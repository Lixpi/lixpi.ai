// Fixed values every metering surface shares.

// The only currency Lixpi bills in. Both wire messages carry it explicitly, so the
// backend never has to assume one.
export const METRICS_CURRENCY = 'USD'

// Micro-dollars are what the metering backend speaks; anything shown to a person is
// plain currency.
export const MICRO_DOLLARS_PER_USD = 1_000_000

// The margin applied to a measured prompt to cover the growth the caller cannot see
// at admission time. See ../documentation/SPEND-AUTHORIZATION.md.
export const UNMEASURED_PROMPT_GROWTH_FACTOR = 2
