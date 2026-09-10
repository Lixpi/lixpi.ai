import { applyCssCustomProperties } from '@lixpi/ui-primitives/dom'

import { initCalendar } from '../../runtime/calendar.ts'
import { initFileManager } from '../../runtime/file-manager.ts'
import { initInbox } from '../../runtime/inbox.ts'
import { initKanban } from '../../runtime/kanban.ts'
import { initSettings } from '../../runtime/settings.ts'
import {
    GentelellaElementComponent,
    createGentelellaComponentInstance,
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
import { createGentelellaAvatar } from '../foundation/index.ts'

export type GentelellaCalendarEvent = {
    color?: string
    id: string
    label: string
}

export type GentelellaCalendarDay = {
    date: string
    day: number
    events?: GentelellaCalendarEvent[]
    muted?: boolean
    today?: boolean
}

export type GentelellaCalendarConfig = {
    className?: string
    days: GentelellaCalendarDay[]
    document?: Document
    label: string
    monthLabel: string
    onEventSelect?: (
        eventId: string,
        event: MouseEvent,
    ) => void
    onNavigate?: (direction: 'next' | 'previous' | 'today') => void
    weekdays?: string[]
}

export type GentelellaCalendarInstance = GentelellaComponentInstance<HTMLDivElement> & {
    initialize: () => void
}

class GentelellaRuntimeApplication<ElementType extends HTMLElement, InitializationResult> extends GentelellaElementComponent<ElementType> {
    constructor(
        element: ElementType,
        private readonly initializer: () => InitializationResult,
    ) {
        super(element)
    }

    initialize(): InitializationResult {
        return this.initializer()
    }
}

export const createGentelellaCalendar = (config: GentelellaCalendarConfig): GentelellaCalendarInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        '',
        {
            className: config.className,
            document,
        },
    )
    const toolbar = createGentelellaElement(
        'div',
        'calendar-toolbar',
        { document },
    )
    const createNavigationButton = (
        direction: 'next' | 'previous' | 'today',
        label: string,
    ): HTMLButtonElement => {
        const button = createGentelellaElement(
            'button',
            gentelellaClasses.button.ghost,
            {
                attributes: {
                    'aria-label': label,
                    type: 'button',
                },
                content: direction === 'previous'
                    ? '‹'
                    : direction === 'next'
                        ? '›'
                        : label,
                document,
            },
        )
        button.classList.add(gentelellaClasses.button.base)
        button.addEventListener('click', () => config.onNavigate?.(direction))

        return button
    }
    toolbar.append(
        createNavigationButton('previous', 'Previous month'),
        createGentelellaElement(
            'div',
            'calendar-month',
            {
                content: config.monthLabel,
                document,
            },
        ),
        createNavigationButton('today', 'Today'),
        createNavigationButton('next', 'Next month'),
    )
    const grid = createGentelellaElement(
        'div',
        'calendar-grid',
        {
            attributes: {
                'aria-label': config.label,
                role: 'grid',
            },
            document,
        },
    )

    for (const weekday of config.weekdays ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        grid.append(
            createGentelellaElement(
                'div',
                'dow',
                {
                    content: weekday,
                    document,
                },
            ),
        )

    for (const day of config.days) {
        const cell = createGentelellaElement(
            'div',
            combineGentelellaClassNames(
                'calendar-day',
                day.muted && 'muted',
                day.today && 'today',
            ),
            {
                attributes: {
                    'aria-label': day.date,
                    role: 'gridcell',
                },
                document,
            },
        )
        cell.append(
            createGentelellaElement(
                'span',
                'day-num',
                {
                    content: day.day,
                    document,
                },
            ),
        )

        for (const calendarEvent of day.events ?? []) {
            const eventButton = createGentelellaElement(
                'button',
                'calendar-event',
                {
                    attributes: {
                        'data-id': calendarEvent.id,
                        type: 'button',
                    },
                    content: calendarEvent.label,
                    document,
                },
            )

            if (calendarEvent.color)
                applyCssCustomProperties(eventButton, { '--event-color': calendarEvent.color })

            eventButton.addEventListener('click', event => config.onEventSelect?.(calendarEvent.id, event))
            cell.append(eventButton)
        }

        grid.append(cell)
    }

    element.append(toolbar, grid)

    return new GentelellaRuntimeApplication(element, initCalendar)
}

