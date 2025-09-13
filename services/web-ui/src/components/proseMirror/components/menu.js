import { NodeSelection } from "prosemirror-state"
import { toggleMark } from "prosemirror-commands"
import { wrapInList } from "prosemirror-schema-list"
import { TextField, openPrompt } from "./prompt.js"
import crel from "crelt"

import { menuBar } from "./prosemirror-menu/menubar.ts"
import {
    wrapItem,
    blockTypeItem,
    Dropdown,
    DropdownSubmenu,
    joinUpItem,
    liftItem,
    // selectParentNodeItem,
    undoItem,
    redoItem,
    MenuItem
} from "./prosemirror-menu/menu.ts"

import {
    perfoperforatedChevronRightIcon,
    joinIcon,
    liftIcon,
    undoIcon,
    redoIcon,
    selectParentNodeIcon,
    boldIcon,
    italicIcon,
    codeIcon,
    linkIcon,
    bulletListIcon,
    orderedListIcon,
    blockquoteIcon,
    imageIcon,
    horizontalRuleIcon,
    inlineCodeIcon,
    codeBlockIcon
} from '../../../svgIcons'


// Helpers to create specific types of items
const canInsert = (state, nodeType) => {
    let $from = state.selection.$from;
    for (let d = $from.depth; d >= 0; d--) {
        let index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) return true;
    }
    return false;
};

const insertImageItem = nodeType => {
    return new MenuItem({
        title: "Insert image",
        icon: imageIcon,
        class: 'insert-image',
        label: "Image",
        enable: state => canInsert(state, nodeType),
        run: (state, _, view) => {
            let {from, to} = state.selection,
            attrs = null;

            if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType)
                attrs = state.selection.node.attrs;

            openPrompt({
                title: "Insert image",
                fields: {
                    src: new TextField({label: "Location", required: true, value: attrs && attrs.src}),
                    title: new TextField({label: "Title", value: attrs && attrs.title}),
                    alt: new TextField({
                        label: "Description",
                        value: attrs ? attrs.alt : state.doc.textBetween(from, to, " ")
                    })
                },
                callback: attrs => {
                    view.dispatch(view.state.tr.replaceSelectionWith(nodeType.createAndFill(attrs)));
                    view.focus();
                }
            });
        }
    });
};

const cmdItem = (cmd, options) => {
    let passedOptions = {
        label: options.title,
        run: cmd
    };

    for (let prop in options) {
        passedOptions[prop] = options[prop]
    }

    if (!options.enable && !options.select) {
        passedOptions[options.enable ? "enable" : "select"] = state => cmd(state)
    }

    return new MenuItem(passedOptions)
};

const markActive = (state, type) => {
    let {from, $from, to, empty} = state.selection;

    if (empty) {
        return !!type.isInSet(state.storedMarks || $from.marks());
    } else {
        return state.doc.rangeHasMark(from, to, type);
    }
};

const markItem = (markType, options) => {
    let passedOptions = {
        active: state => markActive(state, markType)
    };

    for (let prop in options) {
        passedOptions[prop] = options[prop];
    }

    return cmdItem(toggleMark(markType), passedOptions);
};

const linkItem = markType => {
    return new MenuItem({
        title: "Add or remove link",
        icon: linkIcon,
        class: 'toggle-link',
        active: state => markActive(state, markType),
        enable: state => !state.selection.empty,
        run: (state, dispatch, view) => {
            if (markActive(state, markType)) {
                toggleMark(markType)(state, dispatch);
                return true;
            }
            openPrompt({
                title: "Create a link",
                fields: {
                    href: new TextField({
                        label: "Link target",
                        required: true
                    }),
                    title: new TextField({label: "Title"})
                },
                callback: attrs => {
                    toggleMark(markType, attrs)(view.state, view.dispatch);
                    view.focus();
                }
            });
        }
    });
};

const wrapListItem = (nodeType, options) => {
    return cmdItem(wrapInList(nodeType, options.attrs), options);
};

const getActiveLabel = (state) => {
    const { $from } = state.selection;
    const node = $from.node();

    if (node.type.name === "paragraph") {
        return "Regular text";
    } else if (node.type.name === "heading") {
        if (node.attrs.level === 1) {
            return "Title";
        }
        return `Heading ${node.attrs.level -1}`;
    } else if (node.type.name === "code_block") {
        return "Code Block";
    }

    return "Regular text";
};


