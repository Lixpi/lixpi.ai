import {
    closeCommandPalette,
    initCommandPalette,
    openCommandPalette,
} from '../../runtime/command-palette.ts'
import { initPageActions } from '../../runtime/page-actions.ts'
import {
    createGentelellaButton,
    type GentelellaButtonInstance,
} from '../button/index.ts'
import {
    type GentelellaButtonSize,
    type GentelellaButtonVariant,
} from '../../classNames.ts'

export type GentelellaCommandPaletteTriggerConfig = {
    className?: string
    document?: Document
    iconHtml?: string
    label?: string
    size?: GentelellaButtonSize
    variant?: GentelellaButtonVariant
}

export type GentelellaCommandPaletteTriggerInstance = GentelellaButtonInstance & {
    close: () => void
    initializeShortcut: () => void
    open: () => void
}

class GentelellaCommandPaletteTrigger implements GentelellaCommandPaletteTriggerInstance {
    readonly el: HTMLButtonElement

    private readonly button: GentelellaButtonInstance

    constructor(config: GentelellaCommandPaletteTriggerConfig = {}) {
        this.button = createGentelellaButton({
            className: config.className,
            document: config.document,
            iconHtml: config.iconHtml,
            label: config.label ?? 'Search',
            onClick: this.open,
            size: config.size,
            variant: config.variant ?? 'ghost',
        })
        this.el = this.button.el
        this.el.setAttribute('aria-haspopup', 'dialog')
    }

    initializeShortcut(): void {
        initCommandPalette()
    }

    open = (): void => void openCommandPalette()

    close(): void {
        closeCommandPalette()
    }

    setBusy(busy: boolean): void {
        this.button.setBusy(busy)
    }

    setDisabled(disabled: boolean): void {
        this.button.setDisabled(disabled)
    }

    setLabel(label: string): void {
        this.button.setLabel(label)
    }

    destroy(): void {
        this.close()
        this.button.destroy()
    }
}

export const createGentelellaCommandPaletteTrigger = (config: GentelellaCommandPaletteTriggerConfig = {}): GentelellaCommandPaletteTriggerInstance =>
    new GentelellaCommandPaletteTrigger(config)

export type GentelellaPageAction = 'compose' | 'export' | 'invite' | 'new-deal' | 'new-event' | 'new-project' | 'new-task' | 'print' | 'refresh' | 'share'

const PAGE_ACTION_LABELS: Record<GentelellaPageAction, string> = {
    compose: 'Compose',
    export: 'Export',
    invite: 'Invite',
    'new-deal': 'New deal',
    'new-event': 'New event',
    'new-project': 'New project',
    'new-task': 'New task',
    print: 'Print',
    refresh: 'Refresh',
    share: 'Share',
}

export type GentelellaPageActionButtonConfig = {
    action: GentelellaPageAction
    className?: string
    document?: Document
    iconHtml?: string
    label?: string
    size?: GentelellaButtonSize
    variant?: GentelellaButtonVariant
}

export type GentelellaPageActionButtonInstance = GentelellaButtonInstance & {
    initialize: () => void
}

class GentelellaPageActionButton implements GentelellaPageActionButtonInstance {
    readonly el: HTMLButtonElement

    private readonly button: GentelellaButtonInstance

    constructor(config: GentelellaPageActionButtonConfig) {
        this.button = createGentelellaButton({
            ariaLabel: PAGE_ACTION_LABELS[config.action],
            className: config.className,
            document: config.document,
            iconHtml: config.iconHtml,
            label: config.label ?? PAGE_ACTION_LABELS[config.action],
            size: config.size,
            variant: config.variant,
        })
        this.el = this.button.el
        this.el.dataset.pageAction = config.action
    }

    initialize(): void {
        initPageActions()
    }

    setBusy(busy: boolean): void {
        this.button.setBusy(busy)
    }

    setDisabled(disabled: boolean): void {
        this.button.setDisabled(disabled)
    }

    setLabel(label: string): void {
        this.button.setLabel(label)
    }

    destroy(): void {
        this.button.destroy()
    }
}

export const createGentelellaPageActionButton = (config: GentelellaPageActionButtonConfig): GentelellaPageActionButtonInstance =>
    new GentelellaPageActionButton(config)
