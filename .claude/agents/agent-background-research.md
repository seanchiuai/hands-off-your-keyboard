name: agent-gemini-background-research
description: Implements Background Research using Gemini API with Google Search
model: inherit
color: purple
tech_stack:
  framework: Next.js
  database: Convex
  auth: Clerk
  provider: Google Gemini API
generated: 2025-10-17T03:14:00Z
documentation_sources:
  - https://docs.convex.dev/functions/actions
  - https://docs.convex.dev/functions/http-actions
  - https://ai.google.dev/gemini-api/docs/grounding
  - https://ai.google.dev/gemini-api/docs
  - https://docs.convex.dev/auth/clerk
  - https://docs.convex.dev/react/use-query
  - https://docs.convex.dev/storage/environment-variables

---

# Agent: Background Research Implementation with Gemini API

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Background Research" feature. This feature will search for products across retailers and marketplaces based on a user's query, re-rank and filter results by criteria like price, reviews, and availability, and stream new options into the UI in real-time. This is achieved by integrating Google Gemini API with Search grounding for product discovery and Convex for backend logic, data storage, and real-time updates, all within a Next.js application using Clerk for authentication.
**Tech Stack**: Next.js (App Router), Convex (Backend, Database, Real-time), Clerk (Authentication), Google Gemini API (Product Search with Grounding).
**Source**: Refer to the `documentation_sources` in the metadata for detailed references.

## Critical Implementation Knowledge
### 1. Gemini API & Convex Integration 🚨
*   **Convex Actions**: Designed for external API calls (`fetch`), complex business logic, and third-party integrations, operating in a Node.js environment. They are not part of the reactive sync engine directly; to achieve real-time UI updates, actions *must* trigger Convex Mutations to write data to the database. Actions are not automatically retried by Convex upon failure; implement custom retry logic if necessary.
*   **Gemini API with Search Grounding**: Google's Gemini API supports grounding responses with Google Search results. By using the `googleSearch` tool in the API request, Gemini can access real-time web information to find current product listings, prices, and availability. The API returns structured responses that can include product information extracted from search results.
*   **Gemini API Response Format**: Gemini returns responses in a structured format with `candidates` containing `content` with `parts`. Each part can contain text that may include JSON-formatted product data or structured text that needs to be parsed.
*   **Convex & Next.js Authentication (Clerk)**: `ConvexProviderWithClerk` is the recommended way to integrate Clerk authentication with Convex in a React/Next.js client-side application. Backend Convex functions (actions, mutations, queries) validate Clerk JWTs using a configured `CLERK_JWT_ISSUER_DOMAIN` environment variable to access user identity via `ctx.auth.getUserIdentity()`.

### 2. Common Pitfalls & Solutions 🚨
*   **Pitfall**: Attempting `fetch` calls directly within Convex Queries or Mutations.
    *   **Solution**: All external API calls, including to Gemini API, *must* be encapsulated within Convex Actions. Queries and Mutations are deterministic and cannot perform arbitrary external I/O.
*   **Pitfall**: Expecting Convex Actions to automatically trigger real-time UI updates.
    *   **Solution**: After an action fetches and processes data from Gemini API, it *must* call a Convex Mutation (e.g., `ctx.runMutation(internal.myModule.storeData, { ... })`) to persist the data to the Convex database. The Convex frontend, using `useQuery` hooks, will then reactively subscribe to these database changes.
*   **Pitfall**: Gemini API rate limiting or quota exceeded.
    *   **Solution**: Implement proper error handling for rate limit responses. Use exponential backoff for retries. Monitor API usage in the Google Cloud Console and set up appropriate quotas.
