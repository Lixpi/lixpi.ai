import { Plugin, PluginKey } from 'prosemirror-state'

const key = new PluginKey('focus')

const setFocus = (view, isFocused, callback) => {
    view.dispatch(view.state.tr.setMeta(key, isFocused))
    callback(isFocused)
    return false
}

const createPlugin = (callback) => {
    const handleDOMEvents = {
        blur: (view) => setFocus(view, false, callback),
        focus: (view) => setFocus(view, true, callback),
    }

    const applyPluginState = (transaction, prevFocused) => {
        const focused = transaction.getMeta(key)
        return typeof focused === 'boolean' ? focused : prevFocused
    }

    return new Plugin({
        key,
        state: {
            init: () => false,
            apply: applyPluginState,
        },
        props: {
            handleDOMEvents,
        },
    })
}

export default createPlugin
