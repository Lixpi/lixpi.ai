// ============================================================================
// CROSS-REPO WIRE CONTRACT. Do NOT change without explicit user allowance.
//
// A metering backend in another repository mirrors these types, and they must stay
// byte-compatible on the wire: field names, types, all of it. A change here has to
// be mirrored there in the same change and released together, along with the
// metrics.* subjects in @lixpi/constants. A one-sided change breaks the wire
// silently. See ../documentation/METERING-PORT.md.
// ============================================================================
//
// Lixpi sends unit counts and never money: the backend owns pricing.

export type MeteredModality = 'tokens' | 'image' | 'video'
export type BillingUnit = 'tokens' | 'images' | 'seconds'

// Asks whether the org's balance covers an upcoming paid provider call. The backend
// prices estimatedUnits as an upper bound.
export type SpendAuthorizationRequest = {
    orgId: string
    userId: string
    workspaceId?: string
    workflowId: string
    model: string
    modality: MeteredModality
    estimatedUnits: number // upper-bound unit count for the estimate
    currency: string // 'USD' at launch
}

// The admission decision. operationId is the metering side's handle for the call,
// opaque here, and ties this authorization to the usage recorded against it.
export type SpendAuthorizationResponse = {
    approved: boolean
    operationId?: string
    estimatedCost?: number // micro-dollars, for display/telemetry
    balance?: number // micro-dollars
    reason?: string // e.g. insufficient_balance (when denied)
}

// The measured, cost-relevant dimensions of one provider call. Only the fields the
// modality uses are set. The backend prices from these, so the split is what makes
// accurate pricing possible.
export type MeasuredUsage = {
    // Text tokens, split because input and output are priced differently. Two
    // invariants the backend relies on, so normalize per provider before sending:
    // cached tokens are included in promptTokens, and reasoning tokens in
    // completionTokens. Both are subsets, never extras.
    promptTokens?: number
    completionTokens?: number
    cachedTokens?: number
    reasoningTokens?: number
    // Image: the count plus the size and quality that drive the per-image rate.
    imageCount?: number
    imageSize?: string
    imageQuality?: string
    // Video: per-second metered (VEO) uses durationSeconds and a resolution tier;
    // token-metered (Seedance) uses videoTokens.
    durationSeconds?: number
    resolution?: string
    videoTokens?: number
    // Seconds of source video supplied as input to the generation. Absent or 0
    // means text-to-video. Whole seconds, rounded UP when the true value is
    // fractional. Providers can price a run with video input differently from one
    // without, so the rate depends on it.
    inputVideoSeconds?: number
}

// Reports one provider call's measured usage after it returns. measuringUnit is the
// modality's primary unit, and is what tells video seconds from video tokens.
// Idempotent on providerRequestId.
export type RecordedUsageRequest = {
    providerRequestId: string
    operationId?: string // from the matching authorization; empty or unknown means the backend charges by actuals
    orgId: string
    userId: string
    workspaceId?: string
    workflowId: string
    workflowSeq: number
    model: string
    modality: MeteredModality
    measuringUnit: BillingUnit
    usage: MeasuredUsage
    currency: string // 'USD' at launch
    occurredAt: string // ISO 8601
}

// The posted charge and the balance after it.
export type RecordedUsageResponse = {
    transferId?: string
    resaleCost?: number // micro-dollars, amount charged to the org
    balance?: number // micro-dollars, new balance after the debit
}
