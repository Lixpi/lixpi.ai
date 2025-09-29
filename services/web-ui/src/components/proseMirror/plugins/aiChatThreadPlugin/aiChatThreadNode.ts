// @ts-nocheck
import { keyboardMacCommandIcon, keyboardEnterKeyIcon, sendIcon, pauseIcon, chatThreadBoundariesInfoIcon, aiRobotFaceIcon, gptAvatarIcon, claudeIcon, chevronDownIcon } from '../../../../svgIcons/index.js'
import { TextSelection } from 'prosemirror-state'
import { AI_CHAT_THREAD_PLUGIN_KEY } from './aiChatThreadPluginKey.ts'
import { html } from '../../components/domTemplates.ts'
import { aiModelsStore } from '../../../../stores/aiModelsStore.js'
import { documentStore } from '../../../../stores/documentStore.js'
import { dropdownNodeView } from '../primitives/dropdown/dropdownNode.js'

export const aiChatThreadNodeType = 'aiChatThread'

export const aiChatThreadNodeSpec = {
    group: 'block',
    // Allow paragraphs, AI response messages, code blocks, and dropdown nodes
    // Put 'paragraph' first so PM's contentMatch.defaultType picks it when creating an empty thread
    content: '(paragraph | code_block | aiResponseMessage | dropdown)+', // Must contain at least one child; default child = paragraph
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
    const modelSelectorDropdown = createAiModelSelectorDropdown(view, node, getPos)

    // Create AI submit button
    const submitButton = createAiSubmitButton(view)

    // Create thread boundary indicator for context visualization
    const threadBoundaryIndicator = createThreadBoundaryIndicator(dom, view, node.attrs.threadId)

    // Append all elements
    dom.appendChild(contentDOM)
    // Note: modelSelectorDropdown is now a ProseMirror node inserted into the document
    dom.appendChild(submitButton)
    dom.appendChild(threadBoundaryIndicator)

    // Setup content focus handling
    setupContentFocus(contentDOM, view, getPos)

    return {
        dom,
        contentDOM,
        update: (updatedNode, decorations) => {
            if (updatedNode.type.name !== aiChatThreadNodeType) {
                return false
            }

            // Update attributes if changed
            dom.setAttribute('data-thread-id', updatedNode.attrs.threadId)
            dom.setAttribute('data-status', updatedNode.attrs.status)

            node = updatedNode

            // Note: Dropdown open/close state is now handled by the dropdown primitive's own decorations
            // The aiChatThreadNode just needs to translate threadId-based events to dropdown-primitive events

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

// Note: We no longer use a global registry for dropdown handlers.
// Instead, we dispatch metadata through ProseMirror transactions
// and handle the selection in the aiChatThreadPlugin

// Helper function to create AI model selector dropdown using the dropdown primitive
function createAiModelSelectorDropdown(view, node, getPos) {
    const dropdownId = `ai-model-dropdown-${node.attrs.threadId}`

    // Check if dropdown already exists in this thread to prevent duplicates
    const pos = getPos()
    const threadStart = pos
    const threadEnd = pos + node.nodeSize
    let dropdownExists = false

    view.state.doc.nodesBetween(threadStart, threadEnd, (childNode, childPos) => {
        if (childNode.type.name === 'dropdown' && childNode.attrs.id === dropdownId) {
            dropdownExists = true
        }
    })

    if (dropdownExists) {
        return { _cleanup: () => {} }
    }



    const aiAvatarIcons = {
        gptAvatarIcon,
        claudeIcon,
    }

    // Get AI models from store
    const aiModelsData = aiModelsStore.getData()
    const currentAiModel = documentStore.getData('aiModel')

    // Transform data to match dropdown format
    const aiModelsSelectorDropdownOptions = aiModelsData.map(aiModel => ({
        title: aiModel.title,
        icon: aiAvatarIcons[aiModel.iconName],
        color: aiModel.color,
        aiModel: `${aiModel.provider}:${aiModel.model}`,
        // Store provider and model separately so we can use them in the nodeview
        provider: aiModel.provider,
        model: aiModel.model
    }))

    // Find selected value
    const selectedValue = aiModelsSelectorDropdownOptions.find(model => model.aiModel === currentAiModel) || {}

    // Insert dropdown at the beginning of the thread content (after thread wrapper, before first paragraph)
    const insertPos = pos + 1 // Insert after opening of aiChatThread node

    if (!view.state.schema.nodes.dropdown) {
        console.error('❌ SCHEMA ERROR: dropdown node not found in schema')
        return { _cleanup: () => {} }
    }

    try {
        const dropdownNode = view.state.schema.nodes.dropdown.create({
            id: dropdownId,
            selectedValue: selectedValue,
            dropdownOptions: aiModelsSelectorDropdownOptions,
            theme: 'dark',
            renderPosition: 'bottom',
            buttonIcon: chevronDownIcon
        })

        // Insert the dropdown node into the document
        const tr = view.state.tr.insert(insertPos, dropdownNode)
        view.dispatch(tr)
    } catch (error) {
        console.error('Failed to create/insert dropdown node:', error)
        return { _cleanup: () => {} }
    }

    // Subscribe to documentStore to update the dropdown when selection changes
    let currentSelectedValue = selectedValue
    const unsubscribeDoc = documentStore.subscribe((store) => {
        const aiModelStr = store?.data?.aiModel
        const newSelected = aiModelsSelectorDropdownOptions.find(model => model.aiModel === aiModelStr) || {}

        if (newSelected.aiModel !== currentSelectedValue.aiModel) {
            currentSelectedValue = newSelected

            // Find the dropdown node in the document and update it
            const currentPos = getPos()
            if (currentPos !== undefined) {
                // The dropdown is the first child of the aiChatThread, so it's at currentPos + 1
                const dropdownPos = currentPos + 1
                const doc = view.state.doc
                const dropdownNode = doc.nodeAt(dropdownPos)

                if (dropdownNode && dropdownNode.type.name === 'dropdown' && dropdownNode.attrs.id === dropdownId) {
                    const updatedAttrs = {
                        ...dropdownNode.attrs,
                        selectedValue: newSelected
                    }
                    const tr = view.state.tr.setNodeMarkup(dropdownPos, null, updatedAttrs)
                    view.dispatch(tr)
                }
            }
        }
    })

    // Return cleanup function
    return {
        _cleanup: () => {
            if (typeof unsubscribeDoc === 'function') unsubscribeDoc()
            // Clean up handlers from registry
            aiModelsSelectorDropdownOptions.forEach(option => {
                if (option.id && dropdownHandlersRegistry.has(option.id)) {
                    dropdownHandlersRegistry.delete(option.id)
                }
            })
        }
    }
}

// Helper function to create AI submit button
function createAiSubmitButton(view) {
    // Cache the click handler to avoid recreation
    const handleClick = (e) => {
        e.preventDefault()
        e.stopPropagation()

        // Get plugin state to check if receiving
        const pluginState = AI_CHAT_THREAD_PLUGIN_KEY.getState(view.state)

        if (pluginState?.isReceiving) {
            // TODO: Stop AI streaming functionality
        } else {
            // Trigger AI chat submission
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