// Given a schema, look for default mark and node types in it and
// return an object with relevant menu items relating to those marks.
export const buildMenuItems = (schema) => {
    let r = {};
    let mark;
    let node;

    if (mark = schema.marks.em) {
        r.toggleItalic = markItem(mark, {
            title: "Italic ⌘+I",
            icon: italicIcon,
            class: 'toggle-italic'
        });
    }

    if (mark = schema.marks.strong) {
        r.toggleBold = markItem(mark, {
            title: "Bold ⌘+B",
            icon: boldIcon,
            class: 'toggle-bold'
        });
    }

    if (mark = schema.marks.link) {
        r.toggleLink = linkItem(mark);
    }

    if (node = schema.nodes.image) {
        r.insertImage = insertImageItem(node);
    }

    if (node = schema.nodes.bullet_list) {
        r.wrapBulletList = wrapListItem(node, {
            title: "Wrap in bullet list",
            icon: bulletListIcon
        })
    }

    if (node = schema.nodes.ordered_list) {
        r.wrapOrderedList = wrapListItem(node, {
            title: "Wrap in ordered list",
            icon: orderedListIcon
        })
    }

    if (node = schema.nodes.blockquote) {
        r.wrapBlockQuote = wrapItem(node, {
            title: "Wrap in block quote",
            icon: blockquoteIcon,
            class: 'wrap-blockquote'
        })
    }

    if (node = schema.nodes.paragraph) {
        r.makeParagraph = blockTypeItem(node, {
            title: "Change to paragraph",
            label: "Regular text",
            class: 'make-regular-text',
            type: 'dropdownItem'
        })
    }

    if (mark = schema.marks.code) {
        r.toggleInlineCode = markItem(mark, {
            title: "Inline Code ``",
            label: "Inline Code",
            icon: inlineCodeIcon,
            class: 'toggle-inline-code',
        });
    }

    if (node = schema.nodes.code_block) {
        r.makeCodeBlock = blockTypeItem(node, {
            title: "Code Block ```",
            label: `Code Block;`,
            icon: codeBlockIcon,
            class: 'make-code-block',
        })
    }

    if (node = schema.nodes.heading) {
        // TODO: refactor this fucking mess
        r["makeHead1"] = blockTypeItem(node, {
            title: "Change to title",
            label: "Title",
            class: 'make-header-1',
            attrs: {level: 1},
            type: 'dropdownItem'
        })
        for (let i = 2; i <= 5; i++) {
            r["makeHead" + i] = blockTypeItem(node, {
                title: "Change to heading " + (i+1),
                label: "Heading " + (i-1),
                class: 'make-header-' + i,
                attrs: {level: i},
                type: 'dropdownItem'
            })
        }
    }
    if (node = schema.nodes.horizontal_rule) {
        let hr = node;
        r.insertHorizontalRule = new MenuItem({
            title: "Insert horizontal rule",
            icon: horizontalRuleIcon,
            label: "Horizontal rule",
            class: 'insert-horizontal-rule',
            enable: state => canInsert(state, hr),
            run: (state, dispatch) => dispatch(state.tr.replaceSelectionWith(hr.create()))
        });
    }

    r.fullMenu = [
        [undoItem, redoItem],
        [
            new Dropdown(
                [
                    r.makeHead1,
                    r.makeHead2,
                    r.makeHead3,
                    r.makeHead4,
                    // r.makeHead5,
                    // r.makeHead6,
                    r.makeParagraph,
                ],
                { labelFunction: getActiveLabel },
                // {label: "Regular text"}
            ),
        ],
        [
            r.toggleBold,
            r.toggleItalic,
        ],
        [
            r.toggleInlineCode,
        ],
        [
            r.makeCodeBlock,
        ],
        [
            r.insertImage,
        ],
        [
            r.wrapBlockQuote,
        ],
        [
            // r.insertHorizontalRule,
            r.toggleLink,
        ],
        [
            // r.wrapBulletList,
            // r.wrapOrderedList,
            // joinUpItem,
            // liftItem,
            // selectParentNodeItem
        ],
    ]

    return r;
}











// const createNewTaskMenuItem = (taskType, taskSchema) => {
//     return new MenuItem({
//         title: "Insert task",
//         label: "Task",
//         enable: () => true,
//         run(state, dispatch) {
//             if (dispatch) {
//                 const attrs = defaultAttrs;
//                 const tr = state.tr.setMeta('insert:taskRow', attrs);
//                 dispatch(tr);
//             }
//         }
//     });
// }

// const insertAiUserMessageMenuItem = () => {
//   return new MenuItem({
//       title: "Insert Ai User Message",
//       label: "AI User Message",
//       enable: () => true,
//       run(state, dispatch) {
//           if (dispatch) {
//               const attrs = defaultAttrs;
//               const tr = state.tr.setMeta(`insert:${nodeTypes.aiUserMessageNodeType}`, attrs);
//               dispatch(tr);
//           }
//       }
//   });
// }

// const insertAiUserInputMenuItem = () => {
//     return new MenuItem({
//         title: "Ai",
//         label: "AI",
//         enable: () => true,
//         run(state, dispatch) {
//             if (dispatch) {
//                 const attrs = defaultAttrs;
//                 const tr = state.tr.setMeta(`insert:${nodeTypes.aiUserInputNodeType}`, attrs);
//                 dispatch(tr);
//             }
//         }
//     });
// }

// const createAiChatMenuItem = () => {
//     return new MenuItem({
//         title: "AI Chat",
//         label: "AI Chat",
//         enable: () => true,
//         run(state, dispatch) {
//             if (dispatch) {
//                 // const attrs = defaultAttrs;
//                 const tr = state.tr.setMeta('use:aiChat', {});
//                 dispatch(tr);
//             }
//         }
//     });
// }

export const buildMenu = (mySchema) => {
    const taskType = mySchema.nodes.task
    const menu = buildMenuItems(mySchema)

    // menu.fullMenu.push([createNewTaskMenuItem(taskType, mySchema)])
    // menu.fullMenu.push([insertAiUserMessageMenuItem()])
    // menu.fullMenu.push([createAiChatMenuItem()])

    // menu.fullMenu.push([insertAiUserInputMenuItem()])

    return menu
}

export const menuPlugin = (schema) => {
    return menuBar({
        floating: true,
        staySticky: true,    // Added by Shelby
        content: buildMenu(schema).fullMenu
    })
}

