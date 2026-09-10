import { createDocumentHtml } from '@lixpi/ui-primitives/dom'
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import { GENTELELLA_CHART_TYPES } from '../inventory.ts'

import {
    createGentelellaContactCard,
    createGentelellaFaqList,
    createGentelellaProjectCard,
} from './admin/index.ts'
import {
    createGentelellaCalendar,
    createGentelellaChatBubble,
    createGentelellaChatComposer,
    createGentelellaFileItem,
    createGentelellaInboxRoot,
    createGentelellaKanbanCard,
    createGentelellaNotificationList,
    createGentelellaSettingsRow,
} from './applications/index.ts'
import {
    createGentelellaAuthCard,
    createGentelellaCountdown,
    createGentelellaStatusPanel,
} from './auth/index.ts'
import {
    createGentelellaChart,
    createGentelellaMapHost,
} from './chart/index.ts'
import {
    createGentelellaCommandPaletteTrigger,
    createGentelellaPageActionButton,
} from './commands/index.ts'
import {
    GENTELELLA_PRODUCT_IMAGES,
    GENTELELLA_PRODUCT_MOCKUPS,
    createGentelellaInvoiceLines,
    createGentelellaPricingTier,
    createGentelellaProductCard,
    createGentelellaProductOptions,
    createGentelellaQuantity,
} from './commerce/index.ts'
import {
    createGentelellaCustomerCell,
    createGentelellaDataTable,
} from './dataTable/index.ts'
import {
    createGentelellaAsyncRegion,
    createGentelellaProgress,
    createGentelellaSkeleton,
    createGentelellaStepper,
    createGentelellaTimeline,
    createGentelellaWizard,
} from './feedback/index.ts'
import {
    createGentelellaColorSwatches,
    createGentelellaCharacterCounter,
    createGentelellaDateRange,
    createGentelellaDropzone,
    createGentelellaMultiSelect,
    createGentelellaOtpInput,
    createGentelellaRating,
    createGentelellaRichText,
    createGentelellaSegmentedControl,
    createGentelellaSlider,
    createGentelellaSwitch,
    createGentelellaTagInput,
    createGentelellaToggle,
} from './formControls/index.ts'
import {
    createGentelellaAccordion,
    createGentelellaAlert,
    createGentelellaAvatar,
    createGentelellaBadge,
    createGentelellaBreadcrumbs,
    createGentelellaDivider,
    createGentelellaGrid,
    createGentelellaListGroup,
    createGentelellaPagination,
} from './foundation/index.ts'
import {
    GENTELELLA_ICONS,
    createGentelellaIcon,
    createGentelellaMediaTile,
} from './media/index.ts'
import {
    createGentelellaCallToAction,
    createGentelellaFeatureGrid,
    createGentelellaHero,
} from './marketing/index.ts'
import {
    createGentelellaSidebarNavigation,
    createGentelellaTopbar,
} from './navigation/index.ts'
import {
    createGentelellaThemePreview,
    createGentelellaTooltip,
} from './theme/index.ts'
import {
    createGentelellaActivityFeed,
    createGentelellaStat,
    createGentelellaTodoList,
    createGentelellaVersionDistribution,
    createGentelellaVisitorDistribution,
} from './widgets/index.ts'

afterEach(() => void document.body.replaceChildren())

