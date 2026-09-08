// Talks to the registry's model-catalog endpoints and writes what comes back
// into the store. Every mutation goes through the same server API that guards
// the tree: nothing here edits a catalog file directly, and every write is
// followed by a reload so the page shows what the tree now holds.

import { LoadingStatus } from '@lixpi/constants'

import {
    idleSyncProgress,
    modelCatalogStore,
    type SyncProgress,
} from '$src/stores/modelCatalogStore.ts'

import {
    type CatalogOverview,
    type ConfigPatchResult,
    type ProviderDirectory,
    type SyncProgressEvent,
} from '$src/views/modelCatalog/types.ts'

export type CatalogIndexPatch = {
    syncMode?: 'all' | 'onlyListed'
    skipModels?: Array<{
        model: string
        reason: string
    }>
    unskipModels?: string[]
    syncModels?: string[]
    unsyncModels?: string[]
}

const readError = async (response: Response): Promise<string> => {
    try {
        const body = (await response.json()) as {
            error?: string
            detail?: string
        }

        return body.detail ?? body.error ?? `Request failed with ${response.status}`
    } catch {
        return `Request failed with ${response.status}`
    }
}

class ModelCatalogService {
    // The open event stream, or null when nothing is being followed.
    private syncEvents: EventSource | null = null

    private static instance: ModelCatalogService | null

    static getInstance(): ModelCatalogService {
        return ModelCatalogService.instance ?? (ModelCatalogService.instance = new ModelCatalogService())
    }

    async load(): Promise<void> {
        modelCatalogStore.setMetaValues({
            loadingStatus: LoadingStatus.loading,
            error: null,
        })

        try {
            const response = await fetch('/api/model-catalog/overview')

            if (!response.ok)
                throw new Error(await readError(response))

            const overview = (await response.json()) as CatalogOverview
            modelCatalogStore.setDataValues({ overview })
            modelCatalogStore.setMetaValues({ loadingStatus: LoadingStatus.success })
        } catch (error: unknown) {
            modelCatalogStore.setMetaValues({
                loadingStatus: LoadingStatus.error,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    // Merges fields into a model's authored file. A null value removes a field,
    // which is the server's contract, so the caller never resends a whole record.
    async patchModelFields(
        provider: ProviderDirectory,
        modelId: string,
        fields: Record<string, unknown>,
    ): Promise<boolean> {
        return await this.write(`/api/model-catalog/${provider}/models/${encodeURIComponent(modelId)}/lixpi`, { fields })
    }

    async patchCatalogIndex(
        provider: ProviderDirectory,
        patch: CatalogIndexPatch,
    ): Promise<boolean> {
        return await this.write(`/api/model-catalog/${provider}/catalog-index`, patch)
    }

    async patchProviderBase(
        provider: ProviderDirectory,
        fieldsInheritedByEveryModel: Record<string, unknown>,
    ): Promise<boolean> {
        return await this.write(`/api/model-catalog/${provider}/base`, { fieldsInheritedByEveryModel })
    }

    // Starts a run and follows it. The request returns as soon as the run starts;
    // what it is doing arrives on the event stream, which is also what ends the
    // spinner. Pressing the button during a run joins that run rather than starting a
    // second one.
    async runSync(): Promise<boolean> {
        try {
            const response = await fetch('/api/models/sync', { method: 'POST' })

            if (!response.ok)
                throw new Error(await readError(response))

            this.watchSync()

            return true
        } catch (error: unknown) {
            modelCatalogStore.setDataValues({
                syncProgress: {
                    ...idleSyncProgress,
                    message: error instanceof Error ? error.message : String(error),
                },
            })

            return false
        }
    }

    // One stream at a time. Reconnecting on every press would replay the run from the
    // beginning and flicker every spinner back on.
    watchSync(): void {
        if (this.syncEvents)
            return

        const events = new EventSource('/api/models/sync/events')
        this.syncEvents = events

        events.addEventListener(
            'message',
            message => void this.applySyncEvent(JSON.parse((message as MessageEvent<string>).data) as SyncProgressEvent),
        )

        // A dropped connection is not a finished run, but the page cannot tell what is
        // happening any more, so it stops claiming to know.
        events.addEventListener('error', () => {
            events.close()
            this.syncEvents = null
            modelCatalogStore.setDataValues({ syncProgress: idleSyncProgress })
        })
    }

    private applySyncEvent(event: SyncProgressEvent): void {
        const current = modelCatalogStore.getData('syncProgress') as SyncProgress

        // Everything the page is showing is waiting on the run the moment it starts.
        // The catalog it already has is what says how many that is.
        if (event.type === 'run-started') {
            const overview = modelCatalogStore.getData('overview') as CatalogOverview | null
            modelCatalogStore.setDataValues({
                syncProgress: {
                    ...idleSyncProgress,
                    running: true,
                    pendingProviders: (overview?.providers ?? []).map(provider => provider.directory),
                    pendingModels: (overview?.models ?? []).map(model => `${model.provider}/${model.modelId}`),
                },
            })

            return
        }

        // A run walks everything twice, once to fetch and once to merge. An item that
        // has already cleared stays cleared rather than spinning again for the second
        // pass, which would read as work being redone.
        if (event.type === 'phase') {
            modelCatalogStore.setDataValues({
                syncProgress: {
                    ...current,
                    running: true,
                    phase: event.phase,
                },
            })

            return
        }

        if (event.type === 'run-finished') {
            this.syncEvents?.close()
            this.syncEvents = null
            modelCatalogStore.setDataValues({
                syncProgress: {
                    ...idleSyncProgress,
                    message: event.status === 'completed'
                        ? 'Sync finished'
                        : event.message ?? 'The sync failed',
                },
            })
            void this.load()

            return
        }

        // Only the finishes matter now: a start says an item is being worked on, which
        // is what it was already showing.
        if (
            event.type !== 'provider-finished'
            && event.type !== 'model-finished'
        )
            return

        const key = event.type === 'model-finished'
            ? `${event.provider}/${event.modelId}`
            : null

        modelCatalogStore.setDataValues({
            syncProgress: {
                ...current,
                running: true,
                pendingProviders: key
                    ? current.pendingProviders
                    : current.pendingProviders.filter(entry => entry !== event.provider),
                pendingModels: key
                    ? current.pendingModels.filter(entry => entry !== key)
                    : current.pendingModels,
            },
        })
    }

    private async write(
        url: string,
        body: unknown,
    ): Promise<boolean> {
        modelCatalogStore.setMetaValues({
            saving: true,
            lastSaveMessage: null,
        })

        try {
            const response = await fetch(
                url,
                {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(body),
                },
            )

            if (!response.ok)
                throw new Error(await readError(response))

            const result = (await response.json()) as ConfigPatchResult
            modelCatalogStore.setMetaValues({
                lastSaveMessage: result.changed
                    ? `Saved: ${result.applied.join(', ')}`
                    : 'Nothing changed',
            })
            await this.load()

            return true
        } catch (error: unknown) {
            modelCatalogStore.setMetaValues({
                lastSaveMessage: error instanceof Error ? error.message : String(error),
            })

            return false
        } finally {
            modelCatalogStore.setMetaValues({ saving: false })
        }
    }
}

export const modelCatalogService = ModelCatalogService.getInstance()
