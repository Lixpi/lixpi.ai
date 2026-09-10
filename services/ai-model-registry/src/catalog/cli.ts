import process from 'node:process'

import {
    err,
    info,
} from '@lixpi/debug-tools'

import { CatalogSync } from './catalog-sync.ts'
import { CredentialsExpiredError } from './sources/credentials-error.ts'

// Manual sync entry point, run inside the container:
//   node --experimental-transform-types ./src/catalog/cli.ts [--no-fetch] [--no-write] [--no-file-writes]
//
// Three separate questions, so a run can answer one without answering the others:
// `--no-fetch` asks no source and merges the tree as it stands, `--no-write` leaves
// DynamoDB alone, and `--no-file-writes` leaves the tree alone. A re-merge that fills
// in a default still needs to write the tree, which is why it is not the same flag as
// fetching.
const args = new Set(
    process.argv.slice(2),
)

const sync = new CatalogSync({
    catalogDir: process.env.MODEL_CATALOG_DIR ?? '/usr/src/service/data/model-catalog',
    fetchFromSources: !args.has('--no-fetch'),
    writeCatalogFiles: !args.has('--no-file-writes'),
    writeDynamoDb: !args.has('--no-write'),
})

try {
    const result = await sync.run()
    info(
        JSON.stringify(
            {
                ranAt: result.ranAt,
                models: result.models,
                included: result.included,
                incomplete: result.incomplete.length,
                excluded: result.excluded.length,
                drift: {
                    pricing: result.drift.pricing.length,
                    other: result.drift.other.length,
                },
                totalNew: result.totalNew,
                totalUpdated: result.totalUpdated,
                totalDeleted: result.totalDeleted,
            },
            null,
            4,
        ),
    )
} catch (error) {
    if (error instanceof CredentialsExpiredError) {
        err(`Catalog sync stopped. ${error.message}`)
        process.exitCode = 2
    } else {
        err('Catalog sync failed:', error)
        process.exitCode = 1
    }
}
