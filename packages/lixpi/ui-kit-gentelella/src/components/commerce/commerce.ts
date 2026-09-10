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
import { PRODUCT_IMAGES } from '../../runtime/product-images.ts'
import {
    MOCKUPS,
    RELATED,
} from '../../runtime/product-mockups.ts'
import { createGentelellaButton } from '../button/index.ts'
import { createGentelellaRating } from '../formControls/index.ts'

export const GENTELELLA_PRODUCT_IMAGES = PRODUCT_IMAGES
export const GENTELELLA_PRODUCT_MOCKUPS = MOCKUPS
export const GENTELELLA_RELATED_MOCKUPS = RELATED

export type GentelellaProductCardConfig = {
    badge?: string
    className?: string
    document?: Document
    imageAlt: string
    imageSrc: string
    metadata?: string
    onSelect?: (event: MouseEvent) => void
    price: string
    title: string
}

export const createGentelellaProductCard = (config: GentelellaProductCardConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'product-card',
        {
            className: config.className,
            document,
        },
    )
    const image = createGentelellaElement(
        'img',
        'product-thumb',
        { document },
    )
    image.alt = config.imageAlt
    image.loading = 'lazy'
    image.src = config.imageSrc
    element.append(image)

    if (config.badge)
        element.append(
            createGentelellaElement(
                'span',
                'product-badge',
                {
                    content: config.badge,
                    document,
                },
            ),
        )

    const info = createGentelellaElement(
        'div',
        'product-info',
        { document },
    )
    info.append(
        createGentelellaElement(
            'div',
            'title',
            {
                content: config.title,
                document,
            },
        ),
        createGentelellaElement(
            'div',
            'price',
            {
                content: config.price,
                document,
            },
        ),
    )

    if (config.metadata)
        info.append(
            createGentelellaElement(
                'div',
                'meta',
                {
                    content: config.metadata,
                    document,
                },
            ),
        )

    element.append(info)

    if (config.onSelect) {
        element.tabIndex = 0
        element.addEventListener('click', config.onSelect)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaProductGalleryImage = {
    alt: string
    src: string
}

export type GentelellaProductGalleryConfig = {
    className?: string
    document?: Document
    images: GentelellaProductGalleryImage[]
    initialIndex?: number
}

export type GentelellaProductGalleryInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setActiveIndex: (index: number) => void
}

class GentelellaProductGallery extends GentelellaElementComponent<HTMLDivElement> implements GentelellaProductGalleryInstance {
    private readonly buttons: HTMLButtonElement[]
    private readonly mainEl: HTMLImageElement

    constructor(private readonly config: GentelellaProductGalleryConfig) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            'product-gallery',
            {
                className: config.className,
                document,
            },
        )
        const main = createGentelellaElement(
            'img',
            'gallery-main',
            { document },
        )
        const thumbnails = createGentelellaElement(
            'div',
            'gallery-thumbs',
            { document },
        )
        super(element)
        this.mainEl = main
        this.buttons = config.images.map((image, index) => {
            const button = createGentelellaElement(
                'button',
                'gallery-thumb',
                {
                    attributes: {
                        'aria-label': `Show ${image.alt}`,
                        type: 'button',
                    },
                    document,
                },
            )
            const thumbnail = createGentelellaElement(
                'img',
                '',
                { document },
            )
            thumbnail.alt = ''
            thumbnail.loading = 'lazy'
            thumbnail.src = image.src
            button.append(thumbnail)
            button.addEventListener('click', () => this.setActiveIndex(index))
            thumbnails.append(button)

            return button
        })
        this.el.append(this.mainEl, thumbnails)
        this.setActiveIndex(config.initialIndex ?? 0)
    }

    setActiveIndex(index: number): void {
        const boundedIndex = Math.max(
            0,
            Math.min(this.config.images.length - 1, index),
        )
        const image = this.config.images[boundedIndex]

        if (!image)
            return

        this.mainEl.alt = image.alt
        this.mainEl.src = image.src
        this.buttons.forEach((button, buttonIndex) => {
            button.classList.toggle(gentelellaClasses.state.active, buttonIndex === boundedIndex)
            button.setAttribute(
                'aria-pressed',
                String(buttonIndex === boundedIndex),
            )
        })
    }
}

