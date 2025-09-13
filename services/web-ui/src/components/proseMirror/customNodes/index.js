import { taskRowNodeType, taskRowNodeSpec } from './taskRowNode.js'
import { aiUserMessageNodeType, aiUserMessageNodeSpec, aiUserMessageNodeView } from './aiUserMessageNode.js'
import { aiUserInputNodeType, aiUserInputNodeSpec } from './aiUserInputNode.js'
import { documentTitleNodeType, documentTitleNodeSpec } from './documentTitleNode.js'
import { codeBlockNodeType, codeBlockNodeSpec } from './codeBlockNode.js'

export const nodeTypes = {
    documentTitleNodeType,
    taskRowNodeType,
    aiUserMessageNodeType,
    aiUserInputNodeType,
    codeBlockNodeType
}

export const nodeViews = {
    aiUserMessageNodeView,
}

// Exporting all nodes. ORDER MATTERS!
export default {
    [nodeTypes.documentTitleNodeType]: documentTitleNodeSpec,
    [nodeTypes.taskRowNodeType]: taskRowNodeSpec,
    [nodeTypes.aiUserMessageNodeType]: aiUserMessageNodeSpec,
    [nodeTypes.aiUserInputNodeType]: aiUserInputNodeSpec,
    [nodeTypes.codeBlockNodeType]: codeBlockNodeSpec
}
