export const codeBlockNodeType = 'code_block'

export const codeBlockNodeSpec = {
    attrs: {
        theme: { default: 'gruvboxDark' },
    },
    content: 'text*',
    marks: '',
    group: 'block',
    code: true,
    defining: true,
    draggable: false,
    selectable: true,
    parseDOM: [
        {
            tag: 'pre',
            preserveWhitespace: 'full',
            getAttrs(dom) {
                return {
                    theme: dom.getAttribute('data-theme') || 'gruvboxDark',
                }
            },
        },
    ],
    toDOM(node) {
        return ['pre', {'data-theme': node.attrs.theme}, ['code', 0]]
    },
}
