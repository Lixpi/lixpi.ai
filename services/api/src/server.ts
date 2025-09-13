'use strict'

import process from 'process'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import chalk from 'chalk'
import { log, info, infoStr, warn, err } from '@lixpi/debug-tools'

import DynamoDBService from '@lixpi/dynamodb-service'
import SSMService from '@lixpi/ssm-service'
import NATS_Service from '@lixpi/nats-service'
import { startNatsAuthCalloutService } from '@lixpi/nats-auth-callout-service'

import { createServer } from 'http'

// SQS pollers imports ******************************************
// import SqsPollingService from './SQS-pollers/polling-service.ts'
// import { userSubscriptionSqsPollers } from './SQS-pollers/polling-handlers/user-subscription.ts'

import { jwtAuthMiddleware } from './NATS/middleware/nats-auth-middleware.ts'
import { userSubjects } from './NATS/subscriptions/user-subjects.ts'
import { aiModelSubjects } from './NATS/subscriptions/ai-model-subjects.ts'
import { aiChatSubjects } from './NATS/subscriptions/ai-chat-subjects.ts'
import { documentSubjects } from './NATS/subscriptions/document-subjects.ts'
import { subscriptionSubjects } from './NATS/subscriptions/subscription-subjects.ts'

import { AiModelsSync } from './workloads/functions/ai-models-synchronization/ai-models-synchronization.ts'

const env = process.env

// Set the global DynamoDB service instance to be used across the application for database operations
global.dynamoDBService = new DynamoDBService({
    region: env.AWS_REGION,
    ssoProfile: env.AWS_PROFILE,
    ...(env.DYNAMODB_ENDPOINT && { endpoint: env.DYNAMODB_ENDPOINT }),    // For local development only
})

//Set the global SSM service instance to be used across the application for parameter store operations
// const ssmService = new SSMService({
//     region: env.AWS_REGION,
//     ssoProfile: env.AWS_PROFILE,
//     prefix: `/sst/${env.ORG_NAME}/${env.STAGE}/`
// })

// Fetch and set the global SSM parameters to be used across the application
// global.ssmParams = {
//     // // Queues ******************************************
//     // UserSubscriptionEventsQueue: await ssmService.getParameter({
//     //     parameterName: 'Queue/User_Subscription_Events/queueUrl',
//     //     withDecryption: true,
//     //     origin: 'server:start::getSsmParams'
//     // }),
//     // // SNS Topics **************************************
//     // AiTokensUsageSnsTopic: await ssmService.getParameter({
//     //     parameterName: 'Parameter/AI_TOKENS_USAGE_TOPIC_ARN/value',
//     //     withDecryption: true,
//     //     origin: 'server:start::getSsmParams'
//     // }),
//     // // Lambdas *****************************************
//     // StripeBillingHandlerLambda: await ssmService.getParameter({
//     //     parameterName: 'Function/Stripe_Billing_Handler/functionName',
//     //     withDecryption: true,
//     //     origin: 'server:start::getSsmParams'
//     // }),

// }

// // Start the SQS polling service
// const sqsPollingService = new SqsPollingService([
//     ...userSubscriptionSqsPollers(ssmParams)
// ])
// sqsPollingService.startPolling()

// Initialize AI Models Synchronization service and synchronize models on startup
const aiModelsSync = new AiModelsSync({
    dynamoDBService: global.dynamoDBService
})

// Synchronize AI models on startup
await aiModelsSync.synchronizeModels()

const subscriptions = [
    ...userSubjects,
    ...subscriptionSubjects,
    ...aiModelSubjects,
    ...aiChatSubjects,
    ...documentSubjects,
]

// Initialize with your NATS server connection
await NATS_Service.init({
    servers: env.NATS_SERVERS,
    name: 'api-server',
    user: 'regular_user',
    pass: env.NATS_REGULAR_USER_PASSWORD,
    middleware: [
        jwtAuthMiddleware, // global middleware, applies to all subscriptions
    ],
    subscriptions
})

await startNatsAuthCalloutService({
    natsService: await NATS_Service.getInstance(),
    subscriptions,
    nKeyIssuerSeed: env.NATS_AUTH_NKEY_ISSUER_SEED,
    xKeyIssuerSeed: env.NATS_AUTH_XKEY_ISSUER_SEED,
    jwtAudience: env.AUTH0_API_IDENTIFIER,
    jwtIssuer: `${env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
    jwksUri: `${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    natsAuthAccount: env.NATS_AUTH_ACCOUNT,
})



const app = express()
const httpServer = createServer(app)

app.set('trust proxy', true)

const corsOptions = {
    origin: env.ORIGIN_HOST_URL,
    credentials: true
}

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(cors(corsOptions))
app.use(cookieParser())



// Health check endpoint
app.get('/health-check', (req, res) => {
    // Perform other necessary health checks
    const isHealthy = httpServer.listening     //TODO: is there a better way to check if socket.io is alive?

    if (isHealthy) {
        res.json({ status: 'healthy', services: { socketIo: 'running' } })
    } else {
        res.status(503).json({ status: 'unhealthy', services: { socketIo: 'not running' } })
    }
})

// Use HTTP server to listen on the specified port instead of the Express app
httpServer.listen(3000, '0.0.0.0', () => {
    infoStr([
        chalk.green('Server is running on: '),
        chalk.blue('http://localhost:3000'),
        '\n\n\n'
    ])
})


// Graceful shutdown (for your application termination handlers)
process.on('SIGINT', async () => {
    log('Shutting down...')
    await await NATS_Service.getInstance()!.drain()    // Drains subscriptions and closes connection
    process.exit(0)
})

process.on('SIGTERM', () => {
    log('Nuke request received, shutting down immediately...')
    process.exit(0)
})