export const createGentelellaProductGallery = (config: GentelellaProductGalleryConfig): GentelellaProductGalleryInstance =>
    new GentelellaProductGallery(config)

export type GentelellaProductOption = {
    disabled?: boolean
    label: string
    value: string
}

export type GentelellaProductOptionsConfig = {
    className?: string
    document?: Document
    label: string
    onChange?: (value: string) => void
    options: GentelellaProductOption[]
    value?: string
}

export type GentelellaProductOptionsInstance = GentelellaComponentInstance<HTMLDivElement> & {
    setValue: (value: string) => void
}

class GentelellaProductOptions extends GentelellaElementComponent<HTMLDivElement> implements GentelellaProductOptionsInstance {
    private readonly buttons = new Map<string, HTMLButtonElement>()

    constructor(private readonly config: GentelellaProductOptionsConfig) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            'product-option',
            {
                className: config.className,
                document,
            },
        )
        element.append(
            createGentelellaElement(
                'div',
                'option-label',
                {
                    content: config.label,
                    document,
                },
            ),
        )
        const values = createGentelellaElement(
            'div',
            'option-values',
            { document },
        )
        super(element)

        for (const option of config.options) {
            const button = createGentelellaElement(
                'button',
                combineGentelellaClassNames('option-value', option.value === config.value && gentelellaClasses.state.active),
                {
                    attributes: { type: 'button' },
                    content: option.label,
                    document,
                },
            )
            button.disabled = option.disabled ?? false
            button.addEventListener('click', () => {
                this.setValue(option.value)
                this.config.onChange?.(option.value)
            })
            this.buttons.set(option.value, button)
            values.append(button)
        }

        this.el.append(values)
    }

    setValue(value: string): void {
        for (const [optionValue, button] of this.buttons)
            button.classList.toggle(gentelellaClasses.state.active, optionValue === value)
    }

    override destroy(): void {
        this.buttons.clear()
        super.destroy()
    }
}

export const createGentelellaProductOptions = (config: GentelellaProductOptionsConfig): GentelellaProductOptionsInstance =>
    new GentelellaProductOptions(config)

export type GentelellaQuantityConfig = {
    className?: string
    document?: Document
    label?: string
    max?: number
    min?: number
    onChange?: (value: number) => void
    value?: number
}

export type GentelellaQuantityInstance = GentelellaComponentInstance<HTMLDivElement> & {
    getValue: () => number
    setValue: (value: number) => void
}

class GentelellaQuantity extends GentelellaElementComponent<HTMLDivElement> implements GentelellaQuantityInstance {
    private readonly config: GentelellaQuantityConfig
    private readonly inputEl: HTMLInputElement

    constructor(config: GentelellaQuantityConfig = {}) {
        const document = config.document ?? globalThis.document
        const element = createGentelellaElement(
            'div',
            'product-quantity-row',
            {
                className: config.className,
                document,
            },
        )

        if (config.label)
            element.append(
                createGentelellaElement(
                    'span',
                    'qty-label',
                    {
                        content: config.label,
                        document,
                    },
                ),
            )

        const controls = createGentelellaElement(
            'div',
            'qty-controls',
            { document },
        )
        const input = createGentelellaElement(
            'input',
            gentelellaClasses.form.control,
            { document },
        )
        input.max = String(config.max ?? Number.MAX_SAFE_INTEGER)
        input.min = String(config.min ?? 0)
        input.type = 'number'
        super(element)
        this.config = config
        this.inputEl = input
        const decrement = createGentelellaElement(
            'button',
            'qty-btn',
            {
                attributes: {
                    'aria-label': 'Decrease quantity',
                    type: 'button',
                },
                content: '−',
                document,
            },
        )
        decrement.addEventListener('click', () => this.changeBy(-1))
        const increment = createGentelellaElement(
            'button',
            'qty-btn',
            {
                attributes: {
                    'aria-label': 'Increase quantity',
                    type: 'button',
                },
                content: '+',
                document,
            },
        )
        increment.addEventListener('click', () => this.changeBy(1))
        this.inputEl.addEventListener('change', this.handleChange)
        controls.append(
            decrement,
            this.inputEl,
            increment,
        )
        this.el.append(controls)
        this.setValue(config.value ?? config.min ?? 1)
    }

