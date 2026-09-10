import { applyStyle } from '@lixpi/ui-primitives/dom'

import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'
import { createGentelellaEmptyState } from '../emptyState/index.ts'

export type GentelellaProgressConfig = {
    className?: string
    color?: string
    document?: Document
    label?: string
    value?: number
}

export type GentelellaProgressInstance = GentelellaComponentInstance<HTMLDivElement> & {
    readonly barEl: HTMLDivElement
    setValue: (value: number) => void
}

class GentelellaProgress implements GentelellaProgressInstance {
    readonly barEl: HTMLDivElement
    readonly el: HTMLDivElement

    constructor(config: GentelellaProgressConfig) {
        const document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'div',
            gentelellaClasses.progress.thin,
            {
                attributes: {
                    'aria-label': config.label,
                    'aria-valuemax': 100,
                    'aria-valuemin': 0,
                    role: 'progressbar',
                },
                className: config.className,
                document,
            },
        )
        this.barEl = createGentelellaElement(
            'div',
            gentelellaClasses.progress.bar,
            { document },
        )

        if (config.color)
            applyStyle(this.barEl, { background: config.color })

        this.el.append(this.barEl)
        this.setValue(config.value ?? 0)
    }

    setValue(value: number): void {
        const boundedValue = Math.max(
            0,
            Math.min(100, value),
        )
        applyStyle(this.barEl, { width: `${boundedValue}%` })
        this.el.setAttribute(
            'aria-valuenow',
            String(boundedValue),
        )
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaProgress = (config: GentelellaProgressConfig = {}): GentelellaProgressInstance => new GentelellaProgress(config)

export type GentelellaLoadingBarConfig = {
    className?: string
    document?: Document
    label?: string
}

export const createGentelellaLoadingBar = (config: GentelellaLoadingBarConfig = {}): GentelellaComponentInstance<HTMLDivElement> =>
    createGentelellaComponentInstance(
        createGentelellaElement(
            'div',
            gentelellaClasses.loading.bar,
            {
                attributes: {
                    'aria-label': config.label ?? 'Loading',
                    role: 'progressbar',
                },
                className: config.className,
                document: config.document,
            },
        ),
    )

export type GentelellaSkeletonVariant = 'circle' | 'rectangle' | 'text' | 'text-large'

export type GentelellaSkeletonConfig = {
    className?: string
    document?: Document
    height?: number | string
    variant?: GentelellaSkeletonVariant
    width?: number | string
}

const SKELETON_VARIANT_CLASSES: Record<GentelellaSkeletonVariant, string> = {
    circle: gentelellaClasses.skeleton.circle,
    rectangle: gentelellaClasses.skeleton.rectangle,
    text: gentelellaClasses.skeleton.text,
    'text-large': combineGentelellaClassNames(gentelellaClasses.skeleton.text, gentelellaClasses.skeleton.textLarge),
}

export const createGentelellaSkeleton = (config: GentelellaSkeletonConfig = {}): GentelellaComponentInstance<HTMLSpanElement> => {
    const element = createGentelellaElement(
        'span',
        combineGentelellaClassNames(gentelellaClasses.skeleton.base, SKELETON_VARIANT_CLASSES[config.variant ?? 'text']),
        {
            attributes: { 'aria-hidden': true },
            className: config.className,
            document: config.document,
        },
    )

    applyStyle(
        element,
        {
            height: config.height === undefined
                ? undefined
                : typeof config.height === 'number'
                    ? `${config.height}px`
                    : config.height,
            width: config.width === undefined
                ? undefined
                : typeof config.width === 'number'
                    ? `${config.width}px`
                    : config.width,
        },
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaSkeletonTableConfig = {
    className?: string
    columns: number
    document?: Document
    rows?: number
}

export const createGentelellaSkeletonTable = (config: GentelellaSkeletonTableConfig): GentelellaComponentInstance<HTMLTableSectionElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'tbody',
        '',
        {
            attributes: {
                'aria-busy': true,
                'aria-label': 'Loading rows',
            },
            className: config.className,
            document,
        },
    )

    for (let rowIndex = 0; rowIndex < (config.rows ?? 4); rowIndex++) {
        const row = createGentelellaElement(
            'tr',
            '',
            { document },
        )

        for (let columnIndex = 0; columnIndex < config.columns; columnIndex++) {
            const cell = createGentelellaElement(
                'td',
                '',
                { document },
            )
            const width = `${45 + ((rowIndex * 17 + columnIndex * 13) % 40)}%`
            cell.append(createGentelellaSkeleton({
                document,
                width,
            }).el)
            row.append(cell)
        }

        element.append(row)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaTimelineTone = 'blue' | 'green' | 'primary' | 'red' | 'yellow'

export type GentelellaTimelineEntry = {
    description?: GentelellaContent
    time?: string
    title: GentelellaContent
    tone?: GentelellaTimelineTone
}

export type GentelellaTimelineConfig = {
    className?: string
    document?: Document
    entries: GentelellaTimelineEntry[]
}

export const createGentelellaTimeline = (config: GentelellaTimelineConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.timeline.base,
        {
            className: config.className,
            document,
        },
    )

    for (const entry of config.entries) {
        const item = createGentelellaElement(
            'div',
            combineGentelellaClassNames(gentelellaClasses.timeline.item, entry.tone ? `is-${entry.tone}` : ''),
            { document },
        )

        if (entry.time)
            item.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.timeline.time,
                    {
                        content: entry.time,
                        document,
                    },
                ),
            )

        item.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.timeline.title,
                {
                    content: entry.title,
                    document,
                },
            ),
        )

        if (entry.description)
            item.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.timeline.description,
                    {
                        content: entry.description,
                        document,
                    },
                ),
            )

        element.append(item)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaStepState = 'active' | 'complete' | 'pending'

