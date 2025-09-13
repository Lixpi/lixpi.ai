'use strict'

import {
    USER_SUBJECTS,
    LoadingStatus
} from '@lixpi/constants'

import AuthService from './auth0-service.ts'

import { servicesStore } from '$src/stores/servicesStore.ts'
import { userStore } from '../stores/userStore.ts'

export default class UserService {
    constructor() {}

    public async getUser(): Promise<void> {
        userStore.setMetaValues({ loadingStatus: LoadingStatus.loading })

        try {
            const user: any = await servicesStore.getData('nats')!.request(USER_SUBJECTS.GET_USER, {
                token: await AuthService.getTokenSilently()
            })

            userStore.setDataValues(user)
            userStore.setMetaValues({ loadingStatus: LoadingStatus.success })

        } catch (error) {
            console.error('Failed to load user:', error)
            userStore.setMetaValues({ loadingStatus: LoadingStatus.error })
        }

    }
}
