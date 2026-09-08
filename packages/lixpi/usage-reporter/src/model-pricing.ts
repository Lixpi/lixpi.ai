import {
    type AiModel,
} from '@lixpi/constants'

import {
    type AiModelPricing,
    type PricedAiModel,
    type PricedModelFields,
} from './types.ts'

// Rates belong to an inference provider, not to a model: the same model through a
// vendor's API and through AWS Bedrock is billed at two different rates. These
// helpers resolve the endpoint the request actually went to. See
// ../documentation/PRICING-PER-ENDPOINT.md.

export const inferenceProviderCalledByThePlatform = (model: PricedModelFields | undefined): string | undefined => {
    if (!model?.inferenceProviders)
        return undefined

    if (
        model.inferenceProviderCalledByThePlatform
        && model.inferenceProviders[model.inferenceProviderCalledByThePlatform]
    )
        return model.inferenceProviderCalledByThePlatform

    return Object.entries(model.inferenceProviders).find(([, entry]) => entry.isCalledByThePlatform)?.[0]
}

// Rates for the endpoint the request goes to. Undefined when nothing prices this
// model there, which callers treat as "no rate", never as zero.
export const pricingForCalledInferenceProvider = (model: PricedModelFields | undefined): AiModelPricing | undefined => {
    const inferenceProvider = inferenceProviderCalledByThePlatform(model)

    return inferenceProvider
        ? model?.inferenceProviders?.[inferenceProvider]?.pricing
        : undefined
}

// The catalog record with every endpoint's rates removed, which is the plain
// `AiModel` everything outside metering works with. Rates stop at the API.
export const withoutInferenceProviderPricing = (model: PricedAiModel): AiModel => {
    const {
        inferenceProviders,
        ...rest
    } = model

    if (!inferenceProviders)
        return rest as AiModel

    return {
        ...rest,
        inferenceProviders: Object.fromEntries(
            Object.entries(inferenceProviders).map(([inferenceProvider, entry]) => {
                const {
                    pricing,
                    ...entryWithoutPricing
                } = entry

                return [inferenceProvider, entryWithoutPricing]
            }),
        ),
    } as AiModel
}
