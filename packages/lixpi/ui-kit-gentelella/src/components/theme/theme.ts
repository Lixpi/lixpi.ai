import {
    ElementStyleLease,
    applyCssCustomProperties,
} from '@lixpi/ui-primitives/dom'

import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    type GentelellaContent,
} from '../../content.ts'
import {
    type GentelellaThemeToken,
} from '../../inventory.ts'
import { createGentelellaColorSwatches } from '../formControls/index.ts'

export {
    GENTELELLA_THEME_TOKENS,
    type GentelellaThemeToken,
} from '../../inventory.ts'

export type GentelellaThemeValues = Partial<Record<GentelellaThemeToken, string>>

export const applyGentelellaTheme = (
    element: HTMLElement,
    values: GentelellaThemeValues,
): void => void applyCssCustomProperties(element, values)

export type GentelellaThemePreviewConfig = {
    className?: string
    content: GentelellaContent
    document?: Document
    values?: GentelellaThemeValues
}

export type GentelellaThemePreviewInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setValues: (values: GentelellaThemeValues) => void
}

class GentelellaThemePreview implements GentelellaThemePreviewInstance {
    readonly el: HTMLDivElement

    private lease: ElementStyleLease | null = null

    constructor(config: GentelellaThemePreviewConfig) {
        this.el = createGentelellaElement(
            'div',
            'theme-preview',
            {
                className: config.className,
                content: config.content,
                document: config.document,
            },
        )
        this.setValues(config.values ?? {})
    }

    setValues(values: GentelellaThemeValues): void {
        this.lease?.destroy()
        this.lease = new ElementStyleLease(
            this.el,
            Object.fromEntries(
                Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined),
            ),
        )
    }

    destroy(): void {
        this.lease?.destroy()
        this.lease = null
        this.el.remove()
    }
}

export const createGentelellaThemePreview = (config: GentelellaThemePreviewConfig): GentelellaThemePreviewInstance =>
    new GentelellaThemePreview(config)

export type GentelellaThemeSwatch = {
    color: string
    label: string
    values: GentelellaThemeValues
}

export type GentelellaThemeSwatchesConfig = {
    className?: string
    document?: Document
    onChange?: (swatch: GentelellaThemeSwatch) => void
    swatches: GentelellaThemeSwatch[]
}

export const createGentelellaThemeSwatches = (config: GentelellaThemeSwatchesConfig): GentelellaComponentInstance<HTMLDivElement> =>
    createGentelellaColorSwatches({
        ariaLabel: 'Theme palette',
        className: `theme-swatches ${config.className ?? ''}`.trim(),
        document: config.document,
        onChange: value => {
            const swatch = config.swatches[Number(value)]

            if (swatch)
                config.onChange?.(swatch)
        },
        swatches: config.swatches.map(
            (swatch, index) => ({
                color: swatch.color,
                label: swatch.label,
                value: String(index),
            }),
        ),
    })

export type GentelellaTooltipConfig = {
    className?: string
    content: GentelellaContent
    document?: Document
    position?: 'bottom' | 'left' | 'right' | 'top'
    tooltip: string
}

export const createGentelellaTooltip = (config: GentelellaTooltipConfig): GentelellaComponentInstance<HTMLSpanElement> =>
    createGentelellaComponentInstance(
        createGentelellaElement(
            'span',
            '',
            {
                attributes: {
                    'data-tooltip': config.tooltip,
                    'data-tooltip-pos': config.position,
                },
                className: config.className,
                content: config.content,
                document: config.document,
            },
        ),
    )
