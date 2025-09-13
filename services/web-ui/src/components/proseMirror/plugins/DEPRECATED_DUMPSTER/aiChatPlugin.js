// @ts-nocheck
'use strict'

import { Plugin, PluginKey } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { nodeTypes, nodeViews } from '../customNodes'
import { documentTitleNodeType } from '../customNodes/documentTitleNode'
import { aiChatThreadNodeType } from '../customNodes/aiChatThreadNode'
import SegmentsReceiver from '../../../services/segmentsReceiver-service.js'

export const aiChatPluginKey = new PluginKey('aiChat')
// const transactionName = `insert:${nodeTypes.aiUserMessageNodeType}`
const transactionName = 'use:aiChat'
let insertPosition = null

const getNodeContent = (node) => {
	let textContent = ''
	node.forEach(childNode => {
		if (childNode.type.name === 'text') {
			textContent += childNode.text
		} else if (childNode.type.name === 'hard_break') {
			textContent += '\n'
		} else {
			textContent += getNodeContent(childNode)
		}
	})
	return textContent
}

// Get content from the aiChatThread node where the cursor is located
const getThreadContent = (state) => {
	const { selection } = state
	const { $from } = selection
	const threadContent = []

	// Find the aiChatThread node containing the cursor
	let threadNode = null
	let threadPos = null

	for (let depth = $from.depth; depth > 0; depth--) {
		const node = $from.node(depth)
		if (node.type.name === aiChatThreadNodeType) {
			threadNode = node
			threadPos = $from.before(depth)
			break
		}
	}

	if (!threadNode) {
		return threadContent
	}

	// If we found a thread, extract its content
	if (threadNode) {
		threadNode.forEach((block, index) => {
			if (block.textContent) {
				const blockNodeContent = {
					nodeType: block.type.name,
					textContent: getNodeContent(block),
				}
				threadContent.push(blockNodeContent)
			}
		})
	}

	return threadContent
}

// TODO use like this:
// const docContent = getDocContent(state.doc)
const getDocContent = (doc) => {
	const docContent = []
	doc.forEach(block => {
		if (block.textContent) {
			const blockNodeContent = {
				nodeType: block.type.name,
				textContent: getNodeContent(block),
			}
			docContent.push(blockNodeContent)
		}
	})
	return docContent
}


const initPluginState = () => ({ attrs: 'defaultAttrs' })

const applyPluginState = (tr, prev) => {
	const attrs = tr.getMeta('aiChat')
	return attrs ? { attrs } : prev
}

const handleTransaction = (transactions, oldState, newState, callback) => {
    const transaction = transactions.find(tr => tr.getMeta(transactionName));

    if (transaction) {
        const attrs = transaction.getMeta(transactionName);

        // Use the new thread content extraction instead of full document
        const threadContent = getThreadContent(newState);

        // Optimized transformation of thread content
        const transformedContent = threadContent.reduce((acc, curr) => {
            const role = curr.nodeType === nodeTypes.aiResponseMessageNodeType ? 'assistant' : 'user';
            const lastElement = acc.length > 0 ? acc[acc.length - 1] : null;

            if (lastElement && lastElement.role === role) {
                lastElement.content += '\n' + curr.textContent;
            } else {
                acc.push({
                    role: role,
                    content: curr.textContent,
                    nodeType: curr.nodeType
                });
            }

            return acc;
        }, []).map(({role, content}) => ({role, content}));

        if (attrs) {
            callback(transformedContent);
        }
    }
};

const ensureEmptyLineAfterNode = (editorView, nodeType, insertPosition) => {
	const { state, dispatch } = editorView
	const { tr } = state

	// Find the position of the node
	let pos
	state.doc.descendants((node, position) => {
		if (node.type.name === nodeType) {
			pos = position
		}
	})

	if (pos !== undefined) {
		const nodeSize = state.doc.nodeAt(pos).nodeSize
		const endPos = pos + nodeSize
		const nextNode = state.doc.nodeAt(endPos)

		// If the next node is not a paragraph or it's not empty, insert an empty paragraph
		if (!nextNode || (nextNode.type.name !== 'paragraph' || nextNode.textContent !== '')) {
			const emptyParagraph = state.schema.nodes.paragraph.createAndFill()
			dispatch(tr.insert(endPos, emptyParagraph))
		}
	}
}

const moveCursorToPosition = (editorView, position) => {
	const { state, dispatch } = editorView
	const tr = state.tr
	const textSelection = TextSelection.create(tr.doc, position)
	dispatch(tr.setSelection(textSelection))
}

