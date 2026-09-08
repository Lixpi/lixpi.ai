import { NATS_SUBJECTS } from '@lixpi/constants'

import {
    type SpendAuthorizationRequest,
    type SpendAuthorizationResponse,
    type RecordedUsageRequest,
    type RecordedUsageResponse,
} from './usage-metering-contract.ts'
import { warn } from '@lixpi/debug-tools'

// CROSS-REPO WIRE CONTRACT. These subjects and the message shapes are shared with a
// metering backend in another repository; both sides change together or the wire
// breaks silently. The subject names are the backend's, which is why they still say
// check and confirm. See ../documentation/METERING-PORT.md.
const USAGE_METERING_SUBJECTS = (NATS_SUBJECTS as any).METRICS_SUBJECTS as {
    USAGE_CHECK: string
    USAGE_CONFIRM: string
}

// The smallest slice of the NATS service this needs: one request/reply call.
// Depending on the interface rather than the singleton is what keeps it testable.
export type UsageMeteringTransport = {
    request<Req = any, Res = any>(
        subject: string,
        data: Req,
        timeoutMs: number,
    ): Promise<Res>
}

export type UsageMeteringOptions = {
    // false is the plug: every spend is authorized, recording is a no-op, and nothing
    // touches the network.
    enabled: boolean
    // Timeout on both calls, which are request/reply rather than fire and forget.
    requestTimeoutMs: number
    // Whether an unreachable backend denies the run (the default) or allows it.
    denySpendWhenUnreachable: boolean
}

// The integration flags, from the environment.
export const usageMeteringOptionsFromEnv = (): UsageMeteringOptions => {
    return {
        enabled: process.env.METRICS_ENABLED === 'true',
        requestTimeoutMs: Number(process.env.METRICS_REQUEST_TIMEOUT_MS ?? 3000),
        // Fail-closed by default; METRICS_FAIL_OPEN=true trades overspend risk for availability.
        denySpendWhenUnreachable: process.env.METRICS_FAIL_OPEN !== 'true',
    }
}

// The hosted binding of the metering port: authorize the spend before a paid call,
// record what it used afterwards. See ../documentation/METERING-PORT.md.
export class UsageMeteringClient {
    constructor(
        private readonly transport: UsageMeteringTransport,
        private readonly options: UsageMeteringOptions,
    ) {}

    get enabled(): boolean {
        return this.options.enabled
    }

    // Asks whether the balance covers a call that has not run yet. Metering off
    // approves; a transport error follows the deny-when-unreachable policy.
    async authorizeSpend(request: SpendAuthorizationRequest): Promise<SpendAuthorizationResponse> {
        if (!this.options.enabled)
            return { approved: true }

        try {
            return await this.transport.request<SpendAuthorizationRequest, SpendAuthorizationResponse>(
                USAGE_METERING_SUBJECTS.USAGE_CHECK,
                request,
                this.options.requestTimeoutMs,
            )
        } catch (error: any) {
            warn(`[UsageMetering] spend authorization failed: ${error?.message ?? String(error)}`)

            return {
                approved: !this.options.denySpendWhenUnreachable,
                reason: 'metrics_unreachable',
            }
        }
    }

    // Reports what a finished call actually used, which is what the org is charged
    // on. A failure is logged rather than thrown, so a metering hiccup never fails a
    // request the user already received. Retrying is safe: the backend is idempotent
    // on providerRequestId.
    async recordSpend(request: RecordedUsageRequest): Promise<RecordedUsageResponse | undefined> {
        if (!this.options.enabled)
            return undefined

        try {
            return await this.transport.request<RecordedUsageRequest, RecordedUsageResponse>(
                USAGE_METERING_SUBJECTS.USAGE_CONFIRM,
                request,
                this.options.requestTimeoutMs,
            )
        } catch (error: any) {
            warn(`[UsageMetering] recording spend failed (providerRequestId=${request.providerRequestId}): ${error?.message ?? String(error)}`)

            return undefined
        }
    }
}
