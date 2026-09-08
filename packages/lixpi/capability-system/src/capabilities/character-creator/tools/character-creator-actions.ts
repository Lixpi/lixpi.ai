import {
    type CapabilityJsonValue,
    type ExecutionTraceHandle,
} from '@lixpi/constants'

import {
    type CapabilityActionExecutionContext,
    type CapabilityActionRegistry,
    type CapabilityActionValidationResult,
} from '../../../backend/capability-action-registry.ts'
import { CapabilityError } from '../../../shared/capability-errors.ts'
import {
    assertValidCharacterSheetRenderPlan,
    buildCharacterSheetRenderPlan,
} from '../shared/character-sheet-media-plan.ts'
import { CHARACTER_CREATOR_CAPABILITY_IDS } from './character-creator-definition.ts'
import { characterCreatorSettings } from '../settings.ts'

export type CharacterCreatorActionDependencies = Record<never, never>

export const registerCharacterCreatorActions = (
    registry: CapabilityActionRegistry,
    _dependencies: CharacterCreatorActionDependencies = {},
): void => {
    registerIfMissing(
        registry,
        {
            key: 'character.validate-request',
            timeoutMs: characterCreatorSettings.actionTimeoutsMs.validateRequest,
            validateInput: validateObject,
            validateOutput: validateObject,
            authorize: authorizeCharacterCreator,
            execute: (input, context) => {
                const request = validateCharacterCreatorRequest(input)
                context.trace.addFact(
                    'Prompt characters',
                    String(request.prompt.length),
                )
                context.trace.addFact(
                    'Accepted references',
                    String(request.referenceAssetIds.length),
                )

                return request
            },
            classifyRetry: () => 'terminal',
            collectInputHandles: input => characterReferenceHandles(input.referenceAssetIds),
            summarizeInput: input => `Checking a ${stringLength(input.prompt)}-character request with ${formatReferenceCount(
                arrayLength(input.referenceAssetIds),
            )}.`,
            summarizeOutput: output => `Request valid. ${formatReferenceCount(
                arrayLength(asRecord(output)?.referenceAssetIds),
            )} accepted for character planning.`,
        },
    )
    registerIfMissing(
        registry,
        {
            key: 'character.build-render-plan',
            timeoutMs: characterCreatorSettings.actionTimeoutsMs.buildRenderPlan,
            validateInput: validateObject,
            validateOutput: validatePlanOutput,
            authorize: authorizeCharacterCreator,
            execute: (input, context) => buildPlanOutput(input, context),
            classifyRetry: () => 'terminal',
            collectInputHandles: input => characterReferenceHandles(input.referenceAssetIds),
            summarizeInput: input => `Building the character-shot graph from ${formatReferenceCount(
                arrayLength(input.referenceAssetIds),
            )}.`,
            summarizeOutput: output =>
                `Render plan ready: ${arrayLength(asRecord(asRecord(output)?.capabilityMediaExecutionPlan)?.panels)} shot(s). The portrait, front full-body, and back full-body anchors run sequentially before optional shots are released; one provider attempt per shot.`,
        },
    )
}

// Asset titles are resolved by the client from its Asset store, so the durable
// handle carries the Asset identity and a readable fallback rather than a title
// that could drift after the trace is sealed.
const characterReferenceHandles = (value: unknown): ExecutionTraceHandle[] => {
    if (!Array.isArray(value))
        return []

    return value.flatMap(
        assetId =>
            typeof assetId === 'string'
                && assetId.trim()
                ? [{
                    kind: 'media' as const,
                    id: assetId,
                    displayName: assetId,
                    mediaKind: 'image' as const,
                    role: 'character-reference',
                }]
                : [],
    )
}

const buildPlanOutput = (
    input: Readonly<Record<string, unknown>>,
    context: CapabilityActionExecutionContext,
): Record<string, CapabilityJsonValue> => {
    const plan = buildCharacterSheetRenderPlan({
        capabilityRunId: context.runId,
        sourceAssetIds: readStringArray(
            input.referenceAssetIds,
            'referenceAssetIds',
            true,
        ),
        userPrompt: readString(input.prompt, 'prompt'),
    })
    context.trace.addFact(
        'Planned shots',
        String(plan.panels.length),
    )

    for (const panel of plan.panels) {
        context.trace.addFact(panel.panelId, panel.title)
    }

    return {
        mediaGenerationMode: 'character-creator',
        preserveUserPrompt: true,
        capabilityMediaExecutionPlan: plan as unknown as CapabilityJsonValue,
    }
}

const validateCharacterCreatorRequest = (input: Readonly<Record<string, unknown>>): {
    prompt: string
    referenceAssetIds: string[]
} => {
    const prompt = readString(input.prompt, 'prompt').trim()

    if (prompt.length > 8000)
        throw new CapabilityError('CAPABILITY_ACTION_INPUT_INVALID', 'Character prompt exceeds 8000 characters')

    const referenceAssetIds = [...new Set(
        readStringArray(
            input.referenceAssetIds,
            'referenceAssetIds',
            true,
        ),
    )]

    if (referenceAssetIds.length > 8)
        throw new CapabilityError('CAPABILITY_ACTION_INPUT_INVALID', 'Character Creator accepts at most 8 reference Assets')

    return {
        prompt,
        referenceAssetIds,
    }
}

const authorizeCharacterCreator = (context: { rootCapabilityId: string }): boolean =>
    context.rootCapabilityId === CHARACTER_CREATOR_CAPABILITY_IDS.tool

const registerIfMissing = (
    registry: CapabilityActionRegistry,
    definition: Parameters<CapabilityActionRegistry['register']>[0],
): void => {
    if (!registry.has(definition.key))
        registry.register(definition)
}

const validateObject = (input: unknown): CapabilityActionValidationResult => {
    return asRecord(input)
        ? { valid: true }
        : {
            valid: false,
            message: 'Value must be an object',
        }
}

const validatePlanOutput = (output: unknown): CapabilityActionValidationResult => {
    const record = asRecord(output)

    if (
        record?.mediaGenerationMode !== 'character-creator'
        || record.preserveUserPrompt !== true
    )
        return {
            valid: false,
            message: 'Output must contain a Character Sheet media execution plan',
        }

    try {
        assertValidCharacterSheetRenderPlan(record.capabilityMediaExecutionPlan)

        return { valid: true }
    } catch {
        return {
            valid: false,
            message: 'Output must contain a Character Sheet media execution plan',
        }
    }
}

const readString = (
    value: unknown,
    field: string,
): string => {
    if (
        typeof value !== 'string'
        || !value.trim()
    )
        throw new CapabilityError('CAPABILITY_ACTION_INPUT_INVALID', `${field} must be a non-empty string`)

    return value
}

const readStringArray = (
    value: unknown,
    field: string,
    optional: boolean,
): string[] => {
    if (
        value === undefined
        && optional
    )
        return []

    if (
        !Array.isArray(value)
        || value.some(item => typeof item !== 'string' || !item.trim())
    )
        throw new CapabilityError('CAPABILITY_ACTION_INPUT_INVALID', `${field} must be an array of non-empty strings`)

    return value as string[]
}

const asRecord = (value: unknown): Record<string, any> | undefined => {
    return value
        && typeof value === 'object'
        && !Array.isArray(value)
        ? value as Record<string, any>
        : undefined
}

const stringLength = (value: unknown): number => (typeof value === 'string' ? value.length : 0)

const arrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0)

const formatReferenceCount = (count: number): string => `${count} reference Asset${count === 1 ? '' : 's'}`
