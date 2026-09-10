# Gentelella Application Shell

`createGentelellaApplicationShell()` renders the Gentelella sidebar and main-content structure without importing Gentelella's global auto-mount entrypoint. The host supplies branding, navigation, footer content, active-route state, and navigation behavior.

The instance owns its root element and navigation links. Call `setActivePath()` when routing changes and `destroy()` when the host application unmounts.
