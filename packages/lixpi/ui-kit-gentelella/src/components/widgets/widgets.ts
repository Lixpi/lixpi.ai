import {
    applyCssCustomProperties,
    applyStyle,
} from '@lixpi/ui-primitives/dom'

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
    type GentelellaContent,
} from '../../content.ts'
import { createGentelellaProgress } from '../feedback/index.ts'

export type GentelellaWidgetColor = 'azure' | 'blue' | 'green' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'

export type GentelellaStatConfig = {
    change?: {
        direction: 'down' | 'up'
        value: string
    }
    className?: string
    color?: GentelellaWidgetColor
    document?: Document
    icon?: GentelellaContent
    label: string
    subtext?: string
    value: GentelellaContent
}

export const createGentelellaStat = (config: GentelellaStatConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.widget.stat,
        {
            className: config.className,
            document,
        },
    )

    if (config.icon) {
        element.append(
            createGentelellaElement(
                'div',
                combineGentelellaClassNames(gentelellaClasses.widget.statIcon, config.color),
                {
                    content: config.icon,
                    document,
                },
            ),
        )
    }

    const content = createGentelellaElement(
        'div',
        gentelellaClasses.widget.statContent,
        { document },
    )
    content.append(
        createGentelellaElement(
            'div',
            gentelellaClasses.widget.statLabel,
            {
                content: config.label,
                document,
            },
        ),
    )
    const valueRow = createGentelellaElement(
        'div',
        gentelellaClasses.widget.statValueRow,
        { document },
    )
    valueRow.append(
        createGentelellaElement(
            'span',
            gentelellaClasses.widget.statValue,
            {
                content: config.value,
                document,
            },
        ),
    )

    if (config.change) {
        valueRow.append(
            createGentelellaElement(
                'span',
                combineGentelellaClassNames(gentelellaClasses.widget.statChange, config.change.direction),
                {
                    content: `${config.change.direction === 'up' ? '↑' : '↓'} ${config.change.value}`,
                    document,
                },
            ),
        )
    }

    content.append(valueRow)

    if (config.subtext)
        content.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.widget.statSubtext,
                {
                    content: config.subtext,
                    document,
                },
            ),
        )

    element.append(content)

    return createGentelellaComponentInstance(element)
}

export type GentelellaActivity = {
    avatar?: GentelellaContent
    body: GentelellaContent
    time: string
}

export type GentelellaActivityFeedConfig = {
    className?: string
    document?: Document
    items: GentelellaActivity[]
}

export const createGentelellaActivityFeed = (config: GentelellaActivityFeedConfig): GentelellaComponentInstance<HTMLUListElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'ul',
        gentelellaClasses.activity.list,
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const row = createGentelellaElement(
            'li',
            gentelellaClasses.activity.item,
            { document },
        )

        if (item.avatar)
            row.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.activity.avatar,
                    {
                        content: item.avatar,
                        document,
                    },
                ),
            )

        const body = createGentelellaElement(
            'div',
            gentelellaClasses.activity.body,
            {
                content: item.body,
                document,
            },
        )
        body.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.activity.time,
                {
                    content: item.time,
                    document,
                },
            ),
        )
        row.append(body)
        element.append(row)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaVisitorDistributionItem = {
    color?: string
    flag?: string
    name: string
    percent: number
}

export type GentelellaVisitorDistributionConfig = {
    className?: string
    document?: Document
    items: GentelellaVisitorDistributionItem[]
}

export const createGentelellaVisitorDistribution = (config: GentelellaVisitorDistributionConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        '',
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const row = createGentelellaElement(
            'div',
            gentelellaClasses.widget.visitorRow,
            { document },
        )

        if (item.flag)
            row.append(
                createGentelellaElement(
                    'span',
                    gentelellaClasses.widget.visitorFlag,
                    {
                        content: item.flag,
                        document,
                    },
                ),
            )

        row.append(
            createGentelellaElement(
                'span',
                gentelellaClasses.widget.visitorName,
                {
                    content: item.name,
                    document,
                },
            ),
        )
        const bar = createGentelellaElement(
            'span',
            gentelellaClasses.widget.visitorBar,
            { document },
        )
        const fill = createGentelellaElement(
            'span',
            'fill',
            { document },
        )
        applyStyle(
            fill,
            {
                width: `${Math.max(
                    0,
                    Math.min(100, item.percent),
                )}%`,
            },
        )

        if (item.color)
            applyStyle(fill, { background: item.color })

        bar.append(fill)
        row.append(bar)
        row.append(
            createGentelellaElement(
                'span',
                gentelellaClasses.widget.visitorPercent,
                {
                    content: `${item.percent}%`,
                    document,
                },
            ),
        )
        element.append(row)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaTodoItem = {
    completed?: boolean
    date?: string
    id: string
    priority?: 'blue' | 'green' | 'red' | 'yellow'
    text: GentelellaContent
}

export type GentelellaTodoListConfig = {
    className?: string
    document?: Document
    items: GentelellaTodoItem[]
    onChange?: (
        id: string,
        completed: boolean,
    ) => void
}

export type GentelellaTodoListInstance = GentelellaComponentInstance<HTMLDivElement> & {
    getRemainingCount: () => number
    setCompleted: (
        id: string,
        completed: boolean,
    ) => void
}

type GentelellaTodoElements = {
    checkbox: HTMLButtonElement
    row: HTMLDivElement
}

class GentelellaTodoList extends GentelellaElementComponent<HTMLDivElement> implements GentelellaTodoListInstance {
    private readonly items = new Map<string, GentelellaTodoElements>()

    constructor(private readonly config: GentelellaTodoListConfig) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            '',
            {
                className: config.className,
                document,
            },
        )
        super(element)

        for (const item of config.items)
            this.el.append(
                this.renderItem(item, document),
            )
    }

    setCompleted(
        id: string,
        completed: boolean,
    ): void {
        const item = this.items.get(id)

        if (!item)
            return

        item.checkbox.classList.toggle(gentelellaClasses.state.done, completed)
        item.checkbox.setAttribute(
            'aria-checked',
            String(completed),
        )
        item.row.classList.toggle(gentelellaClasses.state.done, completed)
    }

    private renderItem(
        item: GentelellaTodoItem,
        document: Document,
    ): HTMLDivElement {
        const row = createGentelellaElement(
            'div',
            combineGentelellaClassNames(gentelellaClasses.widget.todoRow, item.completed && gentelellaClasses.state.done),
            {
                attributes: { 'data-todo-id': item.id },
                document,
            },
        )
        const checkbox = createGentelellaElement(
            'button',
            combineGentelellaClassNames(gentelellaClasses.widget.todoCheckbox, item.completed && gentelellaClasses.state.done),
            {
                attributes: {
                    'aria-checked': String(item.completed ?? false),
                    'aria-label': 'Toggle task',
                    role: 'checkbox',
                    type: 'button',
                },
                document,
            },
        )
        checkbox.addEventListener('click', () => {
            const completed = checkbox.getAttribute('aria-checked') !== 'true'
            this.setCompleted(item.id, completed)
            this.config.onChange?.(item.id, completed)
        })
        const text = createGentelellaElement(
            'div',
            gentelellaClasses.widget.todoText,
            {
                content: item.text,
                document,
            },
        )
        row.append(checkbox, text)

        if (item.priority)
            row.append(
                createGentelellaElement(
                    'span',
                    combineGentelellaClassNames(gentelellaClasses.widget.todoPriority, item.priority),
                    { document },
                ),
            )

        if (item.date)
            row.append(
                createGentelellaElement(
                    'span',
                    gentelellaClasses.widget.todoDate,
                    {
                        content: item.date,
                        document,
                    },
                ),
            )

        this.items.set(
            item.id,
            {
                checkbox,
                row,
            },
        )

        return row
    }

    getRemainingCount(): number {
        return [...this.items.values()].filter(item => item.checkbox.getAttribute('aria-checked') !== 'true').length
    }

    override destroy(): void {
        this.items.clear()
        super.destroy()
    }
}

