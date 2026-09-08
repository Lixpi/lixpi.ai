// The model catalog page: what the catalog holds, why each model resolved the
// way it did, and the controls that change it. The store is the source of truth
// for the loaded overview, the filters, and the selected model; this view
// re-renders from it and writes back through the catalog service.

import { LoadingStatus } from '@lixpi/constants'
import { html } from '@lixpi/ui-primitives/dom'

import { modelCatalogService } from '$src/services/model-catalog-service.ts'
import {
    modelCatalogStore,
    modelKey,
    type ModelCatalogFilters,
    type OpenModelFiles,
    type StatusFilter,
    type SyncProgress,
} from '$src/stores/modelCatalogStore.ts'
import {
    alertIcon,
    searchIcon,
    syncIcon,
} from '$src/views/layouts/icons.ts'
import {
    createModelDetailPanel,
    type ModelDetailPanelInstance,
} from '$src/views/modelCatalog/components/modelDetailPanel.ts'
import {
    createModelTable,
    type ModelGroup,
    type ModelTableInstance,
} from '$src/views/modelCatalog/components/modelTable.ts'
import { createProviderGroupHeader } from '$src/views/modelCatalog/components/providerGroupHeader.ts'
import { searchHaystack } from '$src/views/modelCatalog/modelFormatting.ts'
import {
    type CatalogModel,
    type CatalogOverview,
    type CatalogProvider,
    type ProviderDirectory,
    type SkippedModel,
} from '$src/views/modelCatalog/types.ts'
import '$src/views/modelCatalog/model-catalog.scss'

const STATUS_FILTER_OPTIONS: Array<{
    value: StatusFilter
    label: string
}> = [
    {
        value: 'all',
        label: 'Every status',
    },
    {
        value: 'written-to-database',
        label: 'In the database',
    },
    {
        value: 'missing-required-fields',
        label: 'Missing required fields',
    },
    // The only way to see excluded models: every other status leaves them out.
    {
        value: 'skipped-by-catalog-index',
        label: 'Excluded',
    },
    {
        value: 'drifting',
        label: 'Drifting from a source',
    },
]

type Tile = {
    label: string
    value: string
    tone: string
}

export type ModelCatalogViewInstance = {
    el: HTMLElement
    mount: () => void
    destroy: () => void
}

// What the button says while a run is going. The phases are the run's own, so the
// button reports where it has got to rather than spinning anonymously.
const SYNC_PHASE_LABELS: Record<string, string> = {
    fetching: 'Fetching…',
    merging: 'Merging…',
    writing: 'Writing…',
}

class ModelCatalogView implements ModelCatalogViewInstance {
    readonly el: HTMLElement

    private readonly statsEl: HTMLDivElement
    private readonly statusEl: HTMLDivElement
    private readonly searchEl: HTMLInputElement
    private readonly providerFilterEl: HTMLSelectElement
    private readonly statusFilterEl: HTMLSelectElement
    private readonly syncButtonEl: HTMLButtonElement
    private readonly syncButtonIconEl: HTMLSpanElement
    private readonly syncButtonLabelEl: HTMLSpanElement
    // Providers a running sync is working through, read by the group headers.
    private syncingProviders: string[] = []
    private readonly table: ModelTableInstance
    private readonly detailPanel: ModelDetailPanelInstance
    private readonly unsubscribeStore: () => void
    private pendingRender: number | null = null

    // Read by the group headers as they are built, so a header knows whether a
    // write is in flight without the table having to carry that through.
    private saving = false

