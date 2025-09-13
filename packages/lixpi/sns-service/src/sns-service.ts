'use strict';

import chalk from 'chalk';
import { fromSSO } from '@aws-sdk/credential-providers';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export type SnsMessage = {
    topicArn: string
    message: any
    attributes?: {
        [key: string]: {
            DataType: 'String' | 'String.Array' | 'Number' | 'Binary'
            StringValue?: string
            BinaryValue?: Uint8Array
        }
    };
    origin?: string
};

const logStats = ({ operation, topicArn, origin }) => {
    const logOrigin = `SNS -> ${operation}`;
    console.info(`${chalk.white(logOrigin)} (TopicArn: ${topicArn}), origin: ${origin}`);
};

class SNSService {
    constructor({
        region = '',
        ssoProfile = ''
    } = {}) {
        if (region === '') {
            throw new Error('AWS region must be provided.');
        }

        this.snsClient = new SNSClient({
            region,
            ...(ssoProfile !== '' && {
                credentials: fromSSO({ profile: ssoProfile })
            })
        });
    }

    async publishMessage({
        topicArn,
        message,
        attributes = {},
        origin = 'unknown'
    }: SnsMessage) {
        if (!topicArn || !message) {
            throw new Error('Topic ARN and message must be provided.');
        }

        const command = new PublishCommand({
            TopicArn: topicArn,
            MessageAttributes: attributes,
            Message: JSON.stringify(message),
        });

        try {
            const response = await this.snsClient.send(command);
            logStats({ operation: 'publishMessage', topicArn, origin });
            return response;
        } catch (error) {
            console.error(`Error publishing message to SNS topic ${topicArn}:`, error);
            return error;
        }
    }
}

export default SNSService;
