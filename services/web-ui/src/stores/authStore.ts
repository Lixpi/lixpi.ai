'use strict'

import { get } from 'svelte/store'
import { writable } from 'svelte/store'

type Meta = {
    isLoading: boolean
    isAuthenticated: boolean
}

type User = {    // TODO use User from @lixpi/constants, but make sure that it's compatible with auth0 user object (if it uses auth0 user object, I don't remember)
    userId: string
    name: string
    email: string
}

type AuthStore = {
    meta: Meta
    data: {
        user: User | null
    }
}

const auth: AuthStore = {
    meta: {
        isLoading: false,
        isAuthenticated: false,
    },
    data: {
        user: null,
    }
}

const store = writable(auth)

export const authStore = {
    ...store,

    // Useful for non-svelte components that need to access the store
    getMeta: (key: keyof Meta | null = null): any => {
        let returnValue: any
        const unsubscribe = store.subscribe(store => {
            returnValue = key ? store.meta[key] : store.meta
        })
        unsubscribe()

        return returnValue
    },

    // Useful for non-svelte components that need to access the store
    getData: (key: keyof Auth | null = null): any => {
        let returnValue: any
        const unsubscribe = store.subscribe(store => {
            returnValue = key ? store.data[key] : store.data
        })
        unsubscribe()

        return returnValue
    },

    setMetaValues: (values: Partial<Meta> = {}): void => store.update(state => ({
        ...state,
        meta: {
            ...state.meta,
            ...values
        }
    })),

    setDataValues: (values: Partial<Auth> = {}): void => store.update(state => ({
        ...state,
        data: {
            ...state.data,
            ...values
        }
    })),

    resetStore: (): void => store.set(auth),
}
