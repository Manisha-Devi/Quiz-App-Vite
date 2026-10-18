---
name: Frontend/backend branch split
description: Project-specific requirement to keep frontend and backend on separate branches while connecting them in Replit preview.
---

Keep the quiz frontend on `main` and the Express API on `server`. In Replit preview, run the server branch from a separate worktree as its own backend workflow, then proxy frontend `/api` requests to that process.

**Why:** the user explicitly requested separate branches, then asked for the frontend to work with the backend without combining their code into one branch.

**How to apply:** preserve the branch split when changing the Replit preview setup; if deployment is added, configure a production API route separately because Vite's dev proxy does not carry into production.
