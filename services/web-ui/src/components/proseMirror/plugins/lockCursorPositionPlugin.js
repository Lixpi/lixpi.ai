import { Plugin, PluginKey } from 'prosemirror-state'

const key = new PluginKey('lockCursorPosition')

const handleDOMEvents = {
    mousedown: (view, event) => {
        // preventDefault to stop the cursor from moving
        event.preventDefault();
        // returning true tells ProseMirror that we've handled the event
        return true;
    },
}

const applyPluginState = (transaction, prev) => {
    return prev; // we're not changing any state here, so just return the previous state
}

const createPlugin = () => {
    return new Plugin({
        key,
        state: {
            init: () => false, // we're not initializing any state here
            apply: applyPluginState,
        },
        props: {
            handleDOMEvents,
        },
    })
}

export default createPlugin