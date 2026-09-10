import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaEmptyStateConfig = {
    action?: GentelellaContent
    className?: string
    description?: string
    document?: Document
    iconHtml?: string
    title: string
}

export type GentelellaEmptyStateInstance = {
    readonly el: HTMLDivElement
    destroy: () => void
}

class GentelellaEmptyState implements GentelellaEmptyStateInstance {
    readonly el: HTMLDivElement

    constructor(config: GentelellaEmptyStateConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.el = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.emptyState.base, config.className)}>
                ${
                    config.iconHtml
                        ? html`
                            <span
                                className=${gentelellaClasses.emptyState.icon}
                                innerHTML=${config.iconHtml}
                            ></span>
                        `
                        : null
                }
                <div className=${gentelellaClasses.emptyState.title}>${config.title}</div>
                ${config.description
                    ? html`<div className=${gentelellaClasses.emptyState.description}>${config.description}</div>`
                    : null}
            </div>
        ` as HTMLDivElement

        if (config.action) {
            const actions = html`<div className=${gentelellaClasses.emptyState.actions}></div>` as HTMLDivElement
            appendGentelellaContent(actions, config.action)
            this.el.append(actions)
        }
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaEmptyState = (config: GentelellaEmptyStateConfig): GentelellaEmptyStateInstance => new GentelellaEmptyState(config)
