import { applyStyle } from '@lixpi/ui-primitives/dom'

import { initFormControls } from '../../runtime/form-controls.ts'
import {
    GentelellaElementComponent,
    createGentelellaElement,
    type GentelellaAttributeValue,
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

class GentelellaInputComponent<ElementType extends HTMLElement> extends GentelellaElementComponent<ElementType> {
    constructor(
        element: ElementType,
        readonly inputEl: HTMLInputElement,
    ) {
        super(element)
    }
}

class GentelellaRuntimeFormControl extends GentelellaElementComponent<HTMLDivElement> {
    initialize(): void {
        initFormControls()
    }
}

export type GentelellaChoiceConfig = {
    checked?: boolean
    className?: string
    disabled?: boolean
    document?: Document
    inputAttributes?: Readonly<Record<string, GentelellaAttributeValue>>
    label: GentelellaContent
    name: string
    onChange?: (
        checked: boolean,
        event: Event,
    ) => void
    type: 'checkbox' | 'radio'
    value?: string
}

export type GentelellaChoiceInstance = GentelellaComponentInstance<HTMLLabelElement> & {
    readonly inputEl: HTMLInputElement
}

export const createGentelellaChoice = (config: GentelellaChoiceConfig): GentelellaChoiceInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'label',
        gentelellaClasses.form.check,
        {
            className: config.className,
            document,
        },
    )
    const input = createGentelellaElement(
        'input',
        '',
        {
            attributes: config.inputAttributes,
            document,
        },
    )
    input.checked = config.checked ?? false
    input.disabled = config.disabled ?? false
    input.name = config.name
    input.type = config.type
    input.value = config.value ?? 'on'

    if (config.onChange)
        input.addEventListener('change', event => config.onChange?.(input.checked, event))

    element.append(input)
    appendGentelellaContent(element, config.label)

    return new GentelellaInputComponent(element, input)
}

export type GentelellaSwitchConfig = {
    checked?: boolean
    className?: string
    disabled?: boolean
    document?: Document
    label: GentelellaContent
    name?: string
    onChange?: (
        checked: boolean,
        event: Event,
    ) => void
}

export type GentelellaSwitchInstance = GentelellaComponentInstance<HTMLLabelElement> & {
    readonly inputEl: HTMLInputElement
    setChecked: (checked: boolean) => void
}

class GentelellaSwitch extends GentelellaInputComponent<HTMLLabelElement> implements GentelellaSwitchInstance {
    setChecked(checked: boolean): void {
        this.inputEl.checked = checked
    }
}

export const createGentelellaSwitch = (config: GentelellaSwitchConfig): GentelellaSwitchInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'label',
        gentelellaClasses.input.switch,
        {
            className: config.className,
            document,
        },
    )
    const input = createGentelellaElement(
        'input',
        '',
        { document },
    )
    input.checked = config.checked ?? false
    input.disabled = config.disabled ?? false
    input.name = config.name ?? ''
    input.type = 'checkbox'
    input.addEventListener('change', event => config.onChange?.(input.checked, event))
    const track = createGentelellaElement(
        'span',
        gentelellaClasses.input.track,
        {
            attributes: { 'aria-hidden': true },
            document,
        },
    )
    const label = createGentelellaElement(
        'span',
        gentelellaClasses.input.switchLabel,
        {
            content: config.label,
            document,
        },
    )
    element.append(
        input,
        track,
        label,
    )

    return new GentelellaSwitch(element, input)
}

export type GentelellaToggleConfig = {
    className?: string
    document?: Document
    label: string
    onChange?: (
        on: boolean,
        event: MouseEvent,
    ) => void
    on?: boolean
}

export type GentelellaToggleInstance = GentelellaComponentInstance<HTMLButtonElement> & {
    setOn: (on: boolean) => void
}

class GentelellaToggle extends GentelellaElementComponent<HTMLButtonElement> implements GentelellaToggleInstance {
    setOn(on: boolean): void {
        this.el.classList.toggle(gentelellaClasses.state.on, on)
        this.el.setAttribute(
            'aria-pressed',
            String(on),
        )
    }
}

