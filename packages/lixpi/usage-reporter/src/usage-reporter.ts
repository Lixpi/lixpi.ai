import { Decimal } from 'decimal.js'

import { warn } from '@lixpi/debug-tools'

import { pricingForCalledInferenceProvider } from './model-pricing.ts'
import {
    type MeteredAiModel,
    type TokenUsageCounts,
    type UsageEventMeta,
} from './types.ts'

// Matches the Python Decimal defaults this replaced (28 digits, round half even),
// so amounts stay byte-identical. decimal.js would otherwise use 20.
Decimal.set({
    precision: 28,
    rounding: Decimal.ROUND_HALF_EVEN,
})

export type TextCallSpend = {
    eventMeta: UsageEventMeta
    aiModel: string
    modelVersion: string // canonical vendor id for the metering backend (aiModel is the display id)
    aiVendorRequestId: string
    aiRequestReceivedAt: number
    aiRequestFinishedAt: number
    textPricePer: string
    textPromptPrice: string
    textCompletionPrice: string
    textPromptPriceResale: string
    textCompletionPriceResale: string
    prompt: {
        usageTokens: number
        cachedTokens: number
        audioTokens: number
        purchasedFor: string
        soldToClientFor: string
    }
    completion: {
        usageTokens: number
        reasoningTokens: number
        audioTokens: number
        purchasedFor: string
        soldToClientFor: string
    }
    total: {
        usageTokens: number
        purchasedFor: string
        soldToClientFor: string
    }
}

export type ImageCallSpend = {
    eventMeta: UsageEventMeta
    aiModel: string
    modelVersion: string // canonical vendor id for the metering backend (aiModel is the display id)
    aiVendorRequestId: string
    aiRequestReceivedAt: number
    aiRequestFinishedAt: number
    image: {
        size: string
        quality: string
        count: number
        pricePerImage: string
        pricePerImageResale: string
        purchasedFor: string
        soldToClientFor: string
    }
}

export type VideoCallSpend = {
    eventMeta: UsageEventMeta
    aiModel: string
    modelVersion: string // canonical vendor id for the metering backend (aiModel is the display id)
    aiVendorRequestId: string
    aiRequestReceivedAt: number
    aiRequestFinishedAt: number
    video: {
        measuringUnit: string
        durationSeconds: number
        resolution: string
        aspectRatio: string
        // Per-second metered (VEO).
        pricePerSecond?: string
        pricePerSecondResale?: string
        // Token metered (Seedance via ModelArk).
        totalTokens?: number
        completionTokens?: number
        pricePer?: string
        price?: string
        // Whole seconds of source video fed into the generation, rounded up.
        // Absent means text-to-video. Vendors price the two differently.
        inputVideoSeconds?: number
        purchasedFor: string
        soldToClientFor: string
    }
}

// Rates and counts arrive as strings, numbers or nothing at all, so every one of
// them goes through here before any arithmetic touches it.
const decimal = (
    value: unknown,
    fallback: string = '0',
): Decimal => new Decimal(value == null ? fallback : String(value))

export class UsageReporter {
    // Prices one returned call. Nothing is published yet: see the TODOs below and
    // ../documentation/RECORDED-SPEND.md.
    priceTextCall(args: {
        eventMeta: UsageEventMeta
        aiModelMetaInfo: MeteredAiModel
        aiVendorRequestId: string
        aiVendorModelName: string
        usage: Partial<TokenUsageCounts>
        aiRequestReceivedAt: number
        aiRequestFinishedAt: number
    }): TextCallSpend | undefined {
        try {
            const {
                aiModelMetaInfo,
                usage,
                eventMeta,
                aiVendorRequestId,
                aiRequestReceivedAt,
                aiRequestFinishedAt,
            } = args
            const pricing: Record<string, any> = pricingForCalledInferenceProvider(aiModelMetaInfo) ?? {}
            const pricePer = decimal(pricing.text?.pricePer, '1000000')
            const tiers = pricing.text?.tiers?.default ?? {}
            const promptPrice = decimal(tiers.prompt, '0')
            const completionPrice = decimal(tiers.completion, '0')

            const promptTokens = usage.promptTokens ?? 0
            const completionTokens = usage.completionTokens ?? 0
            const totalTokens = usage.totalTokens ?? 0

            const promptPurchased = promptPrice.div(pricePer).mul(
                decimal(promptTokens),
            )
            const promptSold = promptPrice.div(pricePer).mul(
                decimal(promptTokens),
            )
            const completionPurchased = completionPrice.div(pricePer).mul(
                decimal(completionTokens),
            )
            const completionSold = completionPrice.div(pricePer).mul(
                decimal(completionTokens),
            )
            const totalPurchased = promptPurchased.plus(completionPurchased)
            const totalSold = promptSold.plus(completionSold)

            const spend: TextCallSpend = {
                eventMeta,
                aiModel: `${aiModelMetaInfo.provider}:${aiModelMetaInfo.model}`,
                modelVersion: aiModelMetaInfo.modelVersion ?? '',
                aiVendorRequestId,
                aiRequestReceivedAt,
                aiRequestFinishedAt,
                textPricePer: pricePer.toString(),
                textPromptPrice: promptPrice.toString(),
                textCompletionPrice: completionPrice.toString(),
                textPromptPriceResale: promptPrice.toString(),
                textCompletionPriceResale: completionPrice.toString(),
                prompt: {
                    usageTokens: promptTokens,
                    cachedTokens: usage.promptCachedTokens ?? 0,
                    audioTokens: usage.promptAudioTokens ?? 0,
                    purchasedFor: promptPurchased.toString(),
                    soldToClientFor: promptSold.toString(),
                },
                completion: {
                    usageTokens: completionTokens,
                    reasoningTokens: usage.completionReasoningTokens ?? 0,
                    audioTokens: usage.completionAudioTokens ?? 0,
                    purchasedFor: completionPurchased.toString(),
                    soldToClientFor: completionSold.toString(),
                },
                total: {
                    usageTokens: totalTokens,
                    purchasedFor: totalPurchased.toString(),
                    soldToClientFor: totalSold.toString(),
                },
            }

            // TODO: publish to NATS once usage.tokens.ai subject is wired up.
            return spend
        } catch (error) {
            warn(`Failed to price a text call: ${error}`)

            return undefined
        }
    }

