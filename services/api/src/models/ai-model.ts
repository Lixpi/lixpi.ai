'use strict'

import * as process from 'process'

import { getDynamoDbTableStageName, type AiModel } from '@lixpi/constants'
import type { Omit, Pick } from 'type-fest'

const {
    ORG_NAME,
    STAGE
} = process.env

export default {
    getAvailableAiModels: async (): Promise<Omit<AiModel, 'pricing'>[]> => {
        const availableAiModels = await dynamoDBService.scanItems({
            tableName: getDynamoDbTableStageName('AI_MODELS_LIST', ORG_NAME, STAGE),
            limit: 25,
            fetchAllItems: true,
            origin: 'model::AiModel->getAvailableAiModels()',
        })

        // Delete 'pricing' key from each item
        const response = availableAiModels.items.map((item) => {
            delete item.pricing    // Delete 'pricing' key from the item, this should not be exposed to the client
            return item
        }).sort((a, b) => a.sortingPosition - b.sortingPosition)

        return response
    },

    getAiModel: async ({
        provider,
        model,
        omitPricing = true
    }: Pick<AiModel, 'provider' | 'model'> & { omitPricing?: boolean }): Promise<AiModel | Omit<AiModel, 'pricing'>> => {
        const aiModel = await dynamoDBService.getItem({
            tableName: getDynamoDbTableStageName('AI_MODELS_LIST', ORG_NAME, STAGE),
            key: { provider, model },
            origin: 'model::AiModel->getAiModel()',
        })

        if (omitPricing)
            delete aiModel.pricing    // Delete 'pricing' key from the item, this should not be exposed to the client

        return aiModel
    }
}