describe('Gentelella complete component surface', () => {
    it('composes foundation and navigation primitives independently', () => {
        const html = createDocumentHtml(document)
        const alert = createGentelellaAlert({
            body: 'Saved',
            title: 'Done',
            variant: 'success',
        })
        const avatar = createGentelellaAvatar({
            initials: 'SK',
            status: 'online',
        })
        const badge = createGentelellaBadge({
            content: '3',
            tone: 'red',
        })
        const divider = createGentelellaDivider({ label: 'More' })
        const accordion = createGentelellaAccordion({
            items: [{
                content: 'Answer',
                open: true,
                title: 'Question',
            }],
        })
        const breadcrumbs = createGentelellaBreadcrumbs({
            items: [{
                href: '/',
                label: 'Home',
            }, { label: 'Models' }],
        })
        const grid = createGentelellaGrid({
            children: [alert.el, avatar.el],
            columns: 2,
        })
        const list = createGentelellaListGroup({
            ariaLabel: 'Filters',
            items: [{
                content: 'All',
                value: 'all',
            }],
        })
        const pagination = createGentelellaPagination({
            currentPage: 1,
            items: [{
                label: '1',
                page: 1,
            }, 'ellipsis', {
                label: '5',
                page: 5,
            }],
        })
        const navigation = createGentelellaSidebarNavigation({
            activeKey: 'models',
            groups: [{
                items: [{
                    children: [{
                        href: '/models',
                        key: 'models',
                        label: 'Models',
                    }],
                    key: 'catalog',
                    label: 'Catalog',
                }],
                label: 'General',
            }],
        })
        const topbar = createGentelellaTopbar({
            actions: badge.el,
            breadcrumbs: breadcrumbs.el,
            searchPlaceholder: 'Search models',
        })
        const commandPalette = createGentelellaCommandPaletteTrigger()
        const pageAction = createGentelellaPageActionButton({
            action: 'refresh',
            label: 'Reload data',
        })
        document.body.append(
            grid.el,
            divider.el,
            accordion.el,
            list.el,
            pagination.el,
            navigation.el,
            topbar.el,
            commandPalette.el,
            pageAction.el,
            html`<span>Composable</span>`,
        )
        commandPalette.open()

        expect(document.querySelector('.alert-success')).not.toBeNull()
        expect(document.querySelector('.avatar-status.online')).not.toBeNull()
        expect(document.querySelector('.nav-sublink.active')).not.toBeNull()
        expect(topbar.searchEl?.placeholder).toBe('Search models')
        expect(document.querySelector('.cmdk-backdrop')).not.toBeNull()
        expect(pageAction.el.getAttribute('aria-label')).toBe('Refresh')
        commandPalette.destroy()
    })

    it('owns form-control state and emits user changes', () => {
        const onToggle = vi.fn()
        const toggle = createGentelellaToggle({
            label: 'Enabled',
            onChange: onToggle,
        })
        const switchControl = createGentelellaSwitch({ label: 'Enabled' })
        const segmented = createGentelellaSegmentedControl({
            ariaLabel: 'Period',
            name: 'period',
            options: [{
                label: 'Day',
                value: 'day',
            }, {
                label: 'Week',
                value: 'week',
            }],
            value: 'day',
        })
        const slider = createGentelellaSlider({
            label: 'Volume',
            value: 40,
        })
        const tags = createGentelellaTagInput({ values: ['design'] })
        const colors = createGentelellaColorSwatches({
            ariaLabel: 'Color',
            swatches: [{
                color: '#000',
                label: 'Black',
                value: 'black',
            }],
            value: 'black',
        })
        const rating = createGentelellaRating({ value: 3 })
        const otp = createGentelellaOtpInput({ length: 4 })
        const dateRange = createGentelellaDateRange()
        const multiSelect = createGentelellaMultiSelect({
            options: [{
                label: 'Design',
                selected: true,
                value: 'design',
            }],
        })
        const richText = createGentelellaRichText({ html: '<p>Hello</p>' })
        const dropzone = createGentelellaDropzone({ label: 'Drop files' })
        const countedInput = document.createElement('input')
        countedInput.value = 'hello'
        const counter = createGentelellaCharacterCounter({
            control: countedInput,
            maxLength: 20,
        })
        document.body.append(
            toggle.el,
            switchControl.el,
            segmented.el,
            slider.el,
            tags.el,
            colors.el,
            rating.el,
            otp.el,
            dateRange.el,
            multiSelect.el,
            richText.el,
            dropzone.el,
            countedInput,
            counter.el,
        )
        toggle.el.click()
        slider.setValue(75)
        tags.add('engineering')
        otp.setValue('1234')

        expect(onToggle).toHaveBeenCalledWith(true, expect.any(MouseEvent))
        expect(slider.valueEl.value).toBe('75')
        expect(tags.getValues()).toEqual(['design', 'engineering'])
        expect(otp.getValue()).toBe('1234')
        expect(document.querySelector('[data-date-range]')).not.toBeNull()
        expect(document.querySelector('[data-multi-select]')).not.toBeNull()
        expect(document.querySelector('[data-rich-text]')).not.toBeNull()
        expect(counter.el.textContent).toBe('5 / 20')
        counter.destroy()
        countedInput.value = 'changed after destroy'
        countedInput.dispatchEvent(new Event('input'))
        expect(counter.el.textContent).toBe('5 / 20')
    })

    it('represents loading, progress, timeline, stepper, and wizard states', () => {
        const progress = createGentelellaProgress({ value: 62 })
        const skeleton = createGentelellaSkeleton({
            variant: 'rectangle',
            width: 80,
        })
        const timeline = createGentelellaTimeline({ entries: [{
            time: 'Now',
            title: 'Deployed',
            tone: 'green',
        }] })
        const stepper = createGentelellaStepper({ items: [{ label: 'Start' }, { label: 'Finish' }] })
        const wizard = createGentelellaWizard({
            steps: [{
                content: 'One',
                label: 'First',
            }, {
                content: 'Two',
                label: 'Second',
            }],
        })
        const region = createGentelellaAsyncRegion({ state: {
            columns: 2,
            rows: 2,
            type: 'loading',
        } })
        document.body.append(progress.el, skeleton.el, timeline.el, stepper.el, wizard.el, region.el)
        wizard.next()
        region.setState({
            description: 'Try later',
            title: 'No results',
            type: 'empty',
        })

        expect(progress.el.getAttribute('aria-valuenow')).toBe('62')
        expect(wizard.el.querySelector('[data-step="1"]')?.hasAttribute('hidden')).toBe(false)
        expect(region.el.querySelector('.empty-state-title')?.textContent).toBe('No results')
    })

    it('covers every chart host and the reusable DataTable contract', () => {
        const charts = GENTELELLA_CHART_TYPES.map(type => createGentelellaChart({
            ariaLabel: type,
            type,
        }))
        const mapMount = vi.fn()
        const map = createGentelellaMapHost({
            ariaLabel: 'Customers',
            id: 'customers-map',
            onMount: mapMount,
        })
        const customer = createGentelellaCustomerCell({ name: 'Sarah Kim' })
        const table = createGentelellaDataTable({
            ariaLabel: 'Customers',
            columns: [{
                header: 'Name',
                render: row => row.name,
            }],
            getRowId: row => row.id,
            rows: [{
                id: '1',
                name: 'Sarah Kim',
            }],
            selectable: true,
        })
        document.body.append(...charts.map(chart => chart.el), map.el, customer.el, table.el)
        map.mount()

        expect(document.querySelectorAll('[data-chart]')).toHaveLength(GENTELELLA_CHART_TYPES.length)
        expect(mapMount).toHaveBeenCalledWith(map.el)
        expect(table.tableEl.dataset.datatable).toBe('')
        expect(table.tableEl.querySelector('[data-row-id="1"]')).not.toBeNull()
    })

    it('composes app-surface primitives without page templates', () => {
        const onSend = vi.fn()
        const calendar = createGentelellaCalendar({
            days: [{
                date: '2026-09-10',
                day: 10,
                events: [{
                    id: 'event-1',
                    label: 'Launch',
                }],
                today: true,
            }],
            label: 'September calendar',
            monthLabel: 'September 2026',
        })
        const bubble = createGentelellaChatBubble({
            content: 'Hello',
            mine: true,
        })
        const composer = createGentelellaChatComposer({ onSend })
        const kanban = createGentelellaKanbanCard({
            id: 'card-1',
            title: 'Ship release',
        })
        const file = createGentelellaFileItem({
            id: 'file-1',
            kind: 'file',
            name: 'report.pdf',
        })
        const notifications = createGentelellaNotificationList({
            items: [{
                body: 'Mentioned you',
                id: 'notice-1',
                kind: 'mention',
                unread: true,
            }],
        })
        const settings = createGentelellaSettingsRow({
            control: 'Control',
            label: 'Theme',
        })
        const inbox = createGentelellaInboxRoot()
        document.body.append(
            calendar.el,
            bubble.el,
            composer.el,
            kanban.el,
            file.el,
            notifications.el,
            settings.el,
            inbox.el,
        )
        composer.inputEl.value = 'Sent'
        composer.el.requestSubmit()

        expect(onSend).toHaveBeenCalledWith('Sent')
        expect(document.querySelector('.calendar-event')?.textContent).toBe('Launch')
        expect(document.querySelector('.chat-bubble.mine')).not.toBeNull()
        expect(document.querySelector('.notification-row.unread')).not.toBeNull()
        expect(inbox.el.id).toBe('inbox-root')
    })

    it('composes commerce, admin, auth, media, and widget primitives', () => {
        const product = createGentelellaProductCard({
            imageAlt: 'Shirt',
            imageSrc: '/shirt.png',
            price: '$49',
            title: 'Shirt',
        })
        const options = createGentelellaProductOptions({
            label: 'Size',
            options: [{
                label: 'Small',
                value: 's',
            }, {
                label: 'Large',
                value: 'l',
            }],
            value: 's',
        })
        const quantity = createGentelellaQuantity({ value: 2 })
        const pricing = createGentelellaPricingTier({
            features: ['Charts', 'Exports'],
            name: 'Pro',
            price: '$49',
        })
        const invoice = createGentelellaInvoiceLines({ lines: [{
            amount: '$49',
            description: 'Pro plan',
        }] })
        const contact = createGentelellaContactCard({
            id: 'user-1',
            name: 'Sarah Kim',
        })
        const project = createGentelellaProjectCard({
            id: 'project-1',
            progress: 70,
            title: 'Redesign',
        })
        const faq = createGentelellaFaqList({ items: [{
            answer: 'Yes',
            id: 'faq-1',
            question: 'Supported?',
        }] })
        const auth = createGentelellaAuthCard({
            content: 'Form',
            title: 'Sign in',
        })
        const status = createGentelellaStatusPanel({
            code: '404',
            description: 'Not found',
            title: 'Missing',
        })
        const countdown = createGentelellaCountdown({ values: [{
            label: 'Days',
            value: 2,
        }] })
        const media = createGentelellaMediaTile({
            id: 'media-1',
            imageAlt: 'Preview',
            imageSrc: '/preview.png',
            title: 'Preview',
        })
        const iconName = Object.keys(GENTELELLA_ICONS)[0]
        expect(iconName).toBeDefined()
        const icon = createGentelellaIcon({ name: iconName! })
        const stat = createGentelellaStat({
            label: 'Revenue',
            value: '$84k',
        })
        const activity = createGentelellaActivityFeed({ items: [{
            body: 'Deployed',
            time: 'Now',
        }] })
        const visitors = createGentelellaVisitorDistribution({ items: [{
            name: 'Canada',
            percent: 40,
        }] })
        const todo = createGentelellaTodoList({ items: [{
            id: 'todo-1',
            text: 'Review',
        }] })
        const versions = createGentelellaVersionDistribution({ items: [{
            label: 'v4',
            percent: 90,
        }] })
        const hero = createGentelellaHero({
            description: 'Composable',
            title: 'Gentelella',
        })
        const features = createGentelellaFeatureGrid({
            features: [{
                description: 'Reusable parts',
                title: 'Components',
            }],
        })
        const action = createGentelellaCallToAction({
            action: 'Start',
            title: 'Ready?',
        })
        const preview = createGentelellaThemePreview({
            content: 'Preview',
            values: { '--primary': '#123456' },
        })
        const tooltip = createGentelellaTooltip({
            content: 'Hover',
            tooltip: 'Details',
        })
        document.body.append(
            product.el,
            options.el,
            quantity.el,
            pricing.el,
            invoice.el,
            contact.el,
            project.el,
            faq.el,
            auth.el,
            status.el,
            countdown.el,
            media.el,
            icon.el,
            stat.el,
            activity.el,
            visitors.el,
            todo.el,
            versions.el,
            hero.el,
            features.el,
            action.el,
            preview.el,
            tooltip.el,
        )
        options.setValue('l')
        quantity.setValue(3)
        todo.setCompleted('todo-1', true)

        expect(document.querySelector('.option-value.active')?.textContent).toBe('Large')
        expect(quantity.getValue()).toBe(3)
        expect(todo.getRemainingCount()).toBe(0)
        expect(document.querySelector('.pricing-tier')).not.toBeNull()
        expect(GENTELELLA_PRODUCT_IMAGES.shirt).toBeDefined()
        expect(GENTELELLA_PRODUCT_MOCKUPS.overview).toBeDefined()
        expect(document.querySelector('.auth-card')).not.toBeNull()
        expect(icon.el.querySelector('svg')).not.toBeNull()
        expect(document.querySelector('.stat-value')?.textContent).toBe('$84k')
        expect(preview.el.style.getPropertyValue('--primary')).toBe('#123456')
        expect(tooltip.el.dataset.tooltip).toBe('Details')
    })
})
