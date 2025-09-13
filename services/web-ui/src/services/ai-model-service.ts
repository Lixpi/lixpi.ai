'use strict'

import {
    AI_MODELS_SUBJECTS,
    LoadingStatus,
} from '@lixpi/constants'

import AuthService from './auth0-service.ts'

import { servicesStore } from '$src/stores/servicesStore.ts'
import { aiModelsStore } from '$src/stores/aiModelsStore.ts'

export default class AiModelService {
    constructor() {}

    public async getAvailableAiModels(): Promise<void> {
        aiModelsStore.setMetaValues({ loadingStatus: LoadingStatus.loading })

        try {
            const availableModels: any = await servicesStore.getData('nats')!.request(AI_MODELS_SUBJECTS.GET_AVAILABLE_MODELS, {
                token: await AuthService.getTokenSilently()
            })

            aiModelsStore.setAiModels(availableModels)
            aiModelsStore.setMetaValues({ loadingStatus: LoadingStatus.success })

        } catch (error) {
            console.error('Failed to load AI models data:', error)
            aiModelsStore.setMetaValues({ loadingStatus: LoadingStatus.error })
        }

    }
}