    constructor() {
        this.statsEl = html`<div className="model-catalog-stats"></div>` as HTMLDivElement
        this.statusEl = html`<div className="model-catalog-status"></div>` as HTMLDivElement

        this.searchEl = html`
            <input
                className="form-control"
                type="search"
                placeholder="Search models"
                autocomplete="off"
                aria-label="Search models"
                oninput=${() => modelCatalogStore.setFilters({ query: this.searchEl.value.trim().toLowerCase() })}
            />
        ` as HTMLInputElement

        this.providerFilterEl = html`
            <select
                className="form-control"
                aria-label="Filter by provider"
                onchange=${() =>
                    modelCatalogStore.setFilters({
                        provider: this.providerFilterEl.value as ModelCatalogFilters['provider'],
                    })}
            >
                <option value="all">Every provider</option>
            </select>
        ` as HTMLSelectElement

        this.statusFilterEl = html`
            <select
                className="form-control"
                aria-label="Filter by status"
                onchange=${() => modelCatalogStore.setFilters({ status: this.statusFilterEl.value as StatusFilter })}
            >
                ${STATUS_FILTER_OPTIONS.map(option => html`<option value=${option.value}>${option.label}</option>`)}
            </select>
        ` as HTMLSelectElement

        this.syncButtonIconEl = html`<span innerHTML=${syncIcon}></span>` as HTMLSpanElement
        this.syncButtonLabelEl = html`<span>Run sync</span>` as HTMLSpanElement
        this.syncButtonEl = html`
            <button
                className="btn btn-primary"
                type="button"
                onclick=${() => void modelCatalogService.runSync()}
            >
                ${this.syncButtonIconEl}
                ${this.syncButtonLabelEl}
            </button>
        ` as HTMLButtonElement

        this.table = createModelTable({
            onSelect: model => this.selectModel(model),
            renderGroupHeader: group => createProviderGroupHeader({
                provider: group.provider,
                shownModels: group.models.length,
                totalModels: group.totalModels,
                saving: this.saving,
                syncing: this.syncingProviders.includes(group.provider.directory),
                collapsed: group.collapsed,
                onToggleCollapsed: provider => modelCatalogStore.toggleProviderCollapsed(provider),
                onPatchIndex: async (provider, patch) => await modelCatalogService.patchCatalogIndex(provider, patch),
                onPatchBase: async (provider, fields) => await modelCatalogService.patchProviderBase(provider, fields),
            }).el,
        })

        this.detailPanel = createModelDetailPanel({
            onClose: () => modelCatalogStore.setDataValues({ selectedModelKey: null }),
            onSaveFields: async fields => await this.saveFields(fields),
            onSkip: async (model, reason) => await modelCatalogService.patchCatalogIndex(
                model.provider,
                {
                    skipModels: [{
                        model: model.modelId,
                        reason,
                    }],
                },
            ),
            // Unskipping alone only changes the settings file. The model itself is
            // not in the tree, so nothing can reach the database until a run fetches
            // it: the sync is part of enabling it, not a separate errand.
            onUnskip: async model => {
                if (await modelCatalogService.patchCatalogIndex(model.provider, { unskipModels: [model.modelId] }))
                    await modelCatalogService.runSync()
            },
        })

        this.el = html`
            <div className="page-wrapper model-catalog-page">
                <div className="page-header">
                    <div className="page-header-row">
                        <div>
                            <div className="page-pretitle">Catalog</div>
                            <h1 className="page-title">AI models</h1>
                        </div>
                        <div className="page-actions">
                            ${this.syncButtonEl}
                        </div>
                    </div>
                </div>

                ${this.statusEl}
                ${this.statsEl}

                <div className="card">
                    <div className="card-header model-catalog-filters">
                        <div>
                            <div className="card-title">Models by provider</div>
                            <div className="card-subtitle">Click a model to see how it resolved and to edit its authored file.</div>
                        </div>
                        <div className="model-catalog-filter-controls">
                            <div className="input-group model-catalog-search">
                                <span
                                    className="input-icon"
                                    innerHTML=${searchIcon}
                                ></span>
                                ${this.searchEl}
                            </div>
                            ${this.providerFilterEl}
                            ${this.statusFilterEl}
                        </div>
                    </div>
                    ${this.table.el}
                </div>

                ${this.detailPanel.backdropEl}
                ${this.detailPanel.el}
            </div>
        ` as HTMLElement

        // A running sync reports every provider and every model twice, which is a few
        // hundred store writes in a handful of seconds. Rendering on each one would
        // rebuild the table faster than a screen can show it, so renders are
        // coalesced to one a frame.
        this.unsubscribeStore = modelCatalogStore.subscribe(() => this.scheduleRender())
    }

