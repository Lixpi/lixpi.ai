// One provider's band in the model table: who it is, how many of its models are
// showing, and, folded away behind a toggle, what it skips and what all of its
// models inherit. It sits at the head of the provider's rows because that is
// what it configures.

import {
    createGentelellaButton,
    type GentelellaButtonInstance,
} from '@lixpi/ui-kit-gentelella/components/button'
import {
    applyGentelellaFormControl,
    createGentelellaFormActions,
    type GentelellaFormActionsInstance,
} from '@lixpi/ui-kit-gentelella/components/form'
import {
    createGentelellaSpinner,
    type GentelellaSpinnerInstance,
} from '@lixpi/ui-kit-gentelella/components/spinner'
import { gentelellaClasses } from '@lixpi/ui-kit-gentelella/class-names'
import { html } from '@lixpi/ui-primitives/dom'

import {
    type CatalogIndexPatch,
} from '$src/services/model-catalog-service.ts'
import { chevronIcon } from '$src/views/layouts/icons.ts'
import {
    type CatalogProvider,
    type ProviderDirectory,
} from '$src/views/modelCatalog/types.ts'

export type ProviderGroupHeaderConfig = {
    provider: CatalogProvider
    shownModels: number
    totalModels: number
    saving: boolean
    // True while a running sync is working through this provider.
    syncing: boolean
    collapsed: boolean
    onToggleCollapsed: (provider: ProviderDirectory) => void
    onPatchIndex: (
        provider: ProviderDirectory,
        patch: CatalogIndexPatch,
    ) => Promise<void>
    onPatchBase: (
        provider: ProviderDirectory,
        fields: Record<string, unknown>,
    ) => Promise<void>
}

export type ProviderGroupHeaderInstance = {
    el: HTMLElement
    destroy: () => void
}

class ProviderGroupHeader implements ProviderGroupHeaderInstance {
    readonly el: HTMLElement

    private readonly components: Array<
        | GentelellaButtonInstance
        | GentelellaFormActionsInstance
        | GentelellaSpinnerInstance
    > = []

    constructor(private readonly config: ProviderGroupHeaderConfig) {
        const {
            provider,
            shownModels,
            totalModels,
        } = this.config
        const skipped = provider.index?.modelsToSkip ?? []
        const spinner = this.config.syncing
            ? createGentelellaSpinner({
                className: 'model-catalog-group-spinner',
                label: `Syncing ${provider.title}`,
                size: 'small',
            })
            : null

        if (spinner)
            this.components.push(spinner)

        const toggleEl = html`
            <button
                className="model-catalog-group-bar"
                type="button"
                aria-expanded=${this.config.collapsed ? 'false' : 'true'}
                onclick=${() => this.config.onToggleCollapsed(provider.directory)}
            >
                <span
                    className="model-catalog-group-chevron"
                    innerHTML=${chevronIcon}
                ></span>
                ${spinner?.el}
                <span className="model-catalog-group-name">${provider.title}</span>
                <span className="model-catalog-group-count">
                    ${shownModels === totalModels
                        ? `${totalModels} models`
                        : `${shownModels} of ${totalModels} models`}
                </span>
                ${skipped.length === 0
                    ? null
                    : html`<span className="model-catalog-group-count">${skipped.length} skipped</span>`}
            </button>
        ` as HTMLButtonElement

        this.el = html`
            <div className=${`model-catalog-group ${this.config.collapsed ? 'model-catalog-group-collapsed' : ''}`}>
                ${toggleEl}
                ${this.config.collapsed ? null : this.renderSettings(provider, skipped)}
            </div>
        ` as HTMLElement
    }

    private renderSettings(
        provider: CatalogProvider,
        skipped: Array<{
            model: string
            reason: string
        }>,
    ): HTMLElement {
        return html`
            <details className="model-catalog-group-settings">
                <summary>Skipped models and inherited fields</summary>
                <div className="model-catalog-group-settings-body">
                    ${
                        skipped.length === 0
                            ? html`<p className="model-catalog-muted">Nothing is skipped.</p>`
                            : html`
                                <div className="model-catalog-skip-list">
                                    ${skipped.map(entry => this.renderSkippedModel(provider.directory, entry))}
                                </div>
                            `
                    }
                    ${this.renderBaseEditor(provider)}
                </div>
            </details>
        ` as HTMLElement
    }

    private renderSkippedModel(
        provider: ProviderDirectory,
        entry: {
            model: string
            reason: string
        },
    ): HTMLElement {
        const button = createGentelellaButton({
            disabled: this.config.saving,
            label: 'Unskip',
            onClick: () => void this.config.onPatchIndex(provider, { unskipModels: [entry.model] }),
            size: 'small',
            variant: 'ghost',
        })
        this.components.push(button)

        return html`
            <div className="model-catalog-skip-item">
                <div>
                    <span className="model-catalog-skip-model">${entry.model}</span>
                    <span className="model-catalog-muted">${entry.reason}</span>
                </div>
                ${button.el}
            </div>
        ` as HTMLElement
    }

    // The fields every model in the directory inherits, edited as the object the
    // file holds. A key removed here is sent as null, which is how the server
    // deletes one.
    private renderBaseEditor(provider: CatalogProvider): HTMLElement {
        const current = provider.base?.fieldsInheritedByEveryModel ?? {}
        const errorEl = html`
            <p
                className=${gentelellaClasses.form.error}
                hidden
            ></p>
        ` as HTMLParagraphElement
        const textarea = applyGentelellaFormControl(
            html`
                <textarea
                    className="model-catalog-json"
                    spellcheck="false"
                    rows="8"
                    aria-label=${`Fields inherited by every ${provider.title} model`}
                >${JSON.stringify(
                    current,
                    null,
                    4,
                )}</textarea>
            ` as HTMLTextAreaElement,
        )

        const save = async (): Promise<void> => {
            let edited: Record<string, unknown>

            try {
                edited = JSON.parse(textarea.value) as Record<string, unknown>
            } catch (error: unknown) {
                errorEl.textContent = error instanceof Error ? error.message : String(error)
                errorEl.hidden = false

                return
            }

            errorEl.hidden = true
            const patch: Record<string, unknown> = {}

            for (const [key, value] of Object.entries(edited)) {
                if (JSON.stringify(current[key]) !== JSON.stringify(value))
                    patch[key] = value
            }

            for (const key of Object.keys(current)) {
                if (!Object.hasOwn(edited, key))
                    patch[key] = null
            }

            if (Object.keys(patch).length > 0)
                await this.config.onPatchBase(provider.directory, patch)
        }

        const button = createGentelellaButton({
            disabled: this.config.saving,
            label: 'Save inherited fields',
            onClick: () => void save(),
            size: 'small',
            variant: 'outline',
        })
        const actions = createGentelellaFormActions({ content: button.el })
        this.components.push(button, actions)

        return html`
            <div className="model-catalog-base">
                <div className="model-catalog-section-title">Fields inherited by every model</div>
                ${textarea}
                ${errorEl}
                ${actions.el}
            </div>
        ` as HTMLElement
    }

    destroy(): void {
        for (const component of this.components)
            component.destroy()

        this.el.remove()
    }
}

export const createProviderGroupHeader = (config: ProviderGroupHeaderConfig): ProviderGroupHeaderInstance => new ProviderGroupHeader(config)
