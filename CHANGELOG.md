Changelog
=========

All notable changes to this project will be documented in this file.

Format inspired by Keep a Changelog. Dates use YYYY-MM-DD.

## 2025-10-17

Status: Ready to launch after quick fixes

- Added: SerpAPI integration config (documented) and Clerk JWT issuer variable to local env docs.
- Added: Documentation files to aid setup and debugging (diagnostic summary, quick fix guide, setup notes).
- Added: Example scrapers and plans for multi-retailer support (`convex/actions/bestBuyScraper.ts`, `convex/actions/playwrightScraper.ts`).
- Added: Project plans and agent guidance for scraper development.
- Changed: General configuration alignment across Next.js, Convex, and Clerk per audit.
- Removed: Deprecated `app/settings/page.tsx` (clean-up per current navigation).
- Note: Two Convex environment variables must be set in the Convex dashboard for full functionality: `CLERK_JWT_ISSUER_DOMAIN` and `SERPAPI_KEY` (do not commit values to source).

Next steps

- Add required variables to Convex dashboard and restart development server.
- Verify sign-in and product search paths work end-to-end.


