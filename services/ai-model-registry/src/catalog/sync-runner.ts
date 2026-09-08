import process from 'node:process'

import { err } from '@lixpi/debug-tools'

import {
    CatalogSync,
    type CatalogSyncResult,
} from './catalog-sync.ts'
import {
    type SyncProgressEvent,
    type SyncProgressListener,
} from './types.ts'

// A sync started from the page, and the running commentary that goes back to it.
//
// The scheduled loop is a separate thing and is off in most environments; pressing
// Run sync is not a request to turn it on, it is a request to run once now. So this
// owns its own CatalogSync and works whether or not the loop exists.
//
// Progress is kept as well as broadcast. A page that opens the stream mid-run gets
// everything that has happened so far and then continues live, instead of showing an
// idle button over a run that is halfway through.
export class SyncRunner {
    private readonly sync: CatalogSync
    private readonly listeners = new Set<SyncProgressListener>()
    private events: SyncProgressEvent[] = []
    private run: Promise<CatalogSyncResult | null> | null = null

    constructor(catalogDir: string) {
        const env = process.env

        this.sync = new CatalogSync({
            catalogDir,
            fetchFromSources: true,
            writeCatalogFiles: env.MODEL_CATALOG_WRITE_FILES?.trim().toLowerCase() === 'true',
            writeDynamoDb: env.MODEL_CATALOG_WRITE_DYNAMODB?.trim().toLowerCase() !== 'false',
        })
    }

    isRunning(): boolean {
        return this.run !== null
    }

    // What has happened so far in the run that is going on, or the last one. A page
    // that connects late replays this before it sees anything live.
    history(): SyncProgressEvent[] {
        return this.events
    }

    subscribe(listener: SyncProgressListener): () => void {
        this.listeners.add(listener)

        return () => this.listeners.delete(listener)
    }

    private emit(event: SyncProgressEvent): void {
        this.events.push(event)

        for (const listener of this.listeners) {
            try {
                listener(event)
            } catch {
                // A browser that went away mid-run must not take the run with it.
            }
        }
    }

    // Starts a run and returns immediately. The caller watches the stream rather than
    // holding a request open for a minute, and a second press while one is going
    // joins the run in progress instead of starting a second.
    start(): {
        started: boolean
    } {
        if (this.run)
            return { started: false }

        this.events = []
        this.run = this.execute()

        return { started: true }
    }

    // The failure is already on the stream as `run-finished` and in the last-run file,
    // so it is logged and swallowed here: nobody is awaiting this promise, and a
    // rejection with no one to catch it would take the process down.
    private async execute(): Promise<CatalogSyncResult | null> {
        try {
            return await this.sync.run(event => this.emit(event))
        } catch (error) {
            err('Catalog sync failed:', error)

            return null
        } finally {
            this.run = null
        }
    }
}