export const createGentelellaTodoList = (config: GentelellaTodoListConfig): GentelellaTodoListInstance => new GentelellaTodoList(config)

export type GentelellaLegendItem = {
    color: string
    label: string
    value?: GentelellaContent
}

export type GentelellaLegendConfig = {
    className?: string
    document?: Document
    items: GentelellaLegendItem[]
    variant: 'donut' | 'storage'
}

export const createGentelellaLegend = (config: GentelellaLegendConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const listClass = config.variant === 'donut'
        ? gentelellaClasses.widget.donutLegend
        : gentelellaClasses.widget.storageLegend
    const itemClass = config.variant === 'donut'
        ? gentelellaClasses.widget.donutLegendItem
        : gentelellaClasses.widget.storageLegendItem
    const element = createGentelellaElement(
        'div',
        listClass,
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const row = createGentelellaElement(
            'div',
            itemClass,
            { document },
        )
        const dot = createGentelellaElement(
            'span',
            'dot',
            { document },
        )
        applyStyle(dot, { background: item.color })
        row.append(
            dot,
            createGentelellaElement(
                'span',
                'label',
                {
                    content: item.label,
                    document,
                },
            ),
        )

        if (item.value !== undefined)
            row.append(
                createGentelellaElement(
                    'span',
                    'value',
                    {
                        content: item.value,
                        document,
                    },
                ),
            )

        element.append(row)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaVersionDistributionItem = {
    color?: string
    label: string
    percent: number
}

export type GentelellaVersionDistributionConfig = {
    className?: string
    document?: Document
    items: GentelellaVersionDistributionItem[]
}

export const createGentelellaVersionDistribution = (config: GentelellaVersionDistributionConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        '',
        {
            className: config.className,
            document,
        },
    )

    for (const item of config.items) {
        const row = createGentelellaElement(
            'div',
            gentelellaClasses.widget.versionRow,
            { document },
        )
        row.append(
            createGentelellaElement(
                'span',
                gentelellaClasses.widget.versionLabel,
                {
                    content: item.label,
                    document,
                },
            ),
        )
        const bar = createGentelellaElement(
            'div',
            gentelellaClasses.widget.versionBar,
            { document },
        )
        const progress = createGentelellaProgress({
            color: item.color,
            document,
            label: item.label,
            value: item.percent,
        })
        bar.append(progress.el)
        row.append(
            bar,
            createGentelellaElement(
                'span',
                gentelellaClasses.widget.versionPercent,
                {
                    content: `${item.percent}%`,
                    document,
                },
            ),
        )
        element.append(row)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaProfileRingConfig = {
    className?: string
    content?: GentelellaContent
    document?: Document
    label: string
    percent: number
}

export const createGentelellaProfileRing = (config: GentelellaProfileRingConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.widget.profileRing,
        {
            attributes: {
                'aria-label': `${config.label}: ${config.percent}%`,
                role: 'img',
            },
            className: config.className,
            document,
        },
    )
    const ring = createGentelellaElement(
        'div',
        'ring-wrap',
        { document },
    )
    applyCssCustomProperties(
        ring,
        {
            '--value': String(
                Math.max(
                    0,
                    Math.min(100, config.percent),
                ),
            ),
        },
    )
    const center = createGentelellaElement(
        'div',
        'ring-center',
        {
            content: config.content ?? `${config.percent}%`,
            document,
        },
    )
    ring.append(center)
    element.append(ring)

    return createGentelellaComponentInstance(element)
}
