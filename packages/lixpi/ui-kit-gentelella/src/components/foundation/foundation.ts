import { applyStyle } from '@lixpi/ui-primitives/dom'

import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaAttributeValue,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    combineGentelellaClassNames,
    gentelellaClasses,
    type GentelellaStatusTone,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaAlertVariant = 'danger' | 'error' | 'info' | 'success' | 'warning'
export type GentelellaAvatarSize = 'default' | 'extra-large' | 'extra-small' | 'extra-extra-large' | 'large' | 'medium' | 'small'
export type GentelellaBadgeTone = 'blue' | 'red' | 'teal'

const ALERT_VARIANT_CLASSES: Record<GentelellaAlertVariant, string> = {
    danger: gentelellaClasses.alert.danger,
    error: gentelellaClasses.alert.error,
    info: gentelellaClasses.alert.info,
    success: gentelellaClasses.alert.success,
    warning: gentelellaClasses.alert.warning,
}

const AVATAR_SIZE_CLASSES: Record<GentelellaAvatarSize, string> = {
    default: '',
    'extra-large': gentelellaClasses.avatar.extraLarge,
    'extra-small': gentelellaClasses.avatar.extraSmall,
    'extra-extra-large': gentelellaClasses.avatar.extraExtraLarge,
    large: gentelellaClasses.avatar.large,
    medium: gentelellaClasses.avatar.medium,
    small: gentelellaClasses.avatar.small,
}

const BADGE_TONE_CLASSES: Record<GentelellaBadgeTone, string> = {
    blue: gentelellaClasses.badge.blue,
    red: gentelellaClasses.badge.red,
    teal: gentelellaClasses.badge.teal,
}

export type GentelellaAlertConfig = {
    body: GentelellaContent
    className?: string
    document?: Document
    icon?: GentelellaContent
    title?: string
    variant: GentelellaAlertVariant
}

export const createGentelellaAlert = (config: GentelellaAlertConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        combineGentelellaClassNames(gentelellaClasses.alert.base, ALERT_VARIANT_CLASSES[config.variant]),
        {
            className: config.className,
            document,
            attributes: { role: config.variant === 'danger'
                || config.variant === 'error'
                ? 'alert'
                : 'status' },
        },
    )

    if (config.icon) {
        const icon = createGentelellaElement(
            'span',
            gentelellaClasses.alert.icon,
            { document },
        )
        appendGentelellaContent(icon, config.icon)
        element.append(icon)
    }

    const body = createGentelellaElement(
        'div',
        gentelellaClasses.alert.body,
        { document },
    )

    if (config.title) {
        const title = createGentelellaElement(
            'strong',
            '',
            { document },
        )
        title.textContent = config.title
        body.append(title, ' ')
    }

    appendGentelellaContent(body, config.body)
    element.append(body)

    return createGentelellaComponentInstance(element)
}

export type GentelellaAvatarConfig = {
    alt?: string
    background?: string
    className?: string
    document?: Document
    initials?: string
    size?: GentelellaAvatarSize
    src?: string
    status?: 'away' | 'offline' | 'online'
}

export const createGentelellaAvatar = (config: GentelellaAvatarConfig = {}): GentelellaComponentInstance<HTMLSpanElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'span',
        combineGentelellaClassNames(gentelellaClasses.avatar.base, AVATAR_SIZE_CLASSES[config.size ?? 'default']),
        {
            className: config.className,
            document,
        },
    )

    if (config.background)
        applyStyle(element, { background: config.background })

    if (config.src) {
        const image = createGentelellaElement(
            'img',
            gentelellaClasses.avatar.image,
            {
                attributes: {
                    alt: config.alt ?? '',
                    src: config.src,
                },
                document,
            },
        )
        element.append(image)
    } else {
        element.textContent = config.initials ?? ''

        if (config.alt)
            element.setAttribute('aria-label', config.alt)
    }

    if (config.status) {
        const status = createGentelellaElement(
            'span',
            combineGentelellaClassNames(gentelellaClasses.avatar.status, config.status),
            {
                attributes: { 'aria-label': config.status },
                document,
            },
        )
        element.append(status)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaAvatarStackConfig = {
    avatars: GentelellaAvatarConfig[]
    className?: string
    document?: Document
}

export const createGentelellaAvatarStack = (config: GentelellaAvatarStackConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.avatar.stack,
        {
            className: config.className,
            document,
        },
    )

    for (const avatar of config.avatars)
        element.append(createGentelellaAvatar({
            ...avatar,
            document,
        }).el)

    return createGentelellaComponentInstance(element)
}

