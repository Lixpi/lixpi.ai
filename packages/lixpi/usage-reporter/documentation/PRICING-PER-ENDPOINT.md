---
title: Rates belong to an endpoint
description: Why a model carries no price of its own, where rates live instead, and how metering picks the one that applies to a call.
---

# Rates belong to an endpoint

A model has no single price. Claude Opus 5 through Anthropic's own API is 5.00/25.00 per million tokens; the same model through AWS Bedrock is 5.50/27.50 in region. Both are true at the same time, so a `pricing` field on the model would be right for at most one of them and quietly wrong for the rest.

So a rate is recorded per inference provider. A catalog record carries one block per endpoint that can serve the model, each with its own rates, limits and source list, plus `inferenceProviderCalledByThePlatform` naming the endpoint Lixpi routes to today.

```json
{
    "model": "claude-opus-5",
    "inferenceProviderCalledByThePlatform": "aws-bedrock",
    "inferenceProviders": {
        "anthropic": { "pricing": { "currency": "USD", "text": { "tiers": { "default": { "prompt": "5.00", "completion": "25.00" } } } } },
        "aws-bedrock": { "pricing": { "currency": "USD", "text": { "tiers": { "default": { "prompt": "5.50", "completion": "27.50" } } } } }
    }
}
```

## Reading a rate

`pricingForCalledInferenceProvider(model)` returns the rates for the endpoint the request went to. It prefers `inferenceProviderCalledByThePlatform` and falls back to whichever block is flagged `isCalledByThePlatform`, so a record written by either convention resolves.

It returns `undefined` when nothing prices the model on that route. Treat that as "no rate", never as zero: a zero rate charges nothing and hides the gap.

```typescript
import { pricingForCalledInferenceProvider } from '@lixpi/usage-reporter'

const pricing = pricingForCalledInferenceProvider(aiModelMetaInfo)

if (!pricing?.text)
    throw new Error(`MODEL_TEXT_PRICING_MISSING:${aiModelMetaInfo.provider}:${aiModelMetaInfo.model}`)
```

Switching the endpoint Lixpi calls therefore re-prices from data already in the catalog. Nothing is refetched and no other endpoint's rates are lost.

## Two views of a model

`@lixpi/constants` defines `AiModel`, which carries no rates at all. This package defines `PricedAiModel`, which is the same record with a `pricing` block inside each endpoint. That split is what keeps prices off the wire to the browser: the API reads a `PricedAiModel` from DynamoDB, calls `withoutInferenceProviderPricing`, and what leaves the API is an `AiModel` with nothing to strip.

`PricedModelFields` is the loose version, enough to do a lookup. Anything holding `inferenceProviders` and the called-endpoint name satisfies it, so a caller passes the record it already has instead of casting to a full model.

## Who writes the rates

The AI Model Registry does. It fetches every source, resolves each endpoint's rates separately, and reports disagreement rather than silently picking a side. Its contract is [`services/ai-model-registry/documentation/AI-MODEL-REGISTRY.md`](../../../../services/ai-model-registry/documentation/AI-MODEL-REGISTRY.md).

Two rules there matter to anything reading rates here:

- Only the endpoint the platform calls has to be priced. A model with no rate on the route it runs on is held out of the database entirely, so a record that reaches this package is priced where it counts.
- On the Bedrock route the AWS price list wins over any aggregator's copy of a published rate, because there the price list is the invoice.
