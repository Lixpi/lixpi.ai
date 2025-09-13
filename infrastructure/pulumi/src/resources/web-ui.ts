'use strict'

import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
// import * as docker from '@pulumi/docker'
import * as dockerBuild from '@pulumi/docker-build'
import * as path from 'path'
import * as fs from 'fs'
import { Command } from '@pulumi/command/local/index.js'

import { log, info, warn, err } from '@lixpi/debug-tools'

import {
    formatStageResourceName,
} from '@lixpi/constants'

export interface WebUIArgs {
    // Organization and environment
    orgName: string
    stage: string

    // Domain configuration
    domainName: string
    hostedZoneId: string
    hostedZoneName: string
    certificateArn: pulumi.Input<string>

    // Web UI configuration
    apiUrl: string
    environment: {
        VITE_API_URL: string
        VITE_AUTH0_LOGIN_URL: string
        VITE_AUTH0_DOMAIN: string
        VITE_AUTH0_CLIENT_ID: string
        VITE_AUTH0_AUDIENCE: string
        VITE_AUTH0_REDIRECT_URI: string
        VITE_NATS_SERVER: string
    }

    // Optional configuration
    dockerBuildContext: string
    dockerfilePath: string
}

export const createWebUI = async (args: WebUIArgs) => {
    const {
        orgName,
        stage,
        domainName,
        hostedZoneId,
        hostedZoneName,
        certificateArn,
        apiUrl,
        environment,
        dockerBuildContext,
        dockerfilePath,
    } = args

    // Always create www domain regardless of stage
    const wwwDomainName = `www.${domainName}`

    // Resource naming
    const serviceName = 'web-ui'
    const formattedServiceName = formatStageResourceName(serviceName, orgName, stage)

    // Create an S3 bucket for the website
    const siteBucket = new aws.s3.Bucket(`${formattedServiceName}-bucket`, {
        bucket: `${orgName}-${serviceName}-${domainName}-cloudfront-distribution`.toLowerCase(),
        acl: 'private', // CloudFront will handle access, so keep this private
        website: {
            indexDocument: 'index.html',
            errorDocument: 'index.html',
        },
        forceDestroy: true,
    })

    // Create a CloudFront origin access identity for S3
    const originAccessIdentity = new aws.cloudfront.OriginAccessIdentity(`${formattedServiceName}-oai`, {
        comment: `OAI for ${domainName} website`,
    })

    // Grant CloudFront permission to access the bucket
    const bucketPolicy = new aws.s3.BucketPolicy(`${formattedServiceName}-bucket-policy`, {
        bucket: siteBucket.id,
        policy: pulumi.all([siteBucket.arn, originAccessIdentity.iamArn]).apply(([bucketArn, oaiArn]) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: {
                    AWS: oaiArn,
                },
                Action: "s3:GetObject",
                Resource: `${bucketArn}/*`,
            }],
        })),
    })


    // Set up Docker to build the web UI using the modern docker-build provider
    const imageTag = `${formattedServiceName}-build:latest`.toLowerCase();

    const webUIBuildImage = new dockerBuild.Image(imageTag, {
        context: {
            location: dockerBuildContext,
        },
        dockerfile: {
            location: dockerfilePath
        },
        platforms: ['linux/amd64'],
        buildArgs: Object.entries(environment).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value
        }), {
            VITE_NATS_SERVER: environment.VITE_NATS_SERVER
        }),
        tags: [imageTag],
        noCache: true,
        buildOnPreview: true,
        push: false, // We don't need to push this image anywhere
        exports: [
            {
                docker: {
                    names: [imageTag],
                }
            },
        ]
    }, {
        replaceOnChanges: ['*'],
        dependsOn: []
    });

    // Prepare environment variables for docker run only
    const envVars = pulumi.all(
        Object.entries(environment).map(([key, value]) =>
          pulumi.output(value).apply(v => `-e ${key}=${v}`)
        )
    ).apply(flags => flags.join(" "));

    // Run a container to build the site, and extract the build artifacts
    const buildCommand = pulumi.interpolate`
        docker stop web-ui-builder >/dev/null 2>&1 || true && \
        docker rm web-ui-builder >/dev/null 2>&1 || true && \
        docker run -d --name web-ui-builder ${envVars} ${imageTag} tail -f /dev/null && \
        docker exec web-ui-builder pnpm run build && \
        mkdir -p ./dist && \
        docker cp web-ui-builder:/usr/src/service/dist/. ./dist/ && \
        docker stop web-ui-builder && \
        docker rm web-ui-builder
    `

    // Run the build command
    const buildExec = new Command(`${formattedServiceName}-build-exec`, {
        create: buildCommand,
        update: buildCommand,
        environment: {
            // Add a timestamp to force the command to run on every update
            TIMESTAMP: new Date().toISOString()
        }
    }, {
        replaceOnChanges: ['*'],
        dependsOn: [webUIBuildImage],
    })

    // Upload the built assets to S3 using aws cli sync
    const s3SyncCommand = pulumi.interpolate`
        aws s3 sync ./dist s3://${siteBucket.bucket} --delete
    `
    const uploadExec = new Command(`${formattedServiceName}-upload-exec`, {
        create: s3SyncCommand,
        update: s3SyncCommand,
        environment: {
            // Add a timestamp to force the command to run on every update
            TIMESTAMP: new Date().toISOString()
        }
    }, {
        dependsOn: [buildExec, siteBucket, webUIBuildImage],
        replaceOnChanges: ['*']
    })

    // Create CloudFront distribution
    const distribution = new aws.cloudfront.Distribution(`${formattedServiceName}-distribution`, {
        enabled: true,
        isIpv6Enabled: true,
        httpVersion: "http3",
        priceClass: "PriceClass_All", // Use global edge locations for worldwide distribution

        // Origins configuration
        origins: [{
            domainName: siteBucket.bucketRegionalDomainName,
            originId: siteBucket.id.apply(id => `S3-${id}`),
            s3OriginConfig: {
                originAccessIdentity: originAccessIdentity.cloudfrontAccessIdentityPath,
            },
        }],

        // Default behavior
        defaultCacheBehavior: {
            allowedMethods: ["GET", "HEAD", "OPTIONS"], // ALLOW_GET_HEAD_OPTIONS
            cachedMethods: ["GET", "HEAD", "OPTIONS"],
            targetOriginId: siteBucket.id.apply(id => `S3-${id}`),
            forwardedValues: {
                queryString: false,
                cookies: {
                    forward: "none",
                },
                headers: ["Origin"],
            },
            viewerProtocolPolicy: "redirect-to-https", // HTTPS_ONLY
            minTtl: 0,
            defaultTtl: 3600,
            maxTtl: 86400,
            compress: true,
        },

        // Restrictions
        restrictions: {
            geoRestriction: {
                restrictionType: "none",
                locations: [],
            },
        },

        // SSL certificate
        viewerCertificate: {
            acmCertificateArn: certificateArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.2_2021",
        },

        // Custom error responses - redirect to index.html for SPA
        customErrorResponses: [
            {
                errorCode: 403,
                responseCode: 200,
                responsePagePath: "/index.html",
            },
            {
                errorCode: 404,
                responseCode: 200,
                responsePagePath: "/index.html",
            },
        ],

        // Aliases (domain names) - always include both primary and www
        aliases: [domainName, wwwDomainName],

        // Wait for invalidation to complete
        waitForDeployment: true,
    }, {
        dependsOn: [originAccessIdentity, uploadExec],
    })

    // Create CloudFront invalidation to ensure latest content is served
    const invalidationCommand = pulumi.interpolate`
        aws cloudfront create-invalidation --distribution-id ${distribution.id} --paths "/*"
    `
    const invalidationExec = new Command(`${formattedServiceName}-invalidation-exec`, {
        create: invalidationCommand,
        update: invalidationCommand,
        environment: {
            // Add a timestamp to force the command to run on every update
            TIMESTAMP: new Date().toISOString()
        }
    }, {
        dependsOn: [uploadExec, distribution],
        replaceOnChanges: ['*']
    })

    return {
        siteBucket,
        distribution,
        outputs: {
            websiteUrl: pulumi.interpolate`https://${domainName}`,
            domainName,
            wwwDomainName,
            distributionId: distribution.id,
            distributionDomainName: distribution.domainName,
            distributionHostedZoneId: distribution.hostedZoneId, // Add hosted zone ID for alias record
        }
    }
}