    private changeBy(difference: number): void {
        this.setValue(this.inputEl.valueAsNumber + difference)
        this.config.onChange?.(this.inputEl.valueAsNumber)
    }

    private handleChange = (): void => {
        this.setValue(this.inputEl.valueAsNumber)
        this.config.onChange?.(this.inputEl.valueAsNumber)
    }

    getValue(): number {
        return this.inputEl.valueAsNumber
    }

    setValue(value: number): void {
        const boundedValue = Math.max(
            this.config.min ?? 0,
            Math.min(this.config.max ?? Number.MAX_SAFE_INTEGER, value),
        )
        this.inputEl.valueAsNumber = boundedValue
    }

    override destroy(): void {
        this.inputEl.removeEventListener('change', this.handleChange)
        super.destroy()
    }
}

export const createGentelellaQuantity = (config: GentelellaQuantityConfig = {}): GentelellaQuantityInstance => new GentelellaQuantity(config)

export type GentelellaPricingTierConfig = {
    action?: GentelellaContent
    className?: string
    description?: string
    document?: Document
    features: GentelellaContent[]
    name: string
    popular?: boolean
    price: string
    priceSuffix?: string
}

export const createGentelellaPricingTier = (config: GentelellaPricingTierConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        combineGentelellaClassNames('pricing-tier', config.popular && 'popular'),
        {
            className: config.className,
            document,
        },
    )

    if (config.popular)
        element.append(
            createGentelellaElement(
                'div',
                'product-badge',
                {
                    content: 'Popular',
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'div',
            'plan-name',
            {
                content: config.name,
                document,
            },
        ),
    )

    if (config.description)
        element.append(
            createGentelellaElement(
                'div',
                'plan-meta',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    const price = createGentelellaElement(
        'div',
        'price-row',
        { document },
    )
    price.append(
        createGentelellaElement(
            'span',
            'price',
            {
                content: config.price,
                document,
            },
        ),
    )

    if (config.priceSuffix)
        price.append(
            createGentelellaElement(
                'span',
                'sub',
                {
                    content: config.priceSuffix,
                    document,
                },
            ),
        )

    element.append(price)
    const features = createGentelellaElement(
        'ul',
        'product-perks',
        { document },
    )

    for (const feature of config.features) {
        const item = createGentelellaElement(
            'li',
            'perk',
            { document },
        )
        appendGentelellaContent(item, feature)
        features.append(item)
    }

    element.append(features)
    appendGentelellaContent(element, config.action)

    return createGentelellaComponentInstance(element)
}

export type GentelellaInvoiceHeaderConfig = {
    className?: string
    document?: Document
    invoiceNumber: string
    metadata?: GentelellaContent
    status?: GentelellaContent
    title?: string
}

export const createGentelellaInvoiceHeader = (config: GentelellaInvoiceHeaderConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'header',
        'invoice-header',
        {
            className: config.className,
            document,
        },
    )
    const identity = createGentelellaElement(
        'div',
        '',
        { document },
    )
    identity.append(
        createGentelellaElement(
            'div',
            'title',
            {
                content: config.title ?? 'Invoice',
                document,
            },
        ),
        createGentelellaElement(
            'div',
            'invoice-meta',
            {
                content: config.invoiceNumber,
                document,
            },
        ),
    )
    appendGentelellaContent(identity, config.metadata)
    element.append(identity)

    if (config.status)
        element.append(
            createGentelellaElement(
                'div',
                'invoice-payment-status',
                {
                    content: config.status,
                    document,
                },
            ),
        )

    return createGentelellaComponentInstance(element)
}

export type GentelellaInvoiceLine = {
    amount: GentelellaContent
    description: GentelellaContent
    quantity?: GentelellaContent
    rate?: GentelellaContent
}

export type GentelellaInvoiceLinesConfig = {
    className?: string
    document?: Document
    lines: GentelellaInvoiceLine[]
}

export const createGentelellaInvoiceLines = (config: GentelellaInvoiceLinesConfig): GentelellaComponentInstance<HTMLTableElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'table',
        combineGentelellaClassNames(gentelellaClasses.table.base, 'invoice-grid'),
        {
            className: config.className,
            document,
        },
    )
    const body = createGentelellaElement(
        'tbody',
        '',
        { document },
    )

    for (const line of config.lines) {
        const row = createGentelellaElement(
            'tr',
            'invoice-row',
            { document },
        )

        for (const value of [line.description, line.quantity, line.rate, line.amount]) {
            const cell = createGentelellaElement(
                'td',
                '',
                { document },
            )
            appendGentelellaContent(cell, value)
            row.append(cell)
        }

        body.append(row)
    }

    element.append(body)

    return createGentelellaComponentInstance(element)
}

