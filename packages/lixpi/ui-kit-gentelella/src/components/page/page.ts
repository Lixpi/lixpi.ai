import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaPageConfig = {
    className?: string
    content?: GentelellaContent
    document?: Document
}

export type GentelellaPageInstance = {
    readonly el: HTMLDivElement
    appendContent: (content: GentelellaContent) => void
    destroy: () => void
}

class GentelellaPage implements GentelellaPageInstance {
    readonly el: HTMLDivElement

    constructor(config: GentelellaPageConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.el = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.page.wrapper, config.className)}></div>
        ` as HTMLDivElement

        this.appendContent(config.content)
    }

    appendContent(content: GentelellaContent): void {
        appendGentelellaContent(this.el, content)
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaPage = (config: GentelellaPageConfig = {}): GentelellaPageInstance => new GentelellaPage(config)
