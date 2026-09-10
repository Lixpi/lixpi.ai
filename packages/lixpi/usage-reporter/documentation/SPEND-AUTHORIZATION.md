---
title: Authorizing a spend
description: How a run's spend is estimated before a paid provider call, why the estimate is an upper bound, and what each modality counts.
---

# Authorizing a spend

Before a paid provider call runs, Lixpi asks the metering backend whether the organization's balance covers it. `estimateSpendForRun` produces the two numbers that question needs: the modality being bought, and how many units of it.

The backend prices `estimatedUnits` at the named model's own rate, which makes the direction of error the whole design.

- **Over-estimating** only makes the gate stricter. A run that could have been afforded is refused, and the confirm afterwards charges what actually happened.
- **Under-estimating** lets a run past a balance that cannot cover it, and the money is already spent by the time anyone finds out.
- **Zero** is the worst case. It prices the check at $0.00, which approves everything and removes the gate without removing the code.

So every rule below rounds toward charging more.

## Modality and unit count come out together

`SpendAuthorizationRequest` names exactly one model and one modality, so the two must describe the same thing. `estimateSpendForRun` returns both in one value for that reason: nothing can update the count and leave the modality behind.

The modality is derived from what the named model *is*, never from what the run might go on to do. A reasoning run gates as `tokens` even with image and video generation enabled, because those are separate paid calls made later through transient media providers, and each of those runs its own check against its own model. Escalating here would name a text model under an image modality, which has no tariff and is denied outright.

`SpendAuthorizationRequest` carries no `measuringUnit`. The backend reads `estimatedUnits` in whatever unit the named model's tariff meters, so the estimate has to speak that unit already.

## Tokens

```text
estimatedUnits = ceil(promptTokensMeasured × 2) + completionCeiling
```

The caller measures the prompt it can see at admission time: the messages plus the system prompt its own adapters build. Everything the request picks up later, such as tool schemas, workspace context, Capability injections and attachment bytes resolved from the object store, is assembled after the gate runs and cannot be measured there.

The factor of 2 (`UNMEASURED_PROMPT_GROWTH_FACTOR`) is the margin for that unmeasurable growth. It is a margin, not a bound. A run that resolves a large workspace context can still exceed it, which is acceptable because the reserved completion ceiling dominates the total and the confirm charges actuals.

The completion ceiling is the run's own `maxCompletionSize` when it sets one, then the model's, and failing both the remainder of the context window after the charged prompt. `basis.completionCeilingFrom` records which of the three answered.

## Images

One image-modality check names one image-generation model and one such run produces one image, so the count is 1. Multi-model fanout and the Character Creator's draft plus fidelity passes each dispatch their own transient run, so each is admitted separately rather than multiplied in here.

## Video

Video models are metered two different ways, and the model's own `pricing.video.measuringUnit` says which:

- **Seconds** (VEO). The count is the clip length.
- **Vendor video tokens** (Seedance through BytePlus ModelArk). The seconds are converted first, see [Seedance video tokens](SEEDANCE-VIDEO-TOKENS.md). Sending seconds against a token tariff understates the cost by orders of magnitude.

Duration resolves to one of the model's own catalog options, because normalization elsewhere in the pipeline already forces the request onto one of them. A requested duration the model publishes is used as-is and the bound is exact; anything else takes the longest option the model offers, which is a guaranteed ceiling. A model publishing no duration options gets the requested value verbatim.

An extension run feeds a source clip back in and the vendor meters that input duration too. The clip's real length is read off its Asset when the request resolves; without one, the estimate falls back to the longest clip these models can produce, which is what generated it.

## The basis, and the log

`SpendEstimateBasis` records how the number was reached, and `logSpendAuthorization` prints it. Only the fields the modality set are filled in, so a tokens line carries no empty video keys.

```text
[UsageMetering] authorize spend model=gpt-5.5 modality=tokens estimatedUnits=41000 unit=tokens promptTokensMeasured=8123 ...
```

Two of its fields exist because the number is not a straight measurement: `promptGrowthFactor` is the margin above, and `provisionalVideoFrame` means the video token count is arithmetic over guessed frame dimensions. A denial and a provisional frame size both log at warn level, so neither is read as an ordinary priced run.

## Calling it

`estimateSpendForRun` takes a `SpendEstimateInput`, not a graph state. The caller owns the request and the tokenizer; this package owns what those numbers are worth.

```typescript
import { estimateSpendForRun } from '@lixpi/usage-reporter'

const { modality, estimatedUnits, basis } = estimateSpendForRun({
    model: aiModelMetaInfo,
    promptTokensMeasured,
    maxCompletionSize,
    videoResolution,
    videoAspectRatio,
    videoDurationSeconds,
})
```

In the API, `services/api/src/llm/usage/spend-estimate.ts` is the adapter that maps a `ProviderState` onto that shape and measures the prompt with the provider's own tokenizer.
