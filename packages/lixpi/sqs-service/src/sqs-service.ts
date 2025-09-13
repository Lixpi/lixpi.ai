'use strict'

//INFO:  https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sqs/

import process from 'process'
import chalk from 'chalk'

import { fromSSO } from '@aws-sdk/credential-providers'
import {
    SQSClient,
    SendMessageCommand,
    SendMessageBatchCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs'

// import { SendMessageCommandOutput, SendMessageCommandInput } from '@aws-sdk/client-sqs'

import { log, info, infoStr, warn, err } from '@lixpi/debug-tools'

const env = process.env

const logStats = ({ operation, queueUrl, messageCount = 0, pollingInterval = 0, origin }) => {
    const operationDirection = ['sendMessage', 'deleteMessage'].includes(operation) ? '->' : '<-'
    const logOrigin = `SQS ${operationDirection} ${operation}`
    let pollingInfo = ''
    if (pollingInterval > -1) {
        pollingInfo = `, polling every ${pollingInterval / 1000} seconds`    // Convert to seconds
    }

    console.info(`${chalk.white(logOrigin)} (${queueUrl}, ${messageCount} messages)${pollingInfo}, origin: ${origin}`)
}

class SQSService {
    constructor({
        region = '',
        ssoProfile = ''
    } = {}) {
        if (region === '') {
            throw new Error('AWS region must be provided.')
        }

        this.sqsClient = new SQSClient({
            region,
            ...(ssoProfile !== '' && {
                credentials: fromSSO({ profile: ssoProfile })
            })
        })
    }

    async sendMessage({
        queueUrl,
        message,
        messageAttributes,
        delaySeconds = 0,
        messageGroupId,
        messageDeduplicationId,
        origin = 'unknown'
    }: {
        queueUrl: string
        message: any
        messageAttributes?: any
        delaySeconds?: number
        messageGroupId?: string
        messageDeduplicationId?: string
        origin: string
    }) {
        if (!queueUrl)
            throw new Error('Queue URL must be provided.')
        if (!message)
            throw new Error('Message must be provided.')

        const isFifoQueue = queueUrl.endsWith('.fifo')

        const commandParams = {
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(message),
            MessageAttributes: messageAttributes,
            DelaySeconds: delaySeconds
        }

        if (isFifoQueue) {
            if (!messageGroupId)
                throw new Error('MessageGroupId must be provided for FIFO queues.')

            commandParams.MessageGroupId = messageGroupId

            // Use provided MessageDeduplicationId or generate a fallback
            commandParams.MessageDeduplicationId = messageDeduplicationId || `dedup-id-${Date.now()}`
        }

        const command = new SendMessageCommand(commandParams)

        try {
            const response = await this.sqsClient.send(command)

            logStats({
                operation: 'sendMessage',
                queueUrl,
                origin
            })

            return response
        } catch (error) {
            console.error(`Error sending message to SQS queue ${queueUrl}:`, error)
            return error
        }
    }

    async sendMessageBatch({
        queueUrl,
        messages,
        messageGroupId,
        origin = 'unknown'
    }: {
        queueUrl: string
        messages: any[]
        messageGroupId: string
        origin: string
    }) {
        if (!queueUrl || !messages || messages.length === 0) {
            throw new Error('Queue URL and non-empty messages array must be provided.')
        }

        const isFifoQueue = queueUrl.endsWith('.fifo')
        if (isFifoQueue && !messageGroupId) {
            throw new Error('MessageGroupId must be provided for FIFO queues.')
        }

        const entries = messages.map((message, index) => {
            const entry = {
                Id: `msg${index}`,
                MessageBody: JSON.stringify(message)
            }
            if (isFifoQueue) {
                entry.MessageGroupId = messageGroupId
                // Use provided MessageDeduplicationId or generate a fallback
                entry.MessageDeduplicationId = message.deduplicationId || `dedup-id-${index}-${Date.now()}`
            }
            return entry
        })

        const command = new SendMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: entries
        })

        try {
            const response = await this.sqsClient.send(command)

            logStats({
                operation: 'sendMessageBatch',
                queueUrl,
                messageCount: messages.length,
                origin
            })

            return response
        } catch (error) {
            console.error(`Error sending message batch to SQS queue ${queueUrl}:`, error)
        }
    }

    async receiveMessages({
        queueUrl,
        maxMessages = 1,
        waitTimeSeconds = 20,
        visibilityTimeout = 30,
        pollingInterval = 0,
        origin = 'unknown',
    }: {
        queueUrl: string
        maxMessages?: number
        waitTimeSeconds?: number
        visibilityTimeout?: number
        pollingInterval?: number
        origin: string
    }) {
        if (!queueUrl) {
            throw new Error('Queue URL must be provided.')
        }

        const command = new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: maxMessages,
            WaitTimeSeconds: waitTimeSeconds,
            VisibilityTimeout: visibilityTimeout
        })

        try {
            const response = await this.sqsClient.send(command)

            if (response.Messages) {
                logStats({
                    operation: 'receiveMessages',
                    queueUrl,
                    messageCount: response.Messages.length,
                    origin
                })

                return response.Messages
            } else {
                logStats({
                    operation: 'receiveMessages',
                    queueUrl,
                    messageCount: 0,
                    pollingInterval,
                    origin
                })

                return []
            }
        } catch (error) {
            err(`Error receiving messages from SQS queue ${queueUrl}:`, error)
            return []
        }
    }

    async deleteMessage({
        queueUrl,
        receiptHandle,
        origin = 'unknown'
    }: {
        queueUrl: string
        receiptHandle: string
        origin: string
    }) {
        if (!queueUrl || !receiptHandle) {
            throw new Error('Queue URL and receipt handle must be provided.')
        }

        const command = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle
        })

        try {
            await this.sqsClient.send(command)

            logStats({
                operation: 'deleteMessage',
                queueUrl,
                origin
            })
        } catch (error) {
            err(`Error deleting message from SQS queue ${queueUrl}:`, error)
        }
    }

    async deleteMessageBatch({
        queueUrl,
        messages,
        origin = 'unknown'
    }: {
        queueUrl: string
        messages: any[]
        origin: string
    }) {
        if (!queueUrl || !messages || messages.length === 0) {
            throw new Error('Queue URL and non-empty messages array must be provided.')
        }

        const entries = messages.map((message, index) => ({
            Id: `msg${index}`,
            ReceiptHandle: message.ReceiptHandle
        }))

        const command = new DeleteMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: entries
        })

        try {
            const response = await this.sqsClient.send(command)

            logStats({
                operation: 'deleteMessageBatch',
                queueUrl,
                messageCount: messages.length,
                origin
            })

            // Check for batch errors
            const errors = response.Failed.map(failure => ({
                Id: failure.Id,
                Error: new Error(failure.Message)
            }))

            return errors
        } catch (error) {
            err(`Error deleting message batch from SQS queue ${queueUrl}:`, error)

            return messages.map((_, index) => ({
                Id: `msg${index}`,
                Error: error
            }))
        }
    }
}

export default SQSService

// example
// const queueUrl = 'https://sqs.region.amazonaws.com/account-id/your-queue-name'
// const pollQueue = async () => {
//     try {
//         await sqsService.receiveMessages({ queueUrl, origin: 'myFargateService' })
//     } catch (error) {
//         console.error('Error polling SQS queue:', error)
//     } finally {
//         // Set a delay before the next poll to avoid continuous high-frequency polling
//         setTimeout(pollQueue, 5000) // Poll every 5 seconds
//     }
// }
// // Start polling
// pollQueue()