export const createGentelellaToggle = (config: GentelellaToggleConfig): GentelellaToggleInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'button',
        combineGentelellaClassNames(gentelellaClasses.input.toggle, config.on && gentelellaClasses.state.on),
        {
            attributes: {
                'aria-label': config.label,
                'aria-pressed': String(config.on ?? false),
                type: 'button',
            },
            className: config.className,
            document,
        },
    )
    const component = new GentelellaToggle(element)
    element.addEventListener('click', event => {
        const on = element.getAttribute('aria-pressed') !== 'true'
        component.setOn(on)
        config.onChange?.(on, event)
    })

    return component
}

export type GentelellaSegmentedOption = {
    disabled?: boolean
    label: string
    value: string
}

export type GentelellaSegmentedControlConfig = {
    ariaLabel: string
    className?: string
    document?: Document
    name: string
    onChange?: (
        value: string,
        event: Event,
    ) => void
    options: GentelellaSegmentedOption[]
    value?: string
}

export type GentelellaSegmentedControlInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setValue: (value: string) => void
}

class GentelellaSegmentedControl extends GentelellaElementComponent<HTMLDivElement> implements GentelellaSegmentedControlInstance {
    constructor(
        element: HTMLDivElement,
        private readonly inputs: Map<string, HTMLInputElement>,
    ) {
        super(element)
    }

    setValue(value: string): void {
        for (const [optionValue, input] of this.inputs)
            input.checked = optionValue === value
    }

    override destroy(): void {
        this.inputs.clear()
        super.destroy()
    }
}

export const createGentelellaSegmentedControl = (config: GentelellaSegmentedControlConfig): GentelellaSegmentedControlInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.input.segmented,
        {
            attributes: {
                'aria-label': config.ariaLabel,
                role: 'radiogroup',
            },
            className: config.className,
            document,
        },
    )
    const inputs = new Map<string, HTMLInputElement>()

    for (const option of config.options) {
        const label = createGentelellaElement(
            'label',
            '',
            { document },
        )
        const input = createGentelellaElement(
            'input',
            '',
            { document },
        )
        input.checked = config.value === option.value
        input.disabled = option.disabled ?? false
        input.name = config.name
        input.type = 'radio'
        input.value = option.value
        input.addEventListener('change', event => config.onChange?.(option.value, event))
        const text = createGentelellaElement(
            'span',
            '',
            { document },
        )
        text.textContent = option.label
        label.append(input, text)
        inputs.set(option.value, input)
        element.append(label)
    }

    return new GentelellaSegmentedControl(element, inputs)
}

export type GentelellaSliderConfig = {
    className?: string
    document?: Document
    label: string
    max?: number
    min?: number
    onChange?: (
        value: number,
        event: Event,
    ) => void
    step?: number
    value?: number
}

export type GentelellaSliderInstance = GentelellaComponentInstance<HTMLDivElement> & {
    readonly inputEl: HTMLInputElement
    readonly valueEl: HTMLOutputElement
    setValue: (value: number) => void
}

class GentelellaSlider extends GentelellaElementComponent<HTMLDivElement> implements GentelellaSliderInstance {
    constructor(
        element: HTMLDivElement,
        readonly inputEl: HTMLInputElement,
        readonly valueEl: HTMLOutputElement,
    ) {
        super(element)
    }

    setValue(value: number): void {
        this.inputEl.valueAsNumber = value
        this.valueEl.value = String(value)
    }
}

