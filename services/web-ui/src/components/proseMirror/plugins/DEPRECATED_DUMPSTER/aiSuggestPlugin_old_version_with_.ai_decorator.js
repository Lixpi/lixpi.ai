'use strict'

import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"

export const key = new PluginKey('aiSuggestPlugin')

class AiSuggest {
    constructor(view) {
        // this.view = view
        this.punctuation = ['.', '?', '!', '…', '.']
        console.log('AiSuggest constructor')
    }

    init = (view) => {
        this.view = view;
    }

    triggerSuggestion(currentChar, lastChar) {
        console.log('triggerSuggestion:', currentChar, lastChar)
        const { state, dispatch } = this.view
        const { $from } = state.selection
        const prevCharIsNotInPunctuation = this.punctuation.filter(punctuationChar => lastChar.includes(punctuationChar)).length === 0


        if (this.punctuation.includes(currentChar) && prevCharIsNotInPunctuation) {
            console.log('dispatching suggest add')
            dispatch(state.tr.setMeta(key, { add: $from.pos, key: 'suggest' }))
        } else {
            console.log('dispatching suggest remove')
            dispatch(state.tr.setMeta(key, { remove: true, key: 'suggest' }))
        }
    }

    handlePrevChar(prevChar) {
        const { state, dispatch } = this.view
        const { $from } = state.selection

        if (this.punctuation.includes(prevChar)) {
            dispatch(state.tr.setMeta(key, {remove: true, key: 'suggest'}))
            dispatch(state.tr.setMeta(key, { add: $from.pos, key: 'suggesHighlighted', color: '#56967c', text: 'i' }))    
            dispatch(state.tr.setMeta(key, { triggerAiSuggestionHighlighter: {from: $from.pos - 1, to: $from.pos + 1}, key: 'suggesHighlighted' }))
        }
    }

    handleCurrentChar(prevChar, currentChar) {
        const { state, dispatch } = this.view
        const { $from } = state.selection

        if (currentChar === 'i' && prevChar === 'a') {
            dispatch(state.tr.setMeta(key, { remove: true, key: 'suggesHighlighted' }))
            dispatch(state.tr.setMeta(key, { remove: true, class: 'ai-suggest-highlighted' }))
            this.handleAiSequence();
        }
    }

    handleAiSequence(forceTrigger = false) {
        const { state, dispatch } = this.view
        const { $from } = state.selection

        const lastTwoChars = this.view.state.doc.textBetween($from.pos - 3, $from.pos)

        if (this.punctuation.map(p => `${p}ai`).includes(lastTwoChars) || forceTrigger) {
            const charOffset = forceTrigger ? 1 : 2
            const from = $from.pos - charOffset
            const to = $from.pos
            let tr = state.tr

            tr.delete(from, to)
            tr.setMeta('use:aiChat', { pos: from })
            tr.setMeta(key, { pendingAiChatTransaction: false })

            dispatch(tr)
        }
    }
}

class AiSuggestDecorations {
    createWidgetDecoration(action) {
        let widget = document.createElement('span')
        widget.className = 'ai-suggest-decorator'
        widget.textContent = action.text || 'ai'
        widget.style.color = action.color || '#c6c6c6'
        return Decoration.widget(action.add, widget, {key: action.key})
    }

    createInlineDecoration(action) {
        return Decoration.inline(action.triggerAiSuggestionHighlighter.from, action.triggerAiSuggestionHighlighter.to, {class: "ai-suggest-highlighted"})
    }

    addDecoration(pluginState, tr, action) {
        let deco
        if (action.add) {
            deco = this.createWidgetDecoration(action)
        } else if (action.triggerAiSuggestionHighlighter) {
            deco = this.createInlineDecoration(action)
        }
        console.log('addDecoration: no deco', {deco, action, pluginState, tr})

        if (deco) {
            return pluginState.decorations.add(tr.doc, [deco])
        }

        console.log('addDecoration:', pluginState.decorations)
        return pluginState.decorations
    }

