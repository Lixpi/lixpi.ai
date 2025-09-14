// @ts-nocheck
// AI Chat Thread Plugin - Modular Architecture
// This plugin consolidates AI chat functionality for ProseMirror:
// - Keyboard triggers (Mod+Enter)
// - Content extraction from chat threads
// - AI response streaming and insertion
// - Thread NodeViews with controls
// - Placeholder decorations

import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet, NodeView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { Node as PMNode, Schema } from 'prosemirror-model'
import { nodeTypes, nodeViews } from '../../customNodes/index.js'
import { documentTitleNodeType } from '../../customNodes/documentTitleNode.js'
import { aiChatThreadNodeType } from './aiChatThreadNode.ts'
import { aiResponseMessageNodeType, aiResponseMessageNodeView } from './aiResponseMessageNode.ts'
import { keyboardMacCommandIcon, keyboardEnterKeyIcon, sendIcon, stopIcon, chatThreadBoundariesInfoIcon } from '../../../../svgIcons/index.js'
import SegmentsReceiver from '../../../../services/segmentsReceiver-service.js'

const IS_RECEIVING_TEMP_DEBUG_STATE = false

// ========== TYPE DEFINITIONS ==========

type AiChatCallback = (messages: Array<{ role: string; content: string }>) => void
type PlaceholderOptions = { titlePlaceholder: string; paragraphPlaceholder: string }
type StreamStatus = 'START_STREAM' | 'STREAMING' | 'END_STREAM'
type SegmentEvent = {
    status: StreamStatus
    aiProvider?: string
    segment?: {
        segment: string
        styles: string[]
        type: string
        level?: number
        isBlockDefining: boolean
    }
}
type ThreadContent = { nodeType: string; textContent: string }
type AiChatThreadPluginState = {
    isReceiving: boolean
    insideBackticks: boolean
    backtickBuffer: string
    insideCodeBlock: boolean
    codeBuffer: string
    decorations: DecorationSet
    modPressed: boolean
    enterPressed: boolean
    hoveredThreadId: string | null
}

// ========== CONSTANTS ==========

const PLUGIN_KEY = new PluginKey<AiChatThreadPluginState>('aiChatThread')
const INSERT_THREAD_META = `insert:${aiChatThreadNodeType}`
const USE_AI_CHAT_META = 'use:aiChat'

// ========== UTILITY MODULES ==========

// Keyboard interaction handling
class KeyboardHandler {
    static isModEnter(event: KeyboardEvent): boolean {
        const isMac = navigator.platform.toUpperCase().includes('MAC')
        const mod = isMac ? event.metaKey : event.ctrlKey
        return event.key === 'Enter' && mod
    }
}

// Content extraction and transformation utilities
class ContentExtractor {
    // Extract and format text recursively, preserving code block structure
    static collectFormattedText(node: PMNode): string {
        let text = ''
        node.forEach(child => {
            if (child.type.name === 'text') {
                text += child.text
            } else if (child.type.name === 'hard_break') {
                text += '\n'
            } else if (child.type.name === 'code_block') {
                // Format code blocks with triple backticks and proper spacing
                const codeContent = ContentExtractor.collectFormattedText(child)
                text += `\n\`\`\`\n${codeContent}\n\`\`\`\n`
            } else {
                text += ContentExtractor.collectFormattedText(child)
            }
        })
        return text
    }

    // Simple text extraction without formatting (for backwards compatibility)
    static collectText(node: PMNode): string {
        let text = ''
        node.forEach(child => {
            if (child.type.name === 'text') {
                text += child.text
            } else if (child.type.name === 'hard_break') {
                text += '\n'
            } else {
                text += ContentExtractor.collectText(child)
            }
        })
        return text
    }