export const createGentelellaSlider = (config: GentelellaSliderConfig): GentelellaSliderInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        gentelellaClasses.input.sliderRow,
        {
            className: config.className,
            document,
        },
    )
    const input = createGentelellaElement(
        'input',
        gentelellaClasses.input.slider,
        {
            attributes: {
                'aria-label': config.label,
                max: config.max ?? 100,
                min: config.min ?? 0,
                step: config.step ?? 1,
                type: 'range',
                value: config.value ?? 0,
            },
            document,
        },
    )
    const output = createGentelellaElement(
        'output',
        gentelellaClasses.input.sliderValue,
        { document },
    )
    const component = new GentelellaSlider(
        element,
        input,
        output,
    )
    component.setValue(config.value ?? 0)
    input.addEventListener('input', event => {
        component.setValue(input.valueAsNumber)
        config.onChange?.(input.valueAsNumber, event)
    })
    element.append(input, output)

    return component
}

export type GentelellaFileInputConfig = {
    accept?: string
    className?: string
    document?: Document
    label?: string
    multiple?: boolean
    name?: string
    onChange?: (
        files: FileList | null,
        event: Event,
    ) => void
}

export type GentelellaFileInputInstance = GentelellaComponentInstance<HTMLLabelElement> & {
    readonly inputEl: HTMLInputElement
    readonly nameEl: HTMLSpanElement
    clear: () => void
}

class GentelellaFileInput extends GentelellaInputComponent<HTMLLabelElement> implements GentelellaFileInputInstance {
    constructor(
        element: HTMLLabelElement,
        input: HTMLInputElement,
        readonly nameEl: HTMLSpanElement,
    ) {
        super(element, input)
    }

    clear(): void {
        this.inputEl.value = ''
        this.nameEl.textContent = 'No file selected'
    }
}

export const createGentelellaFileInput = (config: GentelellaFileInputConfig = {}): GentelellaFileInputInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'label',
        gentelellaClasses.input.file,
        {
            className: config.className,
            document,
        },
    )
    const input = createGentelellaElement(
        'input',
        '',
        { document },
    )
    input.accept = config.accept ?? ''
    input.hidden = true
    input.multiple = config.multiple ?? false
    input.name = config.name ?? ''
    input.type = 'file'
    const trigger = createGentelellaElement(
        'span',
        gentelellaClasses.input.fileTrigger,
        {
            content: config.label ?? 'Choose file',
            document,
        },
    )
    const name = createGentelellaElement(
        'span',
        gentelellaClasses.input.fileName,
        {
            content: 'No file selected',
            document,
        },
    )
    input.addEventListener('change', event => {
        name.textContent = input.files?.length
            ? [...input.files].map(file => file.name).join(', ')
            : 'No file selected'
        config.onChange?.(input.files, event)
    })
    element.append(
        input,
        trigger,
        name,
    )

    return new GentelellaFileInput(
        element,
        input,
        name,
    )
}

export type GentelellaDropzoneConfig = {
    accept?: string
    className?: string
    document?: Document
    label: GentelellaContent
    multiple?: boolean
    onFiles?: (files: FileList) => void
}

export type GentelellaDropzoneInstance = GentelellaComponentInstance<HTMLLabelElement> & {
    readonly inputEl: HTMLInputElement
}

export const createGentelellaDropzone = (config: GentelellaDropzoneConfig): GentelellaDropzoneInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'label',
        'dropzone',
        {
            className: config.className,
            content: config.label,
            document,
        },
    )
    const input = createGentelellaElement(
        'input',
        '',
        { document },
    )
    input.accept = config.accept ?? ''
    input.hidden = true
    input.multiple = config.multiple ?? false
    input.type = 'file'
    input.addEventListener('change', () => {
        if (input.files)
            config.onFiles?.(input.files)
    })
    element.addEventListener('dragover', event => {
        event.preventDefault()
        element.classList.add('over')
    })
    element.addEventListener('dragleave', () => element.classList.remove('over'))
    element.addEventListener('drop', event => {
        event.preventDefault()
        element.classList.remove('over')

        if (event.dataTransfer?.files)
            config.onFiles?.(event.dataTransfer.files)
    })
    element.prepend(input)

    return new GentelellaInputComponent(element, input)
}

export type GentelellaAdvancedControlInstance = GentelellaComponentInstance<HTMLDivElement> & {
    initialize: () => void
}

