import crel from "crelt";
import { Plugin, EditorState, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { renderGrouped, MenuElement } from "./menu.ts";

const prefix = "ProseMirror-menubar";

/// A plugin that will place a menu bar above the editor. Note that
/// this involves wrapping the editor in an additional `<div>`.
export function menuBar(options: {
	/// Provides the content of the menu, as a nested array to be
	/// passed to `renderGrouped`.
	content: readonly (readonly MenuElement[])[];

}): Plugin {
	return new Plugin({
		key: new PluginKey("menuBar"),
		view(editorView) {
			return new MenuBarView(editorView, options);
		}
	});
}

class MenuBarView {
	wrapper: HTMLElement;
	menu: HTMLElement;
	maxHeight = 0;
	widthForMaxHeight = 0;
	contentUpdate: (state: EditorState) => boolean;
	root: Document | ShadowRoot;

	constructor(
		readonly editorView: EditorView,
		readonly options: Parameters<typeof menuBar>[0]
	) {
		this.root = editorView.root;
		this.wrapper = crel("div", { class: prefix + "-wrapper" });
		this.menu = this.wrapper.appendChild(crel("div", { class: prefix }));
		this.menu.className = prefix;

		if (editorView.dom.parentNode)
			editorView.dom.parentNode.replaceChild(this.wrapper, editorView.dom);
		this.wrapper.appendChild(editorView.dom);

		let { dom, update } = renderGrouped(this.editorView, this.options.content);

		this.contentUpdate = update;
		this.menu.appendChild(dom);
		this.update();
	}

	update() {
		if (this.editorView.root != this.root) {
			let { dom, update } = renderGrouped(this.editorView, this.options.content);

			this.contentUpdate = update;
			this.menu.replaceChild(dom, this.menu.firstChild!);
			this.root = this.editorView.root;
		}
		this.contentUpdate(this.editorView.state);

		if (this.menu.offsetWidth != this.widthForMaxHeight) {
			this.widthForMaxHeight = this.menu.offsetWidth;
			this.maxHeight = 0;
		}
		if (this.menu.offsetHeight > this.maxHeight) {
			this.maxHeight = this.menu.offsetHeight;
			this.menu.style.minHeight = this.maxHeight + "px";
		}
	}

	destroy() {
		if (this.wrapper.parentNode)
			this.wrapper.parentNode.replaceChild(this.editorView.dom, this.wrapper);
	}
}
