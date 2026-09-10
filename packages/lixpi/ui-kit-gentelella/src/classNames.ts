export type GentelellaBannerVariant = 'default' | 'danger' | 'info' | 'success' | 'warning'
export type GentelellaButtonSize = 'default' | 'large' | 'small'
export type GentelellaButtonVariant = 'default' | 'danger' | 'ghost' | 'outline' | 'primary' | 'success' | 'warning'
export type GentelellaSpinnerSize = 'default' | 'large' | 'small'
export type GentelellaSpinnerTone = 'azure' | 'default' | 'red' | 'yellow'
export type GentelellaStatusTone = 'blue' | 'gray' | 'green' | 'red' | 'yellow'

export const gentelellaClasses = {
    accordion: {
        base: 'accordion',
        content: 'accordion-content',
        item: 'accordion-item',
        summary: 'accordion-summary',
    },
    activity: {
        avatar: 'activity-avatar',
        body: 'activity-body',
        item: 'activity-item',
        list: 'activity-list',
        time: 'activity-time',
    },
    alert: {
        base: 'alert',
        body: 'alert-body',
        danger: 'alert-danger',
        error: 'alert-error',
        icon: 'alert-icon',
        info: 'alert-info',
        success: 'alert-success',
        warning: 'alert-warning',
    },
    avatar: {
        base: 'avatar',
        image: 'avatar-image',
        large: 'avatar-lg',
        medium: 'avatar-md',
        small: 'avatar-sm',
        stack: 'avatar-stack',
        status: 'avatar-status',
        extraLarge: 'avatar-xl',
        extraSmall: 'avatar-xs',
        extraExtraLarge: 'avatar-xxl',
    },
    badge: {
        base: 'badge',
        blue: 'badge-blue',
        red: 'badge-red',
        teal: 'badge-teal',
    },
    banner: {
        actions: 'banner-actions',
        base: 'banner',
        body: 'banner-body',
        danger: 'banner-danger',
        icon: 'banner-icon',
        info: 'banner-info',
        success: 'banner-success',
        warning: 'banner-warning',
    },
    button: {
        base: 'btn',
        danger: 'btn-danger',
        ghost: 'btn-ghost',
        group: 'btn-group',
        icon: 'btn-icon',
        large: 'btn-lg',
        outline: 'btn-outline',
        primary: 'btn-primary',
        small: 'btn-sm',
        spinner: 'btn-spinner',
        success: 'btn-success',
        warning: 'btn-warning',
    },
    card: {
        base: 'card',
        body: 'card-body',
        footer: 'card-footer',
        header: 'card-header',
        optionButton: 'card-opt-btn',
        options: 'card-options',
        subtitle: 'card-subtitle',
        title: 'card-title',
    },
    chart: {
        area: 'chart-area',
        header: 'chart-header',
        headerLeft: 'chart-header-left',
        skeleton: 'chart-skeleton',
        stat: 'chart-stat',
        tab: 'chart-tab',
        tabs: 'chart-tabs',
    },
    chip: 'chip',
    commandPalette: {
        backdrop: 'cmdk-backdrop',
        dialog: 'cmdk-dialog',
        empty: 'cmdk-empty',
        footer: 'cmdk-footer',
        input: 'cmdk-input',
        inputWrap: 'cmdk-input-wrap',
        item: 'cmdk-item',
        itemIcon: 'cmdk-item-icon',
        itemKey: 'cmdk-item-kbd',
        itemLabel: 'cmdk-item-label',
        list: 'cmdk-list',
        section: 'cmdk-section',
    },
    dataTable: {
        bulkSelectionCount: 'bulk-selection-count',
        container: 'dt-container',
        empty: 'dt-empty',
        info: 'dt-info',
        paging: 'dt-paging',
        pagingButton: 'dt-paging-button',
        search: 'dt-search',
    },
    divider: {
        dashed: 'divider-dashed',
        label: 'divider-label',
        plain: 'divider-plain',
    },
    drawer: {
        backdrop: 'drawer-backdrop',
        base: 'drawer',
        body: 'drawer-body',
        close: 'drawer-close',
        footer: 'drawer-footer',
        header: 'drawer-header',
        title: 'drawer-title',
    },
    emptyState: {
        actions: 'empty-state-actions',
        base: 'empty-state',
        description: 'empty-state-text',
        icon: 'empty-state-icon',
        title: 'empty-state-title',
    },
    form: {
        actions: 'form-actions',
        check: 'form-check',
        control: 'form-control',
        error: 'form-error',
        group: 'form-group',
        help: 'form-help',
        hint: 'form-hint',
        label: 'form-label',
        row: 'form-row',
        required: 'required',
    },
    input: {
        affix: 'input-affix',
        dateRange: 'date-range',
        file: 'file-input',
        fileName: 'file-input-name',
        fileTrigger: 'file-input-trigger',
        group: 'input-group',
        icon: 'input-icon',
        multiSelect: 'multi-select',
        otp: 'otp-input',
        otpGrid: 'otp-grid',
        richText: 'rich-text',
        segmented: 'segmented',
        slider: 'slider',
        sliderRow: 'slider-row',
        sliderValue: 'slider-value',
        switch: 'switch',
        switchLabel: 'switch-label',
        tag: 'tag-input',
        tagPill: 'tag-pill',
        toggle: 'toggle',
        toggleRow: 'toggle-row',
        track: 'track',
    },
    layout: {
        brandIcon: 'brand-icon',
        brandName: 'brand-name',
        main: 'main',
        breadcrumb: 'breadcrumb',
        breadcrumbs: 'breadcrumbs',
        footer: 'footer',
        navigationGroup: 'nav-group',
        navigationActive: 'active',
        navigationLabel: 'nav-label',
        navigationLink: 'nav-link',
        navigationText: 'nav-text',
        row: 'row',
        skipLink: 'skip-link',
        sidebar: 'sidebar',
        sidebarBrand: 'sidebar-brand',
        sidebarFooter: 'sidebar-footer',
        sidebarNavigation: 'sidebar-nav',
    },
    page: {
        actions: 'page-actions',
        header: 'page-header',
        headerRow: 'page-header-row',
        pretitle: 'page-pretitle',
        title: 'page-title',
        wrapper: 'page-wrapper',
    },
    list: {
        base: 'list-group',
        item: 'list-group-item',
    },
    loading: {
        bar: 'loading-bar',
    },
    menu: {
        item: 'menu-item',
        panel: 'menu-panel',
        popover: 'menu-popover',
        separator: 'menu-separator',
    },
    modal: {
        backdrop: 'modal-backdrop',
        body: 'modal-body',
        close: 'modal-close',
        dialog: 'modal-dialog',
        footer: 'modal-footer',
        formRow: 'modal-form-row',
        header: 'modal-header',
        large: 'modal-lg',
        small: 'modal-sm',
        title: 'modal-title',
    },
    pagination: {
        base: 'pagination',
        button: 'page-btn',
        ellipsis: 'page-ellipsis',
    },
    panel: {
        action: 'panel-action',
        avatar: 'panel-avatar',
        badge: 'panel-badge',
        body: 'panel-body',
        content: 'panel-content',
        footer: 'panel-footer',
        header: 'panel-header',
        icon: 'panel-icon',
        link: 'panel-link',
        list: 'panel-list',
        row: 'panel-row',
        text: 'panel-text',
        time: 'panel-time',
        title: 'panel-title',
    },
    popover: {
        content: 'popover-content',
        text: 'popover-text',
        title: 'popover-title',
        trigger: 'popover-trigger',
    },
    progress: {
        bar: 'bar',
        thin: 'progress-thin',
    },
    skeleton: {
        base: 'skeleton',
        circle: 'skeleton-circle',
        rectangle: 'skeleton-rect',
        text: 'skeleton-text',
        textLarge: 'skeleton-text-lg',
    },
    spinner: {
        azure: 'spinner-azure',
        base: 'spinner',
        dots: 'spinner-dots',
        large: 'spinner-lg',
        red: 'spinner-red',
        small: 'spinner-sm',
        yellow: 'spinner-yellow',
    },
    state: {
        active: 'active',
        done: 'done',
        invalid: 'is-invalid',
        on: 'on',
        open: 'open',
        selected: 'selected',
        unread: 'unread',
    },
    status: {
        base: 'status',
        blue: 'status-blue',
        gray: 'status-gray',
        green: 'status-green',
        red: 'status-red',
        yellow: 'status-yellow',
    },
    table: {
        base: 'table',
        cellAvatar: 'cell-avatar',
        cellCustomer: 'cell-customer',
        cellMono: 'cell-mono',
        cellStrong: 'cell-strong',
        responsive: 'table-responsive',
        rowActions: 'row-actions',
        rowButton: 'row-btn',
    },
    tabs: {
        active: 'active',
        chartTab: 'chart-tab',
        chartTabs: 'chart-tabs',
        pill: 'tabs-pill',
        tab: 'tab',
        underline: 'tabs-underline',
    },
    timeline: {
        base: 'timeline',
        description: 'ti-desc',
        item: 'timeline-item',
        time: 'ti-time',
        title: 'ti-title',
    },
    toast: {
        base: 'toast',
        error: 'toast-error',
        host: 'toast-host',
        success: 'toast-success',
        warning: 'toast-warning',
    },
    widget: {
        activityList: 'activity-list',
        donut: 'donut-block',
        donutLegend: 'donut-legend',
        donutLegendItem: 'donut-legend-item',
        profileRing: 'profile-ring-box',
        stat: 'stat',
        statChange: 'stat-change',
        statContent: 'stat-content',
        statIcon: 'stat-icon',
        statLabel: 'stat-label',
        statSubtext: 'stat-subtext',
        statValue: 'stat-value',
        statValueRow: 'stat-value-row',
        storageBar: 'storage-bar',
        storageLegend: 'storage-legend',
        storageLegendItem: 'storage-legend-item',
        todoCheckbox: 'todo-cb',
        todoDate: 'todo-date',
        todoPriority: 'todo-prio',
        todoRow: 'todo-row',
        todoText: 'todo-text',
        versionBar: 'version-bar',
        versionLabel: 'version-label',
        versionPercent: 'version-pct',
        versionRow: 'version-row',
        visitorBar: 'visitor-bar',
        visitorFlag: 'visitor-flag',
        visitorName: 'visitor-name',
        visitorPercent: 'visitor-pct',
        visitorRow: 'visitor-row',
    },
} as const

