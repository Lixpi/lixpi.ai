'use strict'

import process from 'process'
import SQSService from '@lixpi/sqs-service'

class QueuePollingService {
    constructor(pollers = []) {
        this.sqsService = new SQSService({
            region: process.env.AWS_REGION,
            ssoProfile: process.env.AWS_PROFILE,
        })
        this.pollers = pollers
    }

    startPolling() {
        this.pollers.forEach(config => {
            this.pollQueue(config)
        })
    }

    async pollQueue({
        queueUrl,
        pollingInterval,
        handler
    }: {
        queueUrl: string
        pollingInterval: number
        handler: (message: any) => Promise<void>
    }) {
        try {
            const messages = await this.sqsService.receiveMessages({ queueUrl, origin: 'SQS-Polling-Service', pollingInterval })
            if (messages?.length) {

                console.log('Messages:', messages)

                for (const message of messages) {
                    await handler(
                        message,
                        receiptHandle => this.sqsService.deleteMessage({ queueUrl, receiptHandle, origin: 'SQS-Polling-Service' })
                    )
                }
            }
        } catch (error) {
            console.error(`Error polling SQS queue ${queueUrl}:`, error)
        } finally {
            // Set a delay before the next poll using the specified pollingInterval
            setTimeout(() => this.pollQueue({ queueUrl, pollingInterval, handler }), pollingInterval)
        }
    }
}

export default QueuePollingService