const createAdvancedControl = (
    className: string,
    dataAttribute: string,
    config: {
        className?: string
        content: GentelellaContent
        document?: Document
        data?: Readonly<Record<string, string>>
    },
): GentelellaAdvancedControlInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        className,
        {
            attributes: {
                [dataAttribute]: true,
                ...config.data,
            },
            className: config.className,
            content: config.content,
            document,
        },
    )

    return new GentelellaRuntimeFormControl(element)
}

export type GentelellaDateRangeConfig = {
    className?: string
    document?: Document
    input?: HTMLInputElement
    placeholder?: string
}

export const createGentelellaDateRange = (config: GentelellaDateRangeConfig = {}): GentelellaAdvancedControlInstance => {
    const document = config.document ?? globalThis.document
    const input = config.input ?? createGentelellaElement(
        'input',
        gentelellaClasses.form.control,
        {
            attributes: {
                'aria-label': config.placeholder ?? 'Date range',
                placeholder: config.placeholder ?? 'Pick a date range',
            },
            document,
        },
    )

    return createAdvancedControl(
        gentelellaClasses.input.dateRange,
        'data-date-range',
        {
            className: config.className,
            content: input,
            document,
        },
    )
}

export type GentelellaMultiSelectOption = {
    label: string
    selected?: boolean
    value: string
}

export type GentelellaMultiSelectConfig = {
    className?: string
    document?: Document
    name?: string
    options: GentelellaMultiSelectOption[]
}

export const createGentelellaMultiSelect = (config: GentelellaMultiSelectConfig): GentelellaAdvancedControlInstance => {
    const document = config.document ?? globalThis.document
    const select = createGentelellaElement(
        'select',
        '',
        { document },
    )
    select.hidden = true
    select.multiple = true
    select.name = config.name ?? ''

    for (const option of config.options) {
        const optionEl = createGentelellaElement(
            'option',
            '',
            { document },
        )
        optionEl.selected = option.selected ?? false
        optionEl.textContent = option.label
        optionEl.value = option.value
        select.append(optionEl)
    }

    return createAdvancedControl(
        gentelellaClasses.input.multiSelect,
        'data-multi-select',
        {
            className: config.className,
            content: select,
            data: { 'data-options': config.options.map(option => option.value).join(',') },
            document,
        },
    )
}

export type GentelellaRichTextConfig = {
    className?: string
    document?: Document
    html?: string
    name?: string
}

export const createGentelellaRichText = (config: GentelellaRichTextConfig = {}): GentelellaAdvancedControlInstance => {
    const document = config.document ?? globalThis.document
    const textarea = createGentelellaElement(
        'textarea',
        '',
        { document },
    )
    textarea.hidden = true
    textarea.name = config.name ?? ''
    textarea.value = config.html ?? ''

    return createAdvancedControl(
        gentelellaClasses.input.richText,
        'data-rich-text',
        {
            className: config.className,
            content: textarea,
            document,
        },
    )
}

export type GentelellaOtpInputConfig = {
    className?: string
    document?: Document
    length?: number
    name?: string
    onChange?: (value: string) => void
}

export type GentelellaOtpInputInstance = GentelellaComponentInstance<HTMLDivElement> & {
    getValue: () => string
    setValue: (value: string) => void
}

class GentelellaOtpInput extends GentelellaElementComponent<HTMLDivElement> implements GentelellaOtpInputInstance {
    private readonly inputs: HTMLInputElement[] = []

