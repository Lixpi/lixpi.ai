'use strict'

import { EditorState, Plugin, PluginKey } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"
import customNodes from '../customNodes'
import { schema } from "prosemirror-schema-basic"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

// Plugins
import { statePlugin } from '../plugins/statePlugin.js'
import focusPlugin from '../plugins/focusPlugin.js'
import { createAiUserInputPlugin } from '../plugins/aiUserInputPlugin.js' //TODO: deprecated, remove
import { createAiUserMessagePlugin } from '../plugins/aiUserMessagePlugin.js'
import lockCursorPositionPlugin from '../plugins/lockCursorPositionPlugin.js'
import { createAiChatPlugin } from '../plugins/aiChatPlugin.js'
import { aiTriggerPlugin } from '../plugins/aiTriggerPlugin.js'
import { 
    codeMirrorPlugin, 
    // codeMirrorInputRulePlugin ,
    tripleBacktickInputRule,
    exitCodeBlockKeyMap,
} from '../plugins/codeMirrorPlugin.js'
import { editorPlaceholderPlugin } from '../plugins/editorPlaceholderPlugin.js'
import createCodeBlockPlugin from '../plugins/codeBlockPlugin.js'

// Node types
import { documentTitleNodeType } from "../customNodes/documentTitleNode.js"

import { menuPlugin } from "./menu.js"

import {buildKeymap} from "./keyMap.js"
import {buildInputRules} from "./inputRules.js"
import { createSvelteComponentRendererPlugin } from '../plugins/svelteComponentRenderer/svelteComponentRendererPlugin.js'
import TaskRow from './../../rows/TaskRow.svelte'

import { defaultAttrs as defautSubtaskAttrs } from '../customNodes/taskRowNode.js'

let editorView

// `nodesBuilder` extends the base ProseMirror `schema` with custom node types defined in `supportedNodes`.
// `schema`: Base ProseMirror schema to be extended.
// `supportedNodes`: Object with custom node types. Each key is a node type name, value is its spec.
// The function updates the 'doc' node type to allow custom nodes at the document level. 
// Then, it iterates over `supportedNodes` and adds each custom node type to the schema before the 'paragraph' node type.
// Returns the extended schema.
const nodesBuilder = (schema, supportedNodes) => {
    const nodesKeys = Object.keys(supportedNodes)
    let extendedSchema = schema.spec.nodes
    .update('doc', {
        // content: `documentTitle block* | ${nodesKeys.join(' | ')}`, // TODO this was used before for adding support for custom nodes, but it seems to be redundant
        content: `${documentTitleNodeType} (paragraph | block)+`,
        marks: "_",
    })
    nodesKeys.forEach((nodeKey) => {
        extendedSchema = extendedSchema.addBefore("paragraph", nodeKey, supportedNodes[nodeKey])
    })
    return extendedSchema
}
    
export class ProseMirrorEditor {
    constructor(editorMountElement, content, initialVal, isDisabled, onEditorChange, onProjectTitleChange, onAiChatSubmit) {
        this.onEditorChange = onEditorChange
        this.onProjectTitleChange = onProjectTitleChange
        this.onAiChatSubmit = onAiChatSubmit
        this.isDisabled = isDisabled
        this.editorSchema = this.createSchema()
        this.editorView = new EditorView(editorMountElement, {
            state: EditorState.create({
                doc: DOMParser.fromSchema(this.editorSchema).parse(content),
                plugins: this.createPlugins(initialVal, isDisabled)
            }),
            editable: () => !isDisabled
        })

        // console.log('EditorView plugins:', this.editorView.state.plugins);
    }
    
    createSchema() {
        // const allNodes = this.mergeSchemas([customNodes]); // titlePlugin.nodes would be merged first
        return new Schema({
            
            nodes: nodesBuilder(schema, customNodes),
            marks: schema.spec.marks
        })
    }

    createPlugins(initialValue, isDisabled) {
        return [
            statePlugin(initialValue, this.dispatchStateChange.bind(this), this.onProjectTitleChange.bind(this)),
            focusPlugin(this.updateEditorFocusState.bind(this)), // Allows to enable editor if it was disabled and user clicks on the editor area
            menuPlugin(this.editorSchema),
            buildInputRules(this.editorSchema),
            keymap(buildKeymap(this.editorSchema)),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            history(),
            createSvelteComponentRendererPlugin(TaskRow, 'taskRow', defautSubtaskAttrs),
            createAiChatPlugin(val => this.onAiChatSubmit(val)),
            // createAiUserMessagePlugin({}, val => {}),
            createAiUserInputPlugin(val => {}),
            // lockCursorPositionPlugin()
            aiTriggerPlugin,
            editorPlaceholderPlugin({titlePlaceholder: 'New project', paragraphPlaceholder: 'Type something and hit Cmd+Enter on Mac and Ctrl+Enter on PC to trigger AI.\n'}),
            // codeMirrorPlugin(this.editorSchema), 
            // tripleBacktickInputRule(this.editorSchema),
            createCodeBlockPlugin(this.editorSchema),
            // exitCodeBlockKeyMap(this.editorSchema),
            // codeMirrorInputRulePlugin(this.editorSchema),
        ]
    }
    
    updateEditorFocusState(focusedState) {
        if (!this.editorView) { return }
        this.editorView.setProps({ editable: () => !this.isDisabled })
    }
    
    dispatchStateChange(json) {
        this.onEditorChange(json) //TODO START HERE
    }

    // TODO ask on how to better do it the marjan himself
    swapContent(newContent) {
        // console.log('swapContent', newContent)
        const tr = this.editorView.state.tr;
        const isEmpty = Object.keys(newContent).length === 0;
        // Create an empty document or parse the new content
        const newDoc = isEmpty ? this.editorSchema.topNodeType.createAndFill() : this.editorSchema.nodeFromJSON(newContent);
        
        // Get Decorations from the current doc before it gets swapped out
        // const oldDecorations = this.editorView.state.selection.$from.marks(); // Note the adjustment here
        
        // Replace the entire document
        tr.replaceWith(0, this.editorView.state.doc.content.size, newDoc);
        
        // indication that this transaction includes only replace, hence not skipping `aiSuggestPlugin.js`
        tr.setMeta('replace', true);
        // tr.setMeta('addToHistory', false)
        tr.setMeta('skipDispatch', true)
        
        // Reintroduce the Decorations to the new doc
        this.editorView.state.selection.$from.marks().forEach(mark => tr.addMark(0, tr.doc.content.size, mark));
        
        // Apply the transaction
        this.editorView.dispatch(tr);
    }
    
    destroy() {
        if (this.editorView) {
            this.editorView.destroy()
            this.editorView = null
        }
    }
}

export default ProseMirrorEditor
