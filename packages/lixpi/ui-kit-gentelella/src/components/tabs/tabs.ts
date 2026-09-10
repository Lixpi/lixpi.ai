import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
    gentelellaTabClassName,
} from '../../classNames.ts'

export type GentelellaTabItem = {
    disabled?: boolean
    label: string
    value: string
}

export type GentelellaTabsConfig = {
    activeValue?: string
    ariaLabel: string
    className?: string
    document?: Document
    items: GentelellaTabItem[]
    onSelect?: (
        value: string,
        event: MouseEvent,
    ) => void
    variant?: 'chart' | 'pill' | 'underline'
}

export type GentelellaTabsInstance = {
    readonly el: HTMLElement
    destroy: () => void
    setActiveValue: (value: string) => void
}

class GentelellaTabs implements GentelellaTabsInstance {
    readonly el: HTMLElement

    private readonly buttons = new Map<string, HTMLButtonElement>()

    constructor(private readonly config: GentelellaTabsConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        const variant = config.variant ?? 'underline'
        const containerClass = variant === 'chart'
            ? gentelellaClasses.tabs.chartTabs
            : variant === 'pill'
                ? gentelellaClasses.tabs.pill
                : gentelellaClasses.tabs.underline
        this.el = html`
            <nav
                className=${combineGentelellaClassNames(containerClass, config.className)}
                aria-label=${config.ariaLabel}
                role="tablist"
            ></nav>
        ` as HTMLElement

        for (const item of config.items) {
            const active = item.value === config.activeValue
            const button = html`
                <button
                    className=${variant === 'chart'
                        ? combineGentelellaClassNames(gentelellaClasses.tabs.chartTab, active && gentelellaClasses.tabs.active)
                        : gentelellaTabClassName(active)}
                    type="button"
                    role="tab"
                    aria-selected=${String(active)}
                    disabled=${item.disabled}
                    data=${{ value: item.value }}
                    onclick=${(event: MouseEvent) => this.select(item.value, event)}
                >${item.label}</button>
            ` as HTMLButtonElement
            this.buttons.set(item.value, button)
            this.el.append(button)
        }
    }

    private select(
        value: string,
        event: MouseEvent,
    ): void {
        this.setActiveValue(value)
        this.config.onSelect?.(value, event)
    }

    setActiveValue(value: string): void {
        for (const [itemValue, button] of this.buttons) {
            const active = itemValue === value
            button.classList.toggle(gentelellaClasses.tabs.active, active)
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

export const createGentelellaTabs = (config: GentelellaTabsConfig): GentelellaTabsInstance => new GentelellaTabs(config)
