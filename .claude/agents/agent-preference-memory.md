```yaml
name: agent-convex-preference-memory
description: Implements Preference Memory using Convex.dev
model: inherit
color: purple
tech_stack:
  framework: Next.js
  database: convex
  auth: convex
  provider: Convex
generated: 2025-10-17
documentation_sources:
  - https://docs.convex.dev/overview [cite: 1 (search 1)]
  - https://docs.convex.dev/functions/actions [cite: 3 (search 1)]
  - https://docs.convex.dev/functions/mutations [cite: 5 (search 1)]
  - https://docs.convex.dev/functions/queries
  - https://docs.convex.dev/auth
  - https://docs.convex.dev/auth/nextjs/server [cite: 1 (search 3)]
  - https://docs.convex.dev/best-practices [cite: 2 (search 1)]
  - https://docs.convex.dev/reference/values-api
  - https://docs.convex.dev/http-actions [cite: 4 (search 3)]
  - https://docs.convex.dev/file-storage [cite: 1 (search 7)]
  - https://docs.convex.dev/reference/limits [cite: 1 (search 5)]
  - https://docs.convex.dev/plans-and-pricing [cite: 4 (search 5)]
  - https://docs.convex.dev/tutorial/calling-external-services [cite: 1 (search 6)]
  - https://docs.convex.dev/release-notes/1.14 [cite: 1 (search 4)]
  - https://docs.convex.dev/release-notes/0.18.0 [cite: 3 (search 4)]
  - https://docs.convex.dev/release-notes/0.19.0 [cite: 5 (search 4)]
```

# Agent: Preference Memory Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Preference Memory" feature using Convex.dev as the backend. It focuses on automatically learning and storing user preferences (style, budget, size, interaction signals), personalizing future searches, and enabling users to review and edit their learned profile. The instructions adhere strictly to Convex's architectural patterns, emphasizing the use of Convex Actions, Mutations, and Queries for all backend logic and integrating seamlessly with a Next.js frontend.
**Tech Stack**: Next.js, Convex (database, auth, backend functions), TypeScript.
**Source**: Refer to the `documentation_sources` in the YAML header for detailed links.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
*   **Node.js Runtimes**: Convex now supports Node.js 20 and 22 for Actions, with Node.js 18 being deprecated. Projects on Node.js 18 will be automatically migrated to Node.js 20 by October 22, 2025. [cite: 4 (search 4)]
*   **Asynchronous Index Backfills**: Large tables can now stage indexes, allowing backfilling without blocking deployments. [cite: 4 (search 4)]
*   **AI SDK v5 Support**: Convex's RAG and Agent components now support AI SDK v5, facilitating advanced AI workflows. [cite: 4 (search 4)]
*   **Convex Auth for Next.js**: Improvements have been made to server-side authentication support for Next.js in Convex Auth, including custom claims in JWTs. [cite: 1 (search 4)]
*   **`npx convex init` / `reinit` Deprecation**: These CLI commands are deprecated in favor of `npx convex dev --configure`. [cite: 1 (search 4)]
*   **General Availability**: Text Search, File Storage, Pagination, and Optimistic Updates have moved out of beta. [cite: 5 (search 5)]
*   **Convex Insights Free**: The performance monitoring tool, Convex Insights, is now available for all users. [cite: 5 (search 5)]

### 2. Common Pitfalls & Solutions 🚨
*   **Side Effects in Queries/Mutations**:
    *   **Pitfall**: Attempting to make external API calls or non-deterministic operations directly within `queries` or `mutations`.
    *   **Solution**: `Queries` and `mutations` are designed to be deterministic and transactional. All external API calls, complex business logic that isn't purely transactional, and non-deterministic operations (like sending emails or calling an LLM) MUST be wrapped in a Convex `action`. A `mutation` can schedule an `action` to run asynchronously if needed. [cite: 1 (search 1), 5 (search 1), 1 (search 6)]
*   **Dangling Promises in Actions**:
    *   **Pitfall**: Forgetting to `await` all Promises within an `action` function. Unawaited promises might not complete or could lead to errors in subsequent invocations if the Node.js runtime is reused.
    *   **Solution**: Always `await` every Promise created within an `action` to ensure all asynchronous tasks complete before the action returns. [cite: 3 (search 1)]
