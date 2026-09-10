import { applyStyle } from '@lixpi/ui-primitives/dom'

import { initTables } from '../../runtime/tables.ts'
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

export type GentelellaDataTableColumn<Row> = {
    align?: 'center' | 'left' | 'right'
    header: GentelellaContent
    orderable?: boolean
    render: (
        row: Row,
        rowIndex: number,
    ) => GentelellaContent
}

export type GentelellaDataTableConfig<Row> = {
    ariaLabel: string
    className?: string
    columns: GentelellaDataTableColumn<Row>[]
    document?: Document
    exportName?: string
    getRowId?: (
        row: Row,
        rowIndex: number,
    ) => string
    onSelectionChange?: (selectedIds: string[]) => void
    pageLength?: number
    responsive?: boolean
    rows: Row[]
    selectable?: boolean
}

export type GentelellaDataTableInstance<Row> = GentelellaComponentInstance<HTMLElement> & {
    readonly tableEl: HTMLTableElement
    getSelectedIds: () => string[]
    initialize: () => Promise<void>
    setRows: (rows: Row[]) => void
}

class GentelellaDataTable<Row> implements GentelellaDataTableInstance<Row> {
    readonly el: HTMLElement
    readonly tableEl: HTMLTableElement

    private readonly bodyEl: HTMLTableSectionElement
    private readonly document: Document
    private readonly rowCheckboxes = new Map<string, HTMLInputElement>()

    constructor(private readonly config: GentelellaDataTableConfig<Row>) {
        this.document = config.document ?? globalThis.document
        this.tableEl = createGentelellaElement(
            'table',
            gentelellaClasses.table.base,
            {
                attributes: {
                    'aria-label': config.ariaLabel,
                    'data-datatable': true,
                    'data-export': config.exportName,
                    'data-page-length': config.pageLength,
                    'data-selectable': config.selectable,
                },
                className: config.className,
                document: this.document,
            },
        )
        this.bodyEl = createGentelellaElement(
            'tbody',
            '',
            { document: this.document },
        )
        this.tableEl.append(
            this.renderHead(),
            this.bodyEl,
        )
        this.setRows(config.rows)
        this.el = config.responsive === false
            ? this.tableEl
            : createGentelellaElement(
                'div',
                gentelellaClasses.table.responsive,
                {
                    content: this.tableEl,
                    document: this.document,
                },
            )
    }

    private renderHead(): HTMLTableSectionElement {
        const head = createGentelellaElement(
            'thead',
            '',
            { document: this.document },
        )
        const row = createGentelellaElement(
            'tr',
            '',
            { document: this.document },
        )

        if (this.config.selectable) {
            const heading = createGentelellaElement(
                'th',
                '',
                { document: this.document },
            )
            heading.setAttribute('data-orderable', 'false')
            row.append(heading)
        }

        for (const column of this.config.columns) {
            const heading = createGentelellaElement(
                'th',
                '',
                { document: this.document },
            )

            if (column.orderable === false)
                heading.setAttribute('data-orderable', 'false')

            if (column.align)
                applyStyle(heading, { textAlign: column.align })

            appendGentelellaContent(heading, column.header)
            row.append(heading)
        }

        head.append(row)

        return head
    }

    private emitSelection = (): void => void this.config.onSelectionChange?.(
        this.getSelectedIds(),
    )

    getSelectedIds(): string[] {
        return [...this.rowCheckboxes].filter(([, checkbox]) => checkbox.checked).map(([id]) => id)
    }

    setRows(rows: Row[]): void {
        this.bodyEl.replaceChildren()
        this.rowCheckboxes.clear()

        rows.forEach((row, rowIndex) => {
            const rowId = this.config.getRowId?.(row, rowIndex) ?? String(rowIndex)
            const rowEl = createGentelellaElement(
                'tr',
                '',
                {
                    attributes: { 'data-row-id': rowId },
                    document: this.document,
                },
            )

            if (this.config.selectable)
                rowEl.append(
                    this.renderSelectionCell(rowId, rowIndex),
                )

            for (const column of this.config.columns) {
                const cell = createGentelellaElement(
                    'td',
                    '',
                    { document: this.document },
                )

                if (column.align)
                    applyStyle(cell, { textAlign: column.align })

                appendGentelellaContent(
                    cell,
                    column.render(row, rowIndex),
                )
                rowEl.append(cell)
            }

            this.bodyEl.append(rowEl)
        })
    }

    private renderSelectionCell(
        rowId: string,
        rowIndex: number,
    ): HTMLTableCellElement {
        const cell = createGentelellaElement(
            'td',
            '',
            { document: this.document },
        )
        const checkbox = createGentelellaElement(
            'input',
            'row-cb',
            {
                attributes: {
                    'aria-label': `Select row ${rowIndex + 1}`,
                    type: 'checkbox',
                },
                document: this.document,
            },
        )
        checkbox.addEventListener('change', this.emitSelection)
        this.rowCheckboxes.set(rowId, checkbox)
        cell.append(checkbox)

        return cell
    }

    initialize(): Promise<void> {
        return initTables()
    }

    destroy(): void {
        this.rowCheckboxes.clear()
        this.el.remove()
    }
}

export const createGentelellaDataTable = <Row>(config: GentelellaDataTableConfig<Row>): GentelellaDataTableInstance<Row> =>
    new GentelellaDataTable(config)

export type GentelellaCustomerCellConfig = {
    avatarColor?: string
    className?: string
    document?: Document
    initials?: string
    name: string
}

export const createGentelellaCustomerCell = (config: GentelellaCustomerCellConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.table.cellCustomer,
        {
            className: config.className,
            document,
        },
    )
    const avatar = createGentelellaElement(
        'div',
        gentelellaClasses.table.cellAvatar,
        {
            content: config.initials ?? config.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
            document,
        },
    )

    if (config.avatarColor)
        applyStyle(avatar, { background: config.avatarColor })

    const name = createGentelellaElement(
        'span',
        gentelellaClasses.table.cellStrong,
        {
            content: config.name,
            document,
        },
    )
    element.append(avatar, name)

    return createGentelellaComponentInstance(element)
}