    // Nothing to do on mount: this view renders from the store, and the store
    // delivers its current value the moment it is subscribed to.
    mount(): void {}

    private selectModel(model: CatalogModel): void {
        const key = modelKey(model)
        const current = modelCatalogStore.getData('selectedModelKey')

        if (current === key) {
            modelCatalogStore.setDataValues({
                selectedModelKey: null,
                openModelFiles: null,
            })

            return
        }

        modelCatalogStore.setDataValues({
            selectedModelKey: key,
            openModelFiles: null,
        })
        void modelCatalogService.loadModelFiles(model.provider, model.modelId)
    }

    private async saveFields(fields: Record<string, unknown>): Promise<void> {
        const selected = this.selectedModel()

        if (!selected)
            return

        await modelCatalogService.patchModelFields(
            selected.provider,
            selected.modelId,
            fields,
        )
    }

    private selectedModel(): CatalogModel | null {
        const overview = modelCatalogStore.getData('overview') as CatalogOverview | null
        const key = modelCatalogStore.getData('selectedModelKey') as string | null

        if (
            !overview
            || !key
        )
            return null

        // Excluded models are not in the tree, so a row the excluded filter put on
        // the page is found in the skip lists instead. Without this, clicking one
        // selects a model the panel cannot find and nothing opens.
        return overview.models.find(model => modelKey(model) === key)
            ?? this.excludedModels(overview).find(model => modelKey(model) === key)
            ?? null
    }

    // A row for a model the catalog is told to skip. It has no directory in the tree
    // and so no merged record, no sources, and no drift: everything known about it is
    // in the provider's `catalog-settings.json`.
    private static excludedRow(
        provider: CatalogProvider,
        skipped: SkippedModel,
    ): CatalogModel {
        return {
            provider: provider.directory,
            providerTitle: provider.title,
            modelId: skipped.model,
            status: 'skipped-by-catalog-index',
            mergedAt: '',
            model: null,
            file: {},
            lixpi: null,
            missingRequiredFields: [],
            fieldsFilledFromSchemaDefault: [],
            ratesRefusedBecauseUnitsDiffer: [],
            sources: {
                sourcesQueried: [],
                sourcesWithDataForThisModel: [],
                inferenceProviderCalledByThePlatform: '',
                sourcesWithoutRatesForThatProvider: [],
                confirmedByMoreThanOneSource: false,
                fieldsWhereSourcesDisagree: [],
            },
            authored: {
                fieldsOnlyLixpiSupplies: [],
                fieldsWhereLixpiOverridesSources: [],
                fieldsInheritedFromProviderBaseFile: [],
            },
            drift: [],
            excludedReason: skipped.reason,
        }
    }

    // Every model the catalog is told to skip, read from each provider's
    // `catalog-settings.json` rather than from the tree. The sync deletes a skipped
    // model's directory, so the tree is exactly where these are not. A model skipped
    // since the last sync is still in the tree, and that record is used when it is
    // there, with the reason from the settings file added to it.
    private excludedModels(overview: CatalogOverview): CatalogModel[] {
        const inTree = new Map(
            overview.models.map(model => [modelKey(model), model]),
        )
        const rows: CatalogModel[] = []

        for (const provider of overview.providers) {
            for (const skipped of provider.index?.modelsToSkip ?? []) {
                const existing = inTree.get(`${provider.directory}/${skipped.model}`)
                rows.push(
                    existing
                        ? {
                            ...existing,
                            excludedReason: skipped.reason,
                        }
                        : ModelCatalogView.excludedRow(provider, skipped),
                )
            }
        }

        return rows
    }

