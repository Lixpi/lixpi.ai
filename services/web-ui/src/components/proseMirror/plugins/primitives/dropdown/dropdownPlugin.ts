import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { dropdownNodeView } from './dropdownNode.js'

export const dropdownNodeType = 'dropdown'

export const dropdownNodeSpec = {
    group: 'inline',
    inline: true,
    draggable: false,
    attrs: {
        id: { default: null },
        selectedValue: { default: {} },
        dropdownOptions: { default: [] },
        theme: { default: 'light' },
        renderPosition: { default: 'bottom' },
        buttonIcon: { default: null }
    },
    parseDOM: [
        {
            tag: 'span.dropdown-menu-tag-pill-wrapper',
            getAttrs: (dom) => ({
                id: dom.getAttribute('data-id'),
                theme: dom.getAttribute('data-theme') || 'light',
                renderPosition: dom.getAttribute('data-render-position') || 'bottom'
            })
        }
    ],
    toDOM: (node) => [
        'span',
        {
            class: `dropdown-menu-tag-pill-wrapper theme-${node.attrs.theme}`,
            'data-id': node.attrs.id,
            'data-theme': node.attrs.theme,
            'data-render-position': node.attrs.renderPosition
        },
        0
    ]
}

type DropdownPluginState = {
    decorations: DecorationSet
    openDropdownId: string | null
}

class DropdownPlugin {
    private key: PluginKey<DropdownPluginState>

    constructor() {
        this.key = new PluginKey<DropdownPluginState>('dropdown')
    }

    createPlugin(): Plugin<DropdownPluginState> {
        return new Plugin<DropdownPluginState>({
            key: this.key,
            
            state: {
                init: () => ({
                    decorations: DecorationSet.empty,
                    openDropdownId: null
                }),
                
                apply: (tr: Transaction, pluginState: DropdownPluginState) => {
                    let { decorations, openDropdownId } = pluginState

                    // Handle dropdown toggle metadata
                    const toggleDropdown = tr.getMeta('toggleDropdown')
                    if (toggleDropdown) {
                        openDropdownId = openDropdownId === toggleDropdown.id ? null : toggleDropdown.id
                    }

                    // Handle close dropdown metadata  
                    const closeDropdown = tr.getMeta('closeDropdown')
                    if (closeDropdown) {
                        openDropdownId = null
                    }

                    // Create decorations for open state
                    decorations = this.createDecorations(tr.doc, openDropdownId)

                    return {
                        decorations: decorations.map(tr.mapping, tr.doc),
                        openDropdownId
                    }
                }
            },

            props: {
                decorations: (state: EditorState) => {
                    const pluginState = this.key.getState(state)
                    return pluginState?.decorations
                },
                
                nodeViews: {
                    [dropdownNodeType]: dropdownNodeView
                }
            }
        })
    }

    private createDecorations(doc, openDropdownId: string | null): DecorationSet {
        const decorations: Decoration[] = []

        if (openDropdownId) {
            doc.descendants((node, pos) => {
                if (node.type.name === dropdownNodeType && node.attrs.id === openDropdownId) {
                    decorations.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                            class: 'dropdown-open'
                        })
                    )
                }
            })
        }

        return DecorationSet.create(doc, decorations)
    }
}

export function createDropdownPlugin(): Plugin<DropdownPluginState> {
    const plugin = new DropdownPlugin()
    return plugin.createPlugin()
}