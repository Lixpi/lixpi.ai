'use strict'

import chalk from 'chalk'
import axios from 'axios'
import { log, err, infoStr } from '@lixpi/debug-tools'

import User from '../models/user.ts'
import Organization from '../models/organization.ts'

const logStats = ({ operation, userId, origin }) => {
    const logOrigin = `RegistrationService -> ${operation}`
    infoStr([
        chalk.white(logOrigin),
        ' (User: ',
        userId,
        '), origin: ',
        origin
    ])
}

class RegistrationService {
    constructor() {}

    async verifyRegistration({ decodedToken, accessToken }) {
        const user = await User.get(decodedToken.sub)    // Check if the user exists in the database

        if (user) {
            return { user }
        }

        // If the user does not exist, register the user
        if (!user) {
            const auth0User = await this.getAuth0UserInfo({ queryUserDetailsUrl: decodedToken.aud[1], accessToken })

            const {
                sub: userId,
                stripe_customer_id: stripeCustomerId,
                email,
                name,
                given_name: givenName,
                family_name: familyName,
                picture: avatar,
            } = auth0User

            const { user, error } = await this.createUser({
                userId,
                stripeCustomerId,
                email,
                name,
                givenName,
                familyName,
                avatar
            })

            await this.createOrganization({
                userId,
                organizationName: `${name}'s Organization`
            })

            logStats({
                operation: 'registerUser',
                userId: userId,
                origin: 'verifyRegistration'
            })

            return { user }
        }
    }

    async getAuth0UserInfo({ queryUserDetailsUrl, accessToken }) {
        try {
            const response = await axios.get(queryUserDetailsUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            return response.data
        } catch (error) {
            err('Error during getAuth0UserInfo:', error)
            return { error }
        }
    }

    async createUser({
        userId,
        stripeCustomerId,
        email,
        name,
        givenName,
        familyName,
        avatar
    }) {
        try {
            const user = await User.create({
                userId,    // Partition key
                stripeCustomerId,    // Sort key
                email,
                name,
                givenName,
                familyName,
                avatar,
                hasActiveSubscription: false,
            })
            return { user }
        } catch (error) {
            return { error }
        }
    }

    async createOrganization({ userId, organizationName }) {
        try {
            const organization = await Organization.createOrganization({
                name: organizationName,    // Partition key
                userId: userId,
                accessLevel: 'owner'
            })

            // Update the user's organizations field
            await User.update({
                userId,
                organizations: [organization.organizationId],  // Add the new organization ID to the organizations list
            })
        } catch (error) {
            err('Error during createOrganization:', error)
            return error
        }
    }
}

export default RegistrationService