    constructor(private readonly config: GentelellaOtpInputConfig = {}) {
        const document = config.document ?? globalThis.document
        super(
            createGentelellaElement(
                'div',
                gentelellaClasses.input.otpGrid,
                {
                    className: config.className,
                    document,
                },
            ),
        )
        const length = config.length ?? 6

        for (let index = 0; index < length; index++) {
            const input = createGentelellaElement(
                'input',
                gentelellaClasses.input.otp,
                {
                    attributes: {
                        'aria-label': `Digit ${index + 1}`,
                        autocomplete: index === 0 ? 'one-time-code' : 'off',
                        inputmode: 'numeric',
                        maxlength: 1,
                        name: config.name ? `${config.name}-${index}` : undefined,
                        pattern: '[0-9]*',
                        type: 'text',
                    },
                    document,
                },
            )
            input.addEventListener('input', () => this.handleInput(input, index))
            input.addEventListener(
                'keydown',
                event => this.handleKeydown(
                    input,
                    index,
                    event,
                ),
            )
            this.inputs.push(input)
            this.el.append(input)
        }
    }

    private handleInput(
        input: HTMLInputElement,
        index: number,
    ): void {
        input.value = input.value.replace(/\D/g, '').slice(0, 1)

        if (
            input.value
            && this.inputs[index + 1]
        )
            this.inputs[index + 1].focus()

        this.config.onChange?.(
            this.getValue(),
        )
    }

    private handleKeydown(
        input: HTMLInputElement,
        index: number,
        event: KeyboardEvent,
    ): void {
        if (
            event.key === 'Backspace'
            && !input.value
            && this.inputs[index - 1]
        )
            this.inputs[index - 1].focus()
    }

    getValue(): string {
        return this.inputs.map(input => input.value).join('')
    }

    setValue(value: string): void {
        this.inputs.forEach((input, index) => void (input.value = value[index] ?? ''))
    }
}

export const createGentelellaOtpInput = (config: GentelellaOtpInputConfig = {}): GentelellaOtpInputInstance => new GentelellaOtpInput(config)

export type GentelellaPasswordStrengthConfig = {
    className?: string
    document?: Document
    label?: string
    value?: number
}

export type GentelellaPasswordStrengthInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setValue: (
        value: number,
        label?: string,
    ) => void
}

class GentelellaPasswordStrength extends GentelellaElementComponent<HTMLDivElement> implements GentelellaPasswordStrengthInstance {
    private readonly barEl: HTMLDivElement
    private readonly fillEl: HTMLDivElement
    private readonly labelEl: HTMLDivElement

    constructor(private readonly config: GentelellaPasswordStrengthConfig = {}) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            'password-strength',
            {
                className: config.className,
                document,
            },
        )
        const bar = createGentelellaElement(
            'div',
            gentelellaClasses.progress.thin,
            {
                attributes: { role: 'progressbar' },
                document,
            },
        )
        const fill = createGentelellaElement(
            'div',
            gentelellaClasses.progress.bar,
            { document },
        )
        const label = createGentelellaElement(
            'div',
            'password-strength-label',
            { document },
        )
        bar.append(fill)
        element.append(bar, label)
        super(element)
        this.barEl = bar
        this.fillEl = fill
        this.labelEl = label
        this.setValue(config.value ?? 0)
    }

    setValue(
        value: number,
        text = this.config.label ?? '',
    ): void {
        const boundedValue = Math.max(
            0,
            Math.min(100, value),
        )
        applyStyle(this.fillEl, { width: `${boundedValue}%` })
        this.barEl.setAttribute(
            'aria-valuenow',
            String(boundedValue),
        )
        this.labelEl.textContent = text
    }
}

export const createGentelellaPasswordStrength = (config: GentelellaPasswordStrengthConfig = {}): GentelellaPasswordStrengthInstance =>
    new GentelellaPasswordStrength(config)

export type GentelellaRatingConfig = {
    className?: string
    document?: Document
    label?: string
    max?: number
    onChange?: (value: number) => void
    readonly?: boolean
    value?: number
}

export type GentelellaRatingInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setValue: (value: number) => void
}

class GentelellaRating extends GentelellaElementComponent<HTMLDivElement> implements GentelellaRatingInstance {
    private readonly buttons: HTMLButtonElement[] = []
    private readonly max: number

