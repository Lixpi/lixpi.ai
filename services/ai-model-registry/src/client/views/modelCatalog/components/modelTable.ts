// The model list, grouped by provider. Each group opens with the provider's own
// band, which carries its counts and its sync configuration, and is followed by
// that provider's models. Clicking a row opens the detail panel.

import {
    createGentelellaChip,
    type GentelellaChipInstance,
} from '@lixpi/ui-kit-gentelella/components/chip'
import {
    createGentelellaEmptyState,
    type GentelellaEmptyStateInstance,
} from '@lixpi/ui-kit-gentelella/components/empty-state'
import {
    createGentelellaSpinner,
    type GentelellaSpinnerInstance,
} from '@lixpi/ui-kit-gentelella/components/spinner'
import {
    createGentelellaStatus,
    type GentelellaStatusInstance,
} from '@lixpi/ui-kit-gentelella/components/status'
import {
    createGentelellaTable,
    type GentelellaTableInstance,
} from '@lixpi/ui-kit-gentelella/components/table'
import { gentelellaClasses } from '@lixpi/ui-kit-gentelella/class-names'
import { html } from '@lixpi/ui-primitives/dom'

import {
    formatNumber,
    modalityTitles,
    modelTitle,
    pricingSummary,
    shortModel,
    STATUS_LABELS,
    STATUS_TONES,
} from '$src/views/modelCatalog/modelFormatting.ts'
import {
    type CatalogModel,
    type CatalogProvider,
} from '$src/views/modelCatalog/types.ts'

export type ModelGroup = {
    provider: CatalogProvider
    models: CatalogModel[]
    totalModels: number
    collapsed: boolean
}

export type ModelTableConfig = {
    onSelect: (model: CatalogModel) => void
    // The provider band. The view owns it because it writes to the registry,
    // which is not the table's business.
    renderGroupHeader: (group: ModelGroup) => HTMLElement
}

export type ModelTableInstance = {
    el: HTMLElement
    render: (
        groups: ModelGroup[],
        selectedKey: string | null,
        // `provider/modelId` of every model a running sync is working on.
        syncingModels: string[],
    ) => void
    destroy: () => void
}

const COLUMN_COUNT = 7

class ModelTable implements ModelTableInstance {
    readonly el: HTMLElement

    private readonly table: GentelellaTableInstance
    private readonly tableEl: HTMLTableElement
    private readonly headEl: HTMLTableSectionElement
    private renderedComponents: Array<
        | GentelellaChipInstance
        | GentelellaEmptyStateInstance
        | GentelellaSpinnerInstance
        | GentelellaStatusInstance
    > = []

    constructor(private readonly config: ModelTableConfig) {
        this.headEl = html`
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Modalities</th>
                    <th>Context</th>
                    <th>Rate</th>
                    <th>Sources</th>
                    <th>Drift</th>
                    <th>Status</th>
                </tr>
            </thead>
        ` as HTMLTableSectionElement

        this.table = createGentelellaTable({ className: 'model-catalog-table' })
        this.tableEl = this.table.tableEl
        this.tableEl.append(this.headEl)
        this.el = this.table.el
    }

    render(
        groups: ModelGroup[],
        selectedKey: string | null,
        syncingModels: string[] = [],
    ): void {
        const syncing = new Set(syncingModels)

        for (const component of this.renderedComponents)
            component.destroy()

        this.renderedComponents = []
        this.tableEl.replaceChildren(this.headEl)

        if (groups.length === 0) {
            const emptyState = createGentelellaEmptyState({
                description: 'Loosen the filters, or clear the search box.',
                title: 'No models match',
            })
            this.renderedComponents.push(emptyState)
            this.tableEl.append(
                html`
                    <tbody>
                        <tr>
                            <td colspan=${COLUMN_COUNT}>
                                ${emptyState.el}
                            </td>
                        </tr>
                    </tbody>
                ` as HTMLTableSectionElement,
            )

            return
        }

        for (const group of groups) {
            const body = html`<tbody className="model-catalog-group-body"></tbody>` as HTMLTableSectionElement

            body.append(
                html`
                    <tr className="model-catalog-group-header-row">
                        <td colspan=${COLUMN_COUNT}>${this.config.renderGroupHeader(group)}</td>
                    </tr>
                ` as HTMLTableRowElement,
            )

            for (const model of group.collapsed ? [] : group.models) {
                const key = `${model.provider}/${model.modelId}`
                const row = this.renderRow(
                    model,
                    syncing.has(key),
                )
                row.classList.toggle('model-catalog-row-selected', key === selectedKey)
                body.append(row)
            }

            this.tableEl.append(body)
        }
    }

