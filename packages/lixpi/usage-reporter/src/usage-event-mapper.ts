import { METRICS_CURRENCY } from './constants.ts'
import {
    type RecordedUsageRequest,
} from './usage-metering-contract.ts'
import {
    type TextCallSpend,
    type ImageCallSpend,
    type VideoCallSpend,
} from './usage-reporter.ts'

// Priced calls to usage records: one record per provider call, carrying measured
// unit counts and no money. See ../documentation/RECORDED-SPEND.md.

// The fields every priced call carries, whatever it produced.
type CallSpendIdentity = {
    eventMeta: {
        organizationId?: string
        userId?: string
        workspaceId?: string
        [k: string]: unknown
    }
    aiVendorRequestId: string
    modelVersion: string // canonical vendor id: must match what the authorization sent, and the LiteLLM dataset key
    aiRequestFinishedAt: number
}

const sharedRecordFields = (
    call: CallSpendIdentity,
    workflowId: string,
    workflowSeq: number,
) => ({
    providerRequestId: call.aiVendorRequestId,
    orgId: call.eventMeta?.organizationId ?? '',
    userId: call.eventMeta?.userId ?? '',
    workspaceId: call.eventMeta?.workspaceId,
    workflowId,
    workflowSeq,
    model: call.modelVersion,
    currency: METRICS_CURRENCY,
    occurredAt: new Date(call.aiRequestFinishedAt || Date.now()).toISOString(),
})

export const usageRecordForTextCall = (
    call: TextCallSpend,
    workflowId: string,
    workflowSeq: number,
): RecordedUsageRequest => {
    return {
        ...sharedRecordFields(
            call,
            workflowId,
            workflowSeq,
        ),
        modality: 'tokens',
        measuringUnit: 'tokens',
        usage: {
            promptTokens: call.prompt.usageTokens,
            completionTokens: call.completion.usageTokens,
            cachedTokens: call.prompt.cachedTokens,
            reasoningTokens: call.completion.reasoningTokens,
        },
    }
}

export const usageRecordForImageCall = (
    call: ImageCallSpend,
    workflowId: string,
    workflowSeq: number,
): RecordedUsageRequest => {
    return {
        ...sharedRecordFields(
            call,
            workflowId,
            workflowSeq,
        ),
        modality: 'image',
        measuringUnit: 'images',
        usage: {
            imageCount: call.image.count,
            imageSize: call.image.size,
            imageQuality: call.image.quality,
        },
    }
}

export const usageRecordForVideoCall = (
    call: VideoCallSpend,
    workflowId: string,
    workflowSeq: number,
): RecordedUsageRequest => {
    const video = call.video

    // Seconds of source video fed in. Omitted for text-to-video, which is what
    // absent means on the wire. The backend prices a run with video input at a
    // different rate from one without, so this selects the tariff.
    const inputVideoFields = typeof video.inputVideoSeconds === 'number'
        && video.inputVideoSeconds > 0
        ? { inputVideoSeconds: video.inputVideoSeconds }
        : {}

    // Token-metered (Seedance) or per-second (VEO). The modality stays 'video' either
    // way; only the unit and the dimensions differ.
    if (video.measuringUnit === 'tokens') {
        return {
            ...sharedRecordFields(
                call,
                workflowId,
                workflowSeq,
            ),
            modality: 'video',
            measuringUnit: 'tokens',
            usage: {
                videoTokens: video.totalTokens ?? 0,
                ...inputVideoFields,
            },
        }
    }

    return {
        ...sharedRecordFields(
            call,
            workflowId,
            workflowSeq,
        ),
        modality: 'video',
        measuringUnit: 'seconds',
        usage: {
            durationSeconds: video.durationSeconds,
            resolution: video.resolution,
            ...inputVideoFields,
        },
    }
}
