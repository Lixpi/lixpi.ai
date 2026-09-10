import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'

export type GentelellaChipConfig = {
    active?: boolean
    className?: string
    data?: Readonly<Record<string, string | number>>
    document?: Document
    label: string
    onRemove?: () => void
    onToggle?: (active: boolean) => void
    removable?: boolean
    tone?: 'blue' | 'default' | 'green' | 'primary' | 'purple' | 'red' | 'yellow'
}

export type GentelellaChipInstance = {
    readonly el: HTMLSpanElement
    destroy: () => void
    setActive: (active: boolean) => void
}

class GentelellaChip implements GentelellaChipInstance {
    readonly el: HTMLSpanElement

    constructor(config: GentelellaChipConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        const toneClass = config.tone
            && config.tone !== 'default'
            ? `chip-${config.tone}`
            : ''
        this.el = html`
            <span
                className=${combineGentelellaClassNames(
                    gentelellaClasses.chip,
                    toneClass,
                    config.active && gentelellaClasses.state.active,
                    config.className,
                )}
                data=${config.data}
                role=${config.onToggle ? 'button' : undefined}
                tabindex=${config.onToggle ? 0 : undefined}
                onclick=${() => {
                    if (!config.onToggle)
                        return

                    const active = !this.el.classList.contains(gentelellaClasses.state.active)
                    this.setActive(active)
                    config.onToggle(active)
                }}
            >
                ${config.label}
                ${
                    config.removable
                        || config.onRemove
                        ? html`
                            <button
                                className="chip-close"
                                type="button"
                                aria-label=${`Remove ${config.label}`}
                                onclick=${(event: MouseEvent) => {
                                    event.stopPropagation()
                                    config.onRemove?.()
                                }}
                            >×</button>
                        `
                        : null
                }
            </span>
        ` as HTMLSpanElement
    }

    setActive(active: boolean): void {
        this.el.classList.toggle(gentelellaClasses.state.active, active)
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaChip = (config: GentelellaChipConfig): GentelellaChipInstance => new GentelellaChip(config)
