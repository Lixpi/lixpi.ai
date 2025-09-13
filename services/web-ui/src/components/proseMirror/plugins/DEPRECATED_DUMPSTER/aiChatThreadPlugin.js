// @ts-nocheck
import { Plugin, PluginKey } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { nodeTypes } from '../customNodes'

const key = new PluginKey('aiChatThreadPlugin')
const transactionName = `insert:${nodeTypes.aiChatThreadNodeType}`

const initPluginState = () => ({ attrs: 'defaultAttrs' })

const applyPluginState = (tr, prev) => {
	const newState = tr.getMeta(key);
	return newState ? { ...prev, ...newState } : prev;
}

function createNodeViews(nodeTypes) {
    return {
        [nodeTypes.aiChatThreadNodeType](node, view, getPos, decorations) {
            // Create DOM structure for the thread
            const dom = document.createElement('div');
            dom.className = 'ai-chat-thread-wrapper';
            dom.setAttribute('data-thread-id', node.attrs.threadId);
            dom.setAttribute('data-status', node.attrs.status);

            // Create header with thread controls
            const headerDOM = document.createElement('div');
            headerDOM.className = 'ai-user-input-control-buttons'; // Reuse existing styling

            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'thread-status';
            statusIndicator.textContent = `Thread ${node.attrs.status}`;

            const pauseButton = document.createElement('button');
            pauseButton.className = 'stop-button'; // Reuse existing styling
            pauseButton.textContent = node.attrs.status === 'active' ? 'Pause' : 'Resume';

            const closeButton = document.createElement('button');
            closeButton.className = 'close-button'; // Reuse existing styling
            closeButton.textContent = 'Close Thread';

            headerDOM.appendChild(statusIndicator);
            headerDOM.appendChild(pauseButton);
            headerDOM.appendChild(closeButton);

            // Create content area where AI conversation will live
            const contentDOM = document.createElement('div');
            contentDOM.className = 'ai-chat-thread-content';

            // Append header and content to main wrapper
            dom.appendChild(headerDOM);
            dom.appendChild(contentDOM);

            // Make sure clicks in the content area focus the editor and put the caret inside the thread
            contentDOM.addEventListener('mousedown', () => {
                view.focus()
                const pos = getPos()
                if (pos !== undefined) {
                    const $pos = view.state.doc.resolve(pos + 1)
                    // If first child is an empty paragraph, set selection there
                    const selection = TextSelection.create(view.state.doc, $pos.pos)
                    const tr = view.state.tr.setSelection(selection)
                    view.dispatch(tr)
                }
            })

            // Handle pause/resume button (don’t steal editor focus)
            pauseButton.addEventListener('mousedown', e => e.preventDefault())
            pauseButton.addEventListener('click', (event) => {
                event.preventDefault();
                const pos = getPos();
                if (pos !== undefined) {
                    const newStatus = node.attrs.status === 'active' ? 'paused' : 'active';
                    const tr = view.state.tr.setNodeMarkup(pos, null, {
                        ...node.attrs,
                        status: newStatus
                    });
                    view.dispatch(tr);
                }
            });

            // Handle close thread button (don’t steal editor focus)
            closeButton.addEventListener('mousedown', e => e.preventDefault())
            closeButton.addEventListener('click', (event) => {
                event.preventDefault();
                const pos = getPos();
                if (pos !== undefined) {
                    const tr = view.state.tr.delete(pos, pos + node.nodeSize);
                    view.dispatch(tr);
                }
            });

            return {
                dom,
                contentDOM,
                update(updatedNode) {
                    // Update the UI when node attributes change
                    if (updatedNode.attrs.status !== node.attrs.status) {
                        statusIndicator.textContent = `Thread ${updatedNode.attrs.status}`;
                        pauseButton.textContent = updatedNode.attrs.status === 'active' ? 'Pause' : 'Resume';
                        dom.setAttribute('data-status', updatedNode.attrs.status);
                    }
                    return true;
                },
                destroy() {
                    // Cleanup when node is destroyed
                },
            };
        },
    }
}

export const createAiChatThreadPlugin = (callback) => {
	const state = {
		init: initPluginState,
		apply: (tr, prev) => applyPluginState(tr, prev)
	}

	const appendTransaction = (transactions, oldState, newState) => {
		let tr = null;

		const transaction = transactions.find(tr => tr.getMeta(transactionName));
        if (transaction) {
			const attrs = transaction.getMeta(transactionName);
			const nodeType = newState.schema.nodes[nodeTypes.aiChatThreadNodeType];

			// Create initial content for the thread - an empty paragraph
            const paragraph = newState.schema.nodes.paragraph.create();

			const threadNode = nodeType.create(attrs, paragraph);
			const { $from, $to } = newState.selection;

			tr = newState.tr.replaceWith($from.pos, $to.pos, threadNode);

			// Set selection inside the thread
			const pos = $from.pos + 1;
			const selection = TextSelection.create(tr.doc, pos);
			tr = tr.setSelection(selection);

            // Insert a new paragraph after the thread if the doc requires it
            const afterThreadPos = tr.selection.$from.after();
            const next = tr.doc.nodeAt(afterThreadPos);
            if (!next) {
                const newParagraph = newState.schema.nodes.paragraph.create();
                tr = tr.insert(afterThreadPos, newParagraph);
            }
		}

		if (tr) {
			return tr;
		}
	}

    return new Plugin({
		key,
		state,
        props: {
            nodeViews: createNodeViews(nodeTypes)
        },
		appendTransaction
	})
}
