import { nodeTypes } from "../customNodes"

export const useAiInput = (state, dispatch) => {
    const attrs = {}
    const tr = state.tr.setMeta(`insert:${nodeTypes.aiUserInputNodeType}`, attrs)

    if (dispatch) {
        dispatch(tr)
        return true
    }

    return false
}

export const useAiChatThread = (state, dispatch) => {
    const attrs = {
        threadId: `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'active'
    }
    const tr = state.tr.setMeta(`insert:${nodeTypes.aiChatThreadNodeType}`, attrs)

    if (dispatch) {
        dispatch(tr)
        return true
    }

    return false
}
