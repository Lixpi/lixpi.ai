// @ts-nocheck
import { keyboardMacCommandIcon, keyboardEnterKeyIcon, sendIcon, pauseIcon, chatThreadBoundariesInfoIcon, aiRobotFaceIcon, gptAvatarIcon, claudeIcon, chevronDownIcon } from '../../../../svgIcons/index.js'
import { TextSelection } from 'prosemirror-state'
import { AI_CHAT_THREAD_PLUGIN_KEY } from './aiChatThreadPluginKey.ts'
import { html } from '../../components/domTemplates.ts'
import { aiModelsStore } from '../../../../stores/aiModelsStore.js'
import { documentStore } from '../../../../stores/documentStore.js'

export const aiChatThreadNodeType = 'aiChatThread'

export const aiChatThreadNodeSpec = {
    group: 'block',
    // Allow paragraphs, AI response messages, and code blocks (for user-created code via triple backticks)
    // Put 'paragraph' first so PM's contentMatch.defaultType picks it when creating an empty thread
    content: '(paragraph | code_block | aiResponseMessage)+', // Must contain at least one child; default child = paragraph
    defining: false, // Changed to false to allow better cursor interaction
    draggable: false,
    isolating: false, // Changed to false to allow cursor interaction
    attrs: {
        threadId: { default: null },
        status: { default: 'active' } // active, paused, completed
    },
    parseDOM: [
        {
            tag: 'div.ai-chat-thread-wrapper',
            getAttrs: (dom) => ({
                threadId: dom.getAttribute('data-thread-id'),
                status: dom.getAttribute('data-status') || 'active'
            })
        }
    ],
    toDOM: (node) => [
        'div',
        {
            class: 'ai-chat-thread-wrapper',
            'data-thread-id': node.attrs.threadId,
            'data-status': node.attrs.status
        },
        0
    ]
}