    // Find the active aiChatThread containing the cursor
    static getActiveThreadContent(state: EditorState): ThreadContent[] {
        const { $from } = state.selection
        let thread: PMNode | null = null

        // Walk up the node hierarchy to find the thread
        for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === aiChatThreadNodeType) {
                thread = node
                break
            }
        }

        if (!thread) return []

        // Extract all blocks with content, preserving code block formatting
        const content: ThreadContent[] = []
        thread.forEach(block => {
            // Use formatted text extraction for all blocks
            const formattedText = ContentExtractor.collectFormattedText(block)
            const simpleText = ContentExtractor.collectText(block)

            console.log('Processing block:', {
                nodeType: block.type.name,
                textContent: block.textContent,
                simpleText: simpleText,
                formattedText: formattedText,
                hasContent: !!block.textContent,
                hasFormattedContent: !!formattedText,
                nodeSize: block.nodeSize,
                childCount: block.childCount
            })

            // Include blocks that have any text content
            if (block.textContent || formattedText) {
                let textContent = formattedText || block.textContent

                // For top-level code blocks, format with triple backticks (if not already formatted)
                if (block.type.name === 'code_block' && !textContent.includes('```')) {
                    textContent = `\`\`\`\n${textContent}\n\`\`\``
                }

                content.push({
                    nodeType: block.type.name,
                    textContent: textContent
                })
            }
        })

        console.log('Final extracted content:', content)
        return content
    }

    // Transform thread content into AI message format
    static toMessages(items: ThreadContent[]): Array<{ role: string; content: string }> {
        console.log('Input items to toMessages:', items)

        const messages: Array<{ role: string; content: string; nodeType: string }> = []

        items.forEach(item => {
            const role = item.nodeType === aiResponseMessageNodeType ? 'assistant' : 'user'
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

            console.log('Processing item:', {
                nodeType: item.nodeType,
                role,
                textContent: item.textContent,
                isAiResponse: item.nodeType === aiResponseMessageNodeType,
                expectedType: aiResponseMessageNodeType
            })

            // Merge consecutive messages with same role
            if (lastMessage && lastMessage.role === role) {
                lastMessage.content += '\n' + item.textContent
            } else {
                messages.push({
                    role,
                    content: item.textContent,
                    nodeType: item.nodeType
                })
            }
        })

        const finalMessages = messages.map(({ role, content }) => ({ role, content }))
        console.log('Final messages to send to AI:', finalMessages)
        return finalMessages
    }
}

// Document position and insertion utilities
class PositionFinder {
    // Find where to insert aiResponseMessage in the active thread
    static findThreadInsertionPoint(state: EditorState): {
        insertPos: number
        trailingEmptyParagraphPos: number | null
    } | null {
        let result: { insertPos: number; trailingEmptyParagraphPos: number | null } | null = null

        state.doc.descendants((node, pos) => {
            if (node.type.name !== aiChatThreadNodeType) return

            // Find the last paragraph in the thread
            let lastParaAbsPos: number | null = null
            let lastParaNode: PMNode | null = null

            node.descendants((child, relPos) => {
                if (child.type.name === 'paragraph') {
                    lastParaAbsPos = pos + relPos + 1
                    lastParaNode = child
                }
            })

            // Check if last paragraph is empty (trailing)
            const trailingEmpty = lastParaNode && lastParaNode.textContent === '' ? lastParaAbsPos : null
            const insertPos = trailingEmpty || pos + node.nodeSize - 1

            result = { insertPos, trailingEmptyParagraphPos: trailingEmpty }
            return false // Stop searching
        })

        return result
    }

    // Find the current aiResponseMessage being streamed into
    static findResponseNode(state: EditorState): {
        found: boolean
        endOfNodePos?: number
        childCount?: number
    } {
        let found = false
        let endOfNodePos: number | undefined
        let childCount: number | undefined

        state.doc.descendants((node, pos) => {
            if (node.type.name !== aiResponseMessageNodeType) return

            endOfNodePos = pos + node.nodeSize
            childCount = node.childCount
            found = true
            return false // Stop searching
        })

        return { found, endOfNodePos, childCount }
    }
}

