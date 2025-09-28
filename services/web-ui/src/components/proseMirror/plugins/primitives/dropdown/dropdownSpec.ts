// @ts-nocheck

export const dropdownNodeType = 'dropdown'

export const dropdownNodeSpec = {
    group: 'block',
    content: 'inline*',
    draggable: false,
    isolating: true,
    attrs: {
        id: { default: null },
        selectedValue: { default: {} },
        // IMPORTANT: Explicitly define the shape of objects in the array
        // so that ProseMirror doesn't strip out the extra attributes.
        // Objects in dropdownOptions should include: title, icon, color, provider, model, etc.
        dropdownOptions: {
            default: [],
            // Add a dummy `toDOM` and `parseDOM` for the attribute to signal to PM
            // that it should be treated as complex. This is a bit of a hack, but it
            // helps ensure our custom properties are preserved.
            toDOM: (value) => JSON.stringify(value),
            parseDOM: (value) => JSON.parse(value),
        },
        theme: { default: 'dark' },
        renderPosition: { default: 'bottom' },
        buttonIcon: { default: '' }
    },
    parseDOM: [
        {
            tag: 'div.dropdown-menu-tag-pill-wrapper',
            getAttrs: (dom) => {
                const options = dom.getAttribute('data-options')
                return {
                    id: dom.getAttribute('data-id'),
                    selectedValue: JSON.parse(dom.getAttribute('data-selected-value') || '{}'),
                    dropdownOptions: options ? JSON.parse(options) : [],
                    theme: dom.getAttribute('data-theme') || 'dark',
                    renderPosition: dom.getAttribute('data-render-position') || 'bottom',
                }
            }
        }
    ],
    toDOM: (node) => [
        'div',
        {
            class: `dropdown-menu-tag-pill-wrapper theme-${node.attrs.theme}`,
            'data-id': node.attrs.id,
            'data-selected-value': JSON.stringify(node.attrs.selectedValue),
            'data-options': JSON.stringify(node.attrs.dropdownOptions),
            'data-theme': node.attrs.theme,
            'data-render-position': node.attrs.renderPosition,
        },
        0
    ]
}
