import {
    estimateSpendForRun,
    type SpendEstimate,
    type MeteredAiModel,
} from '@lixpi/usage-reporter'

import {
    type ProviderState,
} from '../graph/state.ts'
import { getSystemPrompt } from '../prompts/load-prompts.ts'
import { estimateInputTokens } from '../providers/provider-input-budget.ts'

// The graph run, told to metering in metering's own terms. What a run is worth is
// @lixpi/usage-reporter's question; what a run contains is this service's, so the
// prompt is measured here with the provider's own tokenizer and handed over as a
// number.
export const estimateSpendForGraphRun = (state: ProviderState): SpendEstimate => {
    // Reproduces getSystemPrompt(hasImageModel, hasVideoModel) as the reasoning
    // adapters call it. The image and video instruction blocks dwarf the base
    // prompt, so omitting them when a media model is attached would understate the
    // prompt by thousands of tokens.
    const promptTokensMeasured = estimateInputTokens({
        messages: state.messages ?? [],
        systemPrompt: getSystemPrompt(!!state.imageModelVersion, !!state.videoModelVersion),
    }).inputTokens

    return estimateSpendForRun({
        model: state.aiModelMetaInfo as MeteredAiModel,
        promptTokensMeasured,
        maxCompletionSize: state.maxCompletionSize,
        videoResolution: state.videoResolution,
        videoAspectRatio: state.videoAspectRatio,
        videoDurationSeconds: state.videoDurationSeconds,
        videoSourceForExtension: state.videoSourceForExtension,
        videoSourceDurationSeconds: state.videoSourceDurationSeconds,
    })
}
