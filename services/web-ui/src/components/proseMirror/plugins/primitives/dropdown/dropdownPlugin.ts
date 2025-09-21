import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { dropdownNodeView } from './dropdownNode.js'

export const dropdownNodeType = 'dropdown'

export const dropdownNodeSpec = {
    group: 'block',
    inline: false,
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
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: apply() called')
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: Current pluginState:', pluginState)
                    let { decorations, openDropdownId } = pluginState

                    // Handle dropdown toggle metadata
                    const toggleDropdown = tr.getMeta('toggleDropdown')
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: toggleDropdown meta:', toggleDropdown)
                    if (toggleDropdown) {
                        const newOpenId = openDropdownId === toggleDropdown.id ? null : toggleDropdown.id
                        console.log('🔧 DROPDOWN PLUGIN DEBUG: Toggling dropdown', {
                            currentOpenId: openDropdownId,
                            toggleId: toggleDropdown.id,
                            newOpenId: newOpenId
                        })
                        openDropdownId = newOpenId
                    }

                    // Handle close dropdown metadata  
                    const closeDropdown = tr.getMeta('closeDropdown')
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: closeDropdown meta:', closeDropdown)
                    if (closeDropdown) {
                        console.log('🔧 DROPDOWN PLUGIN DEBUG: Closing dropdown, was:', openDropdownId)
                        openDropdownId = null
                    }

                    // Create decorations for open state
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: Creating decorations for openDropdownId:', openDropdownId)
                    decorations = this.createDecorations(tr.doc, openDropdownId)
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: Created decorations:', decorations)

                    const newState = {
                        decorations: decorations.map(tr.mapping, tr.doc),
                        openDropdownId
                    }
                    console.log('🔧 DROPDOWN PLUGIN DEBUG: Returning new state:', newState)
                    return newState
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
        console.log('🎨 DROPDOWN PLUGIN DEBUG: createDecorations called with openDropdownId:', openDropdownId)
        const decorations: Decoration[] = []

        if (openDropdownId) {
            console.log('🎨 DROPDOWN PLUGIN DEBUG: Looking for dropdown nodes with id:', openDropdownId)
            doc.descendants((node, pos) => {
                console.log('🎨 DROPDOWN PLUGIN DEBUG: Checking node:', {
                    nodeType: node.type.name,
                    nodeId: node.attrs?.id,
                    position: pos,
                    targetId: openDropdownId
                })
                if (node.type.name === dropdownNodeType && node.attrs.id === openDropdownId) {
                    console.log('🎨 DROPDOWN PLUGIN DEBUG: Found matching dropdown node! Creating decoration')
                    decorations.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                            class: 'dropdown-open'
                        })
                    )
                }
            })
        } else {
            console.log('🎨 DROPDOWN PLUGIN DEBUG: No openDropdownId, no decorations to create')
        }

        console.log('🎨 DROPDOWN PLUGIN DEBUG: Final decorations array length:', decorations.length)
        return DecorationSet.create(doc, decorations)
    }
}

export function createDropdownPlugin(): Plugin<DropdownPluginState> {
    const plugin = new DropdownPlugin()
    return plugin.createPlugin()
}