    removeDecoration(pluginState, action) {
        if (action.remove) {
            return pluginState.decorations.remove(pluginState.decorations.find(null, null, spec => spec.key === action.key || spec.class === action.class))
        }
        return pluginState.decorations
    }

    mapDecorations(pluginState, tr) {
        return pluginState.decorations.map(tr.mapping, tr.doc)
    }

    applyDecorations(pluginState, tr, action) {
        let decorations
        if (action && action.add || action && action.triggerAiSuggestionHighlighter) {
            decorations = this.addDecoration(pluginState, tr, action)
        } else if (action && action.remove) {
            decorations = this.removeDecoration(pluginState, action)
        } else {
            decorations = this.mapDecorations(pluginState, tr)
        }

        console.log('applyDecorations:', {action, pluginState, tr, decorations})
        return decorations
    }
    
}

export const aiSuggestPlugin = new Plugin({
    key,
    state: {
        init: (_, config) => {
            return { 
                decorations: DecorationSet.empty, 
                aiSuggestInstance: new AiSuggest(),
                aiSuggestDecorationsInstance: new AiSuggestDecorations() 
            }
        },
        apply: (tr, pluginState) => {
            const action = tr.getMeta(key);
            if (tr.getMeta('replace')) { return pluginState; }
            return {
                decorations: pluginState.aiSuggestDecorationsInstance.applyDecorations(pluginState, tr, action), 
                aiSuggestInstance: pluginState.aiSuggestInstance,
                aiSuggestDecorationsInstance: pluginState.aiSuggestDecorationsInstance
            };
        }
    },
    view: (view) => {
        // When the plugin view is created, the editor view is set up.
        const pluginState = key.getState(view.state);
        pluginState.aiSuggestInstance.init(view);
        console.log('view pluginState:', pluginState)
        return {
            update: (view, prevState) => {
                // Perhaps you'll implement some updating logic here
            },
            destroy: () => {
                // Cleanup if needed when the editor view is destroyed
            }
        };
    },
    props: {
        decorations(state) {
            return key.getState(state).decorations
            
        },
        handleDOMEvents: {
            keydown: (view, event) => {
                let pluginState = key.getState(view.state)
                const aiSuggestInstance = pluginState.aiSuggestInstance
                

                if (['Backspace', 'Enter'].includes(event.key)) {
                    const { state, dispatch } = view
                    dispatch(state.tr.setMeta(key, { remove: true, key: 'suggest' }))
                    dispatch(state.tr.setMeta(key, { remove: true, key: 'suggesHighlighted' }))
                    return false
                }

                if (event.key.length > 1) {
                    return false
                }

                const { state } = view
                const { $from } = state.selection
                const currentChar = event.key
                const prevChar = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset)

                aiSuggestInstance.triggerSuggestion(currentChar, prevChar)

                if (currentChar === 'a') {
                    aiSuggestInstance.handlePrevChar(prevChar)
                } else if (currentChar === 'i') {
                    aiSuggestInstance.handleCurrentChar(prevChar, currentChar)
                }

                return false
            }
        },
        handleKeyDown: (view, event) => {
            let pluginState = key.getState(view.state)
            const aiSuggestInstance = pluginState.aiSuggestInstance

            if (event.key === 'Tab') {
                const { state, dispatch } = view
                const decorations = key.getState(state).decorations
                const { $from } = state.selection

                // Check if there's an active 'ai-suggest-decorator' decoration
                const activeDecorator = decorations.find($from.pos, $from.pos, spec => spec.key === 'suggest')
                    
                if (activeDecorator.length) {
                    event.preventDefault()
                    // Type 'a' at the current cursor position
                    dispatch(state.tr.insertText('a', $from.pos, $from.pos))
                    aiSuggestInstance.handlePrevChar('.')
                    // After a 100ms delay, type 'i' and trigger the AI response
                    setTimeout(() => {        
                        aiSuggestInstance.triggerSuggestion('i', 'a')                                  
                        aiSuggestInstance.handleAiSequence(true)
                    }, 100)
                }
            }
    
            return false
        }
    }
})
