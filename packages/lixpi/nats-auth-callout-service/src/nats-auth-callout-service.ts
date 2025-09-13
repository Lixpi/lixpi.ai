'use strict'

import c from 'chalk'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { fromSeed } from '@nats-io/nkeys'
import { encodeUser, encodeAuthorizationResponse } from '@nats-io/jwt'

import type { NatsService } from '@lixpi/nats-service'
import { log, info, infoStr, warn, err } from '@lixpi/debug-tools'


const getPermissionsForUser = (userId: string, subscriptions) => {
    const resolvedPermissions = {
        pub: {
            allow: [
                "_INBOX.>"
            ]
        },
        sub: {
            allow: [
                "_INBOX.>"
            ]
        }
    }

    subscriptions.forEach(subject => {
        if (subject.permissions) {
            const { pub, sub } = subject.permissions
            const pubAllows = pub && pub.allow ? pub.allow.map(s => s.replace('{userId}', userId)) : []
            const subAllows = sub && sub.allow ? sub.allow.map(s => s.replace('{userId}', userId)) : []

            resolvedPermissions.pub.allow.push(...pubAllows)
            resolvedPermissions.sub.allow.push(...subAllows)
        }
    })

    info('Final resolved permissions:', resolvedPermissions)
    return resolvedPermissions
}

export const authenticateTokenOnRequest = async ({
    getKey,
    token,
    audience,
    issuer,
    algorithms = ['RS256']
 }) => {
    if (!token) return { error: "authenticateTokenOnRequest() -> No token provided" }

    return new Promise((resolve, reject) => jwt.verify(
        token,
        getKey,
        {
            aud: audience,
            issuer,
            algorithms
        },
        async (error, decoded) => {
            if (error) reject({ error })

            if (decoded) {

                resolve({ decoded })
            }
        }
    ))
}

export const startNatsAuthCalloutService = async ({
    natsService,
    subscriptions,
    nKeyIssuerSeed,
    xKeyIssuerSeed,
    jwtAudience,
    jwtIssuer,
    jwksUri,
    jwtAlgorithms = ['RS256'],
    natsAuthAccount
  }: {
    natsService: NatsService,
    subscriptions: any[],
    nKeyIssuerSeed: string,
    xKeyIssuerSeed: string
    jwtAudience: string,
    jwtIssuer: string,
    jwksUri: string,
    jwtAlgorithms?: string[]
    natsAuthAccount: string
  }) => {
    if (!nKeyIssuerSeed) {
        throw new Error('Issuer seed for NATS auth callout not provided!')
    }

    if (!xKeyIssuerSeed) {
        throw new Error('xKeyIssuerSeed for NATS auth callout not provided!')
    }

    const nKeyPair = fromSeed(Buffer.from(nKeyIssuerSeed))
    const xKeyPair = fromSeed(Buffer.from(xKeyIssuerSeed))

    const getKey = (header, callback) => {
        try {
            jwksClient({ jwksUri }).getSigningKey(header.kid, (error, key) => {
                if (error) {
                    err('JWKS client error:', error)
                    return callback(error, null)
                }

                if (!key) {
                    const keyError = new Error('No signing key found')
                    err('No signing key found for kid:', header.kid)
                    return callback(keyError, null)
                }

                const publicKey = key.publicKey || key.rsaPublicKey
                if (!publicKey) {
                    const keyError = new Error('No public key found in signing key')
                    err('No public key found in signing key for kid:', header.kid)
                    return callback(keyError, null)
                }

                callback(null, publicKey)
            })
        } catch (error) {
            err('Error in getKey function:', error)
            callback(error, null)
        }
    }


    natsService.reply('$SYS.REQ.USER.AUTH', async (data, msg) => {
        try {
            // INFO: `senderPublicCurveKey` also called `xkey` in NATS configuration
            const senderPublicCurveKey = msg.headers?.get('Nats-Server-Xkey')

            if (!senderPublicCurveKey) {
                return new Error('Missing Nats-Server-Xkey in request headers!')
            }

            // Decrypt request signed by curve key using the curve keypair
            const decryptedJWT = xKeyPair.open(msg.data, senderPublicCurveKey)

            if (!decryptedJWT) {
                return new Error('Curve decryption failed')
            }

            const decodedRequest = jwt.decode(new TextDecoder().decode(decryptedJWT), { json: true })

            const connectOpts = decodedRequest?.nats?.connect_opts
            const auth0token = connectOpts?.auth_token

            if (!auth0token) {
                throw new Error('Token missing in client connect options.')
            }

            // console.log("  Verifying Auth0 token...")
            const { decoded, error } = await authenticateTokenOnRequest({
                getKey,
                token: auth0token,
                audience: jwtAudience,
                issuer: jwtIssuer,
                algorithms: jwtAlgorithms
            })

            if (error) {
                err('authenticateTokenOnRequest() failed', error)
                throw new Error(`Token verification failed: ${error.message}`)
            }

            const userId = decoded.sub
            if (!userId) {
                throw new Error('User ID ("sub") missing in provided JWT claims.')
            }

            // Get user permissions
            const permissions = getPermissionsForUser(userId, subscriptions)

            // Each session has a unique nkey
            const userNkey = decodedRequest.nats.user_nkey

            // The userJWT will be encoded with the proper structure
            const userJWT = await encodeUser(
                userId,
                userNkey,
                nKeyPair,
                {
                    ...permissions,
                    type: 'user',
                    version: 2,
                },
                {
                    aud: natsAuthAccount
                }
            )

            // Create auth response using the NATS JWT library
            const responseJWT = await encodeAuthorizationResponse(
                userNkey,
                decodedRequest.nats.server_id.id,
                nKeyPair.getPublicKey(),
                {
                    jwt: userJWT,
                    type: 'auth_response',
                    version: 2
                },
                {
                    signer: nKeyPair
                }
            )

            return responseJWT
        } catch (error) {
            err(`Auth Callout Error: ${error.message}`, error)

            return ''    // Return an empty JWT which will be treated as an auth failure
        }
    }, {}, 'buffer')

    info('NATS Auth Callout Service started successfully')
}
