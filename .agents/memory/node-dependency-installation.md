---
name: Node dependency installation
description: Replit's package installer may change package versions and lockfiles while installing dependencies that are already declared.
---

When installing already-declared Node dependencies through Replit's package installer, passing semver ranges can update `package.json` to newer versions allowed by those ranges and regenerate `package-lock.json`. This can create dependency drift even when the goal is only to populate `node_modules`.

**Why:** A branch verification install rewrote version ranges and the lockfile; restoring the original declarations avoided unrelated dependency upgrades.

**How to apply:** Preserve and inspect the manifest and lockfile around installs. Restore unrelated changes, or avoid installing dependencies when runtime verification is outside the requested scope.
