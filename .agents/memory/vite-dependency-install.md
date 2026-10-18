---
name: Vite dependency installs
description: A Replit package-install issue caused by an unused Create React App dependency.
---

This is a Vite app. An unused `react-scripts` dependency pulled an outdated `websocket-driver` version that Replit's package-install security gate blocked.

**Why:** Removing the unused Create React App package allowed the required server dependencies to install.

**How to apply:** If future package installs fail through `react-scripts` or `websocket-driver`, check for an unused Create React App dependency before changing the Vite workflow.