type GentelellaClassName = string | false | null | undefined

export const combineGentelellaClassNames = (...classNames: GentelellaClassName[]): string => [...new Set(
    classNames.filter((className): className is string => Boolean(className)),
)].join(' ')

const BANNER_VARIANT_CLASSES: Record<GentelellaBannerVariant, string> = {
    default: '',
    danger: gentelellaClasses.banner.danger,
    info: gentelellaClasses.banner.info,
    success: gentelellaClasses.banner.success,
    warning: gentelellaClasses.banner.warning,
}

const BUTTON_SIZE_CLASSES: Record<GentelellaButtonSize, string> = {
    default: '',
    large: gentelellaClasses.button.large,
    small: gentelellaClasses.button.small,
}

const BUTTON_VARIANT_CLASSES: Record<GentelellaButtonVariant, string> = {
    default: '',
    danger: gentelellaClasses.button.danger,
    ghost: gentelellaClasses.button.ghost,
    outline: gentelellaClasses.button.outline,
    primary: gentelellaClasses.button.primary,
    success: gentelellaClasses.button.success,
    warning: gentelellaClasses.button.warning,
}

const SPINNER_SIZE_CLASSES: Record<GentelellaSpinnerSize, string> = {
    default: '',
    large: gentelellaClasses.spinner.large,
    small: gentelellaClasses.spinner.small,
}

