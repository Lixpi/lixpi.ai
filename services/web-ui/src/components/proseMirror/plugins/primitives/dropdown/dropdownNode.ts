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

    console.log('🔧 DROPDOWN NODE DEBUG: Creating dropdown view with options:', dropdownOptions)
    console.log('🔧 DROPDOWN NODE DEBUG: First option details:', dropdownOptions[0])
    console.log('🔧 DROPDOWN NODE DEBUG: Node attrs:', node.attrs)

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
        console.log('🎯 DROPDOWN DEBUG: Option clicked!', { dropdownId, optionTitle: option?.title, optionId: option?.id, fullOption: option })
        e.preventDefault()
        e.stopPropagation()

        const pos = getPos()
        console.log('🎯 DROPDOWN DEBUG: getPos() returned', pos)

        // Build base transaction
        let tr = view.state.tr

        // Attach selection meta first
        if (option) {
            const selectionMeta = { dropdownId, option, nodePos: pos }
            tr = tr.setMeta('dropdownOptionSelected', selectionMeta)
            console.log('🎯 DROPDOWN DEBUG: Added dropdownOptionSelected meta', selectionMeta)
        }

        // Always close dropdown after selection
        tr = tr.setMeta('closeDropdown', true)
        console.log('🎯 DROPDOWN DEBUG: Added closeDropdown meta')

        // Attempt immediate node attr update (optimistic UI) BEFORE dispatching
        try {
            if (typeof pos === 'number') {
                // Our dropdown node should be at pos (since getPos() returns its start) or we just rely on node variable
                const currentNode = view.state.doc.nodeAt(pos)
                console.log('🎯 DROPDOWN DEBUG: nodeAt(pos) before update', { pos, type: currentNode?.type?.name, attrs: currentNode?.attrs })
                if (currentNode?.type?.name === dropdownNodeType) {
                    const updatedAttrs = { ...currentNode.attrs, selectedValue: option }
                    tr = tr.setNodeMarkup(pos, undefined, updatedAttrs)
                    console.log('🎯 DROPDOWN DEBUG: Added setNodeMarkup to transaction with new selectedValue.title', option?.title)
                } else {
                    console.log('⚠️ DROPDOWN DEBUG: currentNode not dropdown (cannot optimistic update)', currentNode?.type?.name)
                }
            } else {
                console.log('⚠️ DROPDOWN DEBUG: getPos() not a number, skipping optimistic update')
            }
        } catch (err) {
            console.log('❌ DROPDOWN DEBUG: Error during optimistic selectedValue update', err)
        }

        // Final sanity log of metas on transaction
        console.log('🎯 DROPDOWN DEBUG: Final transaction metas', {
            dropdownOptionSelected: tr.getMeta('dropdownOptionSelected'),
            closeDropdown: tr.getMeta('closeDropdown')
        })

        view.dispatch(tr)
        console.log('🎯 DROPDOWN DEBUG: Dispatched transaction with selection + close metas')

        // Note: onClick handlers cannot be serialized in ProseMirror attributes
        // The dropdownOptionSelected meta event will be handled by the parent plugin
        if (option?.onClick && typeof option.onClick === 'function') {
            console.log('🎯 DROPDOWN DEBUG: Executing option onClick handler directly')
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

    // Create the dropdown structure using html templates - GENERIC DROPDOWN ONLY
    const createDropdownDOM = () => {
        const dropdownDOM = html`
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

            // Detect selectedValue attr changes
            const prevSelected = node?.attrs?.selectedValue || {}
            const nextSelected = updatedNode?.attrs?.selectedValue || {}
            const changed = (prevSelected?.title !== nextSelected?.title) || (prevSelected?.icon !== nextSelected?.icon)
            if (changed) {
                console.log('🔄 DROPDOWN DEBUG: selectedValue changed', { prev: prevSelected?.title, next: nextSelected?.title })
                try {
                    const titleEl = dom.querySelector('.title')
                    if (titleEl) {
                        titleEl.textContent = nextSelected?.title || ''
                        console.log('🔄 DROPDOWN DEBUG: Updated title textContent to', titleEl.textContent)
                    } else {
                        console.log('⚠️ DROPDOWN DEBUG: .title element not found for update')
                    }
                    const iconWrap = dom.querySelector('.selected-option-icon')
                    if (iconWrap) {
                        if (nextSelected?.icon) {
                            iconWrap.innerHTML = ''
                            const span = document.createElement('span')
                            span.setAttribute('innerHTML', injectFillColor(nextSelected.icon, nextSelected.color))
                            // Using setAttribute like template system does
                            span.innerHTML = injectFillColor(nextSelected.icon, nextSelected.color)
                            iconWrap.appendChild(span)
                        } else {
                            iconWrap.innerHTML = ''
                        }
                        console.log('🔄 DROPDOWN DEBUG: Updated icon HTML')
                    } else {
                        console.log('⚠️ DROPDOWN DEBUG: .selected-option-icon not found for update')
                    }
                } catch (err) {
                    console.log('❌ DROPDOWN DEBUG: Error updating selectedValue DOM', err)
                }
            } else {
                console.log('🔄 DROPDOWN DEBUG: selectedValue unchanged')
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