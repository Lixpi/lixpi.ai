import { applyStyle } from '@lixpi/ui-primitives/dom'

import { initCharts } from '../../runtime/charts.ts'
import {
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    type GentelellaContent,
} from '../../content.ts'
import {
    type GentelellaChartType,
} from '../../inventory.ts'

export type GentelellaChartConfig = {
    ariaLabel: string
    className?: string
    document?: Document
    height?: number | string
    type: GentelellaChartType
}

export type GentelellaChartInstance = GentelellaComponentInstance<HTMLDivElement> & {
    initialize: () => Promise<void>
}

class GentelellaChart implements GentelellaChartInstance {
    readonly el: HTMLDivElement

    constructor(config: GentelellaChartConfig) {
        this.el = createGentelellaElement(
            'div',
            gentelellaClasses.chart.area,
            {
                attributes: {
                    'aria-label': config.ariaLabel,
                    'data-chart': config.type,
                    role: 'img',
                },
                className: config.className,
                document: config.document,
            },
        )

        if (config.height !== undefined)
            applyStyle(this.el, { height: typeof config.height === 'number' ? `${config.height}px` : config.height })
    }

    initialize(): Promise<void> {
        return initCharts()
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaChart = (config: GentelellaChartConfig): GentelellaChartInstance => new GentelellaChart(config)

export type GentelellaMapHostConfig = {
    ariaLabel: string
    className?: string
    document?: Document
    height?: number | string
    id: string
    onMount?: (element: HTMLDivElement) => void
}

export type GentelellaMapHostInstance = GentelellaComponentInstance<HTMLDivElement> & {
    mount: () => void
}

class GentelellaMapHost implements GentelellaMapHostInstance {
    readonly el: HTMLDivElement

    constructor(private readonly config: GentelellaMapHostConfig) {
        this.el = createGentelellaElement(
            'div',
            'map-host',
            {
                attributes: {
                    'aria-label': config.ariaLabel,
                    id: config.id,
                    role: 'application',
                },
                className: config.className,
                document: config.document,
            },
        )

        if (config.height !== undefined)
            applyStyle(this.el, { height: typeof config.height === 'number' ? `${config.height}px` : config.height })
    }

    mount(): void {
        this.config.onMount?.(this.el)
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaMapHost = (config: GentelellaMapHostConfig): GentelellaMapHostInstance => new GentelellaMapHost(config)

export type GentelellaChartTab = {
    label: string
    value: string
}

export type GentelellaChartHeaderConfig = {
    activeValue?: string
    className?: string
    document?: Document
    stat?: GentelellaContent
    subtitle?: string
    tabs?: GentelellaChartTab[]
    title: string
    onTabChange?: (
        value: string,
        event: MouseEvent,
    ) => void
}

export type GentelellaChartHeaderInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setActiveValue: (value: string) => void
}

class GentelellaChartHeader implements GentelellaChartHeaderInstance {
    readonly el: HTMLDivElement

    private readonly buttons = new Map<string, HTMLButtonElement>()

    constructor(private readonly config: GentelellaChartHeaderConfig) {
        const document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'div',
            gentelellaClasses.chart.header,
            {
                className: config.className,
                document,
            },
        )
        const left = createGentelellaElement(
            'div',
            gentelellaClasses.chart.headerLeft,
            { document },
        )
        left.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.card.title,
                {
                    content: config.title,
                    document,
                },
            ),
        )

        if (config.subtitle)
            left.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.card.subtitle,
                    {
                        content: config.subtitle,
                        document,
                    },
                ),
            )

        this.el.append(left)

        if (config.stat)
            this.el.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.chart.stat,
                    {
                        content: config.stat,
                        document,
                    },
                ),
            )

        if (config.tabs?.length)
            this.el.append(
                this.renderTabs(document, config.tabs),
            )
    }

    private renderTabs(
        document: Document,
        tabs: GentelellaChartTab[],
    ): HTMLDivElement {
        const tabsEl = createGentelellaElement(
            'div',
            gentelellaClasses.chart.tabs,
            {
                attributes: { role: 'tablist' },
                document,
            },
        )

        for (const tab of tabs) {
            const active = tab.value === this.config.activeValue
            const button = createGentelellaElement(
                'button',
                combineGentelellaClassNames(gentelellaClasses.chart.tab, active && gentelellaClasses.state.active),
                {
                    attributes: {
                        'aria-selected': String(active),
                        role: 'tab',
                        type: 'button',
                    },
                    content: tab.label,
                    document,
                },
            )
            button.addEventListener('click', event => this.handleTabClick(tab.value, event))
            this.buttons.set(tab.value, button)
            tabsEl.append(button)
        }

        return tabsEl
    }

    private handleTabClick(
        value: string,
        event: MouseEvent,
    ): void {
        this.setActiveValue(value)
        this.config.onTabChange?.(value, event)
    }

    setActiveValue(value: string): void {
        for (const [tabValue, button] of this.buttons) {
            const active = value === tabValue
            button.classList.toggle(gentelellaClasses.state.active, active)
            button.setAttribute(
                'aria-selected',
                String(active),
            )
        }
    }

    destroy(): void {
        this.buttons.clear()
        this.el.remove()
    }
}

export const createGentelellaChartHeader = (config: GentelellaChartHeaderConfig): GentelellaChartHeaderInstance => new GentelellaChartHeader(config)
