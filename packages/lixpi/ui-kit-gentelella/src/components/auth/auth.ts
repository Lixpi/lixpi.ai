import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaAuthCardConfig = {
    actions?: GentelellaContent
    brand?: GentelellaContent
    className?: string
    content: GentelellaContent
    document?: Document
    footer?: GentelellaContent
    subtitle?: string
    title: string
}

export const createGentelellaAuthCard = (config: GentelellaAuthCardConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'auth-card',
        {
            className: config.className,
            document,
        },
    )

    if (config.brand)
        element.append(
            createGentelellaElement(
                'div',
                'auth-brand',
                {
                    content: config.brand,
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'h1',
            'auth-title',
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.subtitle)
        element.append(
            createGentelellaElement(
                'p',
                'auth-subtitle',
                {
                    content: config.subtitle,
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'div',
            'auth-content',
            {
                content: config.content,
                document,
            },
        ),
    )

    if (config.actions)
        element.append(
            createGentelellaElement(
                'div',
                'auth-actions',
                {
                    content: config.actions,
                    document,
                },
            ),
        )

    if (config.footer)
        element.append(
            createGentelellaElement(
                'footer',
                'auth-footer',
                {
                    content: config.footer,
                    document,
                },
            ),
        )

    return createGentelellaComponentInstance(element)
}

export type GentelellaStatusPanelConfig = {
    actions?: GentelellaContent
    className?: string
    code?: string
    description: GentelellaContent
    document?: Document
    icon?: GentelellaContent
    metadata?: GentelellaContent
    title: string
}

export const createGentelellaStatusPanel = (config: GentelellaStatusPanelConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'error-content',
        {
            className: config.className,
            document,
        },
    )

    if (config.icon)
        element.append(
            createGentelellaElement(
                'div',
                'status-page-icon',
                {
                    content: config.icon,
                    document,
                },
            ),
        )

    if (config.code)
        element.append(
            createGentelellaElement(
                'div',
                'error-code',
                {
                    content: config.code,
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'h1',
            'error-title',
            {
                content: config.title,
                document,
            },
        ),
        createGentelellaElement(
            'div',
            'error-message',
            {
                content: config.description,
                document,
            },
        ),
    )

    if (config.metadata)
        element.append(
            createGentelellaElement(
                'div',
                'status-page-meta',
                {
                    content: config.metadata,
                    document,
                },
            ),
        )

    if (config.actions)
        element.append(
            createGentelellaElement(
                'div',
                'error-actions',
                {
                    content: config.actions,
                    document,
                },
            ),
        )

    return createGentelellaComponentInstance(element)
}

export type GentelellaCountdownValue = {
    label: string
    value: string | number
}

export type GentelellaCountdownConfig = {
    className?: string
    document?: Document
    values: GentelellaCountdownValue[]
}

export const createGentelellaCountdown = (config: GentelellaCountdownConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'countdown',
        {
            className: config.className,
            document,
        },
    )

    for (const value of config.values) {
        const cell = createGentelellaElement(
            'div',
            'countdown-cell',
            { document },
        )
        cell.append(
            createGentelellaElement(
                'span',
                'num',
                {
                    content: value.value,
                    document,
                },
            ),
            createGentelellaElement(
                'span',
                'label',
                {
                    content: value.label,
                    document,
                },
            ),
        )
        element.append(cell)
    }

    return createGentelellaComponentInstance(element)
}
