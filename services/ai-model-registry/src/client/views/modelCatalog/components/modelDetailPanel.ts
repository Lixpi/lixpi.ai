// The panel for one model: how it resolved, where the sources disagree with the
// authored file, and the two ways to change it. Editing writes the authored
// half through the server API, which validates the change and keeps the previous
// version; nothing here touches a catalog file directly.

import {
    gentelellaClasses,
    type GentelellaButtonVariant,
} from '@lixpi/ui-kit-gentelella/class-names'
import {
    type GentelellaComponentInstance,
} from '@lixpi/ui-kit-gentelella/component'
import { createGentelellaBanner } from '@lixpi/ui-kit-gentelella/components/banner'
import { createGentelellaButton } from '@lixpi/ui-kit-gentelella/components/button'
import { createGentelellaChip } from '@lixpi/ui-kit-gentelella/components/chip'
import { createGentelellaDataTable } from '@lixpi/ui-kit-gentelella/components/data-table'
import {
    createGentelellaDrawer,
    type GentelellaDrawerInstance,
} from '@lixpi/ui-kit-gentelella/components/drawer'
import {
    createGentelellaFormActions,
    createGentelellaFormField,
} from '@lixpi/ui-kit-gentelella/components/form'
import { createGentelellaStatus } from '@lixpi/ui-kit-gentelella/components/status'
import {
    createGentelellaTabs,
    type GentelellaTabsInstance,
} from '@lixpi/ui-kit-gentelella/components/tabs'
import { html } from '@lixpi/ui-primitives/dom'

import {
    type OpenModelFiles,
} from '$src/stores/modelCatalogStore.ts'
import { arrowLeftIcon } from '$src/views/layouts/icons.ts'
import {
    createJsonViewer,
    type JsonViewerInstance,
} from '$src/views/modelCatalog/components/jsonViewer.ts'
import {
    formatNumber,
    modelTitle,
    STATUS_LABELS,
    STATUS_TONES,
} from '$src/views/modelCatalog/modelFormatting.ts'
import {
    type CatalogModel,
    type DriftFinding,
} from '$src/views/modelCatalog/types.ts'

export type ModelDetailPanelConfig = {
    onClose: () => void
    onSaveFields: (fields: Record<string, unknown>) => Promise<void>
    onSkip: (
        model: CatalogModel,
        reason: string,
    ) => Promise<void>
    onUnskip: (model: CatalogModel) => Promise<void>
}

// While the panel is open the page behind it does not scroll. Without this, a
// wheel over the sidebar or the backdrop scrolls the catalog underneath, and
// closing the panel leaves the reader somewhere they never chose to be.
const SCROLL_LOCK_CLASS = 'model-catalog-scroll-locked'

export type ModelDetailPanelInstance = {
    el: HTMLElement
    // The dimmed layer behind the drawer. It is a separate element because it
    // covers the page rather than sitting inside the panel.
    backdropEl: HTMLElement
    render: (
        model: CatalogModel | null,
        saving: boolean,
        files: OpenModelFiles | null,
    ) => void
    destroy: () => void
}

// The fields worth a labelled control. Everything else on the authored record is
// a structure, and structures are edited in the JSON editor below the form.
type ScalarField = {
    key: string
    label: string
    type: 'text' | 'number'
}

const SCALAR_FIELDS: ScalarField[] = [
    {
        key: 'title',
        label: 'Title',
        type: 'text',
    },
    {
        key: 'shortTitle',
        label: 'Short title',
        type: 'text',
    },
    {
        key: 'providerTitle',
        label: 'Provider brand',
        type: 'text',
    },
    {
        key: 'modelVersion',
        label: 'Model version',
        type: 'text',
    },
    {
        key: 'color',
        label: 'Colour',
        type: 'text',
    },
    {
        key: 'iconName',
        label: 'Icon name',
        type: 'text',
    },
    {
        key: 'colorIconName',
        label: 'Colour icon name',
        type: 'text',
    },
    {
        key: 'sortingPosition',
        label: 'Sorting position',
        type: 'number',
    },
    {
        key: 'defaultTemperature',
        label: 'Default temperature',
        type: 'number',
    },
    {
        key: 'contextWindow',
        label: 'Context window',
        type: 'number',
    },
    {
        key: 'maxCompletionSize',
        label: 'Max completion size',
        type: 'number',
    },
    {
        key: 'imagePromptMaxChars',
        label: 'Image prompt max chars',
        type: 'number',
    },
]