export const defaultAttrs = {
    threadId: () => `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'active'
}

// Define the node view for AI chat thread
export const aiChatThreadNodeView = (node, view, getPos) => {
    // Ensure node has a proper threadId - if not, assign one via transaction
    if (!node.attrs.threadId) {
        const newThreadId = defaultAttrs.threadId()
        setTimeout(() => {
            const pos = getPos()
            if (pos !== undefined) {
                const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    threadId: newThreadId
                })
                view.dispatch(tr)
            }
        }, 0)
        // Use the new threadId for this render
        node = node.type.create({
            ...node.attrs,
            threadId: newThreadId
        }, node.content)
    }

    // Create DOM structure - the plugin will apply decoration classes like 'receiving' and 'thread-boundary-visible' to this DOM element
    const dom = document.createElement('div')
    dom.className = 'ai-chat-thread-wrapper'
    dom.setAttribute('data-thread-id', node.attrs.threadId)
    dom.setAttribute('data-status', node.attrs.status)

    // Create content container
    const contentDOM = document.createElement('div')
    contentDOM.className = 'ai-chat-thread-content'

    // Create AI model selector dropdown
    const modelSelectorDropdown = createAiModelSelectorDropdown(view, node)

    // Create AI submit button
    const submitButton = createAiSubmitButton(view)

    // Create thread boundary indicator for context visualization
    const threadBoundaryIndicator = createThreadBoundaryIndicator(dom, view, node.attrs.threadId)

    // Append all elements
    dom.appendChild(contentDOM)
    dom.appendChild(modelSelectorDropdown)
    dom.appendChild(submitButton)
    dom.appendChild(threadBoundaryIndicator)

    // Setup content focus handling
    setupContentFocus(contentDOM, view, getPos)

    return {
        dom,
        contentDOM,
        update: (updatedNode, decorations) => {
            console.log('🔄 DEBUG: NodeView update called for thread', updatedNode.attrs.threadId)
            
            if (updatedNode.type.name !== aiChatThreadNodeType) {
                console.log('🔄 DEBUG: Wrong node type, returning false')
                return false
            }

            // Update attributes if changed
            dom.setAttribute('data-thread-id', updatedNode.attrs.threadId)
            dom.setAttribute('data-status', updatedNode.attrs.status)

            node = updatedNode
            
            // Apply decoration-driven classes (e.g., dropdown-open)
            try {
                let hasDropdownOpen = Array.isArray(decorations) && decorations.some(d => {
                    const cls = d?.spec?.attrs?.class || ''
                    return typeof cls === 'string' && cls.split(/\s+/).includes('dropdown-open')
                })
                // Fallback to bridged view state if decoration array doesn't include it
                if (!hasDropdownOpen) {
                    const viewStates = (view as any).__aiDropdownStates
                    if (viewStates instanceof Map) {
                        const open = viewStates.get(updatedNode.attrs.threadId)
                        if (open === true) hasDropdownOpen = true
                    }
                }
                dom.classList.toggle('dropdown-open', !!hasDropdownOpen)
                console.log('🔄 DEBUG: hasDropdownOpen decoration:', !!hasDropdownOpen)
            } catch (e) {
                console.warn('⚠️ DEBUG: Failed to apply decoration classes in NodeView.update', e)
            }

            console.log('🔄 DEBUG: Wrapper classes (expect dropdown-open when open):', dom.className)
            
            return true
        },
        destroy: () => {
            // Clean up dropdown event listeners
            if (modelSelectorDropdown && modelSelectorDropdown._cleanup) {
                modelSelectorDropdown._cleanup()
            }
        }
    }
}

// Helper function to setup content focus
function setupContentFocus(contentDOM, view, getPos) {
    contentDOM.addEventListener('mousedown', () => {
        view.focus()
        const pos = getPos()
        if (pos !== undefined) {
            const $pos = view.state.doc.resolve(pos + 1)
            const selection = TextSelection.create(view.state.doc, $pos.pos)
            view.dispatch(view.state.tr.setSelection(selection))
        }
    })
}

// Helper function to create thread boundary indicator
function createThreadBoundaryIndicator(wrapperDOM, view, threadId) {
    // Create the boundary line element (append to wrapper so it can span full thread height)
    const boundaryLine = html`
        <div className="ai-thread-boundary-indicator-line"></div>
    `
    wrapperDOM.appendChild(boundaryLine)

    // Cache event handlers
    const handleEnter = () => view.dispatch(view.state.tr.setMeta('hoverThread', threadId))
    const handleLeave = () => view.dispatch(view.state.tr.setMeta('hoverThread', null))

    return html`
        <div
            className="ai-thread-boundary-indicator"
            onmouseenter=${handleEnter}
            onmouseleave=${handleLeave}
        >
            <div className="ai-thread-boundary-icon" innerHTML=${chatThreadBoundariesInfoIcon}></div>
            ${createThreadInfoDropdown()}
        </div>
    `
}

// Helper to create a small info dropdown near the boundary indicator
function createThreadInfoDropdown() {
    return html`
        <div className="ai-thread-info-dropdown theme-dark">
            <span className="dots-dropdown-menu">
                <button className="dropdown-trigger-hidden"></button>
                <nav className="submenu-wrapper render-position-bottom">
                    <ul className="submenu with-header">
                        <li className="flex justify-start items-center" data-type="header">
                            <span innerHTML=${aiRobotFaceIcon}></span>
                            <span className="header-text">
                                <span className="header-title">AI Thread context</span>
                                <span className="header-meta">AI generated title will be here</span>
                            </span>
                        </li>
                        <li className="flex justify-start items-center">Add thread below</li>
                        <li className="flex justify-start items-center">Add thread above</li>
                        <li className="flex justify-start items-center">Merge with prev thread</li>
                        <li className="flex justify-start items-center">Merge with thread below</li>
                    </ul>
                </nav>
            </span>
        </div>
    `
}

// Helper function to create AI model selector dropdown
function createAiModelSelectorDropdown(view, node) {
    const aiAvatarIcons = {
        gptAvatarIcon,
        claudeIcon,
    }

    // Get AI models from store
    const aiModelsData = aiModelsStore.getData()
    const currentAiModel = documentStore.getData('aiModel')

    // Transform data to match dropdown format (same as Svelte component)
    const aiModelsSelectorDropdownOptions = aiModelsData.map(aiModel => ({
        title: aiModel.title,
        icon: aiAvatarIcons[aiModel.iconName],
        color: aiModel.color,
        aiModel: `${aiModel.provider}:${aiModel.model}`,
        onClick: (e, id) => {
            console.log('AI Model Selected:', {provider: aiModel.provider, model: aiModel.model})
            // Update document store with new AI model
            documentStore.setDataValues({
                aiModel: `${aiModel.provider}:${aiModel.model}`
            })
            documentStore.setMetaValues({
                requiresSave: true
            })
        }
    }))

    // Find selected value
    const selectedValue = aiModelsSelectorDropdownOptions.find(model => model.aiModel === currentAiModel)

    // State management for dropdown - use plugin state
    let submenuRef = null
    
    // Get dropdown state from plugin
    const getDropdownState = () => {
        const pluginState = AI_CHAT_THREAD_PLUGIN_KEY.getState(view.state)
        if (pluginState && typeof pluginState === 'object' && pluginState.dropdownStates instanceof Map) {
            const currentState = pluginState.dropdownStates.get(node.attrs.threadId)
            return currentState || false
        }
        const viewDropdownStates = (view as any).__aiDropdownStates
        if (viewDropdownStates instanceof Map) {
            const fallbackState = viewDropdownStates.get(node.attrs.threadId)
            return fallbackState || false
        }
        return false
    }

    // Handle toggle dropdown
    const toggleSubmenuHandler = (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        console.log('🖱️ DEBUG: Dropdown toggle clicked for thread', node.attrs.threadId)
        console.log('🖱️ DEBUG: Current view.state:', view.state)
        console.log('🖱️ DEBUG: Creating transaction...')
        
        // Toggle via plugin transaction
        const tr = view.state.tr.setMeta('toggleDropdown', {
            threadId: node.attrs.threadId
        })
        
        console.log('🖱️ DEBUG: Transaction created:', tr)
        console.log('🖱️ DEBUG: Transaction meta:', tr.getMeta('toggleDropdown'))
        console.log('🖱️ DEBUG: Dispatching transaction...')
        
        view.dispatch(tr)
        
        console.log('🖱️ DEBUG: Transaction dispatched')
    }

    // Handle option click
    const onClickHandler = (e, onClick) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Close the dropdown via plugin transaction
        const tr = view.state.tr.setMeta('toggleDropdown', {
            threadId: node.attrs.threadId,
            isOpen: false
        })
        view.dispatch(tr)
        
        // Execute the option click handler if provided
        if (onClick && typeof onClick === 'function') {
            onClick(e)
        }
    }

    // Handle window click to close dropdown
    const handleWindowClick = (e) => {
        if (submenuRef && !e.composedPath().includes(submenuRef)) {
            // Close the dropdown via plugin transaction
            const tr = view.state.tr.setMeta('toggleDropdown', {
                threadId: node.attrs.threadId,
                isOpen: false
            })
            view.dispatch(tr)
        }
    }    // Inject fill color utility
    const injectFillColor = (svg, color) => {
        if (!svg || !color) {
            return svg || ''
        }
        return svg.replace(/<svg([\s\S]*?)>/, `<svg$1 style="fill: ${color}">`)
    }

    // Create the dropdown structure using html templates
    const dropdownDOM = html`
        <div className="ai-model-selector-dropdown">
            <div className="dropdown-menu-tag-pill-wrapper theme-dark">
                <span className="dots-dropdown-menu" onclick=${(e) => e.stopPropagation()}>
                    <button 
                        className="flex justify-between items-center"
                        onclick=${toggleSubmenuHandler}
                    >
                        <span className="selected-option-icon flex items-center">
                            ${selectedValue?.icon ? html`<span innerHTML=${injectFillColor(selectedValue.icon, selectedValue.color)}></span>` : ''}
                        </span>
                        <span className="title">${selectedValue?.title || ''}</span>
                        <span className="state-indicator flex items-center">
                            <span innerHTML=${chevronDownIcon}></span>
                        </span>
                    </button>
                    <nav className="submenu-wrapper render-position-bottom">
                        <ul className="submenu">
                            ${aiModelsSelectorDropdownOptions.map(option => html`
                                <li 
                                    className="flex justify-start items-center"
                                    onclick=${(e) => onClickHandler(e, option.onClick)}
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

    // Set up refs and event listeners
    submenuRef = dropdownDOM
    document.addEventListener('click', handleWindowClick)

    // DOM refs for live updates when store changes
    const titleEl = dropdownDOM.querySelector('.dots-dropdown-menu button .title')
    const iconHost = dropdownDOM.querySelector('.dots-dropdown-menu button .selected-option-icon')

    const renderSelected = (aiModelStr) => {
        try {
            let opt = aiModelsSelectorDropdownOptions.find(m => m.aiModel === aiModelStr)
            if (!opt) {
                const models = aiModelsStore.getData()
                const mapOpt = models.map(m => {
                    const provider = m.provider
                    const modelId = m.model || m.modelName
                    return {
                        title: m.title || `${provider} ${modelId || ''}`.trim(),
                        icon: aiAvatarIcons[m.iconName],
                        color: m.color,
                        aiModel: `${provider}:${modelId}`,
                    }
                })
                opt = mapOpt.find(m => m.aiModel === aiModelStr)
            }
            if (titleEl) titleEl.textContent = opt?.title || ''
            if (iconHost) {
                iconHost.innerHTML = ''
                if (opt?.icon) {
                    const span = document.createElement('span')
                    span.innerHTML = injectFillColor(opt.icon, opt.color)
                    iconHost.appendChild(span)
                }
            }
        } catch (e) {
            console.warn('⚠️ DEBUG: Failed to render selected AI model in NodeView', e)
        }
    }

    // Subscribe to documentStore so PM dropdown reflects selection changes
    const unsubscribeDoc = documentStore.subscribe((store) => {
        const aiModelStr = store?.data?.aiModel
        renderSelected(aiModelStr)
    })

    // Ensure initial selected value is in sync as well
    renderSelected(currentAiModel)

    // Clean up function (will need to be called when NodeView is destroyed)
    dropdownDOM._cleanup = () => {
        document.removeEventListener('click', handleWindowClick)
        if (typeof unsubscribeDoc === 'function') unsubscribeDoc()
    }

    return dropdownDOM
}

// Helper function to create AI submit button
function createAiSubmitButton(view) {
    // Cache the click handler to avoid recreation
    const handleClick = (e) => {
        e.preventDefault()
        e.stopPropagation()

    // Get plugin state to check if receiving
    const pluginState = AI_CHAT_THREAD_PLUGIN_KEY.getState(view.state)

        console.log('🖱️ BUTTON CLICKED: pluginState.isReceiving =', pluginState?.isReceiving)

        if (pluginState?.isReceiving) {
            // TODO: Stop AI streaming functionality
            console.log('🛑 Stop AI streaming - functionality to be implemented')
        } else {
            // Trigger AI chat submission
            console.log('🚀 Triggering AI chat submission')
            const tr = view.state.tr.setMeta('use:aiChat', true)
            view.dispatch(tr)
        }
    }

    return html`
        <div
            className="ai-submit-button"
            onclick=${handleClick}
            style=${{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
            <div className="button-default">
                <span className="send-icon" innerHTML=${sendIcon}></span>
            </div>
            <div className="button-hover">
                <span className="send-icon" innerHTML=${sendIcon}></span>
            </div>
            <div className="button-receiving">
                <span className="stop-icon" innerHTML=${pauseIcon}></span>
            </div>
        </div>
    `
}
