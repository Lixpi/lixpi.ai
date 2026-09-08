// Read-only projections of a catalog model, shared by the table and the detail
// panel so both describe a model the same way.

import { activeInferenceProviderPricing } from '@lixpi/constants'

import {
    type CatalogModel,
    type MergeStatus,
} from '$src/views/modelCatalog/types.ts'

export const STATUS_LABELS: Record<MergeStatus, string> = {
    'written-to-database': 'In database',
    'missing-required-fields': 'Incomplete',
    'skipped-by-catalog-index': 'Excluded',
}

// Green for a model that reaches the database, orange for one held out of it by a
// field nobody has filled in, blue for a deliberate exclusion. Orange rather than
// yellow because the theme's yellow status text is a dark amber meant for light
// backgrounds, which on this page reads as muted rather than as a flag.
export const STATUS_TONES: Record<MergeStatus, string> = {
    'written-to-database': 'status-green',
    'missing-required-fields': 'model-catalog-status-incomplete',
    'skipped-by-catalog-index': 'status-blue',
}

// Trailing build stamps carry no meaning in a list, so
// dreamina-seedance-2-5-260628 reads the same without its final stamp. Only a
// run of three or more digits is dropped, so gpt-image-2 keeps its digit.
export const shortModel = (model: string): string => String(model).replace(/-\d{3,}$/u, '')

export const modelTitle = (model: CatalogModel): string => String(model.model?.title ?? model.file.title ?? model.lixpi?.title ?? model.modelId)

export const modalityTitles = (model: CatalogModel): string[] => {
    const modalities = model.model?.modalities
        ?? model.file.modalities
        ?? []

    return Array.isArray(modalities)
        ? modalities.map((entry: any) => String(entry?.shortTitle ?? entry?.modality ?? '')).filter(Boolean)
        : []
}

export const formatNumber = (value: unknown): string => typeof value === 'number'
    && Number.isFinite(value)
    ? value.toLocaleString('en-US')
    : '—'

// The headline rate on the endpoint the platform calls, which is the rate this model
// is billed at. Every other endpoint's rates are in the detail panel. A model with
// none of them priced yet reads as a dash rather than as free.
export const pricingSummary = (model: CatalogModel): string => {
    const pricing = activeInferenceProviderPricing(model.model ?? undefined)
        ?? activeInferenceProviderPricing(model.file)
        ?? {} as Record<string, any>
    const currency = String(pricing.currency ?? 'USD')

    if (pricing.text?.tiers?.default) {
        const {
            prompt,
            completion,
        } = pricing.text.tiers.default

        return `${prompt ?? '?'} / ${completion ?? '?'} ${currency} per ${formatNumber(
            Number(pricing.text.pricePer),
        )}`
    }

    if (pricing.video?.price)
        return `${pricing.video.price} ${currency} per ${String(pricing.video.measuringUnit ?? 'unit')}`

    if (pricing.image) {
        const first = Object.values(pricing.image)[0] as Record<string, unknown> | undefined
        const rate = first ? Object.values(first)[0] : undefined

        return rate === undefined ? '—' : `${String(rate)} ${currency} per image`
    }

    return '—'
}

export const searchHaystack = (model: CatalogModel): string => [
    model.modelId,
    model.providerTitle,
    modelTitle(model),
    String(model.model?.modelVersion ?? model.file.modelVersion ?? ''),
    ...modalityTitles(model),
].join(' ').toLowerCase()
