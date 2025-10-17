name: agent-brightdata-background-research
description: Implements Background Research using Bright Data
model: inherit
color: purple
tech_stack:
  framework: Next.js
  database: Convex
  auth: Clerk
  provider: Bright Data
generated: 2025-10-17T03:14:00Z
documentation_sources:
  - https://docs.convex.dev/functions/actions
  - https://docs.convex.dev/functions/http-actions
  - https://docs.brightdata.com/docs/web-scraper-api/getting-started
  - https://brightdata.com/products/web-scraper-api
  - https://brightdata.com/products/scraping-browser
  - https://docs.convex.dev/auth/clerk
  - https://docs.convex.dev/react/use-query
  - https://docs.convex.dev/storage/environment-variables

---

# Agent: Background Research Implementation with Bright Data

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Background Research" feature. This feature will continuously crawl retailers and marketplaces based on a user's query, re-rank and filter results by criteria like price, reviews, and availability, and stream new options into the UI in real-time. This is achieved by integrating Bright Data for web scraping and Convex for backend logic, data storage, and real-time updates, all within a Next.js application using Clerk for authentication.
**Tech Stack**: Next.js (App Router), Convex (Backend, Database, Real-time), Clerk (Authentication), Bright Data (Web Scraping API).
**Source**: Refer to the `documentation_sources` in the metadata for detailed references.

## Critical Implementation Knowledge
### 1. Bright Data & Convex Latest Updates 🚨
*   **Convex Actions**: Designed for external API calls (`fetch`), complex business logic, and third-party integrations, operating in a Node.js environment. They are not part of the reactive sync engine directly; to achieve real-time UI updates, actions *must* trigger Convex Mutations to write data to the database. Actions are not automatically retried by Convex upon failure; implement custom retry logic if necessary.
*   **Bright Data Products**: For web crawling and data extraction, Bright Data offers several key products. The **Web Scraper API** (or Data Collector) provides a cloud-based service for automated data extraction, handling IP rotation, CAPTCHA solving, and parsing into structured formats. For highly dynamic or anti-bot protected websites, the **Scraping Browser API** (compatible with Puppeteer/Playwright) is recommended, offering advanced browser interaction and anti-detection capabilities.
*   **Bright Data Delivery**: Data can be delivered in batches (collecting data over time then delivering) or in real-time (delivering as collected). Integration patterns often involve API polling or push delivery (webhooks). Given Convex Actions can expose HTTP endpoints, push delivery to a Convex HTTP Action is a viable option for real-time streaming from Bright Data.
*   **Convex & Next.js Authentication (Clerk)**: `ConvexProviderWithClerk` is the recommended way to integrate Clerk authentication with Convex in a React/Next.js client-side application. Backend Convex functions (actions, mutations, queries) validate Clerk JWTs using a configured `CLERK_JWT_ISSUER_DOMAIN` environment variable to access user identity via `ctx.auth.getUserIdentity()`.

### 2. Common Pitfalls & Solutions 🚨
*   **Pitfall**: Attempting `fetch` calls directly within Convex Queries or Mutations.
    *   **Solution**: All external API calls, including to Bright Data, *must* be encapsulated within Convex Actions. Queries and Mutations are deterministic and cannot perform arbitrary external I/O.
*   **Pitfall**: Expecting Convex Actions to automatically trigger real-time UI updates.
    *   **Solution**: After an action fetches and processes data from Bright Data, it *must* call a Convex Mutation (e.g., `ctx.runMutation(internal.myModule.storeData, { ... })`) to persist the data to the Convex database. The Convex frontend, using `useQuery` hooks, will then reactively subscribe to these database changes.
*   **Pitfall**: Inefficient or unmanaged scraping leading to high Bright Data costs.
    *   **Solution**: Carefully define your Bright Data collector scripts and monitor usage. Implement robust error handling and only request necessary data. For continuous background research, leverage Convex's scheduler to control the frequency and volume of Bright Data API calls.