// A list of field paths. As a comma-joined string it becomes a tall grey blob;
// as chips it wraps across the panel and each field stays readable on its own.
const fieldList = (
    fields: string[],
    emptyLabel: string,
): HTMLElement =>
    fields.length === 0
        ? html`<span className="model-catalog-muted">${emptyLabel}</span>` as HTMLElement
        : html`
            <div className="model-catalog-chips">
                ${fields.map(
                    field => createGentelellaChip({
                        className: 'model-catalog-field-chip',
                        label: field,
                    }).el,
                )}
            </div>
        ` as HTMLElement

const formatValue = (value: unknown): string => {
    if (
        value === null
        || value === undefined
    )
        return '—'

    if (typeof value === 'object')
        return JSON.stringify(value)

    return String(value)
}

class ModelDetailPanel implements ModelDetailPanelInstance {
    readonly el: HTMLElement

    private readonly bodyEl: HTMLDivElement
    private readonly titleEl: HTMLDivElement
    private readonly subtitleEl: HTMLDivElement
    readonly backdropEl: HTMLDivElement
    private readonly drawer: GentelellaDrawerInstance

    private model: CatalogModel | null = null
    private saving = false
    // What the body was last built from. A filter keystroke re-renders the page,
    // and rebuilding the panel on one of those would throw away whatever is
    // half-typed in the editors.
    private renderedSignature: string | null = null
    // The viewer holds a CodeMirror instance, so it is torn down whenever the
    // body it lives in is rebuilt, and again on every switch between files.
    private jsonViewer: JsonViewerInstance | null = null
    // The files behind the open model, as the last render received them. Held so a
    // tab press can re-render from the same data without waiting for the store.
    private files: OpenModelFiles | null = null
    // The tab row and the pane under it, from the render that put them on the page.
    // A tab press swaps the pane's contents and nothing else: rebuilding the body
    // would send the panel back to the top of its scroll and rebuild the form above.
    private fileTabsEl: HTMLElement | null = null
    private fileTabs: GentelellaTabsInstance | null = null
    private filePaneEl: HTMLElement | null = null
    private renderedComponents: GentelellaComponentInstance[] = []
    // The file on show. Null means the first one, which is the merged record. It
    // survives a save: the body is rebuilt when the model resolves again, and
    // dropping back to the merged tab there would undo a deliberate choice.
    private activeFileName: string | null = null
    private renderedModelKey: string | null = null
    private readonly onKeyDown: (event: KeyboardEvent) => void

