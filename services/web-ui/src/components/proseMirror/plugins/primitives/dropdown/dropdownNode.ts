// @ts-nocheck
import { html } from '../../components/domTemplates.ts'
import { chevronDownIcon } from '../../../../../svgIcons/index.js'

export const dropdownNodeType = 'dropdown'

export const dropdownNodeView = (node, view, getPos) => {
    const {
        id,
        selectedValue = {},
        dropdownOptions = [],
        theme = 'light',
        renderPosition = 'bottom',
        buttonIcon = chevronDownIcon
    } = node.attrs

    let submenuRef = null

    // Handle toggle dropdown
    const toggleSubmenuHandler = (e, dropdownId) => {
        e.preventDefault()
        e.stopPropagation()
        
        const tr = view.state.tr.setMeta('toggleDropdown', { id: dropdownId })
        view.dispatch(tr)
    }

    // Handle option click
    const onClickHandler = (e, dropdownId, onClick) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Close the dropdown
        const tr = view.state.tr.setMeta('closeDropdown', true)
        view.dispatch(tr)
        
        // Execute the option click handler if provided
        if (onClick && typeof onClick === 'function') {
            onClick(e, dropdownId)
        }
    }

    // Handle window click to close dropdown
    const handleWindowClick = (e) => {
        if (submenuRef && !e.composedPath().includes(submenuRef)) {
            const tr = view.state.tr.setMeta('closeDropdown', true)
            view.dispatch(tr)
        }
    }

    // Inject fill color utility (same as Svelte component)
    const injectFillColor = (svg, color) => {
        if (!svg || !color) {
            return svg || ''
        }
        return svg.replace(/<svg([\s\S]*?)>/, `<svg$1 style="fill: ${color}">`)
    }

    // Check if dropdown is open from decorations
    const isOpen = () => {
        const pluginKey = view.state.plugins.find(p => p.key && p.key.key === 'dropdown')?.key
        if (!pluginKey) return false
        
        const pluginState = pluginKey.getState(view.state)
        return pluginState?.openDropdownId === id
    }

    // Create the dropdown structure using html templates
    const createDropdownDOM = () => {
        const dropdownDOM = html`
            <div class="dropdown-menu-tag-pill-wrapper theme-${theme}">
                <span 
                    class="dots-dropdown-menu ${isOpen() ? 'is-active' : ''}"
                    onclick=${(e) => e.stopPropagation()}
                >
                    <button 
                        class="flex justify-between items-center"
                        onclick=${(e) => toggleSubmenuHandler(e, id)}
                    >
                        <span class="selected-option-icon flex items-center">
                            ${injectFillColor(selectedValue?.icon, selectedValue?.color)}
                        </span>
                        <span class="title">${selectedValue?.title || ''}</span>
                        <span class="state-indicator flex items-center">
                            ${buttonIcon}
                        </span>
                    </button>
                    ${createSubmenu()}
                </span>
            </div>
        `

        // Store reference to submenu for click detection
        submenuRef = dropdownDOM.querySelector('.dots-dropdown-menu')
        
        return dropdownDOM
    }

    // Create submenu structure
    const createSubmenu = () => {
        if (!isOpen() || dropdownOptions.length === 0) {
            return ''
        }

        const hasHeader = dropdownOptions.some(o => o.type === 'header')

        return html`
            <nav class="submenu-wrapper render-position-${renderPosition}">
                <ul class="submenu ${hasHeader ? 'with-header' : ''}">
                    ${dropdownOptions.map(option => createOption(option)).join('')}
                </ul>
            </nav>
        `
    }

    // Create individual option
    const createOption = (option) => {
        if (option.type === 'header') {
            return html`
                <li class="flex justify-start items-center" data-type="header">
                    ${option.icon ? option.icon : ''}
                    <span class="header-text">
                        <span class="header-title">${option.title}</span>
                        ${option.meta ? `<span class="header-meta">${option.meta}</span>` : ''}
                    </span>
                </li>
            `
        } else {
            return html`
                <li 
                    class="flex justify-start items-center"
                    onclick=${(e) => onClickHandler(e, id, option.onClick)}
                >
                    ${option.icon ? option.icon : ''}
                    ${option.title}
                </li>
            `
        }
    }

    const dom = createDropdownDOM()

    // Add window click listener
    document.addEventListener('click', handleWindowClick)

    return {
        dom,
        update: (updatedNode) => {
            if (updatedNode.type.name !== dropdownNodeType) {
                return false
            }

            // Update the DOM if state changed
            const newDOM = createDropdownDOM()
            dom.replaceWith(newDOM)
            
            return true
        },
        destroy: () => {
            // Clean up window listener
            document.removeEventListener('click', handleWindowClick)
        }
    }
}