    private visibleModels(overview: CatalogOverview): CatalogModel[] {
        const filters = modelCatalogStore.getData('filters') as ModelCatalogFilters
        // Excluded models are not in the tree, so they come from the settings files
        // and only when they are what the filter asks for.
        const models = filters.status === 'skipped-by-catalog-index'
            ? this.excludedModels(overview)
            : overview.models.filter(model => model.status !== 'skipped-by-catalog-index')

        return models.filter(model => {
            if (
                filters.provider !== 'all'
                && model.provider !== filters.provider
            )
                return false

            if (
                filters.status === 'drifting'
                && model.drift.length === 0
            )
                return false

            if (
                filters.status !== 'all'
                && filters.status !== 'drifting'
                && model.status !== filters.status
            )
                return false

            return filters.query === '' || searchHaystack(model).includes(filters.query)
        })
    }

    // Every provider the catalog knows, each with the models the filters left. A
    // provider whose models are all filtered out drops off the page rather than
    // sitting there as an empty band.
    private groupsByProvider(overview: CatalogOverview): ModelGroup[] {
        const filters = modelCatalogStore.getData('filters') as ModelCatalogFilters
        const visible = this.visibleModels(overview)
        const collapsed = modelCatalogStore.getData('collapsedProviders') as string[]
        // What the count on a group band is out of. Under the excluded filter that is
        // the provider's skip list, not the models in the tree, so the band does not
        // say "79 of 5".
        const total = filters.status === 'skipped-by-catalog-index'
            ? this.excludedModels(overview)
            : overview.models
        const groups: ModelGroup[] = []

        for (const provider of overview.providers) {
            const models = visible.filter(model => model.provider === provider.directory)

            if (models.length === 0)
                continue

            groups.push({
                provider,
                models,
                totalModels: total.filter(model => model.provider === provider.directory).length,
                collapsed: collapsed.includes(provider.directory),
            })
        }

        return groups
    }

    private scheduleRender(): void {
        if (this.pendingRender !== null)
            return

        this.pendingRender = requestAnimationFrame(() => {
            this.pendingRender = null
            this.render()
        })
    }

    private render(): void {
        const meta = modelCatalogStore.getMeta()
        const overview = modelCatalogStore.getData('overview') as CatalogOverview | null
        const saving = meta.saving as boolean
        this.saving = saving

        const progress = modelCatalogStore.getData('syncProgress') as SyncProgress
        this.syncingProviders = progress.pendingProviders

        // Pressing it again during a run would only join the run it is already
        // showing, so it holds still until the run ends.
        this.syncButtonEl.disabled = saving || progress.running
        this.syncButtonIconEl.className = progress.running ? 'btn-spinner' : ''
        this.syncButtonIconEl.innerHTML = progress.running ? '' : syncIcon
        this.syncButtonLabelEl.textContent = progress.running
            ? SYNC_PHASE_LABELS[progress.phase ?? 'fetching']
            : 'Run sync'
        this.renderStatus(
            meta,
            overview,
            progress,
        )

        if (!overview) {
            this.statsEl.replaceChildren()
            this.table.render([], null)
            this.detailPanel.render(
                null,
                saving,
                null,
            )

            return
        }

        this.syncProviderOptions(overview)
        this.renderStats(overview)

        const selectedKey = modelCatalogStore.getData('selectedModelKey') as string | null
        this.table.render(
            this.groupsByProvider(overview),
            selectedKey,
            progress.pendingModels,
        )
        this.detailPanel.render(
            this.selectedModel(),
            saving,
            modelCatalogStore.getData('openModelFiles') as OpenModelFiles | null,
        )
    }