*   **Lack of Argument Validation and Access Control**:
    *   **Pitfall**: Exposing Convex functions without validating inputs or checking user authorization.
    *   **Solution**: Always include argument validators (e.g., `v.string()`, `v.id("table")`, `v.int64()`) for all `query`, `mutation`, and `action` functions. Implement robust access control using `ctx.auth.getUserIdentity()` or custom helper functions for all public-facing functions. [cite: 2 (search 1), 4 (search 1), 3 (search 3)]
*   **Incorrect Data Types (`Map`, `Set`, `BigInt`)**:
    *   **Pitfall**: Using JavaScript `Map`s, `Set`s, or native `BigInt`s for database storage or function arguments/returns.
    *   **Solution**: `Map`s and `Set`s are disallowed in function input/output and for database writes. Use arrays or plain JavaScript objects (`{ [key: string]: Value }`) instead. `v.bigint` is deprecated; use `v.int64()` for 64-bit integers. [cite: 3 (search 4), 5 (search 4)]
*   **Overuse of `ctx.runAction`**:
    *   **Pitfall**: Calling `ctx.runAction` from within another action unnecessarily. This incurs overhead and counts as an extra function call.
    *   **Solution**: Only use `ctx.runAction` to cross JavaScript runtimes (e.g., from V8 to Node.js action). Otherwise, refactor shared logic into a synchronous async helper function callable by both. [cite: 3 (search 1)]
*   **Side Effects in Next.js GET Requests with Cookie Auth**:
    *   **Pitfall**: Performing `mutations` or `actions` from Next.js Server Components or GET Route Handlers when using cookie-based authentication, as this can be vulnerable to CSRF attacks.
    *   **Solution**: Only call Convex `queries` from Next.js Server Components and GET Route Handlers. Use Next.js Server Actions or POST/PUT Route Handlers for calling Convex `mutations` and `actions` to ensure security. [cite: 1 (search 3)]

### 3. Best Practices 🚨
*   **TypeScript First**: Leverage TypeScript for all Convex functions and client-side code for end-to-end type safety and better developer experience. [cite: 1 (search 1)]
*   **Function Types**:
    *   **`query`**: For pure reads from the database. They are reactive and automatically cached. [cite: 1 (search 1)]
    *   **`mutation`**: For transactional reads and writes to the database. They guarantee atomicity and consistency. [cite: 1 (search 1), 5 (search 1)]
    *   **`action`**: For external API calls, complex business logic, or operations requiring non-determinism (e.g., calling an LLM, sending emails, processing files). Actions interact with the database by calling `queries` or `mutations`. [cite: 1 (search 1), 3 (search 1), 1 (search 6)]
    *   **`httpAction`**: For exposing custom HTTP endpoints (e.g., webhooks) directly from Convex. They handle raw `Request` and `Response` objects. [cite: 4 (search 3)]
*   **Internal vs. Public Functions**:
    *   Use `internalQuery`, `internalMutation`, `internalAction` for functions meant to be called only from other Convex functions (backend-only). [cite: 4 (search 1)]
    *   Use `query`, `mutation`, `action` for functions exposed to the client. Always protect these with robust access control. [cite: 4 (search 1)]
*   **Helper Functions**: Define helper functions (plain TypeScript functions) to share business logic, data validation, and authorization checks across multiple Convex functions. This keeps your functions lean and promotes reusability. [cite: 1 (search 1)]
*   **Optimistic Updates**: Implement optimistic updates on the client-side for mutations to provide an instantaneous UI experience, improving perceived performance. [cite: 1 (search 1)]
*   **Database Indexing & Pagination**: For large tables (thousands of documents), define appropriate indexes and use pagination in queries to ensure efficient data retrieval and prevent performance bottlenecks. [cite: 1 (search 1)]
*   **Error Handling in Actions**: Since actions are not automatically retried, implement explicit error handling (e.g., try-catch blocks, retries for idempotent operations) within your actions for robust external service interactions. [cite: 3 (search 1)]

## Implementation Steps

The "Preference Memory" feature requires storing user preferences, processing interaction signals, and personalizing content. This will involve a combination of Convex database operations (`mutations`, `queries`) and potentially external service integrations (`actions`) for advanced "learning" or "personalization" logic.