    constructor(private readonly config: ModelDetailPanelConfig) {
        this.titleEl = html`<div className=${gentelellaClasses.drawer.title}></div>` as HTMLDivElement
        this.subtitleEl = html`<div className="model-catalog-drawer-subtitle"></div>` as HTMLDivElement
        const header = html`
            <div className="model-catalog-drawer-header">
                <button
                    className="model-catalog-drawer-back"
                    type="button"
                    aria-label="Back to the model list"
                    innerHTML=${arrowLeftIcon}
                    onclick=${() => this.config.onClose()}
                ></button>
                ${this.titleEl}
                ${this.subtitleEl}
            </div>
        ` as HTMLDivElement
        this.drawer = createGentelellaDrawer({
            body: [],
            bodyClassName: 'model-catalog-drawer-sections',
            className: 'model-catalog-drawer',
            header,
            onBackdropClick: () => this.config.onClose(),
        })
        this.bodyEl = this.drawer.bodyEl
        this.backdropEl = this.drawer.backdropEl
        this.el = this.drawer.el

        // Escape closes the panel, the way it closes anything laid over a page. It is
        // bound on the document because the panel rarely holds focus: a reader is
        // usually scrolling it, not typing in one of its fields.
        this.onKeyDown = (event: KeyboardEvent): void => {
            if (
                event.key !== 'Escape'
                || this.model === null
            )
                return

            event.preventDefault()
            this.config.onClose()
        }
        document.addEventListener('keydown', this.onKeyDown)

        // The header holds its place at the top; the subtitle is the part that goes.
        // It is driven from the scroll position rather than by scrolling out of view,
        // because the rule under the header belongs to the header and has to stay
        // whatever the subtitle is doing.
        this.bodyEl.addEventListener('scroll', () => this.el.classList.toggle('model-catalog-drawer-scrolled', this.bodyEl.scrollTop > 0))
    }

    render(
        model: CatalogModel | null,
        saving: boolean,
        files: OpenModelFiles | null,
    ): void {
        this.model = model
        this.saving = saving
        this.drawer.setOpen(model !== null)
        document.documentElement.classList.toggle(SCROLL_LOCK_CLASS, model !== null)

        if (!model) {
            this.jsonViewer?.destroy()
            this.jsonViewer = null
            this.bodyEl.replaceChildren()
            this.renderedSignature = null
            this.renderedModelKey = null
            this.files = null
            this.fileTabsEl = null
            this.fileTabs?.destroy()
            this.fileTabs = null
            this.filePaneEl = null

            for (const component of this.renderedComponents)
                component.destroy()

            this.renderedComponents = []

            return
        }

        // A model nobody has titled yet carries an empty string rather than nothing, so
        // the header falls back to the id instead of opening with a blank line.
        this.titleEl.textContent = modelTitle(model) || model.modelId
        this.subtitleEl.textContent = `${model.providerTitle} · ${model.modelId}`

        const modelKey = `${model.provider}/${model.modelId}`
        this.files = files

        if (modelKey !== this.renderedModelKey) {
            this.renderedModelKey = modelKey
            this.activeFileName = null
        }

        // The files are part of what the body is built from, so they belong in the
        // signature beside everything else. They arrive one render after the panel
        // opens, which rebuilds the body once more before anyone can have typed in it.
        // Which file is on show is not in here: that is swapped in place.
        const fileNames = this.filesFor(model)
            ?.files.map(file => file.name)
            .join(',') ?? ''
        const signature = `${modelKey}:${model.mergedAt}:${saving}:${fileNames}`

        if (signature === this.renderedSignature)
            return

        this.renderedSignature = signature
        this.jsonViewer?.destroy()
        this.jsonViewer = null
        this.fileTabs?.destroy()
        this.fileTabs = null

        for (const component of this.renderedComponents)
            component.destroy()

        this.renderedComponents = []
        this.bodyEl.replaceChildren(
            this.renderStatus(model),
            this.renderProvenance(model),
            this.renderInferenceProviders(model),
            this.renderDrift(model),
            this.renderFieldForm(model),
            this.renderFilesSection(model),
            this.renderIndexControls(model),
        )
    }

    // The files only when they belong to the model on screen. A slower request for
    // the model before this one must not put its files under this one's name.
    private filesFor(model: CatalogModel): OpenModelFiles | null {
        return this.files
            && this.files.key === `${model.provider}/${model.modelId}`
            ? this.files
            : null
    }

    // `disabled` is a boolean property, not an attribute with a value: writing
    // `disabled="false"` would still disable the button, so it is set after the
    // element exists.
    private renderSaveButton(
        label: string,
        variant: GentelellaButtonVariant,
        onClick: () => Promise<void>,
    ): HTMLButtonElement {
        const button = createGentelellaButton({
            disabled: this.saving,
            label,
            onClick: () => void onClick(),
            variant,
        })
        this.renderedComponents.push(button)

        return button.el
    }

