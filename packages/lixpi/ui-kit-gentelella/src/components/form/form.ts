import { createDocumentHtml } from '@lixpi/ui-primitives/dom'

import {
    combineGentelellaClassNames,
    gentelellaClasses,
} from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'
import {
    createGentelellaComponentInstance,
    createGentelellaElement,
} from '../../component.ts'

export type GentelellaFormControlElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

export type GentelellaFormFieldConfig = {
    className?: string
    control: GentelellaFormControlElement
    document?: Document
    error?: string
    help?: GentelellaContent
    hint?: GentelellaContent
    label: string
    required?: boolean
}

export type GentelellaFormFieldInstance = {
    readonly control: GentelellaFormControlElement
    readonly el: HTMLDivElement
    destroy: () => void
    setError: (error: string | null) => void
}

export type GentelellaFormActionsConfig = {
    className?: string
    content: GentelellaContent
    document?: Document
}

export type GentelellaFormActionsInstance = {
    readonly el: HTMLDivElement
    destroy: () => void
}

export type GentelellaFormConfig = {
    className?: string
    content: GentelellaContent
    document?: Document
    onSubmit?: (event: SubmitEvent) => void
    resetOnSubmit?: boolean
}

export type GentelellaFormInstance = {
    readonly el: HTMLFormElement
    destroy: () => void
}

export const applyGentelellaFormControl = <ElementType extends GentelellaFormControlElement>(
    control: ElementType,
    className?: string,
): ElementType => {
    control.className = combineGentelellaClassNames(
        gentelellaClasses.form.control,
        control.className,
        className,
    )

    return control
}

class GentelellaFormField implements GentelellaFormFieldInstance {
    readonly control: GentelellaFormControlElement
    readonly el: HTMLDivElement

    private readonly errorEl: HTMLDivElement

    constructor(config: GentelellaFormFieldConfig) {
        const html = createDocumentHtml(config.document ?? config.control.ownerDocument)
        this.control = applyGentelellaFormControl(config.control)

        if (!this.control.id)
            this.control.id = `gentelella-control-${crypto.randomUUID()}`

        this.control.required = config.required ?? this.control.required
        this.errorEl = html`<div className=${gentelellaClasses.form.error}></div>` as HTMLDivElement
        this.el = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.form.group, config.className)}>
                <label
                    className=${gentelellaClasses.form.label}
                    for=${this.control.id}
                >
                    ${config.label}
                    ${config.required ? html`<span className=${gentelellaClasses.form.required}>*</span>` : null}
                </label>
                ${config.hint ? html`<div className=${gentelellaClasses.form.hint}>${config.hint}</div>` : null}
                ${this.control}
                ${config.help ? html`<div className=${gentelellaClasses.form.help}>${config.help}</div>` : null}
                ${this.errorEl}
            </div>
        ` as HTMLDivElement
        this.setError(config.error ?? null)
    }

    setError(error: string | null): void {
        this.errorEl.textContent = error ?? ''
        this.errorEl.hidden = !error
    }

    destroy(): void {
        this.el.remove()
    }
}

class GentelellaFormActions implements GentelellaFormActionsInstance {
    readonly el: HTMLDivElement

    constructor(config: GentelellaFormActionsConfig) {
        const html = createDocumentHtml(config.document ?? globalThis.document)
        this.el = html`
            <div className=${combineGentelellaClassNames(gentelellaClasses.form.actions, config.className)}></div>
        ` as HTMLDivElement
        appendGentelellaContent(this.el, config.content)
    }

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaFormField = (config: GentelellaFormFieldConfig): GentelellaFormFieldInstance => new GentelellaFormField(config)

export const createGentelellaFormActions = (config: GentelellaFormActionsConfig): GentelellaFormActionsInstance => new GentelellaFormActions(config)

class GentelellaForm implements GentelellaFormInstance {
    readonly el: HTMLFormElement

    constructor(private readonly config: GentelellaFormConfig) {
        const document = config.document ?? globalThis.document
        this.el = createGentelellaElement(
            'form',
            '',
            {
                className: config.className,
                document,
            },
        )
        this.el.dataset.resetOnSubmit = String(config.resetOnSubmit ?? false)
        appendGentelellaContent(this.el, config.content)

        if (config.onSubmit)
            this.el.addEventListener('submit', this.handleSubmit)
    }

    private handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault()
        this.config.onSubmit?.(event)

        if (this.config.resetOnSubmit)
            this.el.reset()
    }

    destroy(): void {
        this.el.removeEventListener('submit', this.handleSubmit)
        this.el.remove()
    }
}

export const createGentelellaForm = (config: GentelellaFormConfig): GentelellaFormInstance => new GentelellaForm(config)

export type GentelellaFormRowConfig = {
    className?: string
    columns?: 2 | 3
    content: GentelellaContent
    document?: Document
}

export const createGentelellaFormRow = (config: GentelellaFormRowConfig): GentelellaFormActionsInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        combineGentelellaClassNames(gentelellaClasses.form.row, config.columns ? `cols-${config.columns}` : ''),
        {
            className: config.className,
            document,
        },
    )
    appendGentelellaContent(element, config.content)

    return createGentelellaComponentInstance(element)
}