export type GentelellaInvoiceTotal = {
    label: string
    value: GentelellaContent
}

export type GentelellaInvoiceTotalsConfig = {
    className?: string
    document?: Document
    totals: GentelellaInvoiceTotal[]
}

export const createGentelellaInvoiceTotals = (config: GentelellaInvoiceTotalsConfig): GentelellaComponentInstance<HTMLDListElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'dl',
        'invoice-totals',
        {
            className: config.className,
            document,
        },
    )

    for (const total of config.totals) {
        const label = createGentelellaElement(
            'dt',
            '',
            { document },
        )
        label.textContent = total.label
        const value = createGentelellaElement(
            'dd',
            '',
            { document },
        )
        appendGentelellaContent(value, total.value)
        element.append(label, value)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaOrderInfoConfig = {
    className?: string
    document?: Document
    label: string
    value: GentelellaContent
}

export const createGentelellaOrderInfo = (config: GentelellaOrderInfoConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'order-info-row',
        {
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'span',
            'label',
            {
                content: config.label,
                document,
            },
        ),
        createGentelellaElement(
            'span',
            'value',
            {
                content: config.value,
                document,
            },
        ),
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaReviewConfig = {
    author: string
    body: GentelellaContent
    className?: string
    date?: string
    document?: Document
    rating: number
}

export const createGentelellaReview = (config: GentelellaReviewConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'review',
        {
            className: config.className,
            document,
        },
    )
    const head = createGentelellaElement(
        'header',
        'review-head',
        { document },
    )
    head.append(
        createGentelellaElement(
            'span',
            'name',
            {
                content: config.author,
                document,
            },
        ),
        createGentelellaRating({
            document,
            readonly: true,
            value: config.rating,
        }).el,
    )

    if (config.date)
        head.append(
            createGentelellaElement(
                'time',
                'time',
                {
                    content: config.date,
                    document,
                },
            ),
        )

    element.append(
        head,
        createGentelellaElement(
            'div',
            'review-body',
            {
                content: config.body,
                document,
            },
        ),
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaProductActionConfig = {
    document?: Document
    label: string
    onClick?: (event: MouseEvent) => void
}

export const createGentelellaProductAction = (config: GentelellaProductActionConfig): GentelellaComponentInstance<HTMLButtonElement> =>
    createGentelellaButton({
        document: config.document,
        label: config.label,
        onClick: config.onClick,
        variant: 'primary',
    })
