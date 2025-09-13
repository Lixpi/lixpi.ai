'use strict'

import { Plugin, PluginKey } from "prosemirror-state"

export const pluginKey = new PluginKey('activeNodePlugin')

export const activeNodePlugin = new Plugin({
    key: pluginKey,
    state: {
        init: (_, { doc }) => {
            return { nodeType: null, nodeAttrs: {} }
        },
        apply(tr, value, oldState, newState) {
            const { $from } = newState.selection
            const nodeType = $from.parent.type.name
            const nodeAttrs = $from.parent.attrs

            if (value.nodeType !== nodeType || JSON.stringify(value.nodeAttrs) !== JSON.stringify(nodeAttrs)) {
                return { nodeType, nodeAttrs }
            }

            return value
        }
    }
})
