import {
    closeMenu,
    openMenu,
    openPanel,
    type MenuEntry,
} from '../../runtime/menus.ts'
import {
    showModal,
    type ModalAction,
    type ModalHandle,
} from '../../runtime/modal.ts'
import {
    showToast,
    type ToastOptions,
} from '../../runtime/toast.ts'
import {
    GentelellaElementComponent,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import { gentelellaClasses } from '../../classNames.ts'
import {
    appendGentelellaContent,
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaModalConfig = {
    actions?: ModalAction[]
    body?: GentelellaContent
    document?: Document
    onClose?: () => void
    size?: 'lg' | 'md' | 'sm'
    title?: string
}

export const openGentelellaModal = (config: GentelellaModalConfig = {}): ModalHandle => {
    const document = config.document ?? globalThis.document
    const body = createGentelellaElement(
        'div',
        '',
        { document },
    )
    appendGentelellaContent(body, config.body)

    return showModal({
        actions: config.actions,
        body,
        onClose: config.onClose,
        size: config.size,
        title: config.title,
    })
}

export const showGentelellaToast = (
    message: string,
    options?: ToastOptions,
): HTMLDivElement => showToast(message, options)

export type GentelellaMenuButtonConfig = {
    ariaLabel: string
    className?: string
    document?: Document
    icon?: GentelellaContent
    items: MenuEntry[]
}

class GentelellaMenuButton extends GentelellaElementComponent<HTMLButtonElement> {
    constructor(private readonly config: GentelellaMenuButtonConfig) {
        const document = config.document ?? globalThis.document
        super(
            createGentelellaElement(
                'button',
                gentelellaClasses.card.optionButton,
                {
                    attributes: {
                        'aria-haspopup': 'menu',
                        'aria-label': config.ariaLabel,
                        type: 'button',
                    },
                    className: config.className,
                    content: config.icon ?? '•••',
                    document,
                },
            ),
        )
        this.el.addEventListener('click', this.handleClick)
    }

    private handleClick = (event: MouseEvent): void => {
        event.preventDefault()
        event.stopPropagation()
        openMenu(this.el, this.config.items)
    }

    override destroy(): void {
        this.el.removeEventListener('click', this.handleClick)
        closeMenu()
        super.destroy()
    }
}

export const createGentelellaMenuButton = (config: GentelellaMenuButtonConfig): GentelellaComponentInstance<HTMLButtonElement> =>
    new GentelellaMenuButton(config)

export type GentelellaPopoverConfig = {
    className?: string
    content: GentelellaContent
    document?: Document
    label: string
    title?: string
    trigger: GentelellaContent
    width?: number
}

class GentelellaPopover extends GentelellaElementComponent<HTMLButtonElement> {
    private readonly document: Document

    constructor(private readonly config: GentelellaPopoverConfig) {
        const document = config.document ?? globalThis.document
        super(
            createGentelellaElement(
                'button',
                gentelellaClasses.popover.trigger,
                {
                    attributes: {
                        'aria-haspopup': 'dialog',
                        'aria-label': config.label,
                        type: 'button',
                    },
                    className: config.className,
                    content: config.trigger,
                    document,
                },
            ),
        )
        this.document = document
        this.el.addEventListener('click', this.handleClick)
    }

    private handleClick = (): void => {
        const panel = createGentelellaElement(
            'div',
            gentelellaClasses.popover.content,
            { document: this.document },
        )

        if (this.config.title)
            panel.append(
                createGentelellaElement(
                    'div',
                    gentelellaClasses.popover.title,
                    {
                        content: this.config.title,
                        document: this.document,
                    },
                ),
            )

        panel.append(
            createGentelellaElement(
                'div',
                gentelellaClasses.popover.text,
                {
                    content: this.config.content,
                    document: this.document,
                },
            ),
        )
        openPanel(
            this.el,
            panel,
            {
                className: gentelellaClasses.popover.content,
                width: this.config.width,
            },
        )
    }

    override destroy(): void {
        this.el.removeEventListener('click', this.handleClick)
        closeMenu()
        super.destroy()
    }
}

export const createGentelellaPopover = (config: GentelellaPopoverConfig): GentelellaComponentInstance<HTMLButtonElement> =>
    new GentelellaPopover(config)
