import {
    describe,
    it,
    expect,
    vi,
} from 'vitest'

import {
    UsageMeteringClient,
    type UsageMeteringTransport,
    type UsageMeteringOptions,
} from './metrics-client.ts'
import {
    type SpendAuthorizationRequest,
    type RecordedUsageRequest,
} from './usage-metering-contract.ts'

function stubTransport(request: UsageMeteringTransport['request'] = vi.fn()): UsageMeteringTransport {
    return { request }
}

const opts = (over: Partial<UsageMeteringOptions> = {}): UsageMeteringOptions => ({
    enabled: true,
    requestTimeoutMs: 3000,
    denySpendWhenUnreachable: true,
    ...over,
})

const authorizationRequest: SpendAuthorizationRequest = {
    orgId: 'org_1',
    userId: 'usr_1',
    workflowId: 'wf_1',
    model: 'OpenAI:gpt-5',
    modality: 'tokens',
    estimatedUnits: 0,
    currency: 'USD',
}

const usageRecord: RecordedUsageRequest = {
    providerRequestId: 'req_1',
    orgId: 'org_1',
    userId: 'usr_1',
    workflowId: 'wf_1',
    workflowSeq: 1,
    model: 'OpenAI:gpt-5',
    modality: 'tokens',
    measuringUnit: 'tokens',
    usage: { promptTokens: 100, completionTokens: 50 },
    currency: 'USD',
    occurredAt: '2026-01-01T00:00:00.000Z',
}

describe('UsageMeteringClient.authorizeSpend', () => {
    it('approves without a request when disabled (the plug)', async () => {
        const request = vi.fn()
        const response = await new UsageMeteringClient(stubTransport(request), opts({ enabled: false })).authorizeSpend(authorizationRequest)
        expect(response.approved).toBe(true)
        expect(request).not.toHaveBeenCalled()
    })

    it('requests usage.check and returns the decision when enabled', async () => {
        const request = vi.fn().mockResolvedValue({ approved: true, balance: 1000 })
        const response = await new UsageMeteringClient(stubTransport(request), opts()).authorizeSpend(authorizationRequest)
        expect(request).toHaveBeenCalledWith('metrics.usage.check', authorizationRequest, 3000)
        expect(response.approved).toBe(true)
    })

    it('fails closed when the request errors', async () => {
        const request = vi.fn().mockRejectedValue(new Error('timeout'))
        const response = await new UsageMeteringClient(stubTransport(request), opts({ denySpendWhenUnreachable: true })).authorizeSpend(authorizationRequest)
        expect(response.approved).toBe(false)
        expect(response.reason).toBe('metrics_unreachable')
    })

    it('fails open when configured', async () => {
        const request = vi.fn().mockRejectedValue(new Error('timeout'))
        const response = await new UsageMeteringClient(stubTransport(request), opts({ denySpendWhenUnreachable: false })).authorizeSpend(authorizationRequest)
        expect(response.approved).toBe(true)
    })
})

describe('UsageMeteringClient.recordSpend', () => {
    it('is a no-op without a request when disabled (the plug)', async () => {
        const request = vi.fn()
        const response = await new UsageMeteringClient(stubTransport(request), opts({ enabled: false })).recordSpend(usageRecord)
        expect(response).toBeUndefined()
        expect(request).not.toHaveBeenCalled()
    })

    it('requests usage.confirm when enabled', async () => {
        const request = vi.fn().mockResolvedValue({ transferId: 'txn_1', resaleCost: 1000, balance: 999000 })
        const response = await new UsageMeteringClient(stubTransport(request), opts()).recordSpend(usageRecord)
        expect(request).toHaveBeenCalledWith('metrics.usage.confirm', usageRecord, 3000)
        expect(res?.transferId).toBe('txn_1')
    })

    it('swallows request errors (best-effort, never throws)', async () => {
        const request = vi.fn().mockRejectedValue(new Error('nats down'))
        const client = new UsageMeteringClient(stubTransport(request), opts())
        await expect(client.recordSpend(usageRecord)).resolves.toBeUndefined()
    })
})
