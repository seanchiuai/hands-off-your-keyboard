---
description: Organize feature documentation and app routes. Moves misplaced feature markdown files into .claude/plans, merges duplicate plans inside .claude/plans, updates PLANS_DIRECTORY.md, and detects hidden or duplicate/similar URL routes to propose or apply safe merges.
allowed-tools: Bash, Edit
argument-hint: ["plan", "apply"]
---

# Command: /organize

Purpose: Keep feature docs in `/.claude/plans`, keep `PLANS_DIRECTORY.md` in sync, and surface hidden/duplicate `app` routes.

Usage
- `plan` (default): Scan and report. No changes.
- `apply`: Apply safe moves, merges, and updates.

Safety
- Don’t touch `.cursor/**` or `node_modules/**`.
- Only modify `/.claude/plans` during `apply` for safe renames and safe merges of duplicate plans; never destructive.
- Never overwrite or delete without `apply` and a proven-safe action.

Actions
1) Plans
   - Find feature-like `*.md` outside `/.claude/plans` (by filename keywords and headings).
   - Move into `/.claude/plans` with normalized name: `FEATURE_[TITLE]_IMPLEMENTATION.md`.
   - Merge duplicates inside `/.claude/plans`:
     - plan: detect by normalized title and content similarity; report candidates with diffs.
     - apply: safely merge identical or additive content; otherwise keep both and suffix with `[n]` and report.
   - Update `PLANS_DIRECTORY.md` to reflect current plans: add missing entries, remove stale ones, and update date/total. Preserve existing intro/sections and any non-generated content; do not fully rewrite.

2) App routes
   - Live routes: `app/<segment>` with `page.tsx` or `layout.tsx` (exclude `app/_archive`); these map to URL directories.
   - Visible routes: links/buttons found in `app/page.tsx` and nav components (`components/nav-main.tsx`, `components/app-sidebar.tsx`, `components/site-header.tsx`, `components/AppShell.tsx`).
   - Report hidden routes (live but not linked) with suggested insertion points.
   - Detect duplicate or similar features across URL directories (by route path and page content); when applying, perform safe, non-conflicting merges of overlapping URL routes. Never auto-edit navigation.

 Report
- Summary of moved/renamed/merged plans, `PLANS_DIRECTORY.md` changes, hidden routes, and URL-level duplicates/similarities (merged or pending).
