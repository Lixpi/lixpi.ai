// @ts-nocheck
'use strict'

import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"

import { documentTitleNodeType } from "../customNodes/documentTitleNode.js"
import { aiChatThreadNodeType } from "../aiChatThreadPlugin/aiChatThreadNode.ts"

export const key = new PluginKey('aiSuggestPlugin')

export const editorPlaceholderPlugin = (options) => new Plugin({
    key: new PluginKey('editorPlaceholderPlugin'),
    props: {
        decorations(state) {
            const doc = state.doc
            const decorations = []

            // Title placeholder
            doc.descendants((node, pos) => {
                if (node.type.name === documentTitleNodeType && node.content.size === 0) {
                    decorations.push(
                        Decoration.node(
                            pos,
                            pos + node.nodeSize,
                            { class: 'empty-node-placeholder', 'data-placeholder': options.titlePlaceholder }
                        )
                    )
                }
            })

            // Thread paragraph placeholder: only when the single thread has exactly one empty paragraph
            doc.descendants((node, pos) => {
                if (node.type.name === aiChatThreadNodeType && node.childCount === 1) {
                    const firstChild = node.firstChild
                    if (firstChild && firstChild.type.name === 'paragraph' && firstChild.content.size === 0) {
                        const paragraphPos = pos + 1 // first child starts right after the opening tag
                        decorations.push(
                            Decoration.node(
                                paragraphPos,
                                paragraphPos + firstChild.nodeSize,
                                { class: 'empty-node-placeholder', 'data-placeholder': options.paragraphPlaceholder }
                            )
                        )
                    }
                }
            })

            return DecorationSet.create(doc, decorations)
        }
    }
})
