# Roadmap: Background Research

## Context
- Stack: Next.js, convex, convex
- Feature: Background Research with Convex Actions with Bright Data

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Bright Data account.
- [ ] Configure Bright Data Web Scraper API for target e-commerce sites (e.g., Amazon products).
- [ ] Generate Bright Data API key.
- [ ] Create Convex account and project.
- [ ] Configure Convex deployment settings via dashboard or CLI.

### 2. Dependencies & Environment
- [ ] Install: `convex`, `react`, `react-dom`, `next`, `typescript`, `@types/react`, `@types/node`, `@bright-data/scraper-sdk` (or similar HTTP client for API calls).
- [ ] Env vars: `BRIGHT_DATA_API_KEY`, `CONVEX_DEPLOYMENT_URL`.

### 3. Database Schema
- [ ] Structure: `products` table with fields:
    - `_id: Id<'products'>`
    - `queryId: Id<'queries'>` (link to the original search query)
    - `title: string`
    - `imageUrl: string`
    - `productUrl: string`
    - `price: number`
    - `currency: string`
    - `description: string`
    - `reviewsCount: number`
    - `availability: boolean`
    - `source: string` (e.g., "Amazon", "Walmart")
    - `searchRank: number` (initial rank from Bright Data)
    - `systemRank: number` (rank after internal filtering/re-ranking)
    - `createdAt: number`
- [ ] Structure: `queries` table with fields:
    - `_id: Id<'queries'>`
    - `userId: Id<'users'>`
    - `searchText: string` (the spoken query from the user)
    - `status: "pending" | "searching" | "completed" | "failed"`
    - `preferences: object` (user's saved shopping preferences)
    - `createdAt: number`
    - `updatedAt: number`

### 4. Backend Functions
- [ ] `api/products.ts`:
    - `query: getProductsForQuery(queryId: Id<'queries'>)`: Fetches product results for a given query, ordered by `systemRank`.
    - `mutation: saveProductToList(userId: Id<'users'>, productId: Id<'products'>)`: Saves a product to a user's personal list.
- [ ] `api/queries.ts`:
    - `mutation: createSearchQuery(userId: Id<'users'>, searchText: string, preferences: object)`: Creates a new search query record and schedules the initial Bright Data action.
    - `query: getQueryStatus(queryId: Id<'queries'>)`: Fetches the status of a search query.
- [ ] `convex/actions/brightdata.ts` (internal action):
    - `internalAction: initiateProductSearch(queryId: Id<'queries'>, searchText: string, preferences: object)`:
        - Calls Bright Data Web Scraper API with `searchText` and `preferences`.
        - Processes results (filters, re-ranks, deduplicates).
        - Calls `internalMutation: storeProductResults` to persist products.
        - Schedules itself to run again if continuous searching is required or if new relevant criteria emerge.
- [ ] `convex/mutations/brightdata.ts` (internal mutation):
    - `internalMutation: storeProductResults(queryId: Id<'queries'>, products: Product[])`: Stores fetched and processed products into the `products` table. Updates `queries` table status.

### 5. Frontend
- [ ] Components:
    - `ProductCarousel`: Displays products from the `products` table, subscribed via `useQuery`.
    - `SearchInput`: Captures user's voice input (from AI agent) and triggers `createSearchQuery` mutation.
    - `ProductCard`: Individual product display with image, title, price, summary, and "Save to List" button.
- [ ] State:
    - Global state (e.g., Zustand, React Context) for current `queryId`.
    - Local component state for UI interactions (e.g., loading spinners, error messages).
    - `useQuery` hooks from Convex for real-time `products` and `query` status.

### 6. Error Prevention
- [ ] API errors: Implement `try/catch` blocks in Convex actions for Bright Data API calls. Implement exponential backoff/retries for transient Bright Data errors within the action.
- [ ] Validation: Use `v.string()`, `v.number()`, etc., for all Convex function arguments and return values. Validate Bright Data response structure before processing.
- [ ] Rate limiting: Monitor Bright Data usage via their dashboard. Implement intelligent scheduling in Convex actions to manage Bright Data costs (e.g., fetch fewer results initially, increase frequency only for active queries).
- [ ] Auth: Secure `createSearchQuery` mutation with `ctx.auth.getUserIdentity()`. Ensure `BRIGHT_DATA_API_KEY` is stored securely as an environment variable and never exposed client-side.
- [ ] Type safety: Leverage Convex's end-to-end type safety from database schema to frontend.
- [ ] Boundaries: Keep Convex actions focused solely on external API calls and minimal processing, delegating database writes to mutations.

### 7. Testing
- [ ] Test scenarios:
    - Successful initial product search and display.
    - Continuous search updating the UI with new products.
    - Saving a product to a user's list.
    - Handling Bright Data API failures (e.g., network error, invalid API key).
    - Handling scenarios where Bright Data returns no results.
    - Concurrency: Multiple users initiating searches simultaneously.
    - Performance: Latency from voice command to first product display.
    - Cost: Monitor Bright Data consumption during continuous searching.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFOQwSwfr8eFFNhClM4iiE1L8DZxC-hVUSW_Pt52MMgBsVsyLuZg2hv-2wWIumpmjMgny5Bt6IE4V0TuUwdUCW_bCHkRmdCozYQNkzE3EOb1P_hto-Qqg_xyHKLEU66mY7ubroPfXP6)
2. [convex.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGtbBwivUNtV1A7iL7IG2K7CVPe-jf_vniNyQPt8bPAmdenYEWI0ADp138YqYvZMYNns6-KEN-92MhqAcKvseg85-5RT06SKte5nCxqgwT2FtACXJqUuOExzfQXrjVZ9aMu-HMj)
3. [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE85d2Y_dMcNfPUzDdCRJ2m33oPrMn-B-Z6ckxy8w6thLdJThgWQ7H5b8SOOdHWoDFBYqAnQkK4HKbE9g0yLiOFoDoKfn3risZ2kZnm_1oWWWt74KsL1Qz76khPEzPYpZfCOpElP8k=)
4. [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEfNO5ZqXlTAQYTh3O8yGGewwxTyhKrVUForcDqlvze9mhzeqBv9DlrudLZI3bH2EFnA6qgj6jws9kB4nX4_f3v1miWS6vxEDpap_Xd_qstzGy-r9VkKF-m8d9zG_FnT-00p60mLdo=)
