import {
    mkdir,
    readdir,
    readFile,
    rename,
    rm,
    unlink,
    writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'

import { err as debugError } from '@lixpi/debug-tools'

import { VersionedJsonStore } from '../versioned-json-store.ts'

import {
    BASE_FILE,
    PROVIDER_SETTINGS_FILE,
    LIXPI_FILE,
    MERGED_FILE,
    META_FILE,
    PROVIDER_DIRECTORIES,
    SOURCE_FILE_NAMES,
    SOURCE_PRECEDENCE,
    type LixpiModelRecord,
    type MergedModelFile,
    type ModelFile,
    type ModelBundle,
    type ModelMetaFile,
    type ProviderBase,
    type ProviderDirectory,
    type SourceId,
    type SourceModelRecord,
} from './types.ts'

// Reads and writes the model-catalog tree. Each model owns a directory, so
// everything about it sits together and a model can be added or removed as a unit.
//
// It writes the per-source files, the merged file, and the meta file. A model's
// `lixpi.json` is only ever created, never modified: a model discovered on a
// provider gets an empty scaffold, and after that the file belongs to whoever is
// filling it in.
export class ModelCatalogStore {
    private readonly versioned: VersionedJsonStore

    constructor(readonly rootDir: string) {
        this.versioned = new VersionedJsonStore(
            rootDir,
            join(
                rootDir,
                '..',
                'history',
            ),
            'model-catalog-',
        )
    }

    providerDir(provider: ProviderDirectory): string {
        return join(this.rootDir, provider)
    }

    modelDir(
        provider: ProviderDirectory,
        modelId: string,
    ): string {
        return join(
            this.providerDir(provider),
            modelId,
        )
    }

    private modelPath(
        provider: ProviderDirectory,
        modelId: string,
        fileName: string,
    ): string {
        return join(
            this.modelDir(provider, modelId),
            fileName,
        )
    }

    listProviders(): ProviderDirectory[] {
        return Object.keys(PROVIDER_DIRECTORIES) as ProviderDirectory[]
    }

    // A model belongs to the tree once it has a directory holding a lixpi.json,
    // scaffolded or filled.
    async listModels(provider: ProviderDirectory): Promise<string[]> {
        try {
            const entries = await readdir(
                this.providerDir(provider),
                { withFileTypes: true },
            )
            const models: string[] = []

            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue

                const record = await this.readJson<LixpiModelRecord>(
                    this.modelPath(
                        provider,
                        entry.name,
                        LIXPI_FILE,
                    ),
                )

                if (record)
                    models.push(entry.name)
            }

            return models.sort()
        } catch {
            return []
        }
    }

    // Every JSON file in a model's directory, for the panel that shows how the model
    // resolved. The merged file leads because it is the answer; the source files and
    // the account of the merge follow, in the order a reader works back through them.
    async readModelFiles(
        provider: ProviderDirectory,
        modelId: string,
    ): Promise<ModelFile[]> {
        const dir = this.modelDir(provider, modelId)
        let entries: string[] = []

        try {
            entries = await readdir(dir)
        } catch {
            return []
        }

        const order = [
            MERGED_FILE,
            LIXPI_FILE,
            ...SOURCE_PRECEDENCE.map(source => SOURCE_FILE_NAMES[source]),
            META_FILE,
        ]
        const named = entries.filter(entry => entry.endsWith('.json'))
        const files: ModelFile[] = []

        for (const name of [
            ...order.filter(name => named.includes(name)),
            ...named.filter(name => !order.includes(name)).sort(),
        ]) {
            const content = await this.readJson<unknown>(
                join(dir, name),
            )
            files.push({
                name,
                // A file that will not parse is still worth listing: the panel says
                // it is unreadable rather than leaving a tab out with no explanation.
                content,
                readable: content !== null,
            })
        }

        return files
    }

    private async readJson<T>(path: string): Promise<T | null> {
        try {
            return JSON.parse(await readFile(path, 'utf8')) as T
        } catch {
            return null
        }
    }

    // Written through a temp file and a rename so an interrupted run never leaves a
    // half-written model behind.
    private async writeJson(
        path: string,
        content: unknown,
    ): Promise<void> {
        const temp = `${path}.tmp`

        await writeFile(
            temp,
            `${JSON.stringify(
                content,
                null,
                4,
            )}\n`,
            'utf8',
        )

        try {
            await rename(temp, path)
        } catch (error) {
            debugError(`Failed to write ${path}:`, error)
            await unlink(temp).catch(() => undefined)

            throw error
        }
    }

    async hasLixpiRecord(
        provider: ProviderDirectory,
        modelId: string,
    ): Promise<boolean> {
        const record = await this.readJson<LixpiModelRecord>(
            this.modelPath(
                provider,
                modelId,
                LIXPI_FILE,
            ),
        )

        return record !== null
    }

    // Only ever creates. An existing authored file is left exactly as it is.
    async createLixpiRecordIfMissing(
        provider: ProviderDirectory,
        modelId: string,
        scaffold: LixpiModelRecord,
    ): Promise<boolean> {
        if (await this.hasLixpiRecord(provider, modelId))
            return false

        await mkdir(
            this.modelDir(provider, modelId),
            { recursive: true },
        )
        await this.writeJson(
            this.modelPath(
                provider,
                modelId,
                LIXPI_FILE,
            ),
            scaffold,
        )

        return true
    }

    async readLixpiRecord(
        provider: ProviderDirectory,
        modelId: string,
    ): Promise<LixpiModelRecord> {
        return await this.readJson<LixpiModelRecord>(
            this.modelPath(
                provider,
                modelId,
                LIXPI_FILE,
            ),
        ) ?? {}
    }

    async writeSourceRecord(
        provider: ProviderDirectory,
        modelId: string,
        source: SourceId,
        record: SourceModelRecord,
    ): Promise<void> {
        await mkdir(
            this.modelDir(provider, modelId),
            { recursive: true },
        )
        await this.writeJson(
            this.modelPath(
                provider,
                modelId,
                SOURCE_FILE_NAMES[source],
            ),
            record,
        )
    }

    // Returned in precedence order, so whoever merges them does not have to know the
    // file naming to get the priority right.
    async readSourceRecords(
        provider: ProviderDirectory,
        modelId: string,
    ): Promise<SourceModelRecord[]> {
        const records: SourceModelRecord[] = []

        for (const source of SOURCE_PRECEDENCE) {
            const record = await this.readJson<SourceModelRecord>(
                this.modelPath(
                    provider,
                    modelId,
                    SOURCE_FILE_NAMES[source],
                ),
            )

            if (!record)
                continue

            // A file written before the current shape has no `_meta`, and merging it
            // would fail somewhere further in with nothing pointing at the file. The
            // fix is always the same: fetch again.
            if (!record._meta) {
                throw new Error(
                    `SOURCE_FILE_SHAPE_OUTDATED:${provider}/${modelId}/${SOURCE_FILE_NAMES[source]}: no _meta section. Run the sync with fetching enabled to rewrite it.`,
                )
            }

            records.push(record)
        }

        return records
    }

    // Deletes every fetched file in a model's directory that this run did not write.
    // A source file states what a source said on the run that produced it, so one left
    // behind by a source that was skipped, renamed, or removed is a claim nobody
    // stands behind any more. The authored, merged, and meta files are the tree's own
    // and are never touched here.
    async removeUnwrittenSourceFiles(
        provider: ProviderDirectory,
        modelId: string,
        written: Set<string>,
    ): Promise<string[]> {
        const dir = this.modelDir(provider, modelId)
        const kept = new Set([
            LIXPI_FILE,
            MERGED_FILE,
            META_FILE,
            ...written,
        ])
        const removed: string[] = []

        let entries: string[] = []

        try {
            entries = await readdir(dir)
        } catch {
            return removed
        }

        for (const entry of entries) {
            if (
                !entry.endsWith('.json')
                || kept.has(entry)
            )
                continue

            await unlink(
                join(dir, entry),
            ).catch(() => undefined)
            removed.push(`${provider}/${modelId}/${entry}`)
        }

        return removed
    }

    async readProviderBase(provider: ProviderDirectory): Promise<ProviderBase | null> {
        return await this.readJson<ProviderBase>(
            join(
                this.providerDir(provider),
                BASE_FILE,
            ),
        )
    }

    async writeMergedRecord(
        provider: ProviderDirectory,
        modelId: string,
        record: MergedModelFile,
    ): Promise<void> {
        await this.writeJson(
            this.modelPath(
                provider,
                modelId,
                MERGED_FILE,
            ),
            record,
        )
    }

    async writeMetaRecord(
        provider: ProviderDirectory,
        modelId: string,
        record: ModelMetaFile,
    ): Promise<void> {
        await this.writeJson(
            this.modelPath(
                provider,
                modelId,
                META_FILE,
            ),
            record,
        )
    }

    async loadBundle(
        provider: ProviderDirectory,
        modelId: string,
    ): Promise<ModelBundle> {
        return {
            provider,
            modelId,
            base: await this.readProviderBase(provider),
            lixpi: await this.readLixpiRecord(provider, modelId),
            sources: await this.readSourceRecords(provider, modelId),
        }
    }

    // Removes a model from the catalog: its directory and everything in it, the
    // authored file included. Everything is copied into history/ first, because the
    // authored file is hand-written work and a model can be un-skipped later.
    async removeModel(
        provider: ProviderDirectory,
        modelId: string,
    ): Promise<string | null> {
        if (
            modelId === PROVIDER_SETTINGS_FILE
            || modelId === BASE_FILE
        )
            return null

        const dir = this.modelDir(provider, modelId)
        let files: string[] = []

        try {
            files = (await readdir(dir)).map(file => join(dir, file))
        } catch {
            return null
        }

        const snapshotDir = await this.versioned.snapshot(files)

        await rm(
            dir,
            {
                recursive: true,
                force: true,
            },
        )

        return snapshotDir
    }
}
