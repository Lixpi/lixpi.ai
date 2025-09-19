# ProseMirror plugins – how we build them

This is the shared guide for plugins in our ProseMirror app. Keep generic stuff here. Plugin-specific details (like streaming logic for AI chat) stay in that plugin's own README.

If you want a concrete example, check `aiChatThreadPlugin/README.md`.

Direct link: `./aiChatThreadPlugin/README.md`.

## Folder layout (typical)

```
plugins/
	somePlugin/
		README.md                 # plugin-specific notes
		index.ts                  # exports
		somePlugin.ts             # plugin class / orchestration
		someNode.ts               # Node spec + NodeView (self-contained)
		anotherNode.ts            # …more nodes if needed
		some-plugin.scss          # styles for that plugin

	README.md                   # this file (shared patterns)

components/
	domTemplates.ts             # shared html() templating helper (htm)
```

## Core patterns we follow

- Node spec + NodeView live together. Each NodeView builds its DOM with templates and owns its events. No random DOM poking from the plugin class.
- UI is decoration-first. Visual states come from classes via `DecorationSet` (placeholders, keyboard feedback, boundary highlights, etc.). NodeViews render structure; decorations toggle classes.
- Templating uses `htm` via our `html` helper from `components/domTemplates.ts`. No JSX, no VDOM. Tagged templates → direct DOM.
- The plugin class does orchestration only: selection checks, content extraction, transactions, streaming insertions, state flags.
- Keep code small and obvious. If it feels like "framework", you're over-engineering it.

## Templating & NodeViews

Import once and use everywhere:

```ts
import { html } from '../components/domTemplates.ts'

const el = html`
	<div className="btn" onclick=${onClick}>
		<span innerHTML=${icon}></span>
	</div>
`
```

Rules of thumb:
- Use `className` and `innerHTML` in templates.
- Event handlers: `onclick`, `onmouseenter`, etc. Keep handlers stable, avoid recreating closures in tight loops.
- Styles: pass an object to `style=${{ ... }}` if needed. Keep it minimal; most styling belongs in SCSS.

## Decorations – the visual contract

We lean on decorations to flip visual states. The plugin sets classes; SCSS does the rest.

Common state classes we reuse:
- `.receiving`
- `.thread-boundary-visible`

Don't dump CSS into READMEs. Styles live next to the plugin in `.scss` files. Document which classes matter, not the whole stylesheet.

## Plugin responsibilities (what goes where)

Put this in the plugin class:
- Read selection / find active scope
- Extract content into a simple data shape
- Dispatch transactions to insert/update nodes
- Manage `DecorationSet` for visual states
- Wire external signals (e.g., streaming events)

Put this in a NodeView:
- Initial DOM via `html` templates
- Local event handlers (hover, click)
- Minimal DOM refs for dynamic updates
- Call `setNodeMarkup` if attributes need nudging (sparingly)

## Minimal data flow

1) User input → plugin sets metadata on a transaction
2) Plugin gathers data (from the active container node) → calls your app
3) External events (like streaming) feed back → plugin inserts/updates nodes
4) Decorations update classes so CSS can react

The AI Chat Thread plugin is the reference implementation for this setup. See `aiChatThreadPlugin/README.md` for the real thing: node shapes, data events, and concrete templates.

## Tips

- Keep NodeViews small. If a template grows too big, split helpers, but don't invent abstractions you don't need.
- Prefer attributes/classes over inline styles.
- If a behavior repeats across plugins, extract it as a utility. Otherwise, keep it local.
- Don't write history sections in READMEs. Keep it actionable.