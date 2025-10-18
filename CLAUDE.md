# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Instructions

### Custom Agents, Plans, and Specification

**IMPORTANT:** When searching for custom agents, plans, or specifications, always look under the `/.claude` directory.

- **`/agents`** - Contains custom agent definitions for specialized tasks
  - Before implementing features, check if a relevant agent exists in this directory
  - Invoke custom agents using the Task tool when their expertise matches the request
  - Each agent file defines its purpose, when to use it, and expected behavior
  - If no matching agent exists, proceed with the task normally
- **`/plans`** - Contains implementation plans for specific features
  - Before implementing features, check if a relevant plan exists in this directory
  - Follow the step-by-step instructions in the plan when implementing the feature
  - Plans provide architecture decisions, file locations, and implementation details
  - If a user requests new features relevant to an existing plan, modify that plan based on the user's request
  - If no matching plan exists, create a new implementation plan
  - Always update and check `PLANS_DIRECTORY.md` before implementing a new feature
  - Plans should be named `FEATURE_[FEATURE DESCRIPTION]_IMPLEMENTATION.md`
- **`/spec`** - Contains the high-level spec sheet (`spec-sheet.md`) that describes the app's purpose, core features, UI design, and overall tech stack
  - Review `/spec/spec-sheet.md` to understand the project's goals and requirements before starting or suggesting any major changes
  - If a user asks for an app change that does not align with the current spec sheet, **pause and confirm with the user before proceeding**. Once confirmed, update the spec sheet accordingly to ensure project documentation stays accurate and in sync with development
  - The spec sheet is the canonical source for the intended behavior and architecture of the app

**IMPORTANT**: Always check these directories when starting a new feature or task. Always use the Context7 MCP to do more research for complicated features before creating and editing a plan. Custom agents, plans, and the spec sheet provide project-specific expertise and tested approaches when available.

## Commands

### Development
- `npm run dev` - Runs both Next.js frontend and Convex backend in parallel
  - Frontend: http://localhost:3000
  - Convex dashboard opens automatically
- `npm run dev:frontend` - Run only Next.js frontend with Turbopack
- `npm run dev:backend` - Run only Convex backend

### Build & Production
- `npm run build` - Build Next.js for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Convex
- `npx convex dev` - Start Convex development server (auto-started with `npm run dev`)
- `npx convex deploy` - Deploy Convex functions to production

### Run/Execution Policy
- Only run `npm run dev` for brief, self-contained testing.
- Do not leave servers running after tests complete; stop them immediately.
- If a server must be started to verify behavior, terminate it before ending the turn.

## Architecture

This is a full-stack TypeScript application using:

### Frontend
- **Next.js 15** with App Router - React framework with file-based routing in `/app`
- **Tailwind CSS 4** - Utility-first styling with custom dark theme variables
- **shadcn/ui** - Pre-configured component library
- **Clerk** - Authentication provider integrated via `ClerkProvider` in app/layout.tsx

### Backend
- **Convex** - Real-time backend with:
  - Database schema defined in `convex/schema.ts`
  - Server functions in `convex/` directory (myFunctions.ts, todos.ts)
  - Auth config in `convex/auth.config.ts` (requires Clerk JWT configuration)

### Key Integration Points
- **ConvexClientProvider** (components/ConvexClientProvider.tsx) wraps the app with `ConvexProviderWithClerk` to integrate Convex with Clerk auth
- **Middleware** (middleware.ts) protects `/server` routes using Clerk
- Path aliases configured: `@/*` maps to root directory

## Project Structure
- `/app` - Next.js pages and layouts (App Router)
  - `/app/(auth)` - Authentication pages if needed
  - `/app/(protected)` - Protected routes requiring authentication
- `/components` - React components including sidebar and UI components
- `/convex` - Backend functions, schema, and auth configuration
  - `schema.ts` - Database schema definition
  - `auth.config.ts` - Clerk authentication configuration
- `/public` - Static assets including custom fonts
- `/agents` - Custom Claude Code agent definitions for specialized tasks
- `/plans` - Implementation plans and guides for specific features
- `middleware.ts` - Route protection configuration

## Key Architecture Patterns
- Uses TypeScript with strict mode enabled
- Path aliases configured with `@/*` mapping to root directory
- Components follow React patterns with Tailwind CSS for styling
- Real-time data synchronization with Convex
- JWT-based authentication with Clerk
- Custom hooks for framework integration
- ESLint configuration for code quality

## Debugging
- ALWAYS, call the context7 mcp for debugging errors or when the user complains of a feature that is not working even thought the code is implemented.
- If the first attempt does not work after using context7, create a query for the research agent with sufficient project and error context to find information to fix it. The user will report back with the results, then continue to implement the fix.

## Authentication & Security
- Protected routes using Clerk's authentication in middleware.ts
- User-specific data filtering at the database level in Convex
- JWT tokens with Convex integration
- ClerkProvider wraps the app in app/layout.tsx
- ConvexClientProvider integrates Convex with Clerk auth

## Backend Integration
- Convex provides real-time database with TypeScript support
- All mutations and queries are type-safe
- Automatic optimistic updates and real-time sync
- Row-level security ensures users only see their own data
- Use `useQuery`, `useMutation`, and `useAction` hooks in Next.js components

## Styling Approach
- Tailwind CSS 4 with custom dark theme variables
- shadcn/ui component library for pre-built components
- Responsive design with mobile-first approach
- Consistent design system across the application

## API Key Management
When implementing features that require API keys:
1. Ask the user to provide the API key
2. Add the key to `.env.local` file yourself (create the file if it doesn't exist)
3. Update `.env.example` with a placeholder entry for documentation
4. Never ask the user to manually edit environment files - handle it for them

## Convex Backend Development
**IMPORTANT**: When implementing any features or changes that involve Convex:
- ALWAYS refer to and follow the guidelines in `convexGuidelines.md`
- This file contains critical best practices for:
  - Function syntax (queries, mutations, actions, internal functions)
  - Validators and type safety
  - Schema definitions and index usage
  - File storage patterns
  - Scheduling and cron jobs
  - Database queries and performance optimization
- Following these guidelines ensures type safety, proper security, and optimal performance
- Never deviate from these patterns without explicit user approval

## Modular Code Best Practice
**IMPORTANT**: Write modular, reusable code to optimize token usage and maintainability:
- Break down large pages into smaller, focused components
- Extract reusable UI elements into separate component files
- Keep pages concise by delegating logic to components and hooks
- Avoid pages that are thousands of lines long - this saves tokens and improves code quality

## UI-First Implementation Approach
**IMPORTANT**: When implementing new features or screens:
1. **Build the UI first** - Create the complete visual interface with all elements, styling, and layout
2. **Match existing design** - New designs should closely match the existing UI screens, pages, and components, unless otherwise stated by the user
3. **Then add functionality** - After the UI is in place, implement the business logic, state management, and backend integration
4. This approach ensures a clear separation of concerns and makes it easier to iterate on both design and functionality independently

## Minimum Viable Product (MVP) Approach
**IMPORTANT**: When building, work on ONLY the Minimum Viable Product (MVP):
- Focus exclusively on implementing the core features explicitly requested by users
- Prioritize ensuring these core features work reliably and deliver real user value
- Avoid introducing additional features like extra settings, customization, or "nice-to-have" options that were not requested
- Do not add additional features without confirmation from the user
- The MVP goal is to ship a solid, usable version of what users asked for as quickly as possible, before considering enhancements or additional features