export type GentelellaBadgeConfig = {
    attributes?: Readonly<Record<string, GentelellaAttributeValue>>
    className?: string
    content: GentelellaContent
    document?: Document
    tone: GentelellaBadgeTone
}

export const createGentelellaBadge = (config: GentelellaBadgeConfig): GentelellaComponentInstance<HTMLSpanElement> => createGentelellaComponentInstance(
    createGentelellaElement(
        'span',
        combineGentelellaClassNames(gentelellaClasses.badge.base, BADGE_TONE_CLASSES[config.tone]),
        config,
    ),
)

export type GentelellaDividerConfig = {
    className?: string
    document?: Document
    label?: string
    variant?: 'dashed' | 'plain'
}

export const createGentelellaDivider = (config: GentelellaDividerConfig = {}): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const variantClass = config.variant === 'dashed'
        ? gentelellaClasses.divider.dashed
        : gentelellaClasses.divider.plain
    const element = createGentelellaElement(
        'div',
        variantClass,
        {
            className: config.className,
            document,
            attributes: { role: 'separator' },
        },
    )

    if (config.label)
        element.append(
            createGentelellaElement(
                'span',
                gentelellaClasses.divider.label,
                {
                    content: config.label,
                    document,
                },
            ),
        )

    return createGentelellaComponentInstance(element)
}

export type GentelellaListGroupItem = {
    active?: boolean
    content: GentelellaContent
    disabled?: boolean
    value: string
}

export type GentelellaListGroupConfig = {
    ariaLabel?: string
    className?: string
    document?: Document
    items: GentelellaListGroupItem[]
    onSelect?: (
        value: string,
        event: MouseEvent,
    ) => void
}

export type GentelellaListGroupInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setActiveValue: (value: string | null) => void
}

class GentelellaListGroup implements GentelellaListGroupInstance {
    readonly el: HTMLDivElement

    private readonly items = new Map<string, HTMLButtonElement>()

    constructor(private readonly config: GentelellaListGroupConfig) {
        const document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'div',
            gentelellaClasses.list.base,
            {
                attributes: {
                    'aria-label': config.ariaLabel,
                    role: 'list',
                },
                className: config.className,
                document,
            },
        )

        for (const item of config.items) {
            const button = createGentelellaElement(
                'button',
                combineGentelellaClassNames(gentelellaClasses.list.item, item.active && gentelellaClasses.state.active),
                {
                    attributes: {
                        'aria-current': item.active ? 'true' : undefined,
                        role: 'listitem',
                        type: 'button',
                    },
                    content: item.content,
                    document,
                },
            )
            button.disabled = item.disabled ?? false
            button.addEventListener('click', event => this.config.onSelect?.(item.value, event))
            this.items.set(item.value, button)
            this.el.append(button)
        }
    }

    setActiveValue(value: string | null): void {
        for (const [itemValue, item] of this.items) {
            const active = value === itemValue
            item.classList.toggle(gentelellaClasses.state.active, active)

            if (active)
                item.setAttribute('aria-current', 'true')
            else
                item.removeAttribute('aria-current')
        }
    }

    destroy(): void {
        this.items.clear()
        this.el.remove()
    }
}

export const createGentelellaListGroup = (config: GentelellaListGroupConfig): GentelellaListGroupInstance => new GentelellaListGroup(config)

export type GentelellaAccordionItem = {
    content: GentelellaContent
    open?: boolean
    title: GentelellaContent
}

export type GentelellaAccordionConfig = {
    className?: string
    document?: Document
    items: GentelellaAccordionItem[]
}

export const createGentelellaAccordion = (config: GentelellaAccordionConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.accordion.base,
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const details = createGentelellaElement(
            'details',
            gentelellaClasses.accordion.item,
            { document },
        )
        details.open = item.open ?? false
        const summary = createGentelellaElement(
            'summary',
            gentelellaClasses.accordion.summary,
            {
                content: item.title,
                document,
            },
        )
        const content = createGentelellaElement(
            'div',
            gentelellaClasses.accordion.content,
            {
                content: item.content,
                document,
            },
        )
        details.append(summary, content)
        element.append(details)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaBreadcrumbItem = {
    href?: string
    label: string
}

export type GentelellaBreadcrumbConfig = {
    ariaLabel?: string
    className?: string
    document?: Document
    items: GentelellaBreadcrumbItem[]
}

export const createGentelellaBreadcrumbs = (config: GentelellaBreadcrumbConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'nav',
        '',
        {
            attributes: { 'aria-label': config.ariaLabel ?? 'Breadcrumb' },
            className: config.className,
            document,
        },
    )
    const list = createGentelellaElement(
        'ol',
        gentelellaClasses.layout.breadcrumbs,
        { document },
    )
    config.items.forEach((item, index) => {
        const current = index === config.items.length - 1
        const listItem = createGentelellaElement(
            'li',
            gentelellaClasses.layout.breadcrumb,
            {
                attributes: { 'aria-current': current ? 'page' : undefined },
                document,
            },
        )

        if (
            item.href
            && !current
        ) {
            const link = createGentelellaElement(
                'a',
                '',
                { document },
            )
            link.href = item.href
            link.textContent = item.label
            listItem.append(link)
        } else
            listItem.textContent = item.label

        list.append(listItem)
    })
    element.append(list)

    return createGentelellaComponentInstance(element)
}

