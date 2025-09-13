'use strict'

import process from 'process'
import chalk from 'chalk'

import { fromSSO } from '@aws-sdk/credential-providers'
import {
    LambdaClient,
    InvokeCommand
} from '@aws-sdk/client-lambda'

const logStats = ({ functionName, payloadSize, origin }) => {
    const logOrigin = `Lambda -> invoke`
    console.info(`${chalk.white(logOrigin)} (Function: ${functionName}, Payload size: ${payloadSize} bytes), origin: ${origin}`)
}

class LambdaService {
    constructor({
        region = '',
        ssoProfile = ''
    } ) {
        if (region === '') {
            throw new Error('AWS region must be provided.')
        }

        this.lambdaClient = new LambdaClient({
            region,
            ...(ssoProfile !== '' && {
                credentials: fromSSO({ profile: ssoProfile })
            })
        })
    }

    async invokeFunction({ functionName, payload, origin = 'unknown' }) {
        if (!functionName) {
            console.error('Function name must be provided.')
        }

        const command = new InvokeCommand({
            FunctionName: functionName,
            Payload: Buffer.from(JSON.stringify(payload))
        })

        try {
            const response = await this.lambdaClient.send(command)
            const payloadSize = Buffer.byteLength(JSON.stringify(payload))

            logStats({
                functionName,
                payloadSize,
                origin
            })

            return JSON.parse(new TextDecoder('utf-8').decode(response.Payload))
        } catch (error) {
            console.error(`Error invoking Lambda function ${functionName}:`, error)
        }
    }
}

export default LambdaService


// Usage example
// const lambdaService = new LambdaService({
//     region: 'us-west-2',
//     ssoProfile: 'my-sso-profile'
// })

// (async () => {
//     try {
//         const payload = { key: 'value' } // Your payload here
//         const response = await lambdaService.invokeFunction({
//             functionName: 'your-lambda-function-name',
//             payload,
//             origin: 'YourServiceName'
//         })
//         console.log('Lambda Response:', response)
//     } catch (error) {
//         console.error('Failed to invoke Lambda:', error)
//     }
// })()
