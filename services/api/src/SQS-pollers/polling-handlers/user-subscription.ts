'use strict'

import { USER_SUBSCRIPTION_SUBJECTS_SQS_MESSAGE_TYPES } from '@lixpi/constants'
import { log, info, infoStr, warn, err } from '@lixpi/debug-tools'

import {
    notifyClientOfBalanceTopUp,
    notifyClientOfCreditsUse
} from '../../Socket.io/response-handlers/subscription-handlers.ts'

export const userSubscriptionSqsPollers = (ssmParams: any): {
    queueUrl: string
    pollingInterval: number
    handler: (messageContent: any) => Promise<void>
}[] => {
    return [
        {
            queueUrl: ssmParams.UserSubscriptionEventsQueue,
            pollingInterval: 1000, // in milliseconds
            handler: async (messageContent, deleteMessageCallback) => {
                // Implement your logic here

                info('messageContent', messageContent)

                const { messageType, userId, balance, origin } = JSON.parse(messageContent.Body)

                info('UserSubscriptionEventsQueue message received', { messageType, userId, balance, origin })

                switch (messageType) {
                    case USER_SUBSCRIPTION_SUBJECTS_SQS_MESSAGE_TYPES.TOP_UP_BALANCE_SUCCEED:
                        notifyClientOfBalanceTopUp({ userId, balance })
                        break
                    case USER_SUBSCRIPTION_SUBJECTS_SQS_MESSAGE_TYPES.USE_CREDITS:
                        await notifyClientOfCreditsUse({ userId, balance })

                        deleteMessageCallback(messageContent.ReceiptHandle)
                        break
                }
            },
        },
    ]
}