### Backend Implementation
1.  **Define Schema**: Create a Convex schema (`convex/schema.ts`) to define tables for `users`, `preferences`, `savedItems`, and `interactionSignals`.
    *   `users`: Stores basic user info (linked to auth).
    *   `preferences`: Stores learned user preferences (style, budget, size, etc.) with a reference to the `userId`.
    *   `savedItems`: Stores items explicitly saved or purchased by the user, with fields relevant for preference extraction (e.g., `itemId`, `category`, `price`, `color`, `size`).
    *   `interactionSignals`: Stores raw user interactions (e.g., `viewedProductId`, `likedProductId`, `searchQuery`, `timestamp`).
2.  **Authentication Integration**: Integrate Convex Auth (or a third-party provider like Clerk) for user authentication. Ensure `ctx.auth.getUserIdentity()` is available in all relevant Convex functions to identify the current user.
3.  **Data Operations (CRUD for Preferences)**: Implement Convex `queries` to fetch user preferences and `mutations` to store and update them based on user explicit input.
4.  **Signal Processing Logic (Learning)**: Use Convex `actions` to process raw `interactionSignals` and derive/update `preferences`. This might involve calling external AI/ML services for sophisticated preference learning.
5.  **Personalized Search Logic**: Implement Convex `actions` to interact with an external search API, passing user preferences (fetched via a `query`) to personalize search results.
6.  **File Storage (Optional)**: If user preferences involve media (e.g., saved outfit images), use Convex File Storage for uploads and retrieval.

#### Convex Functions (Primary)
*   `convex/preferences.ts`:
    *   `getPreferences(ctx)` (Query): Retrieves the authenticated user's preference profile.
    *   `updatePreferences(ctx, { style, budget, size, ... })` (Mutation): Updates specific preference fields for the authenticated user.
*   `convex/savedItems.ts`:
    *   `getSavedItems(ctx)` (Query): Fetches items saved or purchased by the user.
    *   `addSavedItem(ctx, { itemId, category, details })` (Mutation): Records a new saved/purchased item.
    *   `removeSavedItem(ctx, { itemId })` (Mutation): Removes a saved item.
*   `convex/interactionSignals.ts`:
    *   `logInteraction(ctx, { type, data })` (Mutation): Logs raw user interaction signals (e.g., item view, like, search query).
*   `convex/preferenceLearning.ts`:
    *   `processSignalsAndUpdatePreferences(ctx, { userId })` (Internal Action): An internal action that aggregates `interactionSignals` for a user, potentially calls an external ML model to learn new preferences, and then calls `updatePreferences` mutation. This action could be triggered by a scheduled cron job or another mutation.
*   `convex/personalizedSearch.ts`:
    *   `getPersonalizedSearchResults(ctx, { searchQuery })` (Action): Fetches the user's preferences via an internal query, then makes an HTTP request to an external search API (e.g., Algolia, ElasticSearch) with the `searchQuery` and user `preferences` to get personalized results.
*   `convex/http.ts` (Optional, if external webhooks are needed for preference updates):
    *   `webhookHandler(ctx, request)` (HttpAction): Receives webhooks from external services (e.g., payment processor for purchases, analytics platform for clicks) and logs `interactionSignals` via an internal mutation.

### Frontend Integration
1.  **Convex Client Setup**: Initialize `ConvexReactClient` in your Next.js app's root layout or `_app.tsx` and wrap your app with `ConvexProviderWithAuth`.
2.  **Auth UI**: Implement sign-in/sign-up components using your chosen auth provider.
3.  **Display Preferences**: Use `useQuery(api.preferences.getPreferences)` in a React Server Component or Client Component to display the user's learned preference profile.
4.  **Edit Preferences**: Use `useMutation(api.preferences.updatePreferences)` for UI forms that allow users to manually adjust their preferences.
5.  **Save/Purchase Items**: Use `useMutation(api.savedItems.addSavedItem)` when a user saves or purchases an item.
6.  **Log Interactions**: Call `useMutation(api.interactionSignals.logInteraction)` from various UI points (e.g., when a user views a product, clicks a "like" button, or submits a search query) to feed interaction data to the backend.
7.  **Personalized Search UI**: Use `useAction(api.personalizedSearch.getPersonalizedSearchResults)` to trigger personalized searches and display the results. Consider optimistic updates for a smoother search experience if the action is quick.

## Code Patterns

### Convex Backend Functions