// Content insertion during AI streaming
class StreamingInserter {
    // Insert block-level content (headers, paragraphs, code blocks)
    static insertBlockContent(
        tr: Transaction,
        type: string,
        content: string,
        level: number | undefined,
        marks: any[] | null,
        endOfNodePos: number,
        childCount: number
    ): void {
        try {
            const insertPos = endOfNodePos - 1
            tr.doc.resolve(insertPos) // Validate position

            switch (type) {
                case 'header': {
                    const textNode = tr.doc.type.schema.text(content)
                    const headingNode = tr.doc.type.schema.nodes.heading.createAndFill({ level }, textNode)!

                    if (childCount === 0) {
                        tr.insert(insertPos, headingNode)
                    } else {
                        // Insert separator paragraph first
                        const para = tr.doc.type.schema.nodes.paragraph.createAndFill()!
                        tr.insert(insertPos, para)
                        tr.insert(endOfNodePos, headingNode)
                    }
                    break
                }

                case 'paragraph': {
                    if (content) {
                        const textNode = marks
                            ? tr.doc.type.schema.text(content, marks)
                            : tr.doc.type.schema.text(content)
                        const paragraphNode = tr.doc.type.schema.nodes.paragraph.createAndFill(null, textNode)!
                        tr.insert(insertPos, paragraphNode)
                    } else {
                        const emptyParagraph = tr.doc.type.schema.nodes.paragraph.create()
                        tr.insert(insertPos, emptyParagraph)
                    }
                    break
                }

                case 'codeBlock': {
                    const codeText = tr.doc.type.schema.text(content)
                    const codeBlock = tr.doc.type.schema.nodes.code_block.createAndFill(null, codeText)!
                    tr.insert(insertPos, codeBlock)
                    break
                }
            }
        } catch (error) {
            console.warn(`Block content insertion failed at ${endOfNodePos - 1}:`, error)
        }
    }

    // Insert inline content (text, marks, line breaks)
    static insertInlineContent(
        tr: Transaction,
        type: string,
        content: string,
        marks: any[] | null,
        endOfNodePos: number
    ): void {
        try {
            const insertPos = endOfNodePos - 2
            tr.doc.resolve(insertPos) // Validate position

            if (type === 'codeBlock') {
                const codeText = tr.doc.type.schema.text(content)
                tr.insert(insertPos, codeText)
            } else if (content === '\n') {
                const newParagraph = tr.doc.type.schema.nodes.paragraph.create()
                tr.insert(endOfNodePos - 1, newParagraph)
            } else if (content) {
                const textNode = marks
                    ? tr.doc.type.schema.text(content, marks)
                    : tr.doc.type.schema.text(content)
                tr.insert(insertPos, textNode)
            }
        } catch (error) {
            console.warn(`Inline content insertion failed at ${endOfNodePos - 2}:`, error)
        }
    }
}

// ========== MAIN PLUGIN CLASS ==========

// Main plugin class coordinating all AI chat functionality
class AiChatThreadPluginClass {
    private callback: AiChatCallback
    private placeholderOptions: PlaceholderOptions
    private unsubscribeFromSegments: (() => void) | null = null

    constructor(callback: AiChatCallback, placeholderOptions: PlaceholderOptions) {
        this.callback = callback
        this.placeholderOptions = placeholderOptions
    }

    // ========== STREAMING MANAGEMENT ==========

    private startStreaming(view: EditorView): void {
        this.unsubscribeFromSegments = SegmentsReceiver.subscribeToeceiveSegment((event: SegmentEvent) => {
            const { status, aiProvider, segment } = event
            const { state, dispatch } = view

            console.log('🚀 SEGMENT RECEIVED:', status, 'aiProvider:', aiProvider)
            switch (status) {
                case 'START_STREAM':
                    console.log('🔴 Handling START_STREAM')
                    this.handleStreamStart(state, dispatch, aiProvider)
                    break
                case 'STREAMING':
                    console.log('📡 Handling STREAMING segment')
                    if (segment) this.handleStreaming(state, dispatch, segment)
                    break
                case 'END_STREAM':
                    console.log('🟢 Handling END_STREAM')
                    this.handleStreamEnd(state, dispatch)
                    break
            }
        })
    }

