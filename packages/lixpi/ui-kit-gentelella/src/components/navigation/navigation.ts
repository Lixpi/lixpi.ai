import {
    GentelellaElementComponent,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaNavigationBadge = {
    text: string
    tone: 'blue' | 'red' | 'teal'
}

export type GentelellaNavigationLeaf = {
    badge?: GentelellaNavigationBadge
    href: string
    icon?: GentelellaContent
    key: string
    label: string
}

export type GentelellaNavigationParent = {
    badge?: GentelellaNavigationBadge
    children: GentelellaNavigationLeaf[]
    icon?: GentelellaContent
    key: string
    label: string
}

export type GentelellaNavigationItem = GentelellaNavigationLeaf | GentelellaNavigationParent

export type GentelellaNavigationGroup = {
    items: GentelellaNavigationItem[]
    label: string
}

export type GentelellaSidebarNavigationConfig = {
    activeKey?: string
    ariaLabel?: string
    className?: string
    document?: Document
    groups: GentelellaNavigationGroup[]
    onNavigate?: (
        item: GentelellaNavigationLeaf,
        event: MouseEvent,
    ) => void
}

export type GentelellaSidebarNavigationInstance = GentelellaComponentInstance<HTMLElement> & {
    setActiveKey: (key: string | null) => void
}

const appendNavigationBadge = (
    element: HTMLElement,
    badge: GentelellaNavigationBadge | undefined,
    document: Document,
): void => {
    if (!badge)
        return

    element.append(
        createGentelellaElement(
            'span',
            combineGentelellaClassNames(gentelellaClasses.badge.base, `badge-${badge.tone}`),
            {
                content: badge.text,
                document,
            },
        ),
    )
}

class GentelellaSidebarNavigation extends GentelellaElementComponent<HTMLElement> implements GentelellaSidebarNavigationInstance {
    private readonly links = new Map<string, HTMLAnchorElement>()
    private readonly parents = new Map<string, HTMLDivElement>()

    constructor(private readonly config: GentelellaSidebarNavigationConfig) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'nav',
            gentelellaClasses.layout.sidebarNavigation,
            {
                attributes: { 'aria-label': config.ariaLabel ?? 'Primary navigation' },
                className: config.className,
                document,
            },
        )
        super(element)

        for (const group of config.groups)
            this.el.append(
                this.renderGroup(group, document),
            )

        this.setActiveKey(config.activeKey ?? null)
    }

    private renderLeaf(
        item: GentelellaNavigationLeaf,
        document: Document,
        sublink = false,
    ): HTMLAnchorElement {
        const link = createGentelellaElement(
            'a',
            sublink ? 'nav-sublink' : gentelellaClasses.layout.navigationLink,
            {
                attributes: { href: item.href },
                document,
            },
        )
        appendGentelellaContent(link, item.icon)
        link.append(
            createGentelellaElement(
                'span',
                gentelellaClasses.layout.navigationText,
                {
                    content: item.label,
                    document,
                },
            ),
        )
        appendNavigationBadge(
            link,
            item.badge,
            document,
        )
        link.addEventListener('click', event => this.config.onNavigate?.(item, event))
        this.links.set(item.key, link)

        return link
    }

    private renderGroup(
        group: GentelellaNavigationGroup,
        document: Document,
    ): HTMLDivElement {
        const groupElement = createGentelellaElement(
            'div',
            gentelellaClasses.layout.navigationGroup,
            { document },
        )
        groupElement.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.layout.navigationLabel,
                {
                    content: group.label,
                    document,
                },
            ),
        )

        for (const item of group.items) {
            if (!('children' in item)) {
                groupElement.append(
                    this.renderLeaf(item, document),
                )

                continue
            }

            const tree = createGentelellaElement(
                'div',
                'nav-tree',
                { document },
            )
            const toggle = createGentelellaElement(
                'button',
                'nav-toggle',
                {
                    attributes: {
                        'aria-expanded': false,
                        type: 'button',
                    },
                    document,
                },
            )
            appendGentelellaContent(toggle, item.icon)
            toggle.append(
                createGentelellaElement(
                    'span',
                    gentelellaClasses.layout.navigationText,
                    {
                        content: item.label,
                        document,
                    },
                ),
            )
            appendNavigationBadge(
                toggle,
                item.badge,
                document,
            )
            toggle.append(
                createGentelellaElement(
                    'span',
                    'nav-chev',
                    {
                        content: '›',
                        document,
                    },
                ),
            )
            const children = createGentelellaElement(
                'div',
                'nav-sub',
                { document },
            )

            for (const child of item.children)
                children.append(
                    this.renderLeaf(
                        child,
                        document,
                        true,
                    ),
                )

            toggle.addEventListener('click', () => {
                const open = !tree.classList.contains(gentelellaClasses.state.open)
                tree.classList.toggle(gentelellaClasses.state.open, open)
                toggle.setAttribute(
                    'aria-expanded',
                    String(open),
                )
            })
            tree.append(toggle, children)
            this.parents.set(item.key, tree)
            groupElement.append(tree)
        }

        return groupElement
    }

    setActiveKey(key: string | null): void {
        for (const [itemKey, link] of this.links) {
            const active = itemKey === key
            link.classList.toggle(gentelellaClasses.state.active, active)

            if (active)
                link.setAttribute('aria-current', 'page')
            else
                link.removeAttribute('aria-current')
        }

        for (const tree of this.parents.values()) {
            const active = Boolean(
                tree.querySelector('[aria-current="page"]'),
            )
            tree.classList.toggle('has-active', active)
            tree.classList.toggle(gentelellaClasses.state.open, active)
            tree.querySelector('.nav-toggle')?.setAttribute(
                'aria-expanded',
                String(active),
            )
        }
    }

    override destroy(): void {
        this.links.clear()
        this.parents.clear()
        super.destroy()
    }
}

