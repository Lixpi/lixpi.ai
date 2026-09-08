import {
    readFile,
    writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'

import {
    info,
    warn,
} from '@lixpi/debug-tools'
import {
    type AiModel,
} from '@lixpi/constants'

import { CatalogBaseIndex } from './base-index.ts'
import { CatalogConfigApi } from './catalog-config-api.ts'
import { CatalogFetcher } from './catalog-fetcher.ts'
import { CatalogSchema } from './base-schema.ts'
import {
    DriftReporter,
    type DriftReport,
} from './drift-reporter.ts'
import {
    DynamoDbCatalogWriter,
    type CatalogWriteResult,
} from './dynamodb-catalog-writer.ts'
import { CatalogFetchIncomplete } from './fetch-incomplete-error.ts'
import { CredentialsExpiredError } from './sources/credentials-error.ts'
import { ModelCatalogStore } from './model-catalog-store.ts'
import { redactSensitive } from './redact.ts'
import { ModelMerger } from './model-merger.ts'
import { ProviderCatalogIndex } from './catalog-index.ts'
import {
    LAST_SYNC_FILE,
    PROVIDER_DIRECTORIES,
    type LastSyncOutcome,
    type MergedModel,
    type ProviderDirectory,
    type SourceFailure,
    type SyncProgressListener,
} from './types.ts'

export type CatalogSyncOptions = {
    catalogDir: string
    // Whether to ask the sources at all. Off means merge the tree as it stands, which
    // is a different question from whether the result may be written down.
    fetchFromSources: boolean
    // Off in production, where the catalog tree ships with the image and is read
    // only. A production run merges what shipped and writes DynamoDB.
    writeCatalogFiles: boolean
    writeDynamoDb: boolean
}

export type ModelStatusSummary = {
    modelId: string
    detail: string[]
}

export type CatalogSyncResult = {
    ranAt: string
    models: number
    // Model directories deleted because the catalog index skips them.
    removed: string[]
    included: number
    excluded: ModelStatusSummary[]
    incomplete: ModelStatusSummary[]
    unitMismatches: ModelStatusSummary[]
    usedFallback: ModelStatusSummary[]
    drift: DriftReport
    write: Record<string, CatalogWriteResult>
    totalNew: number
    totalUpdated: number
    totalDeleted: number
    totalProcessed: number
}

// One sync: discover, fetch every source into its own file, merge each model against
// the base schema, write the merged file, and send the complete ones to DynamoDB.
// A model reaches DynamoDB only when `_catalog-index.json` includes it and every
// field the schema demands is filled in.
export class CatalogSync {
    private readonly store: ModelCatalogStore
    private readonly lastSyncPath: string

    constructor(private readonly options: CatalogSyncOptions) {
        this.store = new ModelCatalogStore(options.catalogDir)
        this.lastSyncPath = join(
            options.catalogDir,
            '..',
            LAST_SYNC_FILE,
        )
    }

    // What the last run did, for a caller that did not run it: the server reads this
    // to tell the page whether the catalog in front of it is current.
    async readLastOutcome(): Promise<LastSyncOutcome | null> {
        try {
            return JSON.parse(await readFile(this.lastSyncPath, 'utf8')) as LastSyncOutcome
        } catch {
            return null
        }
    }

    private async mergeAll(onProgress?: SyncProgressListener): Promise<MergedModel[]> {
        const schema = await CatalogSchema.load(this.store.rootDir)
        const baseIndex = await CatalogBaseIndex.load(this.store.rootDir)
        const merger = new ModelMerger(schema)
        const merged: MergedModel[] = []

        for (const provider of this.store.listProviders()) {
            const index = await ProviderCatalogIndex.load(this.store.rootDir, provider)

            onProgress?.({
                type: 'provider-started',
                provider,
            })

            for (const modelId of await this.store.listModels(provider)) {
                onProgress?.({
                    type: 'model-started',
                    provider,
                    modelId,
                })
                const bundle = await this.store.loadBundle(provider, modelId)
                merged.push(
                    merger.merge(
                        bundle,
                        index,
                        baseIndex,
                    ),
                )
                onProgress?.({
                    type: 'model-finished',
                    provider,
                    modelId,
                })
            }

            onProgress?.({
                type: 'provider-finished',
                provider,
            })
        }

        return merged
    }

    // The merged catalog as it stands, without fetching or writing anything.
    async loadMerged(): Promise<MergedModel[]> {
        return await this.mergeAll()
    }

    private summarize(
        merged: MergedModel[],
        pick: (entry: MergedModel) => string[],
    ): ModelStatusSummary[] {
        return merged.map(
            entry => ({
                modelId: `${PROVIDER_DIRECTORIES[entry.provider]}:${entry.modelId}`,
                detail: pick(entry),
            }),
        ).filter(entry => entry.detail.length > 0)
    }

    // Defaults the merge worked out for fields the authored file owns, written back
    // through the same endpoint the catalog page patches with, so they land in
    // history/ and a person can change them afterwards. Only blank fields reach here,
    // so an authored value is never overwritten.
    private async backfillAuthoredFields(merged: MergedModel[]): Promise<string[]> {
        const config = new CatalogConfigApi(
            this.store.rootDir,
            join(
                this.store.rootDir,
                '..',
                'history',
            ),
        )
        const filled: string[] = []

        for (const entry of merged) {
            if (
                !entry.authoredFieldsToBackfill
                || entry.meta.syncStatus === 'skipped-by-catalog-index'
            )
                continue

            const knownModels = new Set(
                merged.filter(candidate => candidate.provider === entry.provider).map(candidate => candidate.modelId),
            )
            const result = await config.patchModel(
                entry.provider,
                entry.modelId,
                { fields: entry.authoredFieldsToBackfill },
                knownModels,
            )

            if ('error' in result) {
                warn(`Could not fill in ${entry.provider}/${entry.modelId}: ${result.error} ${result.detail}`)

                continue
            }

            if (result.applied.length > 0)
                filled.push(`${PROVIDER_DIRECTORIES[entry.provider]}:${entry.modelId} ${result.applied.join(', ')}`)
        }

        return filled
    }

    // The outcome of the last run, written beside the tree so the page can say whether
    // what it is showing is current. A run started from the CLI, from the scheduled
    // loop, or over HTTP all land in the same file, so the answer does not depend on
    // which process happened to run it.
    private async recordOutcome(outcome: LastSyncOutcome): Promise<void> {
        // Redacted here as well as at each source. This file is served to the page, so
        // it is the last point at which something identifying can be caught, and it
        // catches whatever a message picked up on its way through.
        const safe: LastSyncOutcome = {
            ...outcome,
            ...(outcome.error && {
                error: {
                    ...outcome.error,
                    message: redactSensitive(outcome.error.message),
                    sourceFailures: outcome.error.sourceFailures.map(
                        failure => ({
                            ...failure,
                            message: redactSensitive(failure.message),
                        }),
                    ),
                },
            }),
        }

        try {
            await writeFile(
                this.lastSyncPath,
                `${JSON.stringify(
                    safe,
                    null,
                    4,
                )}\n`,
                'utf8',
            )
        } catch (error) {
            warn(`Could not record the sync outcome: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async run(onProgress?: SyncProgressListener): Promise<CatalogSyncResult> {
        const ranAt = new Date().toISOString()
        onProgress?.({
            type: 'run-started',
            ranAt,
        })

        try {
            const result = await this.runOrThrow(ranAt, onProgress)
            onProgress?.({
                type: 'run-finished',
                status: 'completed',
            })

            return result
        } catch (error) {
            const sourceFailures: SourceFailure[] = error instanceof CatalogFetchIncomplete
                ? error.failures
                : []
            await this.recordOutcome({
                ranAt,
                finishedAt: new Date().toISOString(),
                status: 'failed',
                error: {
                    name: error instanceof Error ? error.name : 'Error',
                    message: error instanceof Error ? error.message : String(error),
                    sourceFailures: error instanceof CredentialsExpiredError
                        ? [{
                            sourceId: 'bedrock',
                            sourceName: 'AWS Bedrock',
                            message: error.message,
                        }]
                        : sourceFailures,
                },
            })
            onProgress?.({
                type: 'run-finished',
                status: 'failed',
                message: error instanceof Error ? redactSensitive(error.message) : String(error),
            })

            throw error
        }
    }

    private async runOrThrow(
        ranAt: string,
        onProgress?: SyncProgressListener,
    ): Promise<CatalogSyncResult> {
        if (this.options.fetchFromSources) {
            const schema = await CatalogSchema.load(this.store.rootDir)
            const baseIndex = await CatalogBaseIndex.load(this.store.rootDir)
            onProgress?.({
                type: 'phase',
                phase: 'fetching',
            })
            await new CatalogFetcher(
                this.store,
                schema,
                baseIndex,
            ).run(onProgress)
        }

        onProgress?.({
            type: 'phase',
            phase: 'merging',
        })
        const merged = await this.mergeAll(onProgress)

        if (this.options.writeCatalogFiles) {
            for (const filled of await this.backfillAuthoredFields(merged))
                info(`FILLED IN ${filled}: a default the merge worked out, now authored and editable`)
        }

        // A model the catalog index skips is removed from the tree entirely, its
        // directory included, after everything in it is copied into history/. Leaving
        // the files behind would mean the tree no longer says what the catalog holds,
        // and the next run would fetch for it again.
        const removed: string[] = []

        if (this.options.writeCatalogFiles) {
            for (const entry of merged) {
                if (entry.meta.syncStatus === 'skipped-by-catalog-index') {
                    const keptIn = await this.store.removeModel(entry.provider, entry.modelId)
                    removed.push(`${PROVIDER_DIRECTORIES[entry.provider]}:${entry.modelId}`)
                    warn(
                        `REMOVED ${PROVIDER_DIRECTORIES[entry.provider]}:${entry.modelId}: skipped by _catalog-index.json, directory deleted${keptIn ? `, previous version kept in ${keptIn}` : ''}`,
                    )

                    continue
                }

                await this.store.writeMergedRecord(
                    entry.provider,
                    entry.modelId,
                    entry.file,
                )
                await this.store.writeMetaRecord(
                    entry.provider,
                    entry.modelId,
                    entry.meta,
                )
            }
        }

        const reporter = new DriftReporter()
        const drift = reporter.build(
            merged.flatMap(entry => entry.drift),
        )
        reporter.log(drift)

        const excluded = this.summarize(
            merged,
            entry => (entry.meta.syncStatus === 'skipped-by-catalog-index' ? [entry.meta.note ?? 'excluded'] : []),
        )
        const incomplete = this.summarize(
            merged,
            entry => (entry.meta.syncStatus === 'missing-required-fields' ? entry.meta.requiredFieldsStillMissing : []),
        )
        const unitMismatches = this.summarize(merged, entry => entry.meta.ratesRefusedBecauseUnitsDiffer)
        const usedFallback = this.summarize(merged, entry => entry.meta.fieldsFilledFromSchemaDefault)

        for (const entry of incomplete)
            warn(`INCOMPLETE ${entry.modelId}: ${entry.detail.join(', ')} not filled in, not written to DynamoDB`)

        for (const entry of unitMismatches)
            warn(`UNIT MISMATCH ${entry.modelId}: ${entry.detail.join(', ')} kept from the authored file, the source measures it differently`)

        for (const entry of usedFallback)
            warn(`NO SOURCE ${entry.modelId}: ${entry.detail.join(', ')} written from the schema fallback`)

        const byProvider = new Map<ProviderDirectory, AiModel[]>()

        for (const entry of merged) {
            if (!entry.model)
                continue

            const models = byProvider.get(entry.provider) ?? []
            models.push(entry.model)
            byProvider.set(entry.provider, models)
        }

        const write: Record<string, CatalogWriteResult> = {}

        onProgress?.({
            type: 'phase',
            phase: 'writing',
        })

        if (this.options.writeDynamoDb) {
            const writer = new DynamoDbCatalogWriter()

            for (const [provider, models] of byProvider) {
                const providerKey = PROVIDER_DIRECTORIES[provider]
                write[providerKey] = await writer.writeProvider(providerKey, models)
            }
        } else
            warn('DynamoDB write disabled; the merged catalog was built but not persisted')

        const results = Object.values(write)
        const included = merged.filter(entry => entry.model !== null).length
        const result: CatalogSyncResult = {
            ranAt,
            models: merged.length,
            removed,
            included,
            excluded,
            incomplete,
            unitMismatches,
            usedFallback,
            drift,
            write,
            totalNew: results.reduce((total, entry) => total + entry.newModels, 0),
            totalUpdated: results.reduce((total, entry) => total + entry.updatedModels, 0),
            totalDeleted: results.reduce((total, entry) => total + entry.deletedModels, 0),
            totalProcessed: results.reduce((total, entry) => total + entry.processed, 0),
        }

        info(
            `Catalog sync complete: ${merged.length} models in the tree, ${included} written, ${incomplete.length} incomplete, ${excluded.length} excluded, ${drift.total} drift findings`,
        )

        await this.recordOutcome({
            ranAt,
            finishedAt: new Date().toISOString(),
            status: 'completed',
            models: merged.length,
            written: included,
        })

        return result
    }
}