export type GentelellaStepperItem = {
    description?: string
    label: string
    state?: GentelellaStepState
}

export type GentelellaStepperConfig = {
    className?: string
    document?: Document
    items: GentelellaStepperItem[]
}

export type GentelellaStepperInstance = GentelellaComponentInstance<HTMLOListElement> & {
    setActiveIndex: (index: number) => void
}

class GentelellaStepper implements GentelellaStepperInstance {
    readonly el: HTMLOListElement

    private readonly steps: HTMLLIElement[]

    constructor(config: GentelellaStepperConfig) {
        const document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'ol',
            'stepper',
            {
                className: config.className,
                document,
            },
        )
        this.steps = config.items.map((item, index) => {
            const step = createGentelellaElement(
                'li',
                'step',
                {
                    attributes: { 'aria-current': item.state === 'active' ? 'step' : undefined },
                    className: item.state === 'complete' ? gentelellaClasses.state.done : item.state,
                    document,
                },
            )
            const number = createGentelellaElement(
                'span',
                'num',
                {
                    content: index + 1,
                    document,
                },
            )
            const label = createGentelellaElement(
                'span',
                'label',
                {
                    content: item.label,
                    document,
                },
            )
            step.append(number, label)

            if (item.description)
                step.append(
                    createGentelellaElement(
                        'span',
                        'desc',
                        {
                            content: item.description,
                            document,
                        },
                    ),
                )

            this.el.append(step)

            return step
        })
    }

    setActiveIndex(activeIndex: number): void {
        this.steps.forEach((step, index) => {
            step.classList.toggle(gentelellaClasses.state.active, index === activeIndex)
            step.classList.toggle(gentelellaClasses.state.done, index < activeIndex)

            if (index === activeIndex)
                step.setAttribute('aria-current', 'step')
            else
                step.removeAttribute('aria-current')
        })
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaStepper = (config: GentelellaStepperConfig): GentelellaStepperInstance => new GentelellaStepper(config)

export type GentelellaWizardStep = {
    content: GentelellaContent
    label: string
}

export type GentelellaWizardConfig = {
    className?: string
    document?: Document
    initialStep?: number
    onStepChange?: (index: number) => void
    steps: GentelellaWizardStep[]
}

export type GentelellaWizardInstance = GentelellaComponentInstance<HTMLDivElement> & {
    next: () => void
    previous: () => void
    setStep: (index: number) => void
}

class GentelellaWizard implements GentelellaWizardInstance {
    readonly el: HTMLDivElement

    private activeIndex: number
    private readonly panels: HTMLElement[]
    private readonly stepper: GentelellaStepperInstance

    constructor(private readonly config: GentelellaWizardConfig) {
        const document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'div',
            '',
            {
                className: config.className,
                document,
            },
        )
        this.stepper = createGentelellaStepper({
            document,
            items: config.steps.map(step => ({ label: step.label })),
        })
        this.panels = config.steps.map((step, index) => {
            const panel = createGentelellaElement(
                'section',
                'wizard-panel',
                {
                    attributes: {
                        'aria-label': step.label,
                        'data-step': index,
                    },
                    content: step.content,
                    document,
                },
            )
            this.el.append(panel)

            return panel
        })
        this.el.prepend(this.stepper.el)
        this.activeIndex = config.initialStep ?? 0
        this.setStep(this.activeIndex)
    }

    setStep(index: number): void {
        this.activeIndex = Math.max(
            0,
            Math.min(this.config.steps.length - 1, index),
        )
        this.stepper.setActiveIndex(this.activeIndex)
        this.panels.forEach((panel, panelIndex) => void (panel.hidden = panelIndex !== this.activeIndex))
        this.config.onStepChange?.(this.activeIndex)
    }

    next(): void {
        this.setStep(this.activeIndex + 1)
    }

    previous(): void {
        this.setStep(this.activeIndex - 1)
    }

    destroy(): void {
        this.stepper.destroy()
        this.el.remove()
    }
}

