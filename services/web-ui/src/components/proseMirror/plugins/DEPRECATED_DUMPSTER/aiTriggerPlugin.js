'use strict'

import { Plugin, PluginKey } from "prosemirror-state"

export const key = new PluginKey('aiTriggerPlugin')

class AiTrigger {
    constructor() {
        // console.log('AiTrigger constructor')
    }

    init = (view) => {
        this.view = view;
    }
    
    handleModEnter(event) {
        let isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        let modKeyPressed = isMac ? event.metaKey : event.ctrlKey;
        if(event.key === 'Enter' && modKeyPressed) {
            event.preventDefault();
            const { state, dispatch } = this.view
            const { $from } = state.selection
            let tr = state.tr
            tr.setMeta('use:aiChat', { pos: $from.pos })
            dispatch(tr)
            // console.log('Mod+Enter pressed: transaction dispatched')
        }
    }

}

export const aiTriggerPlugin = new Plugin({
    key,
    state: {
        init: (_, config) => {
            return { 
                aiTriggerInstance: new AiTrigger(),
            }
        },
        apply: (tr, pluginState) => {
            if (tr.getMeta('replace')) { return pluginState; }
            return {
                aiTriggerInstance: pluginState.aiTriggerInstance,
            };
        }
    },
    view: (view) => {
        const pluginState = key.getState(view.state);
        pluginState.aiTriggerInstance.init(view);
        // console.log('view pluginState:', pluginState)
        return {
            update: (view, prevState) => {},
            destroy: () => {}
        };
    },
    props: {
        handleDOMEvents: {
            keydown: (view, event) => {
                let pluginState = key.getState(view.state)
                const aiTriggerInstance = pluginState.aiTriggerInstance

                aiTriggerInstance.handleModEnter(event)

                return false
            }
        }
    }
})
