import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'

export type GentelellaTableConfig = {
    className?: string
    document?: Document
    responsive?: boolean
}

export type GentelellaTableInstance = {
    readonly el: HTMLElement
    readonly tableEl: HTMLTableElement
    destroy: () => void
}

class GentelellaTable implements GentelellaTableInstance {
    readonly el: HTMLElement
    readonly tableEl: HTMLTableElement

    constructor(config: GentelellaTableConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.tableEl = html`
            <table className=${combineGentelellaClassNames(gentelellaClasses.table.base, config.className)}></table>
        ` as HTMLTableElement
        this.el = config.responsive === false
            ? this.tableEl
            : html`
                <div className=${gentelellaClasses.table.responsive}>
                    ${this.tableEl}
                </div>
            ` as HTMLDivElement
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaTable = (config: GentelellaTableConfig = {}): GentelellaTableInstance => new GentelellaTable(config)
