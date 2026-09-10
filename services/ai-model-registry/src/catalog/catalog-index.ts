import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
    PROVIDER_DIRECTORIES,
    PROVIDER_SETTINGS_FILE,
    type CatalogIndex,
    type ProviderDirectory,
} from './types.ts'

// catalog-settings.json decides which of a provider's models the catalog syncs.
// Discovery is separate: the sources report what exists, and this file says what to
// do about it.
export class ProviderCatalogIndex {
    private constructor(
        readonly provider: ProviderDirectory,
        private readonly index: CatalogIndex,
    ) {}

    // A provider with no readable settings file stops the run. Carrying on would mean
    // treating every model the provider lists as included: the sync would scaffold a
    // directory for each one, merge it, and offer it to the database, which is the
    // opposite of what an unreadable exclusion list should cause.
    static async load(
        rootDir: string,
        provider: ProviderDirectory,
    ): Promise<ProviderCatalogIndex> {
        const path = join(
            rootDir,
            provider,
            PROVIDER_SETTINGS_FILE,
        )
        let raw: string

        try {
            raw = await readFile(path, 'utf8')
        } catch (error) {
            throw new Error(
                `${PROVIDER_DIRECTORIES[provider]} has no readable ${PROVIDER_SETTINGS_FILE} at ${path}: ${error instanceof Error ? error.message : String(error)}`,
            )
        }

        let index: CatalogIndex

        try {
            index = JSON.parse(raw) as CatalogIndex
        } catch (error) {
            throw new Error(
                `${PROVIDER_DIRECTORIES[provider]}'s ${PROVIDER_SETTINGS_FILE} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
            )
        }

        if (
            !Array.isArray(index.modelsToSkip)
            || !Array.isArray(index.modelsToSync)
            || (index.syncMode !== 'all' && index.syncMode !== 'onlyListed')
        )
            throw new Error(`${PROVIDER_DIRECTORIES[provider]}'s ${PROVIDER_SETTINGS_FILE} needs syncMode, modelsToSync and modelsToSkip.`)

        return new ProviderCatalogIndex(provider, index)
    }

    get syncMode(): CatalogIndex['syncMode'] {
        return this.index.syncMode
    }

    includes(modelId: string): boolean {
        if (this.index.modelsToSkip.some(entry => entry.model === modelId))
            return false

        if (this.index.syncMode === 'onlyListed')
            return this.index.modelsToSync.includes(modelId)

        return true
    }

    reasonFor(modelId: string): string | null {
        const skipped = this.index.modelsToSkip.find(entry => entry.model === modelId)

        if (skipped)
            return skipped.reason

        if (
            this.index.syncMode === 'onlyListed'
            && !this.index.modelsToSync.includes(modelId)
        )
            return 'not listed in modelsToSync'

        return null
    }
}