export type GentelellaChatConversationConfig = {
    active?: boolean
    className?: string
    document?: Document
    id: string
    initials?: string
    message: string
    name: string
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
    online?: boolean
    time?: string
    unreadCount?: number
}

export const createGentelellaChatConversation = (config: GentelellaChatConversationConfig): GentelellaComponentInstance<HTMLButtonElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'button',
        combineGentelellaClassNames('chat-conversation', config.active && gentelellaClasses.state.active),
        {
            attributes: {
                'aria-current': config.active ? 'true' : undefined,
                'data-id': config.id,
                type: 'button',
            },
            className: config.className,
            document,
        },
    )
    const avatar = createGentelellaAvatar({
        document,
        initials: config.initials ?? config.name.slice(0, 2).toUpperCase(),
        size: 'small',
        status: config.online ? 'online' : 'offline',
    })
    const body = createGentelellaElement(
        'span',
        'chat-conversation-body',
        { document },
    )
    body.append(
        createGentelellaElement(
            'span',
            'name',
            {
                content: config.name,
                document,
            },
        ),
        createGentelellaElement(
            'span',
            'desc',
            {
                content: config.message,
                document,
            },
        ),
    )
    const meta = createGentelellaElement(
        'span',
        'meta',
        { document },
    )

    if (config.time)
        meta.append(
            createGentelellaElement(
                'span',
                'time',
                {
                    content: config.time,
                    document,
                },
            ),
        )

    if (config.unreadCount)
        meta.append(
            createGentelellaElement(
                'span',
                'cnt',
                {
                    content: config.unreadCount,
                    document,
                },
            ),
        )

    element.append(
        avatar.el,
        body,
        meta,
    )
    element.addEventListener('click', event => config.onSelect?.(config.id, event))

    return createGentelellaComponentInstance(element)
}

export type GentelellaChatBubbleConfig = {
    author?: string
    className?: string
    content: GentelellaContent
    document?: Document
    mine?: boolean
    time?: string
}

export const createGentelellaChatBubble = (config: GentelellaChatBubbleConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        combineGentelellaClassNames('chat-bubble', config.mine ? 'mine' : 'theirs'),
        {
            className: config.className,
            document,
        },
    )

    if (config.author)
        element.append(
            createGentelellaElement(
                'div',
                'name',
                {
                    content: config.author,
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'div',
            'bubble',
            {
                content: config.content,
                document,
            },
        ),
    )

    if (config.time)
        element.append(
            createGentelellaElement(
                'div',
                'time',
                {
                    content: config.time,
                    document,
                },
            ),
        )

    return createGentelellaComponentInstance(element)
}

export type GentelellaChatComposerConfig = {
    className?: string
    document?: Document
    onSend: (message: string) => void
    placeholder?: string
}

export type GentelellaChatComposerInstance = GentelellaComponentInstance<HTMLFormElement> & {
    readonly inputEl: HTMLTextAreaElement
    clear: () => void
}

class GentelellaChatComposer extends GentelellaElementComponent<HTMLFormElement> implements GentelellaChatComposerInstance {
    readonly inputEl: HTMLTextAreaElement

