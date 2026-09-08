import chalk from 'chalk'

import {
    infoStr,
    warn,
} from '@lixpi/debug-tools'

import { MICRO_DOLLARS_PER_USD } from './constants.ts'
import {
    type SpendAuthorizationResponse,
    type RecordedUsageRequest,
    type RecordedUsageResponse,
} from './usage-metering-contract.ts'
import {
    type SpendEstimateBasis,
} from './usage-estimator.ts'

// One shape for both halves of metering, so a run's authorization and its recorded
// spend read together off `docker logs lixpi-api`. Lines are assembled as string
// parts and handed to infoStr, the way the rest of the codebase logs.
//
//   [UsageMetering] authorize spend model=gpt-5.5 modality=tokens estimatedUnits=41000 ...
//   [UsageMetering] recorded spend  model=gpt-5.5 modality=tokens unit=tokens ...

type LogField = [string, unknown]

const LOG_TAG = '[UsageMetering] '

// Renders `key=value` pairs and drops anything nobody set, so a tokens line carries
// no empty video keys and a video line no token keys.
const fieldParts = (fields: LogField[]): string[] => fields
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${chalk.gray(key)}=${chalk.white(String(value))} `)

const asUsd = (microDollars: number | undefined): string | undefined => (
    typeof microDollars === 'number'
        ? `$${(microDollars / MICRO_DOLLARS_PER_USD).toFixed(6)}`
        : undefined
)

// How the estimate was reached, minus the unit, which the line already prints.
const basisFields = (basis: SpendEstimateBasis): LogField[] => {
    const {
        measuringUnit: _measuringUnit,
        ...detail
    } = basis

    return Object.entries(detail)
}

export const logSpendAuthorization = (entry: {
    model: string
    modality: string
    estimatedUnits: number
    basis: SpendEstimateBasis
    workflowId: string
    response: SpendAuthorizationResponse
}): void => {
    const {
        basis,
        response,
    } = entry
    const parts = [
        chalk.blue(LOG_TAG),
        chalk.blue('authorize spend '),
        ...fieldParts([
            ['model', entry.model],
            ['modality', entry.modality],
            ['estimatedUnits', entry.estimatedUnits],
            ['unit', basis.measuringUnit],
            ...basisFields(basis),
            ['approved', response.approved],
            ['reason', response.reason],
            ['estimatedCost', asUsd(response.estimatedCost)],
            ['balance', asUsd(response.balance)],
            ['workflowId', entry.workflowId],
            ['operationId', response.operationId],
        ]),
    ]

    // A denial and a provisional frame size both have to stand out: the second means
    // the count is arithmetic over guessed dimensions, not a real cost.
    if (
        !response.approved
        || basis.provisionalVideoFrame
    ) {
        warn(
            parts.join(''),
        )

        return
    }

    infoStr(parts)
}

export const logRecordedSpend = (entry: {
    request: RecordedUsageRequest
    response: RecordedUsageResponse | undefined
    purchasedFor?: string | undefined
    soldToClientFor?: string | undefined
}): void => {
    const {
        request,
        response,
    } = entry

    infoStr([
        chalk.blue(LOG_TAG),
        chalk.blue('recorded spend '),
        ...fieldParts([
            ['model', request.model],
            ['modality', request.modality],
            ['unit', request.measuringUnit],
            ...Object.entries(request.usage),
            ['purchasedFor', entry.purchasedFor],
            ['soldToClientFor', entry.soldToClientFor],
            ['charged', asUsd(response?.resaleCost)],
            ['balance', asUsd(response?.balance)],
            ['workflowId', request.workflowId],
            ['workflowSeq', request.workflowSeq],
            ['providerRequestId', request.providerRequestId],
            ['operationId', request.operationId],
        ]),
    ])
}