    private handleStreamStart(state: EditorState, dispatch: (tr: Transaction) => void, aiProvider?: string): void {
        const threadInfo = PositionFinder.findThreadInsertionPoint(state)
        if (!threadInfo) return

        const { insertPos, trailingEmptyParagraphPos } = threadInfo
        const aiResponseNode = state.schema.nodes[aiResponseMessageNodeType].create({
            isInitialRenderAnimation: true,
            isReceivingAnimation: true,
            aiProvider
        })

        try {
            let tr = state.tr
            tr.insert(insertPos, aiResponseNode)

            const afterResponsePos = insertPos + aiResponseNode.nodeSize
            let cursorPos = afterResponsePos

            // Ensure trailing empty paragraph
            if (trailingEmptyParagraphPos === null || trailingEmptyParagraphPos !== afterResponsePos) {
                const emptyParagraph = state.schema.nodes.paragraph.createAndFill()!
                tr.insert(afterResponsePos, emptyParagraph)
                cursorPos = afterResponsePos + emptyParagraph.nodeSize - 1
            } else {
                cursorPos = afterResponsePos - 1
            }

            tr.setSelection(TextSelection.create(tr.doc, cursorPos))
            tr.setMeta('setReceiving', true)
            console.log('🔴 STREAM START: Setting isReceiving to true via setMeta')
            dispatch(tr)
        } catch (error) {
            console.error('Error inserting aiResponseMessage:', error)
        }
    }

    private handleStreaming(state: EditorState, dispatch: (tr: Transaction) => void, segment: SegmentEvent['segment']): void {
        if (!segment) return

        let tr = state.tr
        const responseInfo = PositionFinder.findResponseNode(state)

        // Create response node if missing (fallback)
        if (!responseInfo.found) {
            this.createResponseFallback(state, dispatch)
            return
        }

        const { endOfNodePos, childCount } = responseInfo
        const { segment: content, styles, type, level, isBlockDefining } = segment

        // Create text marks from styles
        const marks = styles.length > 0
            ? styles.map(style => this.createMark(state.schema, style)).filter(Boolean)
            : null

        // Insert content based on type
        if (isBlockDefining) {
            StreamingInserter.insertBlockContent(tr, type, content, level, marks, endOfNodePos!, childCount!)
        } else {
            StreamingInserter.insertInlineContent(tr, type, content, marks, endOfNodePos!)
        }

        if (tr.docChanged) {
            dispatch(tr)
        }
    }