export const createGentelellaWizard = (config: GentelellaWizardConfig): GentelellaWizardInstance => new GentelellaWizard(config)

export type GentelellaAsyncRegionState =
    | {
        content: GentelellaContent
        type: 'content'
    }
    | {
        action?: GentelellaContent
        description?: string
        title: string
        type: 'empty'
    }
    | {
        action?: GentelellaContent
        message: string
        type: 'error'
    }
    | {
        columns?: number
        rows?: number
        type: 'loading'
    }

export type GentelellaAsyncRegionConfig = {
    className?: string
    document?: Document
    state: GentelellaAsyncRegionState
}

export type GentelellaAsyncRegionInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setState: (state: GentelellaAsyncRegionState) => void
}

class GentelellaAsyncRegion implements GentelellaAsyncRegionInstance {
    readonly el: HTMLDivElement

    private readonly document: Document

    constructor(config: GentelellaAsyncRegionConfig) {
        this.document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'div',
            '',
            {
                attributes: { 'aria-live': 'polite' },
                className: config.className,
                document: this.document,
            },
        )
        this.setState(config.state)
    }

    setState(state: GentelellaAsyncRegionState): void {
        this.el.replaceChildren()
        this.el.removeAttribute('aria-busy')

        if (state.type === 'content') {
            appendGentelellaContent(this.el, state.content)

            return
        }

        if (state.type === 'empty') {
            this.el.append(
                createGentelellaEmptyState({
                    action: state.action,
                    description: state.description,
                    document: this.document,
                    title: state.title,
                }).el,
            )

            return
        }

        if (state.type === 'error') {
            const alert = createGentelellaElement(
                'div',
                combineGentelellaClassNames(gentelellaClasses.banner.base, gentelellaClasses.banner.danger),
                {
                    attributes: { role: 'alert' },
                    document: this.document,
                },
            )
            alert.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.banner.body,
                    {
                        content: state.message,
                        document: this.document,
                    },
                ),
            )
            appendGentelellaContent(alert, state.action)
            this.el.append(alert)

            return
        }

        this.el.setAttribute('aria-busy', 'true')
        const table = createGentelellaElement(
            'table',
            gentelellaClasses.table.base,
            { document: this.document },
        )
        table.append(createGentelellaSkeletonTable({
            columns: state.columns ?? 4,
            document: this.document,
            rows: state.rows,
        }).el)
        this.el.append(table)
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaAsyncRegion = (config: GentelellaAsyncRegionConfig): GentelellaAsyncRegionInstance => new GentelellaAsyncRegion(config)
