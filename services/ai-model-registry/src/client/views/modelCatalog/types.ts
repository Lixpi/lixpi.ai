// What `GET /api/model-catalog/overview` returns. The server assembles it from
// the merged catalog, so these mirror the catalog types without importing server
// code into the browser bundle.

export type ProviderDirectory =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'stability'
    | 'byteplus'

export type MergeStatus =
    | 'written-to-database'
    | 'missing-required-fields'
    | 'skipped-by-catalog-index'

export type SourceId = 'models.dev' | 'litellm' | 'provider-api' | 'bedrock'

export type SkippedModel = {
    model: string
    reason: string
}

export type CatalogIndex = {
    providerKey: string
    description?: string
    syncMode: 'all' | 'onlyListed'
    modelsToSync: string[]
    modelsToSkip: SkippedModel[]
}

export type ProviderBase = {
    providerKey?: string
    fieldsInheritedByEveryModel?: Record<string, unknown>
}

export type DriftFinding = {
    provider: ProviderDirectory
    modelId: string
    field: string
    lixpiValue: unknown
    fetchedValue: unknown
    source: string
    isPricing: boolean
}

export type ModelSources = {
    sourcesQueried: SourceId[]
    sourcesWithDataForThisModel: SourceId[]
    inferenceProviderCalledByThePlatform: string
    sourcesWithoutRatesForThatProvider: SourceId[]
    confirmedByMoreThanOneSource: boolean
    fieldsWhereSourcesDisagree: string[]
}

export type AuthoredSummary = {
    fieldsOnlyLixpiSupplies: string[]
    fieldsWhereLixpiOverridesSources: string[]
    fieldsInheritedFromProviderBaseFile: string[]
}

// One JSON file from a model's directory, as `GET .../models/<model>/files` returns
// it. `merged.json` leads the list, which is the order the panel's tabs follow.
export type ModelFile = {
    name: string
    content: unknown
    readable: boolean
}

export type CatalogModel = {
    provider: ProviderDirectory
    providerTitle: string
    modelId: string
    status: MergeStatus
    mergedAt: string
    // The record that reaches DynamoDB, or null while required fields are missing.
    model: Record<string, any> | null
    // The merged file, which carries the same fields whether or not the model
    // passed validation. The table reads this so an incomplete model still shows
    // what is known about it.
    file: Record<string, any>
    lixpi: Record<string, any> | null
    missingRequiredFields: string[]
    fieldsFilledFromSchemaDefault: string[]
    ratesRefusedBecauseUnitsDiffer: string[]
    sources: ModelSources
    authored: AuthoredSummary
    drift: DriftFinding[]
    // Why the model is kept out, from the provider's `catalog-settings.json`. Only
    // excluded models carry it, and it is the whole content of such a row: the sync
    // deletes a skipped model's directory, so there is nothing else to say about it.
    excludedReason?: string
}

export type CatalogProvider = {
    directory: ProviderDirectory
    title: string
    index: CatalogIndex | null
    base: ProviderBase | null
}

export type InferenceProviderEntry = {
    title: string
    kind: 'vendor-api' | 'cloud-platform'
    servesCatalogDirectories: ProviderDirectory[]
    selectedForDirectoryWhenEnvFlagIsTrue?: Record<string, string>
}

// `catalog-settings.json`: the settings that belong to the whole catalog rather than to
// one provider directory.
export type CatalogBaseIndex = {
    description?: string
    inferenceProviders: Record<string, InferenceProviderEntry>
}

export type SourceFailure = {
    sourceId: SourceId
    sourceName: string
    provider?: string
    message: string
}

// What the last sync did. A failed one means every model on the page is whatever the
// last run that finished left behind.
export type LastSyncOutcome = {
    ranAt: string
    finishedAt: string
    status: 'completed' | 'failed'
    error?: {
        name: string
        message: string
        sourceFailures: SourceFailure[]
    }
    models?: number
    written?: number
}

// What the server reports while a sync runs, over `/api/models/sync/events`.
export type SyncProgressEvent =
    | {
        type: 'run-started'
        ranAt: string
    }
    | {
        type: 'phase'
        phase: 'fetching' | 'merging' | 'writing'
    }
    | {
        type: 'provider-started' | 'provider-finished'
        provider: ProviderDirectory
    }
    | {
        type: 'model-started' | 'model-finished'
        provider: ProviderDirectory
        modelId: string
    }
    | {
        type: 'run-finished'
        status: 'completed' | 'failed'
        message?: string
    }

export type CatalogOverview = {
    baseIndex: CatalogBaseIndex | null
    lastSyncOutcome: LastSyncOutcome | null
    providers: CatalogProvider[]
    models: CatalogModel[]
    lastSync: string | null
}

export type ConfigPatchResult = {
    provider: string
    file: string
    changed: boolean
    applied: string[]
    previousVersionKeptIn: string | null
}
