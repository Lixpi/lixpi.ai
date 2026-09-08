import {
    type InferenceProviderId,
    type LixpiModelRecord,
    type ProviderDirectory,
    type SourceEndpointQuery,
    type SourceFailure,
    type SourceId,
} from '../types.ts'

// What one source can say about one model, per inference provider. Fields a source cannot answer
// are left out entirely rather than filled with a guess, because an absent field
// merges cleanly while a guessed one becomes drift nobody can act on.
export type SourceProviderFacts = {
    sourceKey: string
    fields: Partial<LixpiModelRecord>
    // Facts the source reports that the model record has no field for. They are
    // written to the source file and never merged, so a source can record what it
    // knows without inventing model fields nobody consumes.
    sourceOnlyFacts?: Record<string, unknown>
}

// A source may know a model on the vendor's own API, on AWS Bedrock, or on both. The
// rates differ between them, so they are kept apart all the way to the merge and
// every one of them reaches the merged file.
export type SourceModelFacts = {
    byInferenceProvider: Partial<Record<InferenceProviderId, SourceProviderFacts>>
}

// Every source implements this. `load` runs once per sync, `lookup` is pure after
// that, and `listAvailable` reports what the source sees so models nobody has
// reviewed can be surfaced instead of silently ignored.
//
// `queriedEndpoints` reports what was actually asked for a directory, with the
// parameters that were sent, and it is written into every file the source produces.
// A source answers it after `load`, so the values are the ones the run used rather
// than what the code would use in principle.
export type ModelSource = {
    readonly id: SourceId
    // What this source calls itself for that directory. The provider listings are a
    // different API per vendor, so "provider-api" names a slot in this catalog and
    // never appears in a file as the thing that answered.
    sourceName: (provider: ProviderDirectory) => string
    load: () => Promise<void>
    lookup: (
        provider: ProviderDirectory,
        modelId: string,
    ) => SourceModelFacts | null
    listAvailable: (provider: ProviderDirectory) => string[] | null
    queriedEndpoints: (provider: ProviderDirectory) => SourceEndpointQuery[]
    // Anything that stopped this source answering fully, per directory. A source that
    // loaded cleanly returns none. One that returns any stops the fetch, because a
    // tree written from a partial run records a broken source as a source with
    // nothing to say.
    failures: () => SourceFailure[]
}
