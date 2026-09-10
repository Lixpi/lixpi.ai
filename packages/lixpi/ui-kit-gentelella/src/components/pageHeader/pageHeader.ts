import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaPageHeaderConfig = {
    actions?: GentelellaContent
    className?: string
    document?: Document
    pretitle?: string
    title: string
}

export type GentelellaPageHeaderInstance = {
    readonly el: HTMLDivElement
    readonly titleEl: HTMLHeadingElement
    destroy: () => void
    setTitle: (title: string) => void
}

class GentelellaPageHeader implements GentelellaPageHeaderInstance {
    readonly el: HTMLDivElement
    readonly titleEl: HTMLHeadingElement

    constructor(config: GentelellaPageHeaderConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.titleEl = html`<h1 className=${gentelellaClasses.page.title}>${config.title}</h1>` as HTMLHeadingElement
        const actionsEl = config.actions
            ? html`<div className=${gentelellaClasses.page.actions}></div>` as HTMLDivElement
            : null

        if (actionsEl)
            appendGentelellaContent(actionsEl, config.actions)

        this.el = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.page.header, config.className)}>
                <div className=${gentelellaClasses.page.headerRow}>
                    <div>
                        ${config.pretitle
                            ? html`<div className=${gentelellaClasses.page.pretitle}>${config.pretitle}</div>`
                            : null}
                        ${this.titleEl}
                    </div>
                    ${actionsEl}
                </div>
            </div>
        ` as HTMLDivElement
    }

    setTitle(title: string): void {
        this.titleEl.textContent = title
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaPageHeader = (config: GentelellaPageHeaderConfig): GentelellaPageHeaderInstance => new GentelellaPageHeader(config)