**1. Schema Definition (`convex/schema.ts`)**
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(), // From auth provider
    name: v.string(),
    email: v.string(),
    profileImageUrl: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  preferences: defineTable({
    userId: v.id("users"),
    style: v.optional(v.array(v.string())), // e.g., ["casual", "boho"]
    budget: v.optional(v.object({ min: v.number(), max: v.number() })),
    size: v.optional(v.array(v.string())), // e.g., ["M", "32x32"]
    // Add more preference fields as needed
    lastUpdated: v.number(),
  }).index("by_userId", ["userId"]),

  savedItems: defineTable({
    userId: v.id("users"),
    itemId: v.string(), // External product ID
    category: v.string(),
    details: v.object({
      name: v.string(),
      price: v.number(),
      color: v.optional(v.string()),
      // other relevant item attributes
    }),
    savedAt: v.number(),
  }).index("by_userId_itemId", ["userId", "itemId"]),

  interactionSignals: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("view"), v.literal("like"), v.literal("purchase"), v.literal("search")),
    data: v.any(), // e.g., { productId: "...", category: "..." }, { query: "..." }
    timestamp: v.number(),
  }).index("by_userId_timestamp", ["userId", "timestamp"]),
});
```

**2. Query (Read User Preferences)**
```typescript
// convex/preferences.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    return ctx.db
      .query("preferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});
```

**3. Mutation (Update User Preferences)**
```typescript
// convex/preferences.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updatePreferences = mutation({
  args: {
    style: v.optional(v.array(v.string())),
    budget: v.optional(v.object({ min: v.number(), max: v.number() })),
    size: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    const existingPreferences = await ctx.db
      .query("preferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const newPreferences = {
      ...existingPreferences,
      ...args,
      lastUpdated: Date.now(),
    };

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, newPreferences);
    } else {
      await ctx.db.insert("preferences", { userId: user._id, ...newPreferences });
    }
  },
});
```

**4. Action (Process Signals & Call External ML)**
```typescript
// convex/preferenceLearning.ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api"; // For calling internal mutation

export const processSignalsAndUpdatePreferences = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 1. Fetch recent interaction signals for the user
    const signals = await ctx.runQuery(internal.interactionSignals.getRecentSignals, { userId });

    // 2. Aggregate signals and prepare for external ML model
    const aggregatedData = signals.reduce((acc, signal) => {
      // Logic to aggregate signals, e.g., count product views by category,
      // extract keywords from search queries, etc.
      return acc;
    }, {});

    // 3. Call an external ML model (e.g., an LLM or a custom recommendation API)
    // CRITICAL: Ensure external API key is securely stored in Convex environment variables.
    const externalMlApiKey = process.env.OPENAI_API_KEY; // Example
    if (!externalMlApiKey) {
      console.error("OPENAI_API_KEY environment variable not set.");
      return;
    }

    try {
      const response = await fetch("https://api.external-ml.com/learn-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${externalMlApiKey}`,
        },
        body: JSON.stringify({ userId, data: aggregatedData }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`External ML API error: ${response.status} - ${errorBody}`);
        throw new Error(`Failed to learn preferences from external ML. Status: ${response.status}`);
      }

      const { learnedStyle, learnedBudget, learnedSize } = await response.json();

      // 4. Update user preferences in Convex via an internal mutation
      await ctx.runMutation(internal.preferences.updatePreferences, {
        userId,
        style: learnedStyle,
        budget: learnedBudget,
        size: learnedSize,
      });

      console.log(`Preferences updated for user ${userId}`);
    } catch (error) {
      console.error("Error in processSignalsAndUpdatePreferences:", error);
      // Implement retry logic or dead-letter queue if critical
    }
  },
});

// A corresponding internal query to fetch recent signals
// convex/interactionSignals.ts
export const getRecentSignals = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Fetch last N signals or signals within a time window
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("interactionSignals")
      .withIndex("by_userId_timestamp", (q) =>
        q.eq("userId", userId).gt("timestamp", oneWeekAgo)
      )
      .order("desc")
      .take(100); // Take up to 100 recent signals
  },
});
```

### Frontend Integration
```typescript
// app/layout.tsx (or similar root file for ConvexProviderWithAuth)
import { ClerkProvider } from "@clerk/nextjs"; // Example with Clerk
import { ConvexProviderWithClerk } from "convex-clerk"; // Or ConvexProviderWithAuth from @convex-dev/auth/react
import { ConvexReactClient } from "convex/react";
import "./globals.css";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          <ConvexProviderWithClerk