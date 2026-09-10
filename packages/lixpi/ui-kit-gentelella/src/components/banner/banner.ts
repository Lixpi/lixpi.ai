import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'
import {
    gentelellaBannerClassName,
    gentelellaClasses,
    type GentelellaBannerVariant,
} from '../../classNames.ts'

export type GentelellaBannerConfig = {
    actions?: GentelellaContent
    body: GentelellaContent
    className?: string
    document?: Document
    iconHtml?: string
    title?: string
    variant?: GentelellaBannerVariant
}

export type GentelellaBannerInstance = {
    readonly bodyEl: HTMLDivElement
    readonly el: HTMLDivElement
    destroy: () => void
}

class GentelellaBanner implements GentelellaBannerInstance {
    readonly bodyEl: HTMLDivElement
    readonly el: HTMLDivElement

    constructor(config: GentelellaBannerConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.bodyEl = html`<div className=${gentelellaClasses.banner.body}></div>` as HTMLDivElement

        if (config.title)
            this.bodyEl.append(html`<strong>${config.title}</strong>`)

        appendGentelellaContent(this.bodyEl, config.body)

        const icon = config.iconHtml
            ? html`
                <span
                    className=${gentelellaClasses.banner.icon}
                    innerHTML=${config.iconHtml}
                ></span>
            `
            : null

        this.el = html`
            <div className=${gentelellaBannerClassName(config)}>
                ${icon}
                ${this.bodyEl}
            </div>
        ` as HTMLDivElement

        if (config.actions) {
            const actions = html`<div className=${gentelellaClasses.banner.actions}></div>` as HTMLDivElement
            appendGentelellaContent(actions, config.actions)
            this.el.append(actions)
        }
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaBanner = (config: GentelellaBannerConfig): GentelellaBannerInstance => new GentelellaBanner(config)
