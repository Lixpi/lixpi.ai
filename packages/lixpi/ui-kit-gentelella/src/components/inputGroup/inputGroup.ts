import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaInputGroupConfig = {
    className?: string
    control: GentelellaContent
    document?: Document
    iconHtml?: string
}

export type GentelellaInputGroupInstance = {
    readonly el: HTMLDivElement
    destroy: () => void
}

class GentelellaInputGroup implements GentelellaInputGroupInstance {
    readonly el: HTMLDivElement

    constructor(config: GentelellaInputGroupConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.el = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.input.group, config.className)}>
                ${
                    config.iconHtml
                        ? html`
                            <span
                                className=${gentelellaClasses.input.icon}
                                innerHTML=${config.iconHtml}
                            ></span>
                        `
                        : null
                }
            </div>
        ` as HTMLDivElement
        appendGentelellaContent(this.el, config.control)
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaInputGroup = (config: GentelellaInputGroupConfig): GentelellaInputGroupInstance => new GentelellaInputGroup(config)
