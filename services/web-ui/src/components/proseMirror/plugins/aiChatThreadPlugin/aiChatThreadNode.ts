// @ts-nocheck
import { keyboardMacCommandIcon, keyboardEnterKeyIcon, sendIcon, stopIcon, chatThreadBoundariesInfoIcon } from '../../../../svgIcons/index.js'
import { TextSelection, PluginKey } from 'prosemirror-state'

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

    // Create DOM structure - the plugin will apply decoration classes like 'ai-chat-thread-keys-pressed mod-pressed' to this DOM element
    const dom = document.createElement('div')
    dom.className = 'ai-chat-thread-wrapper'
    dom.setAttribute('data-thread-id', node.attrs.threadId)
    dom.setAttribute('data-status', node.attrs.status)

    // Create content container
    const contentDOM = document.createElement('div')
    contentDOM.className = 'ai-chat-thread-content'

    // Create keyboard shortcut indicator
    const shortcutIndicator = createKeyboardShortcutIndicator(view)

    // Create thread boundary indicator for context visualization
    const threadBoundaryIndicator = createThreadBoundaryIndicator(dom, view, node.attrs.threadId)

    // Append all elements
    dom.appendChild(contentDOM)
    dom.appendChild(shortcutIndicator)
    dom.appendChild(threadBoundaryIndicator)

    // Setup content focus handling
    setupContentFocus(contentDOM, view, getPos)

    return {
        dom,
        contentDOM,
        update: (updatedNode) => {
            if (updatedNode.type.name !== aiChatThreadNodeType) {
                return false
            }

            // Update attributes if changed
            dom.setAttribute('data-thread-id', updatedNode.attrs.threadId)
            dom.setAttribute('data-status', updatedNode.attrs.status)

            node = updatedNode
            return true
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
    const boundaryIndicator = document.createElement('div')
    boundaryIndicator.className = 'ai-thread-boundary-indicator'

    // Create the boundary line element (append to wrapper so it can span full thread height)
    const boundaryLine = document.createElement('div')
    boundaryLine.className = 'ai-thread-boundary-indicator-line'
    wrapperDOM.appendChild(boundaryLine)

    // Create the icon element
    const iconElement = document.createElement('div')
    iconElement.className = 'ai-thread-boundary-icon'
    iconElement.innerHTML = chatThreadBoundariesInfoIcon

    // Add icon to the boundary indicator
    boundaryIndicator.appendChild(iconElement)

    // Handle hover events using ProseMirror transactions for consistency
    boundaryIndicator.addEventListener('mouseenter', () => {
        view.dispatch(view.state.tr.setMeta('hoverThread', threadId))
    })

    boundaryIndicator.addEventListener('mouseleave', () => {
        view.dispatch(view.state.tr.setMeta('hoverThread', null))
    })

    return boundaryIndicator
}

// Helper function to create keyboard shortcut indicator
function createKeyboardShortcutIndicator(view) {
    const indicator = document.createElement('div')
    indicator.className = 'keyboard-shortcut-hint'

    // Detect platform for correct modifier key
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    // Default state (showing keyboard shortcut)
    const defaultContent = document.createElement('div')
    defaultContent.className = 'shortcut-default'

    const defaultIconsContainer = document.createElement('div')
    defaultIconsContainer.className = 'icons-container'

    const keysContainer = document.createElement('div')
    keysContainer.className = 'shortcut-keys'

    if (isMac) {
        const cmdIcon = document.createElement('span')
        cmdIcon.className = 'key-icon cmd-key'
        cmdIcon.innerHTML = keyboardMacCommandIcon
        keysContainer.appendChild(cmdIcon)
    } else {
        const ctrlKey = document.createElement('span')
        ctrlKey.className = 'key-text ctrl-key'
        ctrlKey.textContent = 'Ctrl'
        keysContainer.appendChild(ctrlKey)
    }

    const enterIcon = document.createElement('span')
    enterIcon.className = 'key-icon enter-key'
    enterIcon.innerHTML = keyboardEnterKeyIcon
    keysContainer.appendChild(enterIcon)

    defaultIconsContainer.appendChild(keysContainer)

    const defaultLabel = document.createElement('span')
    defaultLabel.className = 'shortcut-label'
    defaultLabel.textContent = 'send'

    defaultContent.appendChild(defaultIconsContainer)
    defaultContent.appendChild(defaultLabel)

    // Hover state (showing send button)
    const hoverContent = document.createElement('div')
    hoverContent.className = 'shortcut-hover'

    const hoverIconsContainer = document.createElement('div')
    hoverIconsContainer.className = 'icons-container'

    const sendIconElement = document.createElement('span')
    sendIconElement.className = 'send-icon'
    sendIconElement.innerHTML = sendIcon

    hoverIconsContainer.appendChild(sendIconElement)

    const hoverLabel = document.createElement('span')
    hoverLabel.className = 'shortcut-label'
    hoverLabel.textContent = 'send'

    hoverContent.appendChild(hoverIconsContainer)
    hoverContent.appendChild(hoverLabel)

    // Receiving state (showing stop button)
    const receivingContent = document.createElement('div')
    receivingContent.className = 'shortcut-receiving'

    const receivingIconsContainer = document.createElement('div')
    receivingIconsContainer.className = 'icons-container'

    const stopIconElement = document.createElement('span')
    stopIconElement.className = 'stop-icon'
    stopIconElement.innerHTML = stopIcon

    receivingIconsContainer.appendChild(stopIconElement)

    const receivingLabel = document.createElement('span')
    receivingLabel.className = 'shortcut-label'
    receivingLabel.textContent = 'stop'

    receivingContent.appendChild(receivingIconsContainer)
    receivingContent.appendChild(receivingLabel)

    // Add all three states to indicator
    indicator.appendChild(defaultContent)
    indicator.appendChild(hoverContent)
    indicator.appendChild(receivingContent)

    // Enable pointer events and add click handler
    indicator.style.pointerEvents = 'auto'
    indicator.style.cursor = 'pointer'

    // Add click handler
    indicator.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()

        // Get plugin state to check if receiving
        const pluginKey = new PluginKey('aiChatThread')
        const pluginState = pluginKey.getState(view.state)

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
    })

    return indicator
}