    private renderStatus(
        meta: Record<string, any>,
        overview: CatalogOverview | null,
        progress: SyncProgress,
    ): void {
        const notes: HTMLElement[] = []

        if (meta.loadingStatus === LoadingStatus.loading)
            notes.push(html`<div className="model-catalog-note">Loading the catalog…</div>` as HTMLElement)

        if (meta.error)
            notes.push(
                html`
                    <div className="banner banner-danger">
                        <span
                            className="banner-icon"
                            innerHTML=${alertIcon}
                        ></span>
                        <div className="banner-body">${meta.error}</div>
                    </div>
                ` as HTMLElement,
            )

        const outcome = overview?.lastSyncOutcome ?? null

        // A failed sync means every model below it is whatever the last run that
        // finished left behind, which is not something to leave a reader to work out
        // from a stale timestamp.
        if (outcome?.status === 'failed') {
            const failures = outcome.error?.sourceFailures ?? []
            notes.push(
                html`
                    <div className="banner banner-danger model-catalog-sync-failure">
                        <span
                            className="banner-icon"
                            innerHTML=${alertIcon}
                        ></span>
                        <div className="banner-body">
                            <strong>The last sync did not complete.</strong>
                            It started ${new Date(outcome.ranAt).toLocaleString()} and stopped without writing, so everything below is from the last run that finished.
                            ${failures.length === 0
                                ? html`<div className="model-catalog-failure">${outcome.error?.message ?? 'No detail was recorded.'}</div>`
                                : failures.map(
                                    failure => html`
                                        <div className="model-catalog-failure">
                                            <strong>${failure.sourceName}${failure.provider ? ` · ${failure.provider}` : ''}</strong>
                                            <span>${failure.message}</span>
                                        </div>
                                    `,
                                )}
                        </div>
                    </div>
                ` as HTMLElement,
            )
        }

        if (meta.lastSaveMessage)
            notes.push(html`<div className="model-catalog-note">${meta.lastSaveMessage}</div>` as HTMLElement)

        if (progress.message)
            notes.push(html`<div className="model-catalog-note">${progress.message}</div>` as HTMLElement)

        this.statusEl.replaceChildren(...notes)
    }

    private syncProviderOptions(overview: CatalogOverview): void {
        const existing = new Set(
            [...this.providerFilterEl.options].map(option => option.value),
        )

        for (const provider of overview.providers) {
            if (existing.has(provider.directory))
                continue

            this.providerFilterEl.append(html`<option value=${provider.directory}>${provider.title}</option>` as HTMLOptionElement)
        }

        const filters = modelCatalogStore.getData('filters') as ModelCatalogFilters
        this.providerFilterEl.value = filters.provider as ProviderDirectory | 'all'
        this.statusFilterEl.value = filters.status
    }

    private renderStats(overview: CatalogOverview): void {
        const tiles: Tile[] = [
            {
                label: 'Models in the tree',
                value: String(overview.models.length),
                tone: 'model-catalog-stat-lead',
            },
            {
                label: 'In the database',
                value: String(overview.models.filter(model => model.status === 'written-to-database').length),
                tone: 'model-catalog-stat-good',
            },
            {
                label: 'Missing fields',
                value: String(overview.models.filter(model => model.status === 'missing-required-fields').length),
                tone: 'model-catalog-stat-warn',
            },
            {
                label: 'Excluded',
                value: String(this.excludedModels(overview).length),
                tone: '',
            },
            {
                label: 'Drift findings',
                value: String(
                    overview.models.reduce((total, model) => total + model.drift.length, 0),
                ),
                tone: 'model-catalog-stat-warn',
            },
        ]

        this.statsEl.replaceChildren(
            ...tiles.map(
                tile => html`
                    <div className=${`model-catalog-stat ${tile.tone}`}>
                        <span className="model-catalog-stat-value">${tile.value}</span>
                        <span className="model-catalog-stat-label">${tile.label}</span>
                    </div>
                ` as HTMLElement,
            ),
        )
    }

    destroy(): void {
        this.unsubscribeStore()

        if (this.pendingRender !== null)
            cancelAnimationFrame(this.pendingRender)

        this.table.destroy()
        this.detailPanel.destroy()
        this.el.remove()
    }
}

export const createModelCatalogView = (): ModelCatalogViewInstance => new ModelCatalogView()
