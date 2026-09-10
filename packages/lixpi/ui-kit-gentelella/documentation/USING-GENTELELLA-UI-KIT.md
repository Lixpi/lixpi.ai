---
title: Using the Gentelella UI Kit
description: How applications compose Gentelella styles, components, class contracts, and focused runtime modules.
---

# Using the Gentelella UI Kit

Use `@lixpi/ui-kit-gentelella` for any browser surface that uses Gentelella. The package owns the upstream dependency and turns the theme's CSS and JavaScript contracts into small modules that services can compose.

## Import styles once

The application root imports the complete theme once. Import package-owned component styles beside it:

```scss
@use '@lixpi/ui-kit-gentelella/styles/theme';
@use '@lixpi/ui-kit-gentelella/styles/application-shell';
```

Feature Sass can style feature-owned classes, but it must not import the theme again. Recompiling the theme in feature styles duplicates the CSS and makes hot reload order-dependent.

## Compose components

Each component accepts caller-owned content and returns its root element. Keep the returned instance for updates and disposal:

```typescript
import { createGentelellaButton } from '@lixpi/ui-kit-gentelella/components/button'
import { createGentelellaPageHeader } from '@lixpi/ui-kit-gentelella/components/page-header'

const refresh = createGentelellaButton({
    iconHtml: refreshIcon,
    label: 'Refresh',
    onClick: () => void reload(),
    variant: 'primary',
})
const header = createGentelellaPageHeader({
    actions: refresh.el,
    pretitle: 'Catalog',
    title: 'Models',
})

host.append(header.el)
```

Destroy the outer component when the surface unmounts. Destroy nested stateful components as well when the caller retains their instances or they own listeners. Calling `destroy()` after a parent has already detached the child is safe.

Import the smallest component family that owns the needed structure. For example, combine a chart host with a card and a separately managed tab strip instead of reaching for a dashboard template:

```typescript
import { createGentelellaCard } from '@lixpi/ui-kit-gentelella/components/card'
import { createGentelellaChart } from '@lixpi/ui-kit-gentelella/components/chart'

const chart = createGentelellaChart({
    ariaLabel: 'Revenue by month',
    type: 'revenue-line',
})
const card = createGentelellaCard({
    content: chart.el,
    title: 'Revenue',
})

host.append(card.el)
await chart.initialize()
```

The full module-to-component map is in [Component Coverage](COMPONENT-COVERAGE.md).

## Mix package and application markup

The package owns Gentelella classes and generic structure. The application owns domain labels, data, API calls, routing, and feature-specific classes. Pass an application class through `className`, `headerClassName`, or another explicit extension point instead of modifying the package for one screen.

Dynamic markup can use `gentelellaClasses` and the class-name builders from `@lixpi/ui-kit-gentelella/class-names`. This is useful for table rows or conditional fragments that are too small to justify an instance. Do not copy raw Gentelella class strings into a service because an upstream rename would then require a repository-wide search.

## Use focused runtime modules

Gentelella publishes typed v4 modules for shell rendering, menus, tables, charts, modals, toasts, forms, page actions, settings, details, the command palette, the inbox, kanban, the calendar, the file manager, the data adapter, and markup helpers. Import the matching package facade:

```typescript
import { showToast } from '@lixpi/ui-kit-gentelella/runtime/toast'
import { pageHeader } from '@lixpi/ui-kit-gentelella/runtime/markup'
```

These facades deliberately stay thin. They preserve the upstream types and let callers choose modules independently. Do not add an aggregate import that initializes the entire theme runtime.

## Add a component

Put the implementation, index, tests, and component-owned Sass under `src/components/<component>/`. The implementation must accept a `document` when it creates DOM so tests and embedded documents can supply their own realm. Keep data fetching and application state outside the component. Expose the component through a package export and the root index, then add any public Sass forwarding entry under `styles/`.

Build normal DOM through `createDocumentHtml()` or `createDocumentEl()` from `@lixpi/ui-primitives/dom`. Use `applyStyle()` for inline style groups, `applyCssCustomProperties()` for custom properties, and `ElementStyleLease` when a component temporarily owns style overrides. Stateful components must be class-backed and expose a focused instance API. Use the existing UI primitives for DOM, style, geometry, animation, and SVG work whenever that concern exists; do not introduce a second DOM builder, animation system, geometry helper, or SVG parser in this package.

Use classes from `classNames.ts` for upstream contracts and flat kebab-case names prefixed with `gentelella-` for package-owned styles. A consuming service can add its own prefixed class through a documented configuration field.