    constructor(private readonly config: GentelellaChatComposerConfig) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'form',
            'chat-composer',
            {
                className: config.className,
                document,
            },
        )
        const input = createGentelellaElement(
            'textarea',
            gentelellaClasses.form.control,
            { document },
        )
        input.placeholder = config.placeholder ?? 'Write a message…'
        const submit = createGentelellaElement(
            'button',
            'composer-send',
            {
                attributes: {
                    'aria-label': 'Send message',
                    type: 'submit',
                },
                content: 'Send',
                document,
            },
        )
        element.append(input, submit)
        super(element)
        this.inputEl = input
        this.el.addEventListener('submit', this.handleSubmit)
    }

    private handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault()
        const value = this.inputEl.value.trim()

        if (!value)
            return

        this.config.onSend(value)
    }

    clear(): void {
        this.inputEl.value = ''
    }

    override destroy(): void {
        this.el.removeEventListener('submit', this.handleSubmit)
        super.destroy()
    }
}

export const createGentelellaChatComposer = (config: GentelellaChatComposerConfig): GentelellaChatComposerInstance =>
    new GentelellaChatComposer(config)

export type GentelellaChatLayoutConfig = {
    className?: string
    conversations: GentelellaContent
    document?: Document
    thread: GentelellaContent
}