const SPINNER_TONE_CLASSES: Record<GentelellaSpinnerTone, string> = {
    azure: gentelellaClasses.spinner.azure,
    default: '',
    red: gentelellaClasses.spinner.red,
    yellow: gentelellaClasses.spinner.yellow,
}

const STATUS_TONE_CLASSES: Record<GentelellaStatusTone, string> = {
    blue: gentelellaClasses.status.blue,
    gray: gentelellaClasses.status.gray,
    green: gentelellaClasses.status.green,
    red: gentelellaClasses.status.red,
    yellow: gentelellaClasses.status.yellow,
}

export type GentelellaBannerClassNameOptions = {
    className?: string
    variant?: GentelellaBannerVariant
}

export type GentelellaButtonClassNameOptions = {
    className?: string
    iconOnly?: boolean
    size?: GentelellaButtonSize
    variant?: GentelellaButtonVariant
}

export type GentelellaSpinnerClassNameOptions = {
    className?: string
    dots?: boolean
    size?: GentelellaSpinnerSize
    tone?: GentelellaSpinnerTone
}

export type GentelellaStatusClassNameOptions = {
    className?: string
    tone?: GentelellaStatusTone
}

export const gentelellaBannerClassName = (options: GentelellaBannerClassNameOptions = {}): string => combineGentelellaClassNames(
    gentelellaClasses.banner.base,
    BANNER_VARIANT_CLASSES[options.variant ?? 'default'],
    options.className,
)

export const gentelellaButtonClassName = (options: GentelellaButtonClassNameOptions = {}): string =>
    combineGentelellaClassNames(
        gentelellaClasses.button.base,
        BUTTON_VARIANT_CLASSES[options.variant ?? 'default'],
        BUTTON_SIZE_CLASSES[options.size ?? 'default'],
        options.iconOnly && gentelellaClasses.button.icon,
        options.className,
    )

export const gentelellaSpinnerClassName = (options: GentelellaSpinnerClassNameOptions = {}): string =>
    combineGentelellaClassNames(
        gentelellaClasses.spinner.base,
        SPINNER_SIZE_CLASSES[options.size ?? 'default'],
        SPINNER_TONE_CLASSES[options.tone ?? 'default'],
        options.dots && gentelellaClasses.spinner.dots,
        options.className,
    )

export const gentelellaStatusClassName = (options: GentelellaStatusClassNameOptions = {}): string => combineGentelellaClassNames(
    gentelellaClasses.status.base,
    options.tone ? STATUS_TONE_CLASSES[options.tone] : '',
    options.className,
)

export const gentelellaTabClassName = (
    active: boolean,
    className?: string,
): string => combineGentelellaClassNames(
    gentelellaClasses.tabs.tab,
    active && gentelellaClasses.tabs.active,
    className,
)