let unsubscribeSegments // Hold the unsubscribe function

export const createAiChatPlugin = (callback) => {
	return new Plugin({
		key: aiChatPluginKey,
		state: {
			init: initPluginState,
			apply: (tr, prev) => applyPluginState(tr, prev)
		},
		appendTransaction: (transactions, oldState, newState) => handleTransaction(transactions, oldState, newState, callback),
		view(editorView) {
			let prevState = null // Hold reference to previous state

			let isReceiving = false
			// State whether we are inside backticks
			// Buffer to hold the content inside the backticks
			let insideBackticks = false
			let backtickBuffer = ''
			let insideCodeBlock = false
			let insideHeader = false
			let codeBuffer = ''

			let isBoldText = false

			const unsubscribeFromSegmentsReceiver = SegmentsReceiver.subscribeToeceiveSegment((event) => {
				const status = event.status
				const aiProvider = event.aiProvider

				const segment = event.segment
				const { state, dispatch } = editorView

				if (status === 'START_STREAM') {
					let tr = state.tr

					// Find the aiChatThread where we need to insert the aiResponseMessage
					let aiChatThreadPos = null;
					let insertPos = null;
					let trailingEmptyParagraphPos = null;

					state.doc.descendants((node, pos) => {
						if (node.type.name === nodeTypes.aiChatThreadNodeType) {
							console.log('🔥 Found aiChatThread at pos:', pos, 'nodeSize:', node.nodeSize);
							aiChatThreadPos = pos;
							// Determine if the last child is an empty paragraph; if so, insert before it
							let lastParaAbsPos = null;
							let lastParaNode = null;
							node.descendants((child, relPos) => {
								if (child.type.name === 'paragraph') {
									lastParaAbsPos = pos + relPos + 1; // child position in doc
									lastParaNode = child;
								}
							});
							if (lastParaNode && lastParaNode.textContent === '') {
								trailingEmptyParagraphPos = lastParaAbsPos;
								insertPos = lastParaAbsPos; // insert before trailing empty paragraph
							} else {
								// Insert at the end of the aiChatThread content (before closing tag)
								insertPos = pos + node.nodeSize - 1;
							}
						}
					});

					if (insertPos === null) {
						console.error('ERROR: Could not find aiChatThread to insert aiResponseMessage');
						return;
					}

					// Create aiResponseMessage node to be inserted INSIDE the aiChatThread
					// Do NOT provide an initial empty paragraph (schema now allows empty content)
					const aiResponseNode = state.schema.nodes[nodeTypes.aiResponseMessageNodeType].create(
						{
							isInitialRenderAnimation: true,
							isReceivingAnimation: true,
							aiProvider,
						}
					);

					// Insert the aiResponseMessage INSIDE the aiChatThread and ensure an empty paragraph after
					try {
						tr.insert(insertPos, aiResponseNode);
						const afterResponsePos = insertPos + aiResponseNode.nodeSize;
						// If there isn't already a trailing empty paragraph at this position, add one
						let targetCursorPos = afterResponsePos;
						if (trailingEmptyParagraphPos === null || trailingEmptyParagraphPos !== afterResponsePos) {
							const ensureEmptyPara = state.schema.nodes.paragraph.createAndFill();
							tr.insert(afterResponsePos, ensureEmptyPara);
							// Cursor should go into the newly created paragraph
							targetCursorPos = afterResponsePos + ensureEmptyPara.nodeSize - 1;
						} else {
							// Move cursor into existing trailing empty paragraph
							targetCursorPos = afterResponsePos - 1;
						}
						// Move the cursor to the empty paragraph after the aiResponseMessage
						tr.setSelection(TextSelection.create(tr.doc, targetCursorPos));

						dispatch(tr);
					} catch (error) {
						console.error('ERROR inserting aiResponseMessage:', error);
					}

					isReceiving = true;
				}

				if (status === 'STREAMING') {
					const detailChar = segment.segment

					let tr = state.tr

					let endOfNodePos = null
					let aiResponseNodeChildCount = 0

					// Find the aiResponseMessage node (not aiChatThread) to insert streaming content
					// But first check if we need to create it
					let foundAiResponse = false;
					state.doc.descendants((node, pos) => {
						if (node.type.name === nodeTypes.aiResponseMessageNodeType) {
							endOfNodePos = pos + node.nodeSize;
							aiResponseNodeChildCount = node.childCount;
							foundAiResponse = true;
							return false; // Stop searching, we found it
						}
					});

					// If we can't find aiResponseMessage, create it now
					if (!foundAiResponse) {
						// Find the aiChatThread to insert into
						let aiChatThreadPos = null;
						let insertPos = null;
						let trailingEmptyParagraphPos = null;

						state.doc.descendants((node, pos) => {
							if (node.type.name === nodeTypes.aiChatThreadNodeType) {
								aiChatThreadPos = pos;
								// Determine if the last child is an empty paragraph
								let lastParaAbsPos = null;
								let lastParaNode = null;
								node.descendants((child, relPos) => {
									if (child.type.name === 'paragraph') {
										lastParaAbsPos = pos + relPos + 1;
										lastParaNode = child;
									}
								});
								if (lastParaNode && lastParaNode.textContent === '') {
									trailingEmptyParagraphPos = lastParaAbsPos;
									insertPos = lastParaAbsPos; // insert before trailing empty paragraph
								} else {
									insertPos = pos + node.nodeSize - 1;
								}
								return false;
							}
						});

						if (insertPos !== null) {
							// Create and insert aiResponseMessage node WITHOUT an inner empty paragraph
							const aiResponseNode = state.schema.nodes[nodeTypes.aiResponseMessageNodeType].create({
								isInitialRenderAnimation: true,
								isReceivingAnimation: true,
								aiProvider: 'Anthropic',
							});

							let createTr = state.tr.insert(insertPos, aiResponseNode);
							const afterResponsePos = insertPos + aiResponseNode.nodeSize;
							let targetCursorPos = afterResponsePos;
							if (trailingEmptyParagraphPos === null || trailingEmptyParagraphPos !== afterResponsePos) {
								const ensureEmptyPara = state.schema.nodes.paragraph.createAndFill();
								createTr = createTr.insert(afterResponsePos, ensureEmptyPara);
								targetCursorPos = afterResponsePos + ensureEmptyPara.nodeSize - 1;
							} else {
								targetCursorPos = afterResponsePos - 1;
							}
							dispatch(createTr);

							// Move cursor after dispatch (safer with updated doc)
							const selTr = editorView.state.tr.setSelection(TextSelection.create(editorView.state.doc, targetCursorPos));
							editorView.dispatch(selTr);

							// Now set endOfNodePos to the newly created node
							endOfNodePos = insertPos + aiResponseNode.nodeSize;
							aiResponseNodeChildCount = 0; // starts empty; children will be added by streaming
						}
					}

					if (endOfNodePos === null) {
						console.error('AI Plugin STREAMING ERROR: Could not find aiResponseMessage node to insert content into!');
						return;
					}

					let nodeMarks = []
					if(segment.styles.length > 0) {
						segment.styles.forEach(element => {
							switch(element) {
								case 'bold':
									nodeMarks.push(state.schema.marks.strong.create())
									break
								case 'italic':
									nodeMarks.push(state.schema.marks.em.create())
									break
								case 'strikethrough':
									nodeMarks.push(state.schema.marks.strikethrough.create())
									break
								case 'code':
									nodeMarks.push(state.schema.marks.code.create())
									break
							}
						})
					} else {
						nodeMarks = null
					}

					if(segment.isBlockDefining) {
						if (segment.type === 'header') {
							// Create a text node with the content of the header
							const textNode = state.schema.text(detailChar)
							// Create a heading node of the specified level and fill it with the text node
							const paragraphNode = state.schema.nodes.paragraph.createAndFill()
							const headingNode = state.schema.nodes.heading.createAndFill({ level: segment.level }, textNode)

							// If the aiResponseNode is empty, just insert the heading node
							if (aiResponseNodeChildCount === 0) {
								tr.insert(endOfNodePos - 1, headingNode)

							} else {
								// If the aiResponseNode is not empty, insert a paragraph node before the heading node
								tr.insert(endOfNodePos - 1, paragraphNode);
								tr.insert(endOfNodePos, headingNode);
							}
						}
						if (segment.type === 'paragraph') {
							// console.log('detailChar--------------------: ', {detailChar, nodeMarks})
							if (detailChar) {
								let textNode = null
								if(nodeMarks) {
									textNode = state.schema.text(detailChar, nodeMarks);
									// console.log('if node marks ---:: ', {nodeMarks, textNode})
								} else {
									textNode = state.schema.text(detailChar);
									// console.log('else node marks ---:: ', {nodeMarks, textNode})
								}

								const paragraphNode = state.schema.nodes.paragraph.createAndFill(null, textNode);
								try {
									state.doc.resolve(endOfNodePos - 1)
									tr.insert(endOfNodePos - 1, paragraphNode);
								} catch (e) { console.warn('Insert paragraph failed at', endOfNodePos - 1, e) }
								// console.log('paragraphNode   --------:: ', paragraphNode)
							} else {
								const paragraphNode = state.schema.nodes.paragraph.create();
								try {
									state.doc.resolve(endOfNodePos - 1)
									tr.insert(endOfNodePos - 1, paragraphNode);
								} catch (e) { console.warn('Insert empty paragraph failed at', endOfNodePos - 1, e) }
							}
						}
						if (segment.type === 'codeBlock') {
							const codeText = state.schema.text(detailChar);
							const codeBlock = state.schema.nodes.code_block.createAndFill(null, codeText);
							tr.insert(endOfNodePos - 1, codeBlock);

						}

						// if (segment.type === 'codeBlock') {
						// 	const detailChar = segment.segment; // Assuming this contains the content for the codeBlock

						// 	// Prepare to create and insert the codeBlock using the endOfNodePos
						// 	let codeBlock = state.schema.nodes.code_block.createAndFill(null, state.schema.text(detailChar));

						// 	// Calculate the position where the codeBlock should be inserted
						// 	let insertPos = endOfNodePos - 3; // Assuming 'endOfNodePos' points to the position after the current node

						// 	// Replace the content at the calculated position with the codeBlock
						// 	tr.replaceWith(insertPos, endOfNodePos, codeBlock);

						// 	// Ensure there's an empty paragraph after the codeBlock
							// ensureEmptyLineAfterNode(editorView, 'code_block', insertPos);

						// 	// Dispatch if changes occurred
						// 	// if (tr && tr.docChanged) {
						// 	// 	editorView.dispatch(tr);
						// 	// }
						// }
					} else {
						if (segment.type === 'codeBlock') {
							// Insert the code character into the code block
							if (state.doc.resolve(endOfNodePos - 1)) {
								const codeText = state.schema.text(detailChar);
								try { state.doc.resolve(endOfNodePos - 2); tr.insert(endOfNodePos - 2, codeText); } catch (e) { console.warn('Insert code text failed at', endOfNodePos - 2, e) }
							}
						} else {
							if (detailChar === '\n') {
								const paragraphNode = state.schema.nodes.paragraph.create();
								try { state.doc.resolve(endOfNodePos - 1); tr.insert(endOfNodePos - 1, paragraphNode); } catch (e) { console.warn('Insert newline paragraph failed at', endOfNodePos - 1, e) }
							} else {
								if (state.doc.resolve(endOfNodePos - 2) && detailChar) {
									if(nodeMarks) {
										// console.log({nodeMarks})
										try { state.doc.resolve(endOfNodePos - 2); tr.insert(endOfNodePos - 2, state.schema.text(detailChar, nodeMarks)); } catch (e) { console.warn('Insert styled text failed at', endOfNodePos - 2, e) }
									} else {
										try { state.doc.resolve(endOfNodePos - 2); tr.insert(endOfNodePos - 2, state.schema.text(detailChar)); } catch (e) { console.warn('Insert text failed at', endOfNodePos - 2, e) }
									}
								}
							}
						}
					}

					if (tr && tr.docChanged) {
						dispatch(tr);
					}
				}

				if (status === 'END_STREAM') {
					// const { state, dispatch } = editorView;
					const tr = state.tr;

					// Find the position of the custom node
					let pos;
					state.doc.descendants((node, position) => {
						if (node.type.name === nodeTypes.aiResponseMessageNodeType) {
							pos = position;
						}
					});

					// Turn off animation
					if (pos !== undefined) {
						const node = state.doc.nodeAt(pos);
						// Ensure we update only if the animate attribute is true.
						if (node && node.attrs.isInitialRenderAnimation) {
							// Create a transaction to update the node's attributes
							const tr = state.tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								isInitialRenderAnimation: false,
								isReceivingAnimation: false
							});
							dispatch(tr);
						}
					}

					isReceiving = false; // Reset the flag
					insideBackticks = false;
					backtickBuffer = '';
					insideCodeBlock = false;
					codeBuffer = '';
				}

			});

			return {
				destroy() {
                    if (unsubscribeFromSegmentsReceiver) {
                        unsubscribeFromSegmentsReceiver()
                    }
                },
				update: () => {} // No need to do anything on update
			}
		},
		props: {
			nodeViews: {
				[nodeTypes.aiResponseMessageNodeType]: (node, view, getPos) => nodeViews.aiResponseMessageNodeView(node, view, getPos),
			}
		}
	})
}
