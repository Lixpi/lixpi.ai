---
title: Gentelella Component Coverage
description: Reusable component families mapped to the complete Gentelella v4 demo and runtime surface.
---

# Gentelella Component Coverage

The package models Gentelella as composable component families. It does not publish copies of the 58 production pages. Those pages are upstream coverage fixtures: their component and behavior contracts are represented by focused modules that applications can combine in any layout.

## Component modules

| Public module | Reusable surface |
| --- | --- |
| `components/foundation` | Alerts, accordions, avatars and stacks, badges, breadcrumbs, code, dividers, grids, list groups, pagination, status dots, typography samples |
| `components/navigation` | Nested sidebar groups and leaves, active-route state, topbar search and action regions |
| `components/application-shell` | Application shell composition for a caller-owned brand, navigation, content, and footer |
| `components/page`, `components/page-header` | Page wrapper and page heading/action composition |
| `components/button` | All Gentelella button tones, sizes, icon buttons, busy state, and selection groups |
| `components/commands` | Command-palette triggers and the complete shared page-action button vocabulary |
| `components/card` | Header, title, subtitle, actions, body, footer, and collapsible content |
| `components/banner`, `components/status`, `components/chip`, `components/spinner`, `components/empty-state` | Page feedback, statuses, colored/removable chips, spinner variants, and empty states |
| `components/feedback` | Progress and loading bars, skeletons and skeleton tables, timelines, steppers, wizards, and async loading/content/empty/error regions |
| `components/form` | Forms, rows, fields, help, hints, validation messages, actions, and base control styling |
| `components/form-controls` | Checkbox/radio choices, switches, toggles, segmented controls, sliders, file inputs, dropzones, date ranges, multi-select, rich text, OTP, password strength, ratings, tags, color swatches, and character counters |
| `components/input-group` | Input icon and affix composition |
| `components/table` | Static and responsive table roots |
| `components/data-table` | Typed columns and rows, sorting attributes, selection, page length, export, and upstream DataTables initialization |
| `components/chart` | Typed hosts for all 20 Gentelella ECharts variants, chart headers/tabs, and map integration hosts |
| `components/widgets` | Stat tiles, activity feeds, visitor distribution, todos, donut/storage legends, version distribution, and profile rings |
| `components/applications` | Calendar cells/events, chat conversations/bubbles/composer/layout, kanban cards/columns/board, file items/manager, notifications, settings rows/sections, and the inbox host |
| `components/commerce` | Product cards/gallery/options/quantity, product images and mockups, pricing tiers, invoice headers/lines/totals, order information, reviews, and product actions |
| `components/admin` | Contact cards and details, project cards and details, profile summaries, FAQ lists, and integration cards |
| `components/auth` | Auth cards, error/status panels, and countdowns; OTP and password strength remain independent form controls |
| `components/media` | The upstream icon catalog, individual icons, icon grids, and media tiles |
| `components/marketing` | Landing navigation, heroes, feature grids, and calls to action |
| `components/theme` | Typed design tokens, permanent theme application, leased theme previews, theme swatches, and tooltip triggers |
| `components/overlay` | Runtime-backed modal, toast, menu button, panel, and popover APIs |
| `components/drawer`, `components/tabs` | Drawer/backdrop ownership and underline, pill, or chart tab strips |

## Upstream completeness checks

`src/inventory.ts` records the current upstream contract:

- all 20 chart keys;
- all 20 focused v4 runtime modules;
- all 9 v4 Sass layers;
- every public Gentelella theme custom property;
- every production HTML demo used to discover component variants.

`src/inventory.test.ts` compares those inventories to the installed `gentelella` package. An upstream release that adds or removes a runtime module, Sass layer, theme token, production demo, or chart type fails the package test until the reusable component review is complete.

The production page list is deliberately metadata. Do not turn it into page factories. When upstream adds a demo, inspect its markup and behavior, extend the smallest matching component family, and add focused behavior tests.
