import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import { gentelellaClasses } from '../../classNames.ts'

export type GentelellaApplicationShellBrand = {
    mark: Node | string
    name: Node | string
}

export type GentelellaApplicationShellNavigationItem = {
    iconHtml?: string
    label: string
    path: string
}

export type GentelellaApplicationShellNavigationGroup = {
    items: GentelellaApplicationShellNavigationItem[]
    label: string
}

export type GentelellaApplicationShellConfig = {
    brand: GentelellaApplicationShellBrand
    document?: Document
    footerContent?: Node | string
    navigationGroups: GentelellaApplicationShellNavigationGroup[]
    navigationLabel?: string
    onNavigate?: (
        path: string,
        event: MouseEvent,
    ) => void
}

export type GentelellaApplicationShellInstance = {
    readonly contentEl: HTMLDivElement
    readonly el: HTMLDivElement
    destroy: () => void
    setActivePath: (path: string) => void
}

class GentelellaApplicationShell implements GentelellaApplicationShellInstance {
    readonly contentEl: HTMLDivElement
    readonly el: HTMLDivElement

    private readonly navigationLinks = new Map<string, HTMLAnchorElement>()

    constructor(private readonly config: GentelellaApplicationShellConfig) {
        const document = config.document ?? globalThis.document
        const html = createDocumentHtml(document)

        this.contentEl = html`
            <div className="gentelella-application-shell-content"></div>
        ` as HTMLDivElement

        this.el = html`
            <div className="gentelella-application-shell">
                ${this.renderSidebar(html)}
                <main className=${gentelellaClasses.layout.main}>
                    ${this.contentEl}
                </main>
            </div>
        ` as HTMLDivElement
    }

    private renderSidebar(html: ReturnType<typeof createDocumentHtml>): HTMLElement {
        const navigationEl = html`
            <nav
                className=${gentelellaClasses.layout.sidebarNavigation}
                aria-label=${this.config.navigationLabel ?? 'Primary navigation'}
            ></nav>
        ` as HTMLElement

        for (const group of this.config.navigationGroups) {
            const groupEl = html`
                <div className=${gentelellaClasses.layout.navigationGroup}>
                    <div className=${gentelellaClasses.layout.navigationLabel}>${group.label}</div>
                </div>
            ` as HTMLDivElement

            for (const item of group.items) {
                const icon = item.iconHtml
                    ? html`<span innerHTML=${item.iconHtml}></span>`
                    : null
                const link = html`
                    <a
                        className=${gentelellaClasses.layout.navigationLink}
                        href=${item.path}
                        onclick=${(event: MouseEvent) => this.handleNavigationClick(event, item.path)}
                    >
                        ${icon}
                        <span className=${gentelellaClasses.layout.navigationText}>${item.label}</span>
                    </a>
                ` as HTMLAnchorElement
                this.navigationLinks.set(item.path, link)
                groupEl.append(link)
            }

            navigationEl.append(groupEl)
        }

        const footer = this.config.footerContent
            ? html`
                <div className=${gentelellaClasses.layout.sidebarFooter}>
                    ${this.config.footerContent}
                </div>
            `
            : null

        return html`
            <aside className=${gentelellaClasses.layout.sidebar}>
                <div className=${gentelellaClasses.layout.sidebarBrand}>
                    <span className=${gentelellaClasses.layout.brandIcon}>${this.config.brand.mark}</span>
                    <span className=${gentelellaClasses.layout.brandName}>${this.config.brand.name}</span>
                </div>
                ${navigationEl}
                ${footer}
            </aside>
        ` as HTMLElement
    }

    private handleNavigationClick(
        event: MouseEvent,
        path: string,
    ): void {
        if (!this.config.onNavigate)
            return

        event.preventDefault()
        this.config.onNavigate(path, event)
    }

    setActivePath(path: string): void {
        for (const [itemPath, link] of this.navigationLinks) {
            const active = itemPath === path
            link.classList.toggle(gentelellaClasses.layout.navigationActive, active)

            if (active)
                link.setAttribute('aria-current', 'page')
            else
                link.removeAttribute('aria-current')
        }
    }

    destroy(): void {
        this.navigationLinks.clear()
        this.el.remove()
    }
}

export const createGentelellaApplicationShell = (config: GentelellaApplicationShellConfig): GentelellaApplicationShellInstance =>
    new GentelellaApplicationShell(config)