export type GentelellaGridColumns = 1 | 2 | 3 | 4 | '4-8' | '8-4'

export type GentelellaGridConfig = {
    children?: GentelellaContent
    className?: string
    columns?: GentelellaGridColumns
    document?: Document
}

export const createGentelellaGrid = (config: GentelellaGridConfig = {}): GentelellaComponentInstance<HTMLDivElement> =>
    createGentelellaComponentInstance(
        createGentelellaElement(
            'div',
            combineGentelellaClassNames(gentelellaClasses.layout.row, config.columns ? `col-${config.columns}` : ''),
            {
                className: config.className,
                content: config.children,
                document: config.document,
            },
        ),
    )

export type GentelellaPaginationItem = {
    disabled?: boolean
    label: string
    page: number
}

export type GentelellaPaginationConfig = {
    ariaLabel?: string
    className?: string
    currentPage: number
    document?: Document
    items: Array<GentelellaPaginationItem | 'ellipsis'>
    onSelect?: (
        page: number,
        event: MouseEvent,
    ) => void
}

export const createGentelellaPagination = (config: GentelellaPaginationConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'nav',
        gentelellaClasses.pagination.base,
        {
            attributes: { 'aria-label': config.ariaLabel ?? 'Pagination' },
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        if (item === 'ellipsis') {
            element.append(
                createGentelellaElement(
                    'span',
                    gentelellaClasses.pagination.ellipsis,
                    {
                        attributes: { 'aria-hidden': true },
                        content: '…',
                        document,
                    },
                ),
            )

            continue
        }

        const current = item.page === config.currentPage
        const button = createGentelellaElement(
            'button',
            combineGentelellaClassNames(gentelellaClasses.pagination.button, current && gentelellaClasses.state.active),
            {
                attributes: {
                    'aria-current': current ? 'page' : undefined,
                    type: 'button',
                },
                content: item.label,
                document,
            },
        )
        button.disabled = item.disabled ?? false
        button.addEventListener('click', event => config.onSelect?.(item.page, event))
        element.append(button)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaStatusDotConfig = {
    className?: string
    document?: Document
    label: string
    tone: GentelellaStatusTone
}

export const createGentelellaStatusDot = (config: GentelellaStatusDotConfig): GentelellaComponentInstance<HTMLSpanElement> =>
    createGentelellaComponentInstance(
        createGentelellaElement(
            'span',
            combineGentelellaClassNames('dot', config.tone),
            {
                attributes: {
                    'aria-label': config.label,
                    role: 'img',
                },
                className: config.className,
                document: config.document,
            },
        ),
    )

export type GentelellaTypographySampleConfig = {
    className?: string
    content: GentelellaContent
    document?: Document
    label: string
    tagName?: 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'p'
}

export const createGentelellaTypographySample = (config: GentelellaTypographySampleConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'type-row',
        {
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'div',
            'type-label',
            {
                content: config.label,
                document,
            },
        ),
        createGentelellaElement(
            config.tagName ?? 'p',
            'type-sample',
            {
                content: config.content,
                document,
            },
        ),
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaCodeConfig = {
    className?: string
    code: string
    document?: Document
    inline?: boolean
}

export const createGentelellaCode = (config: GentelellaCodeConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document

    if (config.inline)
        return createGentelellaComponentInstance(
            createGentelellaElement(
                'code',
                'code-inline',
                {
                    className: config.className,
                    content: config.code,
                    document,
                },
            ),
        )

    const element = createGentelellaElement(
        'pre',
        '',
        {
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'code',
            '',
            {
                content: config.code,
                document,
            },
        ),
    )

    return createGentelellaComponentInstance(element)
}
