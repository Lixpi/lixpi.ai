import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaDrawerConfig = {
    backdropClassName?: string
    body: GentelellaContent
    bodyClassName?: string
    className?: string
    document?: Document
    header?: GentelellaContent
    onBackdropClick?: (event: MouseEvent) => void
    open?: boolean
}

export type GentelellaDrawerInstance = {
    readonly backdropEl: HTMLDivElement
    readonly bodyEl: HTMLDivElement
    readonly el: HTMLElement
    destroy: () => void
    setOpen: (open: boolean) => void
}

class GentelellaDrawer implements GentelellaDrawerInstance {
    readonly backdropEl: HTMLDivElement
    readonly bodyEl: HTMLDivElement
    readonly el: HTMLElement

    constructor(config: GentelellaDrawerConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.bodyEl = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.drawer.body, config.bodyClassName)}></div>
        ` as HTMLDivElement
        appendGentelellaContent(this.bodyEl, config.body)

        this.backdropEl = html`
            <div
                className=${combineGentelellaClassNames(gentelellaClasses.drawer.backdrop, config.backdropClassName)}
                onclick=${config.onBackdropClick}
            ></div>
        ` as HTMLDivElement

        this.el = html`
            <aside className=${combineGentelellaClassNames(gentelellaClasses.drawer.base, config.className)}>
                ${config.header}
                ${this.bodyEl}
            </aside>
        ` as HTMLElement
        this.setOpen(config.open ?? false)
    }

    setOpen(open: boolean): void {
        this.el.classList.toggle(gentelellaClasses.state.open, open)
        this.backdropEl.classList.toggle(gentelellaClasses.state.open, open)
    }

    destroy(): void {
        this.backdropEl.remove()
        this.el.remove()
    }
}

export const createGentelellaDrawer = (config: GentelellaDrawerConfig): GentelellaDrawerInstance => new GentelellaDrawer(config)