    private renderStatus(model: CatalogModel): HTMLElement {
        const missing = model.missingRequiredFields
        // An excluded model has no merged record and no directory: the sync deletes
        // it. There is no merge to date, so the panel says why it is out instead.
        const notInTree = model.mergedAt === ''
        const status = createGentelellaStatus({
            className: STATUS_TONES[model.status],
            label: STATUS_LABELS[model.status],
        })
        this.renderedComponents.push(status)
        let statusDetail: HTMLElement

        if (notInTree)
            statusDetail = html`<p className="model-catalog-muted">${model.excludedReason ?? "Kept out by the provider's catalog settings."}</p>` as HTMLElement
        else if (missing.length === 0)
            statusDetail = html`<p className="model-catalog-muted">Every required field is filled in.</p>` as HTMLElement
        else {
            const banner = createGentelellaBanner({
                body: fieldList(missing, 'nothing'),
                title: 'Missing required fields',
                variant: 'warning',
            })
            this.renderedComponents.push(banner)
            statusDetail = banner.el
        }

        return html`
            <section className="model-catalog-section">
                <h3 className="model-catalog-section-title">Status</h3>
                <div className="model-catalog-facts">
                    ${status.el}
                    <span className="model-catalog-muted">${notInTree
                        ? 'Not in the tree'
                        : `Merged ${new Date(model.mergedAt).toLocaleString()}`}</span>
                </div>
                ${statusDetail}
                ${
                    model.ratesRefusedBecauseUnitsDiffer.length === 0
                        ? null
                        : html`
                            <p className="model-catalog-muted">
                                Rates a source publishes in another unit, left for a human:
                                ${model.ratesRefusedBecauseUnitsDiffer.join(', ')}
                            </p>
                        `
                }
            </section>
        ` as HTMLElement
    }

    private renderProvenance(model: CatalogModel): HTMLElement {
        const {
            sourcesQueried,
            sourcesWithDataForThisModel,
            sourcesWithoutRatesForThatProvider,
            confirmedByMoreThanOneSource,
            fieldsWhereSourcesDisagree,
            inferenceProviderCalledByThePlatform,
        } = model.sources

        return html`
            <section className="model-catalog-section model-catalog-section-wide">
                <h3 className="model-catalog-section-title">How it resolved</h3>
                <dl className="model-catalog-definitions">
                    <dt>Sources asked</dt>
                    <dd>${sourcesQueried.join(', ') || '—'}</dd>
                    <dt>Sources with data</dt>
                    <dd>${sourcesWithDataForThisModel.join(', ') || 'none'}</dd>
                    <dt>Corroborated</dt>
                    <dd>${confirmedByMoreThanOneSource ? 'By more than one source' : 'By a single source'}</dd>
                    <dt>Called through</dt>
                    <dd>${inferenceProviderCalledByThePlatform}</dd>
                    <dt>No rates for that provider</dt>
                    <dd>${sourcesWithoutRatesForThatProvider.join(', ') || 'none'}</dd>
                    <dt>Sources disagree on</dt>
                    <dd>${fieldList(fieldsWhereSourcesDisagree, 'nothing')}</dd>
                    <dt>Only Lixpi supplies</dt>
                    <dd>${fieldList(model.authored.fieldsOnlyLixpiSupplies, 'nothing')}</dd>
                    <dt>Lixpi overrides</dt>
                    <dd>${fieldList(model.authored.fieldsWhereLixpiOverridesSources, 'nothing')}</dd>
                    <dt>Inherited from base</dt>
                    <dd>${fieldList(model.authored.fieldsInheritedFromProviderBaseFile, 'nothing')}</dd>
                    <dt>Filled from schema default</dt>
                    <dd>${fieldList(model.fieldsFilledFromSchemaDefault, 'nothing')}</dd>
                </dl>
            </section>
        ` as HTMLElement
    }