*   **Pitfall**: Authentication failures between Clerk and Convex.
    *   **Solution**: Ensure the Clerk JWT template is correctly set up for Convex in the Clerk dashboard, and the `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex is correctly pointing to your Clerk Frontend API URL.
*   **Pitfall**: Scraping dynamic, JavaScript-rendered content without a full browser.
    *   **Solution**: For modern SPAs or sites with heavy client-side rendering, `fetch` alone might not suffice. Use Bright Data's Scraping Browser API with Puppeteer/Playwright integration, as it handles browser rendering, CAPTCHAs, and anti-bot measures automatically.

### 3. Best Practices 🚨
*   **Convex Actions for External API Calls**: Always use Convex Actions for any interaction with Bright Data or other external services.
*   **Convex Mutations for Database Writes**: Design your workflow such that Actions, after gathering external data, delegate database write operations to dedicated Mutations. This preserves Convex's transactional guarantees and real-time reactivity.
*   **Convex Queries for Real-time Data**: Leverage Convex `useQuery` hooks in your Next.js frontend to subscribe to the database table storing the scraped research results. This ensures the UI updates in real-time as new data is collected and processed.
*   **Scheduler for Continuous Operations**: For "continuously crawls," utilize Convex's built-in scheduler to periodically trigger your Bright Data scraping action. This automates the background research without needing client-side intervention.
*   **Secure Environment Variables**: Store Bright Data API keys, collector IDs, and Clerk secrets securely in Convex environment variables. Never hardcode them.
*   **Robust Error Handling**: Implement `try-catch` blocks in your Convex Actions for Bright Data API calls. Log errors comprehensively and consider implementing retry mechanisms with exponential backoff for transient issues.
*   **Data Transformation & Schema**: Process and transform raw Bright Data results within your Convex Action before writing to the database via a Mutation. Define clear Convex schemas for your scraped data to ensure type safety, consistency, and efficient querying/filtering.
*   **Internal Functions**: When Convex Actions call other Convex Mutations or Actions, use `internal` functions (e.g., `ctx.runMutation(internal.myModule.myMutation, ...)`) for secure and type-safe internal communication.

## Implementation Steps

### Backend Implementation
The backend will primarily use Convex Actions for interacting with Bright Data, Convex Mutations for storing results, and Convex Queries for real-time streaming to the frontend.

#### Convex Functions (Primary)

1.  **Define Bright Data Scraping Action (`convex/brightData.ts`)**:
    *   Create a Convex Action that receives a `query` (e.g., spoken query for products).
    *   This action will make an HTTP request to the Bright Data Web Scraper API or trigger a specific Data Collector. It will include Bright Data API keys and any necessary parameters for the scraping job (e.g., target marketplaces, search terms).
    *   If using Bright Data's Scraping Browser API, the action will configure and interact with it (e.g., using `puppeteer-core` if compatible with Convex's Node.js runtime, or directly calling Bright Data's Scraping Browser API endpoints).
    *   The action will process the raw data returned by Bright Data, extracting relevant product information (price, reviews, availability, URL, images).
    *   After processing, the action will call an `internal` Convex Mutation to store the structured product data in the database.
    *   Consider implementing a scheduler to periodically run this action for continuous background research.

2.  **Define Product Storage Mutation (`convex/products.ts`)**:
    *   Create a Convex Mutation (`internal` if called from the action) that accepts an array of structured product objects.
    *   This mutation will insert or update product documents in a `products` table in the Convex database.
    *   Define a clear schema for the `products` table, including fields for `query`, `productName`, `price`, `rating`, `reviewCount`, `availability`, `imageUrl`, `productUrl`, `sourceRetailer`, `lastUpdated`, and `userId` (linked to Clerk).

3.  **Define Real-time Product Query (`convex/products.ts`)**:
    *   Create a Convex Query that fetches product results based on a user's initial query or other filters (price range, minimum rating, availability).
    *   This query will subscribe to changes in the `products` table, ensuring that any new products inserted by the Bright Data action are automatically streamed to the subscribed frontend clients.
    *   Include authentication checks (`ctx.auth.getUserIdentity()`) to ensure users only see their relevant search results or publicly available information.

4.  **Convex Authentication Configuration (`convex/auth.config.ts`)**:
    *   Configure Convex to validate Clerk JWTs by specifying the `CLERK_JWT_ISSUER_DOMAIN`. This file will define your authentication providers for Convex.

### Frontend Integration
The Next.js frontend will interact with Convex using its React SDK, leveraging `useMutation` for triggering actions and `useQuery` for real-time data display. Clerk components will handle user authentication.

*   **Convex Client Provider**: Wrap your Next.js application (or relevant parts) with `ConvexProviderWithClerk` to establish the connection to Convex and integrate Clerk authentication.
*   **Triggering Research**: Use `useMutation` hook to call the `brightData.scrapeRetailer` action when a user initiates a search query.
*   **Displaying Real-time Results**: Use `useQuery` hook to fetch and subscribe to the `products.listProducts` query, displaying results as they are streamed into the UI. Implement filtering and re-ranking logic on the client-side as needed, or enhance the Convex query to include server-side filtering.
*   **User Interface**: Integrate Clerk's UI components for sign-in, sign-up, and user profile management. Ensure that the UI reflects the authentication state.

## Code Patterns

### Convex Backend Functions

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