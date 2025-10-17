# Roadmap: Preference Memory

## Context
- Stack: Next.js, convex, convex
- Feature: Preference Memory with Convex Native Business Logic
- App Goal: An AI-powered shopping website with a real-time voice agent and a product research agent, building a memory of user preferences for personalized recommendations.
- User Experience: Users interact with a voice agent, receive product suggestions, save items, and can review/edit their learned preference profile. The system continuously refines recommendations based on interactions.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex project via `npx convex dev` (first time will prompt for GitHub login and project creation)
- [ ] Configure Convex dashboard for project overview
- [ ] Generate Convex deploy key (if manual deployments needed, though `npx convex deploy` handles this)
- [ ] Set up Convex authentication provider (e.g., Clerk or Auth0) dashboard configuration
- [ ] Configure Convex billing (understand Free/Starter plan limits vs. usage-based Professional plan)

### 2. Dependencies & Environment
- [ ] Install: `convex`, `react`, `react-dom`, `next`, `@convex-dev/react`, `@convex-dev/auth`, `@ai-sdk/google` (for Gemini LLM interaction)
- [ ] Env vars: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_AUTH_CLIENT_ID`, `CONVEX_AUTH_DOMAIN` (for Auth0/Clerk), `GOOGLE_API_KEY` (for Gemini)

### 3. Database Schema
- [ ] Structure:
    ```typescript
    // convex/schema.ts
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      users: defineTable({
        auth0Id: v.string(), // Or clerkUserId, etc.
        preferences: v.object({
          style: v.array(v.string()), // e.g., ["minimalist", "boho"]
          budget: v.optional(v.string()), // e.g., "affordable", "mid-range", "luxury"
          size: v.optional(v.string()), // e.g., "L", "XL", "family-of-four"
          productCategories: v.array(v.string()), // e.g., ["furniture", "electronics"]
          brands: v.array(v.string()), // e.g., ["IKEA", "Wayfair"]
          lastUpdated: v.number(),
          // Add other preference fields as needed
        }),
      })
      .index("by_auth0Id", ["auth0Id"]), // Ensure efficient lookup by user ID
      
      savedItems: defineTable({
        userId: v.id("users"),
        productId: v.string(), // External product ID
        productName: v.string(),
        productUrl: v.string(),
        imageUrl: v.string(),
        summary: v.string(),
        savedAt: v.number(),
        // Potentially extract implicit preferences from saved item attributes here
        implicitStyle: v.array(v.string()),
        implicitBudget: v.optional(v.string()),
        // etc.
      })
      .index("by_userId", ["userId"])
      .index("by_userId_productId", ["userId", "productId"]),

      interactionSignals: defineTable({
        userId: v.id("users"),
        type: v.union(v.literal("view"), v.literal("click"), v.literal("save"), v.literal("purchase"), v.literal("dislike")),
        itemId: v.optional(v.string()), // Product ID, if applicable
        queryText: v.optional(v.string()), // The user's voice query
        timestamp: v.number(),
        // Potentially include LLM analysis of interaction here
        extractedPreferenceKeywords: v.optional(v.array(v.string())),
      })
      .index("by_userId", ["userId"])
      .index("by_userId_timestamp", ["userId", "timestamp"]),
    });
    ```

### 4. Backend Functions
- [ ] Functions:
    - `users.getOrCreateUser`: Mutation to find or create a user document on first login, including initial empty preferences.
    - `users.getUserPreferences`: Query to fetch the authenticated user's preference profile.
    - `users.updateUserPreferences`: Mutation to explicitly update user preferences (e.g., from an "Edit Profile" page).
    - `savedItems.saveItem`: Mutation to record a product saved by the user. Includes extracting implicit preferences from the item's attributes.
    - `savedItems.getSavedItems`: Query to fetch a user's saved items.
    - `interactionSignals.recordInteraction`: Mutation to log user interactions (view, click, save, purchase, dislike, voice queries).
    - `preferences.learnFromInteractions`: **Action** (scheduled or triggered by `recordInteraction` mutation) to asynchronously process recent `interactionSignals` and `savedItems` for a user. This action will call the Gemini LLM via `@ai-sdk/google` to extract and refine preferences, then use a mutation to update `users.preferences`.
    - `productSearch.getRecommendedProducts`: Query (or Action for external API calls) that uses `users.preferences` to inform product search parameters.

### 5. Frontend
- [ ] Components:
    - `ConvexClientProvider`: Wraps the Next.js app to provide Convex context and authentication.
    - `UserProfileDisplay`: React Client Component to display current preferences using `useQuery(api.users.getUserPreferences)`.
    - `PreferenceEditor`: React Client Component for users to manually edit their preference profile, triggering `useMutation(api.users.updateUserPreferences)`.
    - `ProductCarouselItem`: Displays product details, including a "Save" button that triggers `useMutation(api.savedItems.saveItem)` and `useMutation(api.interactionSignals.recordInteraction)`.
    - `VoiceAgent`: Interacts with Pipecat and Gemini, passing user queries to Convex actions (e.g., `api.interactionSignals.recordInteraction` for the query itself, and potentially `api.productSearch.getRecommendedProducts`).
- [ ] State: Utilize Convex's reactive queries (`useQuery`) to automatically update UI components when underlying data (user preferences, saved items) changes in the database. Avoid redundant client-side state for data managed by Convex.

### 6. Error Prevention
- [ ] API errors: Implement `try/catch` blocks in Convex functions and client-side mutation calls.
- [ ] Validation: Use `v.string()`, `v.number()`, `v.array()`, `v.object()` for schema validation. Implement additional input validation in mutation arguments.
- [ ] Rate limiting: Apply `@convex-dev/rate-limiter` to key public mutations (e.g., `saveItem`, `recordInteraction`) to prevent abuse.
- [ ] Auth: Ensure all sensitive queries and mutations check `ctx.auth.getUserIdentity()` to verify user identity and authorization.
- [ ] Type safety: Leverage TypeScript for end-to-end type safety (Convex generates types from schema and functions).
- [ ] Boundaries: Use indexes (`.index()`) for efficient data retrieval to avoid fetching and filtering large datasets in memory. Limit the scope of data loaded by queries.

### 7. Testing
- [ ] Test scenarios:
    - User login and initial preference profile creation.
    - User explicitly updates preferences, and UI reflects changes.
    - User saves an item, verifying `savedItems` and `interactionSignals` are updated.
    - Automated background learning process updates `users.preferences` based on new signals.
    - `getRecommendedProducts` query returns relevant items based on the updated preference profile.
    - Unauthorized access attempts to user data are rejected.
    - Rate limits prevent excessive interaction logging from a single user.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. [convex.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHVrjWo2W8Jzq526HJ-uAVDE8r9P8dwVQMyV5Amh4IyNA8HfAJB6QKjkJLhG6FSO_t1VVT3NagBuMu7c0vqYfqKgJgIO-1uQsKNnIdiZUMrj4z3gFIOD2KGuQOXoXEyjdxJihkBVNSc4MUmvm3pLoOUfXGAloU32l8A1rMgwjQCzUeDcZsq)
2. [convex.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHWhZKl0UekifPhm6HVvur8PfjFDkJvCqT3VFrsWgwWdv3haQommRbhUASnPqPfoOOHlRnQw0GzQ1d0Mw7-9JA9MtXE22RcrqBLMlwNF_t4r1kTwcjIy6W-_gDCa8zyzDft)
