export const aiUserInputNodeType = 'aiUserInput'

export const aiUserInputNodeSpec = {
    attrs: {
        id: { default: '' },
        style: { default: '' },
    },
    content: 'block+',
    // content: 'paragraph+',
    group: 'block',
    draggable: false,
    selectable: false,
    parseDOM: [
        {
            tag: 'div',
            getAttrs(dom) {
                return {
                    id: dom.getAttribute('id'),
                    style: dom.getAttribute('style'),
                }
            },
        },
    ],
    toDOM(node) {
        return [
            'div',
            {
                id: node.attrs.id,
                style: node.attrs.style,
                class: 'ai-user-input-wrapper'
            },
            ['div', { class: 'ai-user-input' }, 0],
            ['button', { class: 'stop-button' }, 'Stop'],
            ['button', { class: 'regenerate-button' }, 'Regenerate'],
            ['button', { class: 'close-button' }, 'Close'],
            // add more elements as needed...
        ]
    },
}