export const createGentelellaChatLayout = (config: GentelellaChatLayoutConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'chat-layout',
        {
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'aside',
            'chat-rail',
            {
                content: config.conversations,
                document,
            },
        ),
        createGentelellaElement(
            'section',
            'chat-thread',
            {
                content: config.thread,
                document,
            },
        ),
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaKanbanCardConfig = {
    assignees?: GentelellaContent
    className?: string
    description?: string
    document?: Document
    id: string
    labels?: Array<{
        color: 'blue' | 'green' | 'purple' | 'red' | 'yellow'
        text: string
    }>
    metadata?: GentelellaContent
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
    title: string
}

export const createGentelellaKanbanCard = (config: GentelellaKanbanCardConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'kanban-card',
        {
            attributes: {
                'data-id': config.id,
                tabindex: 0,
            },
            className: config.className,
            document,
        },
    )

    if (config.labels?.length) {
        const labels = createGentelellaElement(
            'div',
            'kanban-card-labels',
            { document },
        )

        for (const label of config.labels) {
            labels.append(
                createGentelellaElement(
                    'span',
                    combineGentelellaClassNames('kanban-label', `kanban-label-${label.color}`),
                    {
                        content: label.text,
                        document,
                    },
                ),
            )
        }

        element.append(labels)
    }

    element.append(
        createGentelellaElement(
            'div',
            'kanban-card-title',
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.description)
        element.append(
            createGentelellaElement(
                'div',
                'kanban-card-desc',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    const footer = createGentelellaElement(
        'footer',
        'kanban-card-foot',
        { document },
    )
    appendGentelellaContent(footer, config.metadata)

    if (config.assignees)
        footer.append(
            createGentelellaElement(
                'div',
                'kanban-card-avatars',
                {
                    content: config.assignees,
                    document,
                },
            ),
        )

    if (footer.childNodes.length)
        element.append(footer)

    element.addEventListener('click', event => config.onSelect?.(config.id, event))

    return createGentelellaComponentInstance(element)
}

export type GentelellaKanbanColumnConfig = {
    cards: GentelellaContent
    className?: string
    count?: number
    document?: Document
    id: string
    onAdd?: (id: string) => void
    title: string
}

export const createGentelellaKanbanColumn = (config: GentelellaKanbanColumnConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'kanban-column',
        {
            attributes: { 'data-id': config.id },
            className: config.className,
            document,
        },
    )
    const header = createGentelellaElement(
        'header',
        'kanban-column-head',
        { document },
    )
    header.append(
        createGentelellaElement(
            'span',
            'title',
            {
                content: config.title,
                document,
            },
        ),
        createGentelellaElement(
            'span',
            'count',
            {
                content: config.count ?? 0,
                document,
            },
        ),
    )
    const body = createGentelellaElement(
        'div',
        'kanban-column-body',
        {
            content: config.cards,
            document,
        },
    )
    const footer = createGentelellaElement(
        'footer',
        'kanban-column-foot',
        { document },
    )
    const addButton = createGentelellaElement(
        'button',
        'kanban-add',
        {
            attributes: { type: 'button' },
            content: '+ Add card',
            document,
        },
    )
    addButton.addEventListener('click', () => config.onAdd?.(config.id))
    footer.append(addButton)
    element.append(
        header,
        body,
        footer,
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaKanbanBoardConfig = {
    className?: string
    columns: GentelellaContent
    document?: Document
}

export type GentelellaKanbanBoardInstance = GentelellaComponentInstance<HTMLDivElement> & {
    initialize: () => void
}

export const createGentelellaKanbanBoard = (config: GentelellaKanbanBoardConfig): GentelellaKanbanBoardInstance => {
    const element = createGentelellaElement(
        'div',
        'kanban-board',
        {
            className: config.className,
            content: config.columns,
            document: config.document,
        },
    )

    return new GentelellaRuntimeApplication(element, initKanban)
}

export type GentelellaFileItemConfig = {
    className?: string
    document?: Document
    id: string
    kind: 'file' | 'folder'
    metadata?: string
    name: string
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
    starred?: boolean
}

export const createGentelellaFileItem = (config: GentelellaFileItemConfig): GentelellaComponentInstance<HTMLButtonElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'button',
        combineGentelellaClassNames('fm-item', config.starred && 'starred'),
        {
            attributes: {
                'data-id': config.id,
                type: 'button',
            },
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'span',
            'fm-item-icon',
            {
                content: config.kind === 'folder' ? '▰' : '▤',
                document,
            },
        ),
        createGentelellaElement(
            'span',
            'fm-item-name',
            {
                content: config.name,
                document,
            },
        ),
    )

    if (config.metadata)
        element.append(
            createGentelellaElement(
                'span',
                'fm-item-meta',
                {
                    content: config.metadata,
                    document,
                },
            ),
        )

    element.addEventListener('click', event => config.onSelect?.(config.id, event))

    return createGentelellaComponentInstance(element)
}

export type GentelellaFileManagerConfig = {
    className?: string
    document?: Document
    items: GentelellaContent
    navigation?: GentelellaContent
    storage?: GentelellaContent
    toolbar?: GentelellaContent
    view?: 'grid' | 'list'
}

export type GentelellaFileManagerInstance = GentelellaComponentInstance<HTMLDivElement> & {
    initialize: () => void
    setView: (view: 'grid' | 'list') => void
}

class GentelellaFileManager extends GentelellaElementComponent<HTMLDivElement> implements GentelellaFileManagerInstance {
    private readonly gridEl: HTMLDivElement

    constructor(config: GentelellaFileManagerConfig) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            'file-manager',
            {
                className: config.className,
                document,
            },
        )
        const layout = createGentelellaElement(
            'div',
            'fm-layout',
            { document },
        )
        const tree = createGentelellaElement(
            'aside',
            'fm-tree-wrap',
            {
                content: config.navigation,
                document,
            },
        )
        appendGentelellaContent(tree, config.storage)
        const main = createGentelellaElement(
            'section',
            'fm-main',
            { document },
        )

        if (config.toolbar)
            main.append(
                createGentelellaElement(
                    'div',
                    'fm-toolbar',
                    {
                        content: config.toolbar,
                        document,
                    },
                ),
            )

        const grid = createGentelellaElement(
            'div',
            'fm-grid',
            {
                content: config.items,
                document,
            },
        )
        main.append(grid)
        layout.append(tree, main)
        element.append(layout)
        super(element)
        this.gridEl = grid
        this.setView(config.view ?? 'grid')
    }

    initialize(): void {
        initFileManager()
    }

    setView(view: 'grid' | 'list'): void {
        this.gridEl.classList.toggle('view-grid', view === 'grid')
        this.gridEl.classList.toggle('view-list', view === 'list')
    }
}

export const createGentelellaFileManager = (config: GentelellaFileManagerConfig): GentelellaFileManagerInstance => new GentelellaFileManager(config)

