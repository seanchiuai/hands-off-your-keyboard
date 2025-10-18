---
description: Organize feature documentation and app routes. Moves misplaced feature markdown files into .claude/plans, updates PLANS_DIRECTORY.md, and detects hidden or duplicate app directories to propose or apply safe merges.
allowed-tools: Bash, Edit
argument-hint: ["--apply", "--dry-run", "--auto-merge-archives"]
---

# Command: /organize

Purpose: Keep feature docs in `/.claude/plans`, keep `PLANS_DIRECTORY.md` in sync, and surface hidden/duplicate `app` routes.

Usage
- `--dry-run` (default): Scan and report. No changes.
- `--apply`: Apply safe moves/updates.
- `--auto-merge-archives`: With `--apply`, safely merge exact-name duplicates under `app/_archive` into live routes.

Safety
- Don’t touch `.cursor/**`, `node_modules/**`, or `.claude/plans` (except safe renames).
- Never overwrite or delete without `--apply` and a proven-safe action.

Actions
1) Plans
   - Find feature-like `*.md` outside `/.claude/plans` (by filename keywords and headings).
   - Move into `/.claude/plans` with normalized name: `FEATURE_[TITLE]_IMPLEMENTATION.md`.
   - Deduplicate by content; if conflict, suffix with `[n]` and report.
   - Update `PLANS_DIRECTORY.md` to reflect current plans: add missing entries, remove stale ones, and update date/total. Preserve existing intro/sections and any non-generated content; do not fully rewrite.

2) App routes
   - Live routes: `app/<segment>` with `page.tsx` or `layout.tsx` (exclude `app/_archive`).
   - Visible routes: links/buttons found in `app/page.tsx` and nav components (`components/nav-main.tsx`, `components/app-sidebar.tsx`, `components/site-header.tsx`, `components/AppShell.tsx`).
   - Report hidden routes (live but not linked) with suggested insertion points.
   - Detect duplicates vs `app/_archive/<segment>`; with `--auto-merge-archives` perform safe, non-conflicting merges. Never auto-edit navigation.

Report
- Summary of moved/renamed plans, `PLANS_DIRECTORY.md` changes, hidden routes, and duplicates (merged or pending).
