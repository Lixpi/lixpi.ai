---
title: Keeping the Package in Sync with Gentelella
description: How to review a Gentelella release and update the package without copying demo pages into applications.
---

# Keeping the Package in Sync with Gentelella

The package tracks Gentelella v4 as an upstream dependency. Review the upstream repository before changing the version because the Sass entrypoint, exported JavaScript modules, type declarations, and markup class contracts can change independently.

## Files to compare upstream

Use the tagged source in the [Gentelella repository](https://github.com/ColorlibHQ/gentelella), not a copied stylesheet or a generated demo bundle. Compare these upstream surfaces with this package:

- `package.json` defines public exports and the package version.
- `types/gentelella.d.ts` lists the supported typed runtime modules and their public symbols.
- `scss/v4/main.scss` is the complete theme entrypoint used by `styles/theme`.
- `src/v4/` contains the focused runtime implementations re-exported by `src/runtime/`.
- `production/*.html` contains the complete demo inventory used to discover component variants. It is a review source, not a page-template source.
- The v4 shell, markup helpers, Sass selectors, and production examples define the class and structure contracts represented in `classNames.ts` and `src/components/`.

Do not derive the package API from Gentelella's root `main-v4.js`. That entrypoint wires document-wide behavior and is not a safe reusable module boundary.

## Upgrade procedure

1. Choose the exact upstream release and update the `gentelella` dependency in `package.json`.
2. Compare upstream `src/v4/` with `src/runtime/modules.ts`. Add, remove, or rename one facade per runtime module, and update package exports in the same change. Upstream modules without declarations need an exact local declaration based on their exported values.
3. Compare `types/gentelella.d.ts` with every typed runtime facade. Keep facades as direct re-exports so upstream parameter and return types remain intact.
4. Confirm `scss/v4/main.scss` remains the complete supported theme entrypoint. Compare every sibling Sass partial with the focused files under `src/styles/`, and update the public style exports when upstream adds, removes, or renames a partial.
5. Run `src/inventory.test.ts`. If the production-page inventory changed, inspect every added or changed demo and update the smallest reusable component families. Never copy a complete page into the package.
6. Compare upstream markup, Sass selectors, and examples with `classNames.ts`. Update class contracts and component markup together. Keep compatibility aliases only when a consuming application still needs them and test the alias explicitly.
7. Search consumers for direct `gentelella` imports and raw theme class strings. Move reusable structure into this package; leave domain data and application-specific class names in the consumer.
8. Update this package's tests for the changed runtime inventory, DOM behavior, Sass entrypoint, and public exports.
9. Update the package README, component coverage, and usage guide when an import path or component contract changes.

## Verify an upgrade

Run the focused package test and quality commands from the package README. Then run the tests and quality checks for every consuming service. For `services/ai-model-registry`, also build its standalone image because the production build must resolve the workspace package and compile the upstream Sass entrypoint:

Review the installed dependency's declaration and export files inside the Docker workspace when a facade fails to resolve. Do not bypass the package boundary with an untyped local declaration unless the upstream package is demonstrably missing a declaration; document any temporary declaration and the upstream issue that requires it.