*   **Pitfall**: Authentication failures between Clerk and Convex.
    *   **Solution**: Ensure the Clerk JWT template is correctly set up for Convex in the Clerk dashboard, and the `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex is correctly pointing to your Clerk Frontend API URL.
*   **Pitfall**: Gemini API returning unstructured text instead of JSON.
    *   **Solution**: Implement robust parsing logic that can handle both JSON-formatted responses and structured text. Use regex and text parsing as fallbacks when JSON extraction fails.

### 3. Best Practices 🚨
*   **Convex Actions for External API Calls**: Always use Convex Actions for any interaction with Gemini API or other external services.
*   **Convex Mutations for Database Writes**: Design your workflow such that Actions, after gathering external data, delegate database write operations to dedicated Mutations. This preserves Convex's transactional guarantees and real-time reactivity.
*   **Convex Queries for Real-time Data**: Leverage Convex `useQuery` hooks in your Next.js frontend to subscribe to the database table storing the product search results. This ensures the UI updates in real-time as new data is collected and processed.
*   **Scheduler for Continuous Operations**: For continuous research updates, utilize Convex's built-in scheduler to periodically trigger your Gemini API search action. This automates the background research without needing client-side intervention.
*   **Secure Environment Variables**: Store Gemini API keys and Clerk secrets securely in Convex environment variables. Never hardcode them.
*   **Robust Error Handling**: Implement `try-catch` blocks in your Convex Actions for Gemini API calls. Log errors comprehensively and consider implementing retry mechanisms with exponential backoff for transient issues like rate limits.
*   **Data Transformation & Schema**: Process and transform Gemini API results within your Convex Action before writing to the database via a Mutation. Define clear Convex schemas for your product data to ensure type safety, consistency, and efficient querying/filtering.
*   **Internal Functions**: When Convex Actions call other Convex Mutations or Actions, use `internal` functions (e.g., `ctx.runMutation(internal.myModule.myMutation, ...)`) for secure and type-safe internal communication.

## Implementation Steps

### Backend Implementation
The backend will primarily use Convex Actions for interacting with Gemini API, Convex Mutations for storing results, and Convex Queries for real-time streaming to the frontend.

#### Convex Functions (Primary)

1.  **Define Gemini API Product Search Action (`convex/actions/brightdata.ts`)**:
    *   Create a Convex Action that receives a `query` (e.g., user's product search).
    *   This action will make an HTTP request to the Gemini API with Google Search grounding enabled. It will include the Gemini API key and necessary parameters for the search (query text, price constraints).
    *   The Gemini API will use Google Search to find current product listings and return structured product information.
    *   The action will process the response from Gemini API, parsing JSON or structured text to extract product information (price, reviews, availability, URL, descriptions).
    *   After processing, the action will call an `internal` Convex Mutation to store the structured product data in the database.
    *   Consider implementing a scheduler to periodically run this action for continuous background research.

2.  **Define Product Storage Mutation (`convex/mutations/brightdata.ts`)**:
    *   Create an internal Convex Mutation that accepts an array of structured product objects.
    *   This mutation will insert or update product documents in a `products` table in the Convex database.
    *   The schema is already defined in `convex/schema.ts` with fields for `queryId`, `title`, `price`, `rating`, `reviewsCount`, `availability`, `imageUrl`, `productUrl`, `source`, `searchRank`, and `systemRank`.

3.  **Define Real-time Product Query (`convex/products.ts`)**:
    *   Create a Convex Query that fetches product results based on a query ID and optional filters (price range, minimum rating, availability, source).
    *   This query subscribes to changes in the `products` table, ensuring that any new products inserted by the Gemini API action are automatically streamed to the subscribed frontend clients.
    *   Include authentication checks (`ctx.auth.getUserIdentity()`) to ensure users only see their relevant search results.

4.  **Convex Authentication Configuration (`convex/auth.config.ts`)**:
    *   Configure Convex to validate Clerk JWTs by specifying the `CLERK_JWT_ISSUER_DOMAIN`. This file defines your authentication providers for Convex.

### Frontend Integration
The Next.js frontend will interact with Convex using its React SDK, leveraging `useMutation` for triggering actions and `useQuery` for real-time data display. Clerk components will handle user authentication.

*   **Convex Client Provider**: The app is wrapped with `ConvexProviderWithClerk` to establish the connection to Convex and integrate Clerk authentication.
*   **Triggering Research**: Use `useMutation` hook to call the `queries.createSearchQuery` mutation when a user initiates a search query. This automatically triggers the Gemini API search action.
*   **Displaying Real-time Results**: Use `useQuery` hook to fetch and subscribe to the `products.getFilteredProducts` query, displaying results as they are streamed into the UI. The UI includes filtering controls for price, rating, and source.
*   **User Interface**: Clerk's UI components are integrated for sign-in, sign-up, and user profile management in the main layout.

## Code Patterns

**Note**: The background research feature is fully implemented in the codebase. Refer to the following files for the actual implementation:
- **Product Search Action**: `convex/actions/brightdata.ts` (uses Gemini API with Google Search grounding)
- **Product Storage Mutations**: `convex/mutations/brightdata.ts`
- **Product Queries**: `convex/products.ts`
- **Search Query Management**: `convex/queries.ts`
- **Frontend UI**: `app/research/page.tsx`, `components/SearchInput.tsx`, `components/ProductCarousel.tsx`

### Convex Backend Functions (Reference)

1.  **`convex/brightData.ts` (Action to call Bright Data)**:
    ```typescript
    import { action } from "./_generated/server";
    import { internal } from "./_generated/api";
    import { v } from "convex/values";

    export const startBackgroundResearch = action({
      args: { query: v.string(), userId: v.id("users") }, // Link to authenticated user
      handler: async (ctx, { query, userId }) => {
        // Auth check if necessary, though userId passed as argument.
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) throw new Error("Not authenticated");

        const BRIGHT_DATA_COLLECTOR_ID = process.env.BRIGHT_DATA_COLLECTOR_ID!;
        const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY!;
        const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || "static"; // Example proxy zone

        // --- Step 1: Trigger Bright Data Scraper ---
        // This is a simplified example. Refer to Bright Data docs for actual API calls.
        const brightDataPayload = {
          collector: BRIGHT_DATA_COLLECTOR_ID,
          payload: {
            query,
            // Example: Pass user-specific parameters or target URLs
            // "target_url": `https://example.com/search?q=${encodeURIComponent(query)}`,
            // "delivery_webhook": `${process.env.CONVEX_SITE_URL}/api/brightdata-webhook`, // If push delivery is used
          },
          // For real-time polling, you might trigger and then poll a job status endpoint
          // For continuous crawling, consider using Bright Data's scheduler or Convex scheduler.
        };

        const response = await fetch("https://api.brightdata.com/dca/trigger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
            "X-BD-Agent": BRIGHT_DATA_ZONE, // Specify proxy zone
          },
          body: JSON.stringify(brightDataPayload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Bright Data API Error:", errorBody);
          throw new Error(`Bright Data API failed: ${response.status} - ${errorBody}`);
        }

        const brightDataResult = await response.json();
        // --- Step 2: Process Bright Data Result ---
        const products = brightDataResult.data.map((item: any) => ({
          query,
          userId, // Link to the user who initiated the research
          productName: item.title,
          price: parseFloat(item.price),
          rating: parseFloat(item.rating),
          reviewCount: parseInt(item.reviews),
          availability: item.inStock,
          imageUrl: item.image,
          productUrl: item.url,
          sourceRetailer: item.retailer,
          lastUpdated: Date.now(),
        }));

        // --- Step 3: Store Processed Data in Convex via Mutation ---
        await ctx.runMutation(internal.products.insertOrUpdateProducts, { products });

        return { success: true, count: products.length };
      },
    });
    ```

2.  **`convex/products.ts` (Mutation for storing data)**:
    ```typescript
    import { mutation, query } from "./_generated/server";
    import { v } from "convex/values";

    export const productsSchema = {
      query: v.string(),
      userId: v.id("users"), // Link to authenticated user
      productName: v.string(),
      price: v.number(),
      rating: v.optional(v.number()),
      reviewCount: v.optional(v.number()),
      availability: v.boolean(),
      imageUrl: v.optional(v.string()),
      productUrl: v.string(),
      sourceRetailer: v.string(),
      lastUpdated: v.number(),
    };

    export const insertOrUpdateProducts = mutation({
      args: { products: v.array(v.object(productsSchema)) },
      handler: async (ctx, { products }) => {
        // For each product, insert if new, or update if already exists (e.g., by productUrl + userId)
        const insertedIds = [];
        for (const product of products) {
          const existing = await ctx.db
            .query("products")
            .withIndex("by_url_and_user", (q) =>
              q.eq("productUrl", product.productUrl).eq("userId", product.userId)
            )
            .first();

          if (existing) {
            await ctx.db.patch(existing._id, product);
          } else {
            const newId = await ctx.db.insert("products", product);
            insertedIds.push(newId);
          }
        }
        return insertedIds;
      },
    });

    export const listProducts = query({
      args: {
        searchQuery: v.string(),
        minPrice: v.optional(v.number()),
        maxPrice: v.optional(v.number()),
        minRating: v.optional(v.number()),
        // Add more filters as needed
      },
      handler: async (ctx, { searchQuery, minPrice, maxPrice, minRating }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          return []; // Or throw an error if authentication is mandatory
        }
        const userId = identity.subject; // Clerk user ID

        let products = await ctx.db
          .query("products")
          .withIndex("by_user_and_query", (q) =>
            q.eq("userId", userId).eq("query", searchQuery)
          )
          .collect();

        // Apply additional filters (price, rating) in memory if not indexed, or enhance query
        if (minPrice !== undefined) products = products.filter((p) => p.price >= minPrice);
        if (maxPrice !== undefined) products = products.filter((p) => p.price <= maxPrice);
        if (minRating !== undefined) products = products.filter((p) => (p.rating || 0) >= minRating);

        // Re-rank (example: by price ascending)
        products.sort((a, b) => a.price - b.price);

        return products;
      },
    });
    ```

3.  **`convex/auth.config.ts` (Authentication config)**:
    ```typescript
    import { AuthConfig } from "convex/server";

    const authConfig: AuthConfig = {
      providers: [
        {
          domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
          applicationID: "clerk", // Must be "clerk"
        },
      ],
    };

    export default authConfig;
    ```

## Testing & Debugging
*   **Convex Dashboard**: Use the Convex dashboard (`dashboard.convex.dev`) to manually run and inspect your `startBackgroundResearch` action. Check its logs for any errors from Bright Data or during data processing.
*   **Convex Logs**: Monitor Convex logs in real-time (`npx convex dev` or dashboard) to trace the execution flow from action to mutation and identify any issues.
*   **Bright Data Control Panel**: Verify successful job execution, data collection, and potential errors within your Bright Data control panel.
*   **Database Inspection**: After an action runs, check the `products` table in the Convex dashboard to ensure data is being correctly inserted/updated.
*   **Frontend `useQuery`**: Use React Dev Tools to inspect the data returned by your `useQuery` hook and ensure the UI is rendering the latest real-time data.
*   **Authentication**: Test with logged-in and logged-out users to ensure `ctx.auth` checks are working correctly and user-specific data is isolated.

## Environment Variables
*   `