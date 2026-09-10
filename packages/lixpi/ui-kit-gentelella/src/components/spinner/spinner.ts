import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    gentelellaSpinnerClassName,
    type GentelellaSpinnerSize,
} from '../../classNames.ts'

export type GentelellaSpinnerConfig = {
    className?: string
    document?: Document
    dots?: boolean
    label?: string
    size?: GentelellaSpinnerSize
    tone?: 'azure' | 'default' | 'red' | 'yellow'
}

export type GentelellaSpinnerInstance = {
    readonly el: HTMLSpanElement
    destroy: () => void
}

class GentelellaSpinner implements GentelellaSpinnerInstance {
    readonly el: HTMLSpanElement

    constructor(config: GentelellaSpinnerConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.el = html`
            <span
                className=${gentelellaSpinnerClassName(config)}
                role=${config.label ? 'status' : undefined}
                aria-label=${config.label}
                aria-hidden=${config.label ? undefined : 'true'}
            ></span>
        ` as HTMLSpanElement
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaSpinner = (config: GentelellaSpinnerConfig = {}): GentelellaSpinnerInstance => new GentelellaSpinner(config)