    // Every endpoint the model can be reached through, side by side. The top of the
    // panel describes the call the platform makes; this says what the same model
    // costs everywhere else, which is the question a routing change asks.
    private renderInferenceProviders(model: CatalogModel): HTMLElement {
        const providers = Object.entries(model.file.inferenceProviders ?? {}) as Array<[string, Record<string, any>]>
        const table = providers.length === 0
            ? null
            : createGentelellaDataTable({
                ariaLabel: `Inference providers for ${model.modelId}`,
                columns: [{
                    header: 'Provider',
                    render: ([id]) => html`<span className=${gentelellaClasses.table.cellMono}>${id}</span>`,
                }, {
                    header: 'Name',
                    render: ([, entry]) => entry.inferenceProviderTitle ?? '',
                }, {
                    header: '',
                    orderable: false,
                    render: ([, entry]) => {
                        if (!entry.isCalledByThePlatform)
                            return null

                        const status = createGentelellaStatus({
                            label: 'Called',
                            tone: 'green',
                        })
                        this.renderedComponents.push(status)

                        return status.el
                    },
                }, {
                    header: 'Pricing',
                    render: ([, entry]) => formatValue(entry.pricing ?? null),
                }, {
                    header: 'Context',
                    render: ([, entry]) => formatValue(entry.contextWindow ?? null),
                }, {
                    header: 'Max output',
                    render: ([, entry]) => formatValue(entry.maxCompletionSize ?? null),
                }, {
                    header: 'Reported by',
                    render: ([, entry]) => (entry.reportedBySources ?? []).join(', '),
                }],
                getRowId: ([id]) => id,
                rows: providers,
            })

        if (table)
            this.renderedComponents.push(table)

        return html`
            <section className="model-catalog-section model-catalog-section-wide">
                <h3 className="model-catalog-section-title">Inference providers</h3>
                ${table?.el ?? html`<p className="model-catalog-muted">No source reports this model on any inference provider.</p>`}
            </section>
        ` as HTMLElement
    }

    private renderDrift(model: CatalogModel): HTMLElement {
        const table = model.drift.length === 0
            ? null
            : createGentelellaDataTable<DriftFinding>({
                ariaLabel: `Drift findings for ${model.modelId}`,
                columns: [{
                    header: 'Field',
                    render: finding => html`<span className=${gentelellaClasses.table.cellMono}>${finding.field}</span>`,
                }, {
                    header: 'Authored',
                    render: finding => formatValue(finding.lixpiValue),
                }, {
                    header: 'Source',
                    render: finding => formatValue(finding.fetchedValue),
                }, {
                    header: 'From',
                    render: finding => finding.source,
                }, {
                    header: '',
                    orderable: false,
                    render: finding => {
                        if (!finding.isPricing)
                            return null

                        const status = createGentelellaStatus({
                            label: 'Pricing',
                            tone: 'red',
                        })
                        this.renderedComponents.push(status)

                        return status.el
                    },
                }],
                getRowId: finding => `${finding.source}:${finding.field}`,
                rows: model.drift,
            })

        if (table)
            this.renderedComponents.push(table)

        return html`
            <section className="model-catalog-section model-catalog-section-wide">
                <h3 className="model-catalog-section-title">Drift</h3>
                ${table?.el ?? html`<p className="model-catalog-muted">The authored file and the sources agree.</p>`}
            </section>
        ` as HTMLElement
    }