export type GentelellaNotificationKind = 'alert' | 'info' | 'mention' | 'task'

export type GentelellaNotification = {
    body: GentelellaContent
    from?: string
    id: string
    kind: GentelellaNotificationKind
    time?: string
    unread?: boolean
}

export type GentelellaNotificationListConfig = {
    className?: string
    document?: Document
    items: GentelellaNotification[]
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
}

export const createGentelellaNotificationList = (config: GentelellaNotificationListConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'notifications-list',
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const row = createGentelellaElement(
            'button',
            combineGentelellaClassNames('notification-row', item.unread && gentelellaClasses.state.unread),
            {
                attributes: {
                    'data-id': item.id,
                    type: 'button',
                },
                document,
            },
        )
        row.append(
            createGentelellaElement(
                'span',
                combineGentelellaClassNames('notif-icon', `notif-${item.kind}`),
                {
                    attributes: { 'aria-hidden': true },
                    document,
                },
            ),
        )
        const body = createGentelellaElement(
            'span',
            'notif-body',
            { document },
        )

        if (item.from)
            body.append(
                createGentelellaElement(
                    'span',
                    'notif-from',
                    {
                        content: item.from,
                        document,
                    },
                ),
            )

        body.append(
            createGentelellaElement(
                'span',
                'notif-text',
                {
                    content: item.body,
                    document,
                },
            ),
        )

        if (item.time)
            body.append(
                createGentelellaElement(
                    'span',
                    'notif-time',
                    {
                        content: item.time,
                        document,
                    },
                ),
            )

        row.append(body)
        row.addEventListener('click', event => config.onSelect?.(item.id, event))
        element.append(row)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaSettingsRowConfig = {
    className?: string
    control: GentelellaContent
    description?: string
    document?: Document
    label: string
}

export const createGentelellaSettingsRow = (config: GentelellaSettingsRowConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'settings-row',
        {
            className: config.className,
            document,
        },
    )
    const text = createGentelellaElement(
        'div',
        'settings-control',
        { document },
    )
    text.append(
        createGentelellaElement(
            'div',
            'label',
            {
                content: config.label,
                document,
            },
        ),
    )

    if (config.description)
        text.append(
            createGentelellaElement(
                'div',
                'settings-hint',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    element.append(text)
    appendGentelellaContent(element, config.control)

    return createGentelellaComponentInstance(element)
}

export type GentelellaSettingsSectionConfig = {
    actions?: GentelellaContent
    className?: string
    description?: string
    document?: Document
    rows: GentelellaContent
    title: string
}

export type GentelellaSettingsSectionInstance = GentelellaComponentInstance<HTMLElement> & {
    initialize: () => void
}

export const createGentelellaSettingsSection = (config: GentelellaSettingsSectionConfig): GentelellaSettingsSectionInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'settings-section',
        {
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'h2',
            'settings-section-title',
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.description)
        element.append(
            createGentelellaElement(
                'p',
                'settings-section-desc',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'div',
            'settings-form',
            {
                content: config.rows,
                document,
            },
        ),
    )

    if (config.actions)
        element.append(
            createGentelellaElement(
                'footer',
                'settings-actions',
                {
                    content: config.actions,
                    document,
                },
            ),
        )

    return new GentelellaRuntimeApplication(element, initSettings)
}

export type GentelellaInboxRootConfig = {
    className?: string
    document?: Document
    id?: string
}

export type GentelellaInboxRootInstance = GentelellaComponentInstance<HTMLDivElement> & {
    initialize: () => Promise<void>
}

export const createGentelellaInboxRoot = (config: GentelellaInboxRootConfig = {}): GentelellaInboxRootInstance => {
    const element = createGentelellaElement(
        'div',
        'inbox-layout',
        {
            attributes: { id: config.id ?? 'inbox-root' },
            className: config.className,
            document: config.document,
        },
    )

    return new GentelellaRuntimeApplication(element, initInbox)
}
