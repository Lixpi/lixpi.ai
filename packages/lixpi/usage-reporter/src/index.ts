// Everything Lixpi knows about what a provider call consumed and what it costs.
// Nothing here decides what a run does; it decides what a run is worth.

export {
    UsageMeteringClient,
    usageMeteringOptionsFromEnv,
    type UsageMeteringOptions,
    type UsageMeteringTransport,
} from './usage-metering-client.ts'

export {
    pricingForCalledInferenceProvider,
    inferenceProviderCalledByThePlatform,
    withoutInferenceProviderPricing,
} from './model-pricing.ts'

export {
    METRICS_CURRENCY,
    MICRO_DOLLARS_PER_USD,
    UNMEASURED_PROMPT_GROWTH_FACTOR,
} from './constants.ts'

export {
    estimateSpendForRun,
    type SpendEstimate,
    type SpendEstimateBasis,
    type SpendEstimateInput,
} from './usage-estimator.ts'

export {
    usageRecordForImageCall,
    usageRecordForTextCall,
    usageRecordForVideoCall,
} from './usage-event-mapper.ts'

export {
    logSpendAuthorization,
    logRecordedSpend,
} from './usage-log.ts'

export {
    UsageReporter,
    type ImageCallSpend,
    type TextCallSpend,
    type VideoCallSpend,
} from './usage-reporter.ts'

export {
    estimateVideoTokens,
    type VideoFrameSize,
    type VideoTokenEstimate,
} from './video-token-accounting.ts'

export type {
    SpendAuthorizationRequest,
    SpendAuthorizationResponse,
    RecordedUsageRequest,
    RecordedUsageResponse,
    BillingUnit,
    MeteredModality,
    MeasuredUsage,
} from './usage-metering-contract.ts'

export type {
    AiModelPricing,
    ImageUsageCounts,
    MeteredAiModel,
    PricedAiModel,
    PricedInferenceProvider,
    PricedModelFields,
    TokenUsageCounts,
    UsageEventMeta,
    VideoUsageCounts,
} from './types.ts'