    // The common scalars. A cleared box sends null, which is how the server
    // removes a field, so emptying one is a deliberate delete rather than a
    // silent no-op.
    private renderFieldForm(model: CatalogModel): HTMLElement {
        const authored = model.lixpi ?? {}
        const inputs = new Map<string, HTMLInputElement>()

        const controls = SCALAR_FIELDS.map(field => {
            const current = authored[field.key]
            const input = html`
                <input
                    type=${field.type}
                    value=${current === undefined
                        || current === null
                        ? ''
                        : String(current)}
                />
            ` as HTMLInputElement
            inputs.set(field.key, input)
            const formField = createGentelellaFormField({
                control: input,
                label: field.label,
            })
            this.renderedComponents.push(formField)

            return formField.el
        })

        const save = async (): Promise<void> => {
            const patch: Record<string, unknown> = {}

            for (const field of SCALAR_FIELDS) {
                const raw = inputs.get(field.key)!.value.trim()
                const before = authored[field.key]
                const next = raw === ''
                    ? null
                    : field.type === 'number'
                        ? Number(raw)
                        : raw

                if (
                    next === null
                    && before === undefined
                )
                    continue

                if (
                    next !== null
                    && String(before) === String(next)
                )
                    continue

                patch[field.key] = next
            }

            if (Object.keys(patch).length > 0)
                await this.config.onSaveFields(patch)
        }
        const actions = createGentelellaFormActions({
            content: this.renderSaveButton(
                'Save fields',
                'primary',
                save,
            ),
        })
        this.renderedComponents.push(actions)

        return html`
            <section className="model-catalog-section model-catalog-section-wide">
                <h3 className="model-catalog-section-title">Authored fields</h3>
                <p className="model-catalog-muted">
                    These live in the model's own file. Clearing a box removes the field, which hands it back to the sources.
                </p>
                <div className="model-catalog-form-grid">${controls}</div>
                ${actions.el}
            </section>
        ` as HTMLElement
    }

    // Every file in the model's directory, one tab each. The merged record leads
    // because it is what the catalog resolved to; the rest are what it was resolved
    // from, which is the question anyone asks next when a value looks wrong.
    //
    // Reading only. A field changes in the form above, where the server validates it
    // and keeps the previous version.
    private renderFilesSection(model: CatalogModel): HTMLElement {
        const loaded = this.filesFor(model)
        const names = loaded?.files.map(file => file.name) ?? []
        const active = this.activeFileName
            && names.includes(this.activeFileName)
            ? this.activeFileName
            : names[0] ?? null
        this.activeFileName = active
        this.fileTabs = createGentelellaTabs({
            activeValue: active ?? undefined,
            ariaLabel: `Files for ${model.modelId}`,
            className: 'model-catalog-file-tabs',
            items: (loaded?.files ?? []).map(
                file => ({
                    label: file.name,
                    value: file.name,
                }),
            ),
            onSelect: name => this.showFile(model, name),
        })
        this.fileTabsEl = this.fileTabs.el
        this.filePaneEl = html`
            <div className="model-catalog-file-pane">
                ${this.renderFilePane(
                    model,
                    loaded,
                    active,
                )}
            </div>
        ` as HTMLElement

        return html`
            <section className="model-catalog-section model-catalog-section-wide">
                <h3 className="model-catalog-section-title">Files</h3>
                <p className="model-catalog-muted">
                    The model's directory as the tree holds it: what it resolved to, what Lixpi authored, and what each source answered.
                </p>
                ${names.length === 0 ? null : this.fileTabsEl}
                ${this.filePaneEl}
            </section>
        ` as HTMLElement
    }

    // Swaps the file on show without touching the rest of the panel: the tabs keep
    // their elements and only their state changes, and the pane's contents are
    // replaced. Nothing above moves, so the panel stays where it was scrolled to.
    private showFile(
        model: CatalogModel,
        name: string,
    ): void {
        if (
            name === this.activeFileName
            || !this.fileTabsEl
            || !this.filePaneEl
        )
            return

        this.activeFileName = name
        this.fileTabs?.setActiveValue(name)

        this.jsonViewer?.destroy()
        this.jsonViewer = null
        this.filePaneEl.replaceChildren(
            this.renderFilePane(
                model,
                this.filesFor(model),
                name,
            ),
        )
    }

