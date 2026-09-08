import {
    type SourceFailure,
} from './types.ts'

// A fetch that lost a source did not happen. The tree is one statement about what
// every source says, and writing a run in which one of them said nothing because it
// was broken would record silence as an answer: the model's rates would quietly fall
// back to whoever is left, and the file that would have shown the gap would be gone.
//
// So the run stops before writing anything. Every file already on disk stays exactly
// as the last complete run left it, and the failure is carried to the caller with
// enough detail to act on: which source, which provider, and what it said.
export class CatalogFetchIncomplete extends Error {
    constructor(readonly failures: SourceFailure[]) {
        super(
            `Fetch incomplete, nothing written. ${failures.length} source ${failures.length === 1 ? 'failure' : 'failures'}: ${failures.map(
                failure => `${failure.sourceName}${failure.provider ? ` (${failure.provider})` : ''}: ${failure.message}`,
            ).join('; ')}`,
        )
        this.name = 'CatalogFetchIncomplete'
    }
}