    private handleStreamEnd(state: EditorState, dispatch: (tr: Transaction) => void): void {
        state.doc.descendants((node, pos) => {
            if (node.type.name === aiResponseMessageNodeType && node.attrs.isInitialRenderAnimation) {
                const tr = state.tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    isInitialRenderAnimation: false,
                    isReceivingAnimation: false
                })

                // Only set isReceiving to false if debug mode is off
                if (!IS_RECEIVING_TEMP_DEBUG_STATE) {
                    tr.setMeta('setReceiving', false)
                    console.log('🟢 STREAM END: Setting isReceiving to false via setMeta')
                } else {
                    console.log('🟡 STREAM END: Debug mode ON - keeping isReceiving state active for CSS inspection')
                }

                dispatch(tr)
                return false // Stop after first match
            }
        })
    }

    private createResponseFallback(state: EditorState, dispatch: (tr: Transaction) => void): void {
        const threadInfo = PositionFinder.findThreadInsertionPoint(state)
        if (!threadInfo) return

        const { insertPos, trailingEmptyParagraphPos } = threadInfo
        const responseNode = state.schema.nodes[aiResponseMessageNodeType].create({
            isInitialRenderAnimation: true,
            isReceivingAnimation: true,
            aiProvider: 'Anthropic'
        })

        let tr = state.tr.insert(insertPos, responseNode)
        const afterPos = insertPos + responseNode.nodeSize

        // Ensure trailing paragraph
        if (trailingEmptyParagraphPos === null || trailingEmptyParagraphPos !== afterPos) {
            const emptyParagraph = state.schema.nodes.paragraph.createAndFill()!
            tr = tr.insert(afterPos, emptyParagraph)
        }

        dispatch(tr)
    }

    private createMark(schema: Schema, style: string): any {
        switch (style) {
            case 'bold': return schema.marks.strong.create()
            case 'italic': return schema.marks.em.create()
            case 'strikethrough': return schema.marks.strikethrough.create()
            case 'code': return schema.marks.code.create()
            default: return null
        }
    }

    // ========== NODE VIEWS ==========

    private createThreadNodeView(node: PMNode, view: EditorView, getPos: () => number | undefined): NodeView {
        // Ensure node has a proper threadId - if not, assign one via transaction
        if (!node.attrs.threadId) {
            const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const pos = getPos()
            if (pos !== undefined) {
                // Update the node with a proper threadId
                setTimeout(() => {
                    const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        threadId: newThreadId
                    })
                    view.dispatch(tr)
                }, 0)
            }
            // Use the new threadId for this render
            node = node.type.create({
                ...node.attrs,
                threadId: newThreadId
            }, node.content)
        }

        // Create DOM structure
        const dom = document.createElement('div')
        dom.className = 'ai-chat-thread-wrapper'
        dom.setAttribute('data-thread-id', node.attrs.threadId)
        dom.setAttribute('data-status', node.attrs.status)

        // Create content container
        const contentDOM = document.createElement('div')
        contentDOM.className = 'ai-chat-thread-content'

        // Create keyboard shortcut indicator
        const shortcutIndicator = this.createKeyboardShortcutIndicator(view)

        // Create thread boundary indicator for context visualization
        const threadBoundaryIndicator = this.createThreadBoundaryIndicator(dom, view, node.attrs.threadId)

        dom.appendChild(contentDOM)
        dom.appendChild(shortcutIndicator)
        dom.appendChild(threadBoundaryIndicator)

        // Focus handling
        this.setupContentFocus(contentDOM, view, getPos)

        return {
            dom,
            contentDOM,
            update: (updatedNode: PMNode) => {
                node = updatedNode
                return true
            }
        }
    }



    private setupContentFocus(contentDOM: HTMLElement, view: EditorView, getPos: () => number | undefined): void {
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

    private createThreadBoundaryIndicator(wrapperDOM: HTMLElement, view: EditorView, threadId: string): HTMLElement {
        const boundaryIndicator = document.createElement('div')
        boundaryIndicator.className = 'ai-thread-boundary-indicator'

        // Create the boundary line element (like ai-response-message-boundaries-indicator)
        // IMPORTANT: append to the wrapper so it can span the full thread height
        const boundaryLine = document.createElement('div')
        boundaryLine.className = 'ai-thread-boundary-indicator-line'
        wrapperDOM.appendChild(boundaryLine)

        // Create the icon element
        const iconElement = document.createElement('div')
        iconElement.className = 'ai-thread-boundary-icon'
        iconElement.innerHTML = chatThreadBoundariesInfoIcon

        // Add elements to the boundary indicator (icon only; line is sibling on wrapper)
        boundaryIndicator.appendChild(iconElement)

        // Handle hover events using ProseMirror transactions for consistency with other state management
        boundaryIndicator.addEventListener('mouseenter', () => {
            view.dispatch(view.state.tr.setMeta('hoverThread', threadId))
        })

        boundaryIndicator.addEventListener('mouseleave', () => {
            view.dispatch(view.state.tr.setMeta('hoverThread', null))
        })

        return boundaryIndicator
    }





    private createKeyboardShortcutIndicator(view: EditorView): HTMLElement {
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

            const pluginState = PLUGIN_KEY.getState(view.state)

            console.log('🖱️ BUTTON CLICKED: pluginState.isReceiving =', pluginState?.isReceiving)

            if (pluginState?.isReceiving) {
                // TODO: Stop AI streaming functionality
                console.log('🛑 Stop AI streaming - functionality to be implemented')
            } else {
                // Trigger AI chat submission
                console.log('🚀 Triggering AI chat submission')
                const tr = view.state.tr.setMeta(USE_AI_CHAT_META, true)
                view.dispatch(tr)
            }
        })

        // Note: Keyboard feedback is now handled via ProseMirror decorations in the plugin props

        return indicator
    }



    // ========== KEYBOARD FEEDBACK ==========

    private createKeyboardFeedbackDecorations(state: EditorState, pluginState: AiChatThreadPluginState): Decoration[] {
        const decorations: Decoration[] = []

        // Find all ai-chat-thread nodes and add keyboard feedback and receiving state styling ONLY
        state.doc.descendants((node, pos) => {
            if (node.type.name === 'aiChatThread') {
                // Build CSS class based ONLY on keyboard and receiving state
                let cssClass = 'ai-chat-thread-keys-pressed'
                if (pluginState.modPressed) {
                    cssClass += ' mod-pressed'
                }
                if (pluginState.enterPressed) {
                    cssClass += ' enter-pressed'
                }
                if (pluginState.isReceiving) {
                    cssClass += ' receiving'
                }

                // Create a decoration that applies the keyboard feedback class to the entire node
                decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                        class: cssClass
                    })
                )
            }
        })

        return decorations
    }

    // ========== THREAD BOUNDARY SYSTEM ==========

    private createThreadBoundaryDecorations(state: EditorState, pluginState: AiChatThreadPluginState): Decoration[] {
        const decorations: Decoration[] = []

        // Find all ai-chat-thread nodes and add boundary visibility ONLY for the hovered thread
        state.doc.descendants((node, pos) => {
            if (node.type.name === 'aiChatThread' && pluginState.hoveredThreadId === node.attrs.threadId) {
                // Apply boundary visibility class ONLY to the specific hovered thread
                decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                        class: 'thread-boundary-visible'
                    })
                )
            }
        })

        return decorations
    }

    // ========== PLACEHOLDERS ==========

    private createPlaceholders(state: EditorState): DecorationSet {
        const decorations: Decoration[] = []

        state.doc.descendants((node, pos) => {
            // Title placeholder
            if (node.type.name === documentTitleNodeType && node.content.size === 0) {
                decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                        class: 'empty-node-placeholder',
                        'data-placeholder': this.placeholderOptions.titlePlaceholder
                    })
                )
            }

            // Thread paragraph placeholder (only for single empty paragraph)
            if (node.type.name === aiChatThreadNodeType && node.childCount === 1) {
                const firstChild = node.firstChild
                if (firstChild && firstChild.type.name === 'paragraph' && firstChild.content.size === 0) {
                    const paragraphPos = pos + 1
                    decorations.push(
                        Decoration.node(paragraphPos, paragraphPos + firstChild.nodeSize, {
                            class: 'empty-node-placeholder',
                            'data-placeholder': this.placeholderOptions.paragraphPlaceholder
                        })
                    )
                }
            }
        })

        return DecorationSet.create(state.doc, decorations)
    }

    // ========== TRANSACTION HANDLING ==========

    private handleInsertThread(transaction: Transaction, newState: EditorState): Transaction | null {
        const attrs = transaction.getMeta(INSERT_THREAD_META)
        if (!attrs) return null

        // Create thread with initial empty paragraph
        const nodeType = newState.schema.nodes[aiChatThreadNodeType]
        const paragraph = newState.schema.nodes.paragraph.create()
        const threadNode = nodeType.create(attrs, paragraph)

        // Replace selection with thread
        const { $from, $to } = newState.selection
        let tr = newState.tr.replaceWith($from.pos, $to.pos, threadNode)

        // Move cursor into thread
        const pos = $from.pos + 1
        tr = tr.setSelection(TextSelection.create(tr.doc, pos))

        return tr
    }

    private handleChatRequest(newState: EditorState): void {
        const threadContent = ContentExtractor.getActiveThreadContent(newState)
        const messages = ContentExtractor.toMessages(threadContent)
        this.callback(messages)
    }

    // ========== PLUGIN CREATION ==========

    create(): Plugin {
        return new Plugin({
            key: PLUGIN_KEY,

            state: {
                init: (): AiChatThreadPluginState => ({
                    isReceiving: IS_RECEIVING_TEMP_DEBUG_STATE,
                    insideBackticks: false,
                    backtickBuffer: '',
                    insideCodeBlock: false,
                    codeBuffer: '',
                    decorations: DecorationSet.empty,
                    modPressed: false,
                    enterPressed: false,
                    hoveredThreadId: null
                }),
                apply: (tr: Transaction, prev: AiChatThreadPluginState): AiChatThreadPluginState => {
                    // Handle receiving state toggle
                    const receivingMeta = tr.getMeta('setReceiving')
                    if (receivingMeta !== undefined) {
                        console.log('📡 PLUGIN STATE APPLY: receivingMeta =', receivingMeta, 'prev.isReceiving =', prev.isReceiving, '-> new isReceiving =', receivingMeta)
                        return {
                            ...prev,
                            isReceiving: receivingMeta,
                            decorations: prev.decorations.map(tr.mapping, tr.doc)
                        }
                    }

                    // Handle mod key toggle
                    const modToggleMeta = tr.getMeta('modToggle')
                    if (modToggleMeta !== undefined) {
                        return {
                            ...prev,
                            modPressed: modToggleMeta,
                            // Clear enter pressed when mod is released
                            enterPressed: modToggleMeta ? prev.enterPressed : false,
                            decorations: prev.decorations.map(tr.mapping, tr.doc)
                        }
                    }

                    // Handle enter key toggle (only when mod is pressed)
                    const enterToggleMeta = tr.getMeta('enterToggle')
                    if (enterToggleMeta !== undefined && prev.modPressed) {
                        return {
                            ...prev,
                            enterPressed: enterToggleMeta,
                            decorations: prev.decorations.map(tr.mapping, tr.doc)
                        }
                    }

                    // Handle hover thread ID change
                    const hoverThreadMeta = tr.getMeta('hoverThread')
                    if (hoverThreadMeta !== undefined) {
                        return {
                            ...prev,
                            hoveredThreadId: hoverThreadMeta,
                            decorations: prev.decorations.map(tr.mapping, tr.doc)
                        }
                    }

                    // Map existing decorations to new document
                    return {
                        ...prev,
                        decorations: prev.decorations.map(tr.mapping, tr.doc)
                    }
                }
            },

            appendTransaction: (transactions: Transaction[], _oldState: EditorState, newState: EditorState) => {
                // Handle AI chat requests
                const chatTransaction = transactions.find(tr => tr.getMeta(USE_AI_CHAT_META))
                if (chatTransaction) {
                    this.handleChatRequest(newState)
                }

                // Handle thread insertions
                const insertTransaction = transactions.find(tr => tr.getMeta(INSERT_THREAD_META))
                if (insertTransaction) {
                    return this.handleInsertThread(insertTransaction, newState)
                }

                return null
            },

            view: (view: EditorView) => {
                this.startStreaming(view)
                return {
                    destroy: () => {
                        if (this.unsubscribeFromSegments) {
                            this.unsubscribeFromSegments()
                        }
                    }
                }
            },

            props: {
                // Keyboard handling
                handleDOMEvents: {
                    keydown: (_view: EditorView, event: KeyboardEvent) => {
                        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
                        const isModKey = (isMac && event.metaKey) || (!isMac && event.ctrlKey)
                        const pluginState = PLUGIN_KEY.getState(_view.state)

                        console.log('Keydown event:', event.key, 'isModKey:', isModKey, 'modPressed:', pluginState?.modPressed, 'enterPressed:', pluginState?.enterPressed)

                        // Handle Mod key press for visual feedback
                        if (isModKey && !pluginState?.modPressed) {
                            console.log('Mod key pressed - setting modPressed to true')
                            const { state, dispatch } = _view
                            dispatch(state.tr.setMeta('modToggle', true))
                            return false
                        }

                        // Handle Enter key press for visual feedback (only when mod is already pressed)
                        if (event.key === 'Enter' && pluginState?.modPressed && !pluginState?.enterPressed) {
                            console.log('Enter key pressed while mod is held - setting enterPressed to true')
                            const { state, dispatch } = _view
                            dispatch(state.tr.setMeta('enterToggle', true))

                            // After setting visual feedback, handle the AI chat submission
                            setTimeout(() => {
                                event.preventDefault()
                                const { state: currentState, dispatch: currentDispatch } = _view
                                const { $from } = currentState.selection
                                currentDispatch(currentState.tr.setMeta(USE_AI_CHAT_META, { pos: $from.pos }))
                            }, 50) // Small delay to allow visual feedback to show

                            return true // Prevent default Enter behavior
                        }

                        // Handle Mod+Enter for AI chat (fallback if Enter wasn't handled above)
                        if (KeyboardHandler.isModEnter(event)) {
                            event.preventDefault()
                            const { state, dispatch } = _view
                            const { $from } = state.selection
                            dispatch(state.tr.setMeta(USE_AI_CHAT_META, { pos: $from.pos }))
                            return true
                        }

                        return false
                    },

                    keyup: (_view: EditorView, event: KeyboardEvent) => {
                        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
                        const isModKey = (isMac && event.metaKey) || (!isMac && event.ctrlKey)
                        const pluginState = PLUGIN_KEY.getState(_view.state)

                        console.log('Keyup event:', event.key, 'isModKey:', isModKey, 'modPressed:', pluginState?.modPressed, 'enterPressed:', pluginState?.enterPressed)

                        // Handle Mod key release
                        if (!isModKey && pluginState?.modPressed) {
                            console.log('Mod key released - setting modPressed to false')
                            const { state, dispatch } = _view
                            dispatch(state.tr.setMeta('modToggle', false))
                            return false
                        }

                        // Handle Enter key release (only when mod is still pressed)
                        if (event.key === 'Enter' && pluginState?.enterPressed) {
                            console.log('Enter key released - setting enterPressed to false')
                            const { state, dispatch } = _view
                            dispatch(state.tr.setMeta('enterToggle', false))
                            return false
                        }

                        return false
                    }
                },

                // Decorations: combine all independent decoration systems
                decorations: (state: EditorState) => {
                    const pluginState = PLUGIN_KEY.getState(state)
                    const placeholders = this.createPlaceholders(state)
                    const allDecorations = [...placeholders.find()]

                    // Independent keyboard feedback system
                    if (pluginState?.modPressed || pluginState?.enterPressed || pluginState?.isReceiving) {
                        const keyboardDecorations = this.createKeyboardFeedbackDecorations(state, pluginState)
                        allDecorations.push(...keyboardDecorations)
                    }

                    // Independent thread boundary system
                    if (pluginState?.hoveredThreadId) {
                        const boundaryDecorations = this.createThreadBoundaryDecorations(state, pluginState)
                        allDecorations.push(...boundaryDecorations)
                    }

                    return DecorationSet.create(state.doc, allDecorations)
                },

                // Node views
                nodeViews: {
                    [aiChatThreadNodeType]: (node: PMNode, view: EditorView, getPos: () => number | undefined) =>
                        this.createThreadNodeView(node, view, getPos),
                    [aiResponseMessageNodeType]: (node: PMNode, view: EditorView, getPos: () => number | undefined) =>
                        aiResponseMessageNodeView(node, view, getPos),
                }
            }
        })
    }
}

// ========== FACTORY FUNCTION ==========

// Factory function to create the AI Chat Thread plugin
export function createAiChatThreadPlugin(callback: AiChatCallback, placeholderOptions: PlaceholderOptions): Plugin {
    const pluginInstance = new AiChatThreadPluginClass(callback, placeholderOptions)
    return pluginInstance.create()
}