    // What sits under the tabs: the file itself once it is here, and why it is not
    // otherwise. A viewer is built only for a file that parsed.
    private renderFilePane(
        model: CatalogModel,
        loaded: OpenModelFiles | null,
        active: string | null,
    ): HTMLElement {
        if (
            !loaded
            || loaded.loading
        )
            return html`<p className="model-catalog-muted">Reading the model's files…</p>` as HTMLElement

        if (loaded.error) {
            const banner = createGentelellaBanner({
                body: loaded.error,
                title: 'The files could not be read',
                variant: 'danger',
            })
            this.renderedComponents.push(banner)

            return banner.el
        }

        const file = loaded.files.find(entry => entry.name === active)

        if (!file)
            return html`<p className="model-catalog-muted">This model's directory holds no files.</p>` as HTMLElement

        if (!file.readable)
            return html`<p className="model-catalog-muted">${file.name} is on disk but does not parse as JSON.</p>` as HTMLElement

        this.jsonViewer = createJsonViewer({
            value: file.content,
            ariaLabel: `${file.name} for ${model.modelId}`,
        })

        return this.jsonViewer.el
    }

    // Whether the model syncs at all. Skipping asks for a reason because the
    // server records one against the model and an unexplained skip outlives
    // whoever made it.
    private renderIndexControls(model: CatalogModel): HTMLElement {
        const isSkipped = model.status === 'skipped-by-catalog-index'
        const reasonEl = html`
            <input
                type="text"
                placeholder="Why this model is not shipped"
            />
        ` as HTMLInputElement

        const skip = async (): Promise<void> => {
            const reason = reasonEl.value.trim()

            if (reason === '') {
                reasonEl.focus()

                return
            }

            await this.config.onSkip(model, reason)
        }
        const action = this.renderSaveButton(
            isSkipped ? 'Stop skipping and sync' : 'Skip this model',
            isSkipped ? 'primary' : 'danger',
            isSkipped
                ? async () => await this.config.onUnskip(model)
                : skip,
        )
        const actions = createGentelellaFormActions({ content: action })
        this.renderedComponents.push(actions)
        const reasonField = isSkipped
            ? null
            : createGentelellaFormField({
                control: reasonEl,
                label: 'Reason',
            })

        if (reasonField)
            this.renderedComponents.push(reasonField)

        return html`
            <section className="model-catalog-section">
                <h3 className="model-catalog-section-title">Catalog settings</h3>
                ${
                    isSkipped
                        ? html`
                            <p className="model-catalog-muted">
                                Bringing it back takes it out of the provider's skip list and runs a sync, which is what fetches the model and puts it in the tree.
                            </p>
                            ${actions.el}
                        `
                        : html`
                            ${reasonField?.el}
                            ${actions.el}
                        `
                }
                <dl className="model-catalog-definitions">
                    <dt>Context window</dt>
                    <dd>${formatNumber(model.model?.contextWindow ?? model.file.contextWindow)}</dd>
                    <dt>Max completion</dt>
                    <dd>${formatNumber(model.model?.maxCompletionSize ?? model.file.maxCompletionSize)}</dd>
                </dl>
            </section>
        ` as HTMLElement
    }

    destroy(): void {
        this.model = null
        this.files = null
        this.fileTabsEl = null
        this.fileTabs?.destroy()
        this.fileTabs = null
        this.filePaneEl = null
        document.removeEventListener('keydown', this.onKeyDown)
        document.documentElement.classList.remove(SCROLL_LOCK_CLASS)
        this.jsonViewer?.destroy()
        this.jsonViewer = null

        for (const component of this.renderedComponents)
            component.destroy()

        this.renderedComponents = []
        this.drawer.destroy()
    }
}

export const createModelDetailPanel = (config: ModelDetailPanelConfig): ModelDetailPanelInstance => new ModelDetailPanel(config)
