---
description: Pull and sync latest changes from Github
allowed-tools: Bash
argument-hint: []
---

# Command: /pull

Ensure all local changes are committed and pushed to the main branch before pulling.

Important notes:
- Verify you are on the main branch.
- Confirm there are no unpushed commits; push them if necessary.
- Pull the latest changes from the remote main branch.
- If merge conflicts occur during pull, resolve them automatically in the most reliable way possible to maintain a clean working state.