    priceImageCall(args: {
        eventMeta: UsageEventMeta
        aiModelMetaInfo: MeteredAiModel
        aiVendorRequestId: string
        imageSize: string
        imageQuality: string
        aiRequestReceivedAt: number
        aiRequestFinishedAt: number
    }): ImageCallSpend | undefined {
        try {
            const {
                eventMeta,
                aiModelMetaInfo,
                aiVendorRequestId,
                imageSize,
                imageQuality,
                aiRequestReceivedAt,
                aiRequestFinishedAt,
            } = args
            const pricing: Record<string, any> = pricingForCalledInferenceProvider(aiModelMetaInfo) ?? {}
            const imageRates = pricing.image ?? {}
            const ratesForSize = imageRates[imageSize]
                ?? imageRates.default
                ?? {}
            const qualityKey = imageQuality in ratesForSize ? imageQuality : 'high'
            const pricePerImage = decimal(ratesForSize[qualityKey], '0.04')

            const spend: ImageCallSpend = {
                eventMeta,
                aiModel: `${aiModelMetaInfo.provider}:${aiModelMetaInfo.model}`,
                modelVersion: aiModelMetaInfo.modelVersion ?? '',
                aiVendorRequestId,
                aiRequestReceivedAt,
                aiRequestFinishedAt,
                image: {
                    size: imageSize,
                    quality: imageQuality,
                    count: 1,
                    pricePerImage: pricePerImage.toString(),
                    pricePerImageResale: pricePerImage.toString(),
                    purchasedFor: pricePerImage.toString(),
                    soldToClientFor: pricePerImage.toString(),
                },
            }

            // TODO: publish to NATS once usage.images.ai subject is wired up.
            return spend
        } catch (error) {
            warn(`Failed to price an image call: ${error}`)

            return undefined
        }
    }

    // Per second (VEO) or per vendor token (Seedance), branching on
    // pricing.video.measuringUnit so a token-metered provider needs no new caller.
    priceVideoCall(args: {
        eventMeta: UsageEventMeta
        aiModelMetaInfo: MeteredAiModel
        aiVendorRequestId: string
        durationSeconds: number
        resolution: string
        aspectRatio: string
        totalTokens?: number
        completionTokens?: number
        inputVideoSeconds?: number
        aiRequestReceivedAt: number
        aiRequestFinishedAt: number
    }): VideoCallSpend | undefined {
        try {
            const {
                eventMeta,
                aiModelMetaInfo,
                aiVendorRequestId,
                durationSeconds,
                resolution,
                aspectRatio,
                totalTokens,
                completionTokens,
                inputVideoSeconds,
                aiRequestReceivedAt,
                aiRequestFinishedAt,
            } = args
            const pricing: Record<string, any> = pricingForCalledInferenceProvider(aiModelMetaInfo) ?? {}
            const videoRates = pricing.video ?? {}
            const measuringUnit = videoRates.measuringUnit ?? 'seconds'
            const price = decimal(videoRates.price, '0')

            const video: VideoCallSpend['video'] = {
                measuringUnit,
                durationSeconds: Number(durationSeconds) || 0,
                resolution,
                aspectRatio,
                // Whole seconds, rounded up, per the metrics contract.
                ...(typeof inputVideoSeconds === 'number'
                    && inputVideoSeconds > 0
                    ? { inputVideoSeconds: Math.ceil(inputVideoSeconds) }
                    : {}),
                purchasedFor: '0',
                soldToClientFor: '0',
            }

            let purchasedFor: Decimal
            let soldFor: Decimal

            if (measuringUnit === 'tokens') {
                // total_tokens × price / pricePer (per-1M-token resource packs).
                const pricePer = decimal(videoRates.pricePer, '1000000')
                const tokens = decimal(totalTokens, '0')
                purchasedFor = price.div(pricePer).mul(tokens)
                soldFor = price.div(pricePer).mul(tokens)
                video.totalTokens = Number(totalTokens) || 0
                video.completionTokens = Number(completionTokens) || 0
                video.price = price.toString()
                video.pricePer = pricePer.toString()
            } else {
                // Seconds (VEO): price per second times duration.
                const seconds = decimal(durationSeconds, '0')
                purchasedFor = price.mul(seconds)
                soldFor = price.mul(seconds)
                video.pricePerSecond = price.toString()
                video.pricePerSecondResale = price.toString()
            }

            video.purchasedFor = purchasedFor.toString()
            video.soldToClientFor = soldFor.toString()

            const spend: VideoCallSpend = {
                eventMeta,
                aiModel: `${aiModelMetaInfo.provider}:${aiModelMetaInfo.model}`,
                modelVersion: aiModelMetaInfo.modelVersion ?? '',
                aiVendorRequestId,
                aiRequestReceivedAt,
                aiRequestFinishedAt,
                video,
            }

            // TODO: publish to NATS once usage.videos.ai subject is wired up.
            return spend
        } catch (error) {
            warn(`Failed to price a video call: ${error}`)

            return undefined
        }
    }
}
