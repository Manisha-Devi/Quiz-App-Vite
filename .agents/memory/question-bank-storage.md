---
name: Question-bank storage durability
description: The user's confirmed storage choice and its published-app durability caveat.
---

Use Lowdb for the server question bank unless the user asks to change it. The user accepted that its file may reset on publish or redeploy.

**Why:** The user chose Lowdb after being told about the published filesystem reset risk.

**How to apply:** Remind the user that uploaded server data may need to be re-added after publishing; do not silently migrate to a persistent database.