    private renderRow(
        model: CatalogModel,
        isSyncing: boolean,
    ): HTMLTableRowElement {
        const modalities = modalityTitles(model)
        const contextWindow = model.model?.contextWindow ?? model.file.contextWindow
        const driftCount = model.drift.length
        const sources = model.sources.sourcesWithDataForThisModel
        const spinner = isSyncing
            ? createGentelellaSpinner({
                className: 'model-catalog-row-spinner',
                label: `Syncing ${model.modelId}`,
                size: 'small',
            })
            : null

        if (spinner)
            this.renderedComponents.push(spinner)

        const modalityChips = modalities.map(modality => {
            const chip = createGentelellaChip({ label: modality })
            this.renderedComponents.push(chip)

            return chip.el
        })
        const driftStatus = driftCount === 0
            ? null
            : createGentelellaStatus({
                label: String(driftCount),
                tone: model.drift.some(finding => finding.isPricing) ? 'red' : 'yellow',
            })

        if (driftStatus)
            this.renderedComponents.push(driftStatus)

        const modelStatus = createGentelellaStatus({
            className: STATUS_TONES[model.status],
            label: STATUS_LABELS[model.status],
        })
        this.renderedComponents.push(modelStatus)

        // A model held out of the database is not a row like the others, and a rate
        // that disagrees with its source is money. Both are marked on the row itself:
        // the status column alone is a word at the far right of a wide table, which is
        // where a reader looks last.
        const hasPricingDrift = model.drift.some(finding => finding.isPricing)
        const rowTone = hasPricingDrift
            ? 'model-catalog-row-error'
            : model.status === 'missing-required-fields'
                ? 'model-catalog-row-incomplete'
                : ''

        return html`
            <tr
                className=${`model-catalog-row ${rowTone}`}
                onclick=${() => this.config.onSelect(model)}
            >
                <td>
                    <div className="model-catalog-cell-name">
                        ${spinner?.el}
                        <div>
                            <span className=${gentelellaClasses.table.cellStrong}>${modelTitle(model)}</span>
                            <code className="model-catalog-model-id">${shortModel(model.modelId)}</code>
                            ${model.excludedReason
                                ? html`<div className="model-catalog-muted">${model.excludedReason}</div>`
                                : null}
                        </div>
                    </div>
                </td>
                <td>
                    <div className="model-catalog-chips">
                        ${modalities.length === 0
                            ? html`<span className="model-catalog-muted">—</span>`
                            : modalityChips}
                    </div>
                </td>
                <td className=${gentelellaClasses.table.cellMono}>${formatNumber(contextWindow)}</td>
                <td className="model-catalog-muted">${pricingSummary(model)}</td>
                <td>
                    <span
                        className="model-catalog-sources"
                        aria-label=${`${sources.length} of ${model.sources.sourcesQueried.length} sources have data`}
                    >${sources.length}/${model.sources.sourcesQueried.length}</span>
                </td>
                <td>
                    ${driftStatus?.el ?? html`<span className="model-catalog-muted">—</span>`}
                </td>
                <td>${modelStatus.el}</td>
            </tr>
        ` as HTMLTableRowElement
    }

    destroy(): void {
        for (const component of this.renderedComponents)
            component.destroy()

        this.renderedComponents = []
        this.table.destroy()
    }
}

export const createModelTable = (config: ModelTableConfig): ModelTableInstance => new ModelTable(config)