export const createGentelellaSidebarNavigation = (config: GentelellaSidebarNavigationConfig): GentelellaSidebarNavigationInstance =>
    new GentelellaSidebarNavigation(config)

export type GentelellaTopbarConfig = {
    actions?: GentelellaContent
    breadcrumbs?: GentelellaContent
    className?: string
    document?: Document
    onSearch?: (query: string) => void
    searchPlaceholder?: string
}

export type GentelellaTopbarInstance = GentelellaComponentInstance<HTMLElement> & {
    readonly searchEl: HTMLInputElement | null
}

class GentelellaTopbar extends GentelellaElementComponent<HTMLElement> implements GentelellaTopbarInstance {
    readonly searchEl: HTMLInputElement | null

    constructor(private readonly config: GentelellaTopbarConfig = {}) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'header',
            'topbar',
            {
                className: config.className,
                document,
            },
        )
        const left = createGentelellaElement(
            'div',
            'topbar-left',
            {
                content: config.breadcrumbs,
                document,
            },
        )
        const right = createGentelellaElement(
            'div',
            'topbar-right',
            { document },
        )
        let search: HTMLInputElement | null = null

        if (
            config.searchPlaceholder
            || config.onSearch
        ) {
            const searchBox = createGentelellaElement(
                'label',
                'search-box',
                { document },
            )
            search = createGentelellaElement(
                'input',
                '',
                { document },
            )
            search.placeholder = config.searchPlaceholder ?? 'Search…'
            search.type = 'search'
            searchBox.append(search)
            right.append(searchBox)
        }

        appendGentelellaContent(right, config.actions)
        element.append(left, right)
        super(element)
        this.searchEl = search
        this.searchEl?.addEventListener('input', this.handleSearch)
    }

    private handleSearch = (): void => void this.config.onSearch?.(this.searchEl?.value ?? '')

    override destroy(): void {
        this.searchEl?.removeEventListener('input', this.handleSearch)
        super.destroy()
    }
}

export const createGentelellaTopbar = (config: GentelellaTopbarConfig = {}): GentelellaTopbarInstance => new GentelellaTopbar(config)
