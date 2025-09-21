// @ts-nocheck
import { html } from '../../../components/domTemplates.ts'
import { chevronDownIcon } from '../../../../../svgIcons/index.js'

export const dropdownNodeType = 'dropdown'

export const dropdownNodeView = (node, view, getPos) => {
    const {
        id,
        selectedValue = {},
        dropdownOptions = [],
        theme = 'dark',
        renderPosition = 'bottom',
        buttonIcon = chevronDownIcon
    } = node.attrs

    let submenuRef = null
    let dom = null

    // Handle toggle dropdown
    const toggleSubmenuHandler = (e, dropdownId) => {
        console.log('🖱️ DROPDOWN DEBUG: Toggle clicked', { dropdownId, id })
        e.preventDefault()
        e.stopPropagation()
        
        console.log('🖱️ DROPDOWN DEBUG: Creating transaction with toggleDropdown meta')
        const tr = view.state.tr.setMeta('toggleDropdown', { id: dropdownId })
        console.log('🖱️ DROPDOWN DEBUG: Transaction meta:', tr.getMeta('toggleDropdown'))
        console.log('🖱️ DROPDOWN DEBUG: Dispatching transaction...')
        view.dispatch(tr)
        console.log('🖱️ DROPDOWN DEBUG: Transaction dispatched')
    }

    // Handle option click
    const onClickHandler = (e, dropdownId, option) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Close the dropdown
        const tr = view.state.tr.setMeta('closeDropdown', true)
        view.dispatch(tr)
        
        // Execute the option click handler if provided
        if (option?.onClick && typeof option.onClick === 'function') {
            option.onClick(e, dropdownId)
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
        console.log('🔍 DROPDOWN DEBUG: Checking if open for id:', id)
        const pluginKey = view.state.plugins.find(p => p.key && p.key.key === 'dropdown')?.key
        console.log('🔍 DROPDOWN DEBUG: Found dropdown plugin key:', !!pluginKey)
        if (!pluginKey) {
            console.log('🔍 DROPDOWN DEBUG: No dropdown plugin found!')
            return false
        }
        
        const pluginState = pluginKey.getState(view.state)
        console.log('🔍 DROPDOWN DEBUG: Plugin state:', pluginState)
        const isOpenResult = pluginState?.openDropdownId === id
        console.log('🔍 DROPDOWN DEBUG: Is open result:', isOpenResult, 'openDropdownId:', pluginState?.openDropdownId, 'comparing with id:', id)
        return isOpenResult
    }

    // Create the dropdown structure using html templates - ALL RENDERING LOGIC HERE
    const createDropdownDOM = () => {
        const dropdownDOM = html`
            <div class="ai-model-selector-dropdown">
                <div class="dropdown-menu-tag-pill-wrapper theme-${theme}">
                    <span 
                        class="dots-dropdown-menu"
                        onclick=${(e) => e.stopPropagation()}
                    >
                        <button 
                            class="flex justify-between items-center"
                            onclick=${(e) => {
                                console.log('🖱️ DROPDOWN DEBUG: Button clicked for dropdown id:', id)
                                toggleSubmenuHandler(e, id)
                            }}
                        >
                            <span class="selected-option-icon flex items-center">
                                ${selectedValue?.icon ? html`<span innerHTML=${injectFillColor(selectedValue.icon, selectedValue.color)}></span>` : ''}
                            </span>
                            <span class="title">${selectedValue?.title || ''}</span>
                            <span class="state-indicator flex items-center">
                                <span innerHTML=${buttonIcon}></span>
                            </span>
                        </button>
                        <nav class="submenu-wrapper render-position-${renderPosition}">
                            <ul class="submenu">
                                ${dropdownOptions.map(option => html`
                                    <li 
                                        class="flex justify-start items-center"
                                        onclick=${(e) => onClickHandler(e, id, option)}
                                    >
                                        ${option.icon ? html`<span innerHTML=${injectFillColor(option.icon, option.color)}></span>` : ''}
                                        ${option.title}
                                    </li>
                                `)}
                            </ul>
                        </nav>
                    </span>
                </div>
            </div>
        `

        // Store reference to submenu for click detection
        submenuRef = dropdownDOM.querySelector('.dots-dropdown-menu')
        
        return dropdownDOM
    }

    // Initial DOM creation
    dom = createDropdownDOM()

    // Add window click listener
    document.addEventListener('click', handleWindowClick)

    return {
        dom,
        update: (updatedNode, decorations) => {
            console.log('🔄 DROPDOWN DEBUG: Update called for dropdown id:', id)
            console.log('🔄 DROPDOWN DEBUG: UpdatedNode type:', updatedNode?.type?.name)
            console.log('🔄 DROPDOWN DEBUG: Decorations:', decorations)
            
            if (updatedNode.type.name !== dropdownNodeType) {
                console.log('🔄 DROPDOWN DEBUG: Wrong node type, returning false')
                return false
            }

            // Check if dropdown is open from decorations
            let hasDropdownOpen = Array.isArray(decorations) && decorations.some(d => {
                // For Decoration.node(), class is in d.type.attrs.class
                const cls = d?.type?.attrs?.class || d?.spec?.attrs?.class || ''
                const hasClass = typeof cls === 'string' && cls.split(/\s+/).includes('dropdown-open')
                console.log('🔄 DROPDOWN DEBUG: Decoration class:', cls, 'has dropdown-open:', hasClass)
                console.log('🔄 DROPDOWN DEBUG: Decoration structure:', {
                    type: d?.type,
                    spec: d?.spec,
                    attrs: d?.type?.attrs || d?.spec?.attrs
                })
                return hasClass
            })
            
            console.log('🔄 DROPDOWN DEBUG: hasDropdownOpen from decorations:', hasDropdownOpen)

            // Toggle submenu visibility based on decoration state
            const submenuWrapper = dom.querySelector('.submenu-wrapper')
            console.log('🔄 DROPDOWN DEBUG: submenuWrapper found:', !!submenuWrapper)
            if (submenuWrapper) {
                submenuWrapper.style.display = hasDropdownOpen ? 'block' : 'none'
                console.log('🔄 DROPDOWN DEBUG: Set submenu display to:', hasDropdownOpen ? 'block' : 'none')
            }

            // Update wrapper class for CSS animations
            dom.classList.toggle('dropdown-open', !!hasDropdownOpen)
            console.log('🔄 DROPDOWN DEBUG: Updated DOM classes:', dom.className)

            // Update node reference
            node = updatedNode
            
            return true
        },
        destroy: () => {
            // Clean up window listener
            document.removeEventListener('click', handleWindowClick)
        }
    }
}