    constructor(private readonly config: GentelellaRatingConfig = {}) {
        const document = config.document ?? globalThis.document
        const max = config.max ?? 5
        super(
            createGentelellaElement(
                'div',
                combineGentelellaClassNames('rating-stars', config.readonly && 'rating-stars-readonly'),
                {
                    attributes: {
                        'aria-label': config.label ?? 'Rating',
                        role: 'radiogroup',
                    },
                    className: config.className,
                    document,
                },
            ),
        )
        this.max = max

        for (let index = 1; index <= max; index++) {
            const button = createGentelellaElement(
                'button',
                '',
                {
                    attributes: {
                        'aria-label': `${index} of ${max}`,
                        role: 'radio',
                        type: 'button',
                    },
                    content: '★',
                    document,
                },
            )
            button.disabled = config.readonly ?? false
            button.addEventListener('click', () => this.handleClick(index))
            this.buttons.push(button)
            this.el.append(button)
        }

        this.setValue(config.value ?? 0)
    }

    private handleClick(value: number): void {
        this.setValue(value)
        this.config.onChange?.(value)
    }

    setValue(nextValue: number): void {
        const value = Math.max(
            0,
            Math.min(this.max, nextValue),
        )
        this.buttons.forEach((button, index) => {
            button.classList.toggle(gentelellaClasses.state.active, index < value)
            button.setAttribute(
                'aria-checked',
                String(index + 1 === value),
            )
        })
    }
}

export const createGentelellaRating = (config: GentelellaRatingConfig = {}): GentelellaRatingInstance => new GentelellaRating(config)

export type GentelellaTagInputConfig = {
    className?: string
    document?: Document
    label?: string
    onChange?: (values: string[]) => void
    placeholder?: string
    values?: string[]
}

export type GentelellaTagInputInstance = GentelellaComponentInstance<HTMLDivElement> & {
    add: (value: string) => void
    getValues: () => string[]
    remove: (value: string) => void
}

class GentelellaTagInput extends GentelellaElementComponent<HTMLDivElement> implements GentelellaTagInputInstance {
    private readonly document: Document
    private readonly inputEl: HTMLInputElement
    private readonly pills = new Map<string, HTMLSpanElement>()
    private readonly values = new Set<string>()

    constructor(private readonly config: GentelellaTagInputConfig = {}) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            gentelellaClasses.input.tag,
            {
                attributes: { 'aria-label': config.label ?? 'Tags' },
                className: config.className,
                document,
            },
        )
        const input = createGentelellaElement(
            'input',
            '',
            { document },
        )
        input.placeholder = config.placeholder ?? 'Add tag…'
        element.append(input)
        super(element)
        this.document = document
        this.inputEl = input
        this.inputEl.addEventListener('keydown', this.handleKeydown)

        for (const value of config.values ?? [])
            this.add(value)
    }

    private emit(): void {
        this.config.onChange?.(
            this.getValues(),
        )
    }

    add(rawValue: string): void {
        const value = rawValue.trim()

        if (
            !value
            || this.values.has(value)
        )
            return

        this.values.add(value)
        const pill = createGentelellaElement(
            'span',
            gentelellaClasses.input.tagPill,
            {
                attributes: { 'data-tag': value },
                content: value,
                document: this.document,
            },
        )
        const removeButton = createGentelellaElement(
            'button',
            'chip-close',
            {
                attributes: {
                    'aria-label': `Remove ${value}`,
                    type: 'button',
                },
                content: '×',
                document: this.document,
            },
        )
        removeButton.addEventListener('click', () => this.remove(value))
        pill.append(removeButton)
        this.pills.set(value, pill)
        this.inputEl.before(pill)
        this.emit()
    }

    private handleKeydown = (event: KeyboardEvent): void => {
        if (
            event.key !== 'Enter'
            && event.key !== ','
        )
            return

        event.preventDefault()
        this.add(this.inputEl.value)
        this.inputEl.value = ''
    }

    getValues(): string[] {
        return [...this.values]
    }

    remove(value: string): void {
        this.values.delete(value)
        this.pills.get(value)?.remove()
        this.pills.delete(value)
        this.emit()
    }

    override destroy(): void {
        this.inputEl.removeEventListener('keydown', this.handleKeydown)
        this.pills.clear()
        this.values.clear()
        super.destroy()
    }
}

export const createGentelellaTagInput = (config: GentelellaTagInputConfig = {}): GentelellaTagInputInstance => new GentelellaTagInput(config)

export type GentelellaColorSwatch = {
    color: string
    label: string
    value: string
}

export type GentelellaColorSwatchesConfig = {
    ariaLabel: string
    className?: string
    document?: Document
    onChange?: (value: string) => void
    swatches: GentelellaColorSwatch[]
    value?: string
}

export type GentelellaColorSwatchesInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setValue: (value: string) => void
}

class GentelellaColorSwatches extends GentelellaElementComponent<HTMLDivElement> implements GentelellaColorSwatchesInstance {
    constructor(
        element: HTMLDivElement,
        private readonly buttons: Map<string, HTMLButtonElement>,
    ) {
        super(element)
    }

    setValue(value: string): void {
        for (const [swatchValue, button] of this.buttons) {
            const selected = swatchValue === value
            button.classList.toggle(gentelellaClasses.state.selected, selected)
            button.setAttribute(
                'aria-checked',
                String(selected),
            )
        }
    }

    override destroy(): void {
        this.buttons.clear()
        super.destroy()
    }
}

export const createGentelellaColorSwatches = (config: GentelellaColorSwatchesConfig): GentelellaColorSwatchesInstance => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'color-grid',
        {
            attributes: {
                'aria-label': config.ariaLabel,
                role: 'radiogroup',
            },
            className: config.className,
            document,
        },
    )
    const buttons = new Map<string, HTMLButtonElement>()
    const component = new GentelellaColorSwatches(element, buttons)

    for (const swatch of config.swatches) {
        const button = createGentelellaElement(
            'button',
            'color-swatch',
            {
                attributes: {
                    'aria-label': swatch.label,
                    role: 'radio',
                    type: 'button',
                },
                document,
            },
        )
        applyStyle(button, { background: swatch.color })
        button.addEventListener('click', () => {
            component.setValue(swatch.value)
            config.onChange?.(swatch.value)
        })
        buttons.set(swatch.value, button)
        element.append(button)
    }

    component.setValue(config.value ?? '')

    return component
}

export type GentelellaCharacterCounterConfig = {
    className?: string
    control: HTMLInputElement | HTMLTextAreaElement
    document?: Document
    maxLength: number
}

export type GentelellaCharacterCounterInstance = GentelellaComponentInstance<HTMLDivElement> & {
    refresh: () => void
}

class GentelellaCharacterCounter extends GentelellaElementComponent<HTMLDivElement> implements GentelellaCharacterCounterInstance {
    constructor(private readonly config: GentelellaCharacterCounterConfig) {
        const document = config.document ?? config.control.ownerDocument
        super(
            createGentelellaElement(
                'div',
                'form-hint',
                {
                    attributes: { 'aria-live': 'polite' },
                    className: config.className,
                    document,
                },
            ),
        )
        config.control.maxLength = config.maxLength
        config.control.addEventListener('input', this.refresh)
        this.refresh()
    }

    refresh = (): void => void (this.el.textContent = `${this.config.control.value.length} / ${this.config.maxLength}`)

    override destroy(): void {
        this.config.control.removeEventListener('input', this.refresh)
        super.destroy()
    }
}

export const createGentelellaCharacterCounter = (config: GentelellaCharacterCounterConfig): GentelellaCharacterCounterInstance =>
    new GentelellaCharacterCounter(config)

export const setGentelellaControlValidation = (
    control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    error: string | null,
): void => {
    control.classList.toggle(
        'is-invalid',
        Boolean(error),
    )
    control.setAttribute(
        'aria-invalid',
        String(
            Boolean(error),
        ),
    )

    if (error)
        control.setAttribute('data-validation-message', error)
    else
        control.removeAttribute('data-validation-message')
}
