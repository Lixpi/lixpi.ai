---
title: Recording what a call cost
description: What the usage reporter measures after a provider call returns, how those reports become usage records, and what the log line says.
---

# Recording what a call cost

Authorization reserves an upper bound. The recorded usage reports what actually happened, and it is what the organization is charged on.

`UsageReporter` builds one report per returned provider call. It prices the call at the rates for the endpoint that served it (see [Rates belong to an endpoint](PRICING-PER-ENDPOINT.md)) and does the arithmetic in `decimal.js` at 28-digit precision with round-half-even, so amounts match the Python implementation this replaced byte for byte. Rates are strings throughout for the same reason: a float loses money.

A reporter never throws. A failure to price something is logged and returns `undefined`, because a metering problem must not fail a request the user already paid for and received.

## The three reports

| Method | Rate it reads | What it counts |
|--------|---------------|----------------|
| `priceTextCall` | `pricing.text` | Prompt and completion tokens, priced separately, plus the cached and reasoning subsets |
| `priceImageCall` | `pricing.image` | One image, at the rate for its size and quality |
| `priceVideoCall` | `pricing.video` | Seconds for a per-second model, vendor video tokens for a token-metered one |

Every report carries both `purchasedFor` (what the provider charged Lixpi) and `soldToClientFor` (what the customer is charged). They are equal today; the two fields exist so a resale margin is a value change rather than a schema change.

`priceVideoCall` branches on `pricing.video.measuringUnit`. `seconds` is rate times duration. `tokens` is `totalTokens × price / pricePer`, with the token count threaded from the vendor's task response. An extension run also reports `inputVideoSeconds`, whole seconds rounded up, because vendors price a run with video input differently from one without.

## Reports become usage records

`usageRecordForTextCall`, `usageRecordForImageCall` and `usageRecordForVideoCall` map a report onto a `RecordedUsageRequest`: one record per provider call, carrying measured unit counts and no money. The metering backend owns pricing on that wire.

Two fields decide whether a charge lands on the right thing:

- `model` is `modelVersion`, the canonical vendor id. It must match what the authorization sent, and it is the key the backend's own pricing dataset is indexed by. The display id (`Provider:model`) is not interchangeable with it.
- `providerRequestId` is the vendor's request id, and the backend is idempotent on it. A retry after a timeout charges once.

Token counts follow one invariant the backend prices against, so providers are normalized before reporting: cached tokens are a subset of prompt tokens, and reasoning tokens a subset of completion tokens. They are reported separately because they are priced differently, not because they are extra.

## The log line

```text
[UsageMetering] recorded spend model=gpt-5.5 modality=tokens unit=tokens promptTokens=8123 completionTokens=612 charged=$0.041200 balance=$18.770000
```

`logRecordedSpend` prints the record's dimensions next to the charge and the resulting balance, so one run's authorization and its recorded spend read together off `docker logs lixpi-api`. Both lines share the `[UsageMetering]` tag, lead with model and modality, and put the unit count next to the unit it is counted in. Amounts from the backend arrive in micro-dollars and are shown in plain currency.

## Not published yet

The reports are built and logged. `usage.tokens.ai` is not wired up, so nothing is published on it: the `TODO` markers in `usage-reporter.ts` are where a publish call goes when that subject exists. The charge itself does not depend on it, since that travels over the metering subject.
