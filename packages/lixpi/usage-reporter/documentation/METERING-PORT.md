---
title: The metering port
description: The two-call wire contract shared with the hosted metering backend, how UsageMeteringClient behaves when it is off or unreachable, and the rules for changing any of it.
---

# The metering port

Lixpi does not run the metering backend. Balances, pricing and the ledger live in a hosted service in a separate repository, and this package talks to it over two NATS subjects.

| Subject | Called | Carries |
|---------|--------|---------|
| `METRICS_SUBJECTS.USAGE_CHECK` | `authorizeSpend`, before a paid provider call | The org, the model, the modality, an upper-bound unit count |
| `METRICS_SUBJECTS.USAGE_CONFIRM` | `recordSpend`, after it returns | The measured unit counts for that one call |

Both are request/reply, not fire and forget. Authorization is a spend guard, so the run waits for the answer.

The subject names still say check and confirm because they are the backend's, and renaming them would break the wire. Everything on this side is named for what it does.

## The wire contract

`src/usage-metering-contract.ts` holds the shapes: `SpendAuthorizationRequest`, `SpendAuthorizationResponse`, `RecordedUsageRequest`, `RecordedUsageResponse`, `MeasuredUsage`, and the `MeteredModality` and `BillingUnit` vocabularies. The subjects themselves live in `@lixpi/constants` (`nats-subjects.json`, `METRICS_SUBJECTS`), because every subject in the system is listed there.

**This is a cross-repo contract.** The hosted backend mirrors these messages and they must stay byte-compatible on the wire, field names and all. The TypeScript names here are local and were chosen for readability; the JSON they serialize to is unchanged. Do not change them without explicit allowance from the repository owner, and when a change is allowed, mirror it in the backend in the same change and release both together. A one-sided change does not fail loudly. It silently misprices or drops charges, which is the worst way for a billing path to break.

Lixpi sends unit counts and never money. The split in `MeasuredUsage` (prompt against completion, image size and quality, video seconds against video tokens) is what lets the backend price accurately, so it is dimensioned rather than flattened to a single number.

## UsageMeteringClient

`UsageMeteringClient` is the hosted binding of that port. It takes a `UsageMeteringTransport`, which is the smallest slice of the NATS service it needs: one request/reply method. Depending on that interface instead of the singleton is what keeps it unit-testable.

```typescript
import { UsageMeteringClient, usageMeteringOptionsFromEnv } from '@lixpi/usage-reporter'

const usageMetering = new UsageMeteringClient(natsService, usageMeteringOptionsFromEnv())
```

| Variable | Default | Effect |
|----------|---------|--------|
| `METRICS_ENABLED` | `false` | `true` turns metering on. Anything else runs the plug. |
| `METRICS_REQUEST_TIMEOUT_MS` | `3000` | Timeout on both calls. |
| `METRICS_FAIL_OPEN` | unset | `true` allows a run when the backend cannot be reached. |

### Disabled is a plug, not a stub

With `enabled: false` every spend is authorized and recording is a no-op, and neither touches the network. That is how the open-source build runs with no metering backend at all: the calling code is identical whether or not anyone is billing.

### Unreachable denies the spend

When `authorizeSpend` errors or times out, the client denies the run and answers `reason: 'metrics_unreachable'`. Protecting the balance is worth blocking on an unreachable backend. `METRICS_FAIL_OPEN=true` reverses that trade, accepting overspend risk for availability, and flips `denySpendWhenUnreachable` off.

`recordSpend` is different: a failure is logged and swallowed. The user's request already completed, and failing it afterwards helps nobody. The call can be retried, because the backend is idempotent on `providerRequestId`.
