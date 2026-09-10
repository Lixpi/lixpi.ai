import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import { gentelellaClasses } from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'
import { createGentelellaAvatarStack } from '../foundation/index.ts'
import { createGentelellaProgress } from '../feedback/index.ts'

export type GentelellaContactCardConfig = {
    actions?: GentelellaContent
    avatar?: GentelellaContent
    channels?: Array<{
        label: string
        value: GentelellaContent
    }>
    className?: string
    document?: Document
    id: string
    name: string
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
    role?: string
    statistics?: Array<{
        label: string
        value: GentelellaContent
    }>
}

export const createGentelellaContactCard = (config: GentelellaContactCardConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'contact-card',
        {
            attributes: { 'data-id': config.id },
            className: config.className,
            document,
        },
    )
    appendGentelellaContent(element, config.avatar)
    element.append(
        createGentelellaElement(
            'div',
            'name',
            {
                content: config.name,
                document,
            },
        ),
    )

    if (config.role)
        element.append(
            createGentelellaElement(
                'div',
                'role',
                {
                    content: config.role,
                    document,
                },
            ),
        )

    for (const channel of config.channels ?? []) {
        const row = createGentelellaElement(
            'div',
            'contact-channel',
            { document },
        )
        row.append(
            createGentelellaElement(
                'span',
                'label',
                {
                    content: channel.label,
                    document,
                },
            ),
            createGentelellaElement(
                'span',
                'value',
                {
                    content: channel.value,
                    document,
                },
            ),
        )
        element.append(row)
    }

    if (config.statistics?.length) {
        const statistics = createGentelellaElement(
            'div',
            'stats',
            { document },
        )

        for (const statistic of config.statistics) {
            const item = createGentelellaElement(
                'div',
                'stat-block',
                { document },
            )
            item.append(
                createGentelellaElement(
                    'span',
                    'value',
                    {
                        content: statistic.value,
                        document,
                    },
                ),
                createGentelellaElement(
                    'span',
                    'label',
                    {
                        content: statistic.label,
                        document,
                    },
                ),
            )
            statistics.append(item)
        }

        element.append(statistics)
    }

    appendGentelellaContent(element, config.actions)

    if (config.onSelect) {
        element.tabIndex = 0
        element.addEventListener('click', event => config.onSelect?.(config.id, event))
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaProjectCardMember = {
    alt?: string
    background?: string
    initials?: string
    src?: string
}

export type GentelellaProjectCardConfig = {
    actions?: GentelellaContent
    className?: string
    client?: string
    description?: string
    document?: Document
    dueDate?: string
    id: string
    members?: GentelellaProjectCardMember[]
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
    progress?: number
    status?: GentelellaContent
    title: string
}

export const createGentelellaProjectCard = (config: GentelellaProjectCardConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'project-card',
        {
            attributes: { 'data-id': config.id },
            className: config.className,
            document,
        },
    )
    const header = createGentelellaElement(
        'header',
        gentelellaClasses.card.header,
        { document },
    )
    const heading = createGentelellaElement(
        'div',
        '',
        { document },
    )
    heading.append(
        createGentelellaElement(
            'div',
            gentelellaClasses.card.title,
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.client)
        heading.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.card.subtitle,
                {
                    content: config.client,
                    document,
                },
            ),
        )

    header.append(heading)
    appendGentelellaContent(header, config.status)
    element.append(header)

    if (config.description)
        element.append(
            createGentelellaElement(
                'p',
                'desc',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    if (config.progress !== undefined)
        element.append(createGentelellaProgress({
            document,
            label: 'Project progress',
            value: config.progress,
        }).el)

    const footer = createGentelellaElement(
        'footer',
        gentelellaClasses.card.footer,
        { document },
    )

    if (config.members?.length)
        footer.append(createGentelellaAvatarStack({
            avatars: config.members,
            document,
        }).el)

    if (config.dueDate)
        footer.append(
            createGentelellaElement(
                'span',
                'due-date',
                {
                    content: config.dueDate,
                    document,
                },
            ),
        )

    appendGentelellaContent(footer, config.actions)

    if (footer.childNodes.length)
        element.append(footer)

    if (config.onSelect) {
        element.tabIndex = 0
        element.addEventListener('click', event => config.onSelect?.(config.id, event))
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaProfileSummaryConfig = {
    actions?: GentelellaContent
    avatar: GentelellaContent
    className?: string
    document?: Document
    metadata?: Array<{
        label: string
        value: GentelellaContent
    }>
    name: string
    role?: string
}

export const createGentelellaProfileSummary = (config: GentelellaProfileSummaryConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'detail-contact-head',
        {
            className: config.className,
            document,
        },
    )
    appendGentelellaContent(element, config.avatar)
    const text = createGentelellaElement(
        'div',
        '',
        { document },
    )
    text.append(
        createGentelellaElement(
            'div',
            'name',
            {
                content: config.name,
                document,
            },
        ),
    )

    if (config.role)
        text.append(
            createGentelellaElement(
                'div',
                'role',
                {
                    content: config.role,
                    document,
                },
            ),
        )

    element.append(text)

    if (config.metadata?.length) {
        const metadata = createGentelellaElement(
            'dl',
            'detail-contact-fields',
            { document },
        )

        for (const item of config.metadata) {
            const term = createGentelellaElement(
                'dt',
                '',
                { document },
            )
            term.textContent = item.label
            const description = createGentelellaElement(
                'dd',
                '',
                { document },
            )
            appendGentelellaContent(description, item.value)
            metadata.append(term, description)
        }

        element.append(metadata)
    }

    appendGentelellaContent(element, config.actions)

    return createGentelellaComponentInstance(element)
}

export type GentelellaFaqItem = {
    answer: GentelellaContent
    id: string
    question: string
}

export type GentelellaFaqListConfig = {
    className?: string
    document?: Document
    items: GentelellaFaqItem[]
}

export const createGentelellaFaqList = (config: GentelellaFaqListConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'faq-list',
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const details = createGentelellaElement(
            'details',
            'faq-item',
            {
                attributes: { 'data-id': item.id },
                document,
            },
        )
        details.append(
            createGentelellaElement(
                'summary',
                'faq-q',
                {
                    content: item.question,
                    document,
                },
            ),
            createGentelellaElement(
                'div',
                'faq-a',
                {
                    content: item.answer,
                    document,
                },
            ),
        )
        element.append(details)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaIntegrationCardConfig = {
    action?: GentelellaContent
    className?: string
    connected?: boolean
    description?: string
    document?: Document
    icon?: GentelellaContent
    name: string
}

export const createGentelellaIntegrationCard = (config: GentelellaIntegrationCardConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'integration',
        {
            className: config.className,
            document,
        },
    )
    const header = createGentelellaElement(
        'header',
        'integration-head',
        { document },
    )
    appendGentelellaContent(header, config.icon)
    header.append(
        createGentelellaElement(
            'span',
            'name',
            {
                content: config.name,
                document,
            },
        ),
    )

    if (config.connected)
        header.append(
            createGentelellaElement(
                'span',
                `${gentelellaClasses.status.base} ${gentelellaClasses.status.green}`,
                {
                    content: 'Connected',
                    document,
                },
            ),
        )

    element.append(header)

    if (config.description)
        element.append(
            createGentelellaElement(
                'p',
                'desc',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    appendGentelellaContent(element, config.action)

    return createGentelellaComponentInstance(element)
}
