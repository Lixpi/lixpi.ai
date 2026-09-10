import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    gentelellaStatusClassName,
    type GentelellaStatusTone,
} from '../../classNames.ts'

export type GentelellaStatusConfig = {
    className?: string
    document?: Document
    label: string
    tone?: GentelellaStatusTone
}

export type GentelellaStatusInstance = {
    readonly el: HTMLSpanElement
    destroy: () => void
    setLabel: (label: string) => void
}

class GentelellaStatus implements GentelellaStatusInstance {
    readonly el: HTMLSpanElement

    constructor(config: GentelellaStatusConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.el = html`
            <span className=${gentelellaStatusClassName(config)}>${config.label}</span>
        ` as HTMLSpanElement
    }

    setLabel(label: string): void {
        this.el.textContent = label
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaStatus = (config: GentelellaStatusConfig): GentelellaStatusInstance => new GentelellaStatus(config)
