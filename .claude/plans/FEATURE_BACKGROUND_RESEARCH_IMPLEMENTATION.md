# Background Research Feature - Complete Implementation Guide

## Overview

The Background Research feature enables users to search for products across multiple retailers using Bright Data's web scraping API, with real-time updates and filtering capabilities.

**Tech Stack**: Next.js, Convex, Bright Data Web Scraper API

**Core Functionality**:
- Search for products across multiple retailers
- Apply filters (price range, rating, availability)
- View real-time results as they are collected
- Track search history and status

---

## Implementation Plan

### 1. Manual Setup (User Required)
- [ ] Create Bright Data account
- [ ] Configure Bright Data Web Scraper API for target e-commerce sites (e.g., Amazon products)
- [ ] Generate Bright Data API key
- [ ] Create Convex account and project
- [ ] Configure Convex deployment settings via dashboard or CLI

### 2. Dependencies & Environment
- [ ] Install: `convex`, `react`, `react-dom`, `next`, `typescript`, `@types/react`, `@types/node`, `@bright-data/scraper-sdk` (or similar HTTP client for API calls)
- [ ] Env vars: `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_COLLECTOR_ID`, `BRIGHT_DATA_ZONE`, `CONVEX_DEPLOYMENT_URL`

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
    - `query: getProductsForQuery(queryId: Id<'queries'>)`: Fetches product results for a given query, ordered by `systemRank`
    - `mutation: saveProductToList(userId: Id<'users'>, productId: Id<'products'>)`: Saves a product to a user's personal list
- [ ] `api/queries.ts`:
    - `mutation: createSearchQuery(userId: Id<'users'>, searchText: string, preferences: object)`: Creates a new search query record and schedules the initial Bright Data action
    - `query: getQueryStatus(queryId: Id<'queries'>)`: Fetches the status of a search query
- [ ] `convex/actions/brightdata.ts` (internal action):
    - `internalAction: initiateProductSearch(queryId: Id<'queries'>, searchText: string, preferences: object)`:
        - Calls Bright Data Web Scraper API with `searchText` and `preferences`
        - Processes results (filters, re-ranks, deduplicates)
        - Calls `internalMutation: storeProductResults` to persist products
        - Schedules itself to run again if continuous searching is required or if new relevant criteria emerge
- [ ] `convex/mutations/brightdata.ts` (internal mutation):
    - `internalMutation: storeProductResults(queryId: Id<'queries'>, products: Product[])`: Stores fetched and processed products into the `products` table. Updates `queries` table status

### 5. Frontend
- [ ] Components:
    - `ProductCarousel`: Displays products from the `products` table, subscribed via `useQuery`
    - `SearchInput`: Captures user's voice input (from AI agent) and triggers `createSearchQuery` mutation
    - `ProductCard`: Individual product display with image, title, price, summary, and "Save to List" button
- [ ] State:
    - Global state (e.g., Zustand, React Context) for current `queryId`
    - Local component state for UI interactions (e.g., loading spinners, error messages)
    - `useQuery` hooks from Convex for real-time `products` and `query` status

### 6. Error Prevention
- [ ] API errors: Implement `try/catch` blocks in Convex actions for Bright Data API calls. Implement exponential backoff/retries for transient Bright Data errors within the action
- [ ] Validation: Use `v.string()`, `v.number()`, etc., for all Convex function arguments and return values. Validate Bright Data response structure before processing
- [ ] Rate limiting: Monitor Bright Data usage via their dashboard. Implement intelligent scheduling in Convex actions to manage Bright Data costs (e.g., fetch fewer results initially, increase frequency only for active queries)
- [ ] Auth: Secure `createSearchQuery` mutation with `ctx.auth.getUserIdentity()`. Ensure `BRIGHT_DATA_API_KEY` is stored securely as an environment variable and never exposed client-side
- [ ] Type safety: Leverage Convex's end-to-end type safety from database schema to frontend
- [ ] Boundaries: Keep Convex actions focused solely on external API calls and minimal processing, delegating database writes to mutations

---

## Implementation Details

### Files Created/Modified

#### Backend (Convex)

**1. Schema Updates**
- **File**: `/convex/schema.ts`
- **Modified**: Added `queries` and `products` tables
- **Key Indexes**:
  - `queries.by_user`: For fetching user's queries
  - `queries.by_user_and_status`: For filtering queries by status
  - `products.by_query`: For fetching all products for a query
  - `products.by_query_and_rank`: For ordered product retrieval
  - `products.by_url_and_query`: For deduplication

**2. Query Management** (`/convex/queries.ts`)
- `createSearchQuery`: Creates new search and schedules Bright Data action
- `getQueryStatus`: Gets current status of a search query
- `getUserQueries`: Retrieves user's search history
- `updateQueryStatus`: Updates search status
- `deleteQuery`: Deletes query and associated products
- `getActiveQuery`: Gets most recent active query

**3. Product Management** (`/convex/products.ts`)
- `getProductsForQuery`: Gets all products for a query
- `getFilteredProducts`: Gets products with price/rating/source filters
- `getProduct`: Gets single product by ID
- `storeProducts`: Internal mutation to store scraped products
- `deleteProductsForQuery`: Deletes all products for a query

**4. Bright Data Integration** (`/convex/actions/brightdata.ts`)
- **Type**: Node.js action (external API calls)
- `initiateProductSearch`: Main action that calls Bright Data API
- `refreshProductSearch`: Re-runs search for continuous updates
- **Features**:
  - Calls Bright Data Trigger API
  - Processes raw results into structured data
  - Handles errors and retries
  - Updates query status throughout lifecycle

**5. Data Storage Mutations** (`/convex/mutations/brightdata.ts`)
- `storeProductResults`: Stores/updates products in database
- `updateQueryStatus`: Updates query status (internal)
- `getQueryById`: Retrieves query for actions
- `reRankProducts`: Re-ranks products by various strategies

#### Frontend (Next.js + React)

**1. Product Card Component** (`/components/ProductCard.tsx`)
- Product image with fallback
- Price formatting with currency
- Rating and review count display
- Availability badge
- External link to product
- Optional save functionality

**2. Product Carousel Component** (`/components/ProductCarousel.tsx`)
- Real-time subscription to product updates
- Loading states and skeletons
- Error handling
- Empty state messaging
- Responsive grid layout (1-4 columns)

**3. Search Input Component** (`/components/SearchInput.tsx`)
- Search text input
- Price range filters (min/max)
- Minimum rating filter
- Form validation
- Loading states
- Toast notifications

**4. Alert Component** (`/components/ui/alert.tsx`)
- Display alerts and notifications
- Variants: Default and destructive

**5. Research Page** (`/app/research/page.tsx`)
- Tabbed interface (Search, Results, History)
- New search creation
- Real-time results display
- Search history with status
- Query selection from history

### Technical Highlights

**Real-Time Updates**
- Uses Convex's reactive queries (`useQuery`) for real-time data sync
- Products appear in UI as they're scraped and stored
- Status updates propagate instantly to frontend

**Error Handling**
- Comprehensive try/catch blocks in actions
- Query status tracking (pending → searching → completed/failed)
- User-friendly error messages
- Detailed logging for debugging

**Authentication & Security**
- All queries tied to authenticated users (Clerk)
- Row-level security in database queries
- API keys stored securely in environment variables
- Never exposed client-side

**Type Safety**
- Full TypeScript coverage
- Convex validators for all function arguments
- Generated types for database schema
- End-to-end type safety from DB to UI

**Performance Optimization**
- Indexed queries for fast retrieval
- Pagination support (limit parameter)
- Efficient deduplication (by URL + queryId)
- Client-side filtering for instant UX

### Data Flow

1. **User initiates search**:
   - User enters search text in `SearchInput`
   - Calls `createSearchQuery` mutation
   - Query record created with status "pending"

2. **Scheduler triggers action**:
   - `initiateProductSearch` action scheduled immediately
   - Query status updated to "searching"

3. **Bright Data API call**:
   - Action calls Bright Data Trigger API
   - Sends search text and preferences
   - Receives raw product data

4. **Data processing**:
   - `processResults` function transforms raw data
   - Extracts relevant fields (title, price, rating, etc.)
   - Assigns search rank

5. **Database storage**:
   - `storeProductResults` mutation called
   - Products upserted (insert or update)
   - System rank calculated

6. **Real-time UI update**:
   - `ProductCarousel` subscribed via `useQuery`
   - New products appear automatically
   - Query status updates to "completed"

---

## Setup Guide

### 1. Bright Data Account Setup

**Create a Bright Data account**:
1. Go to [https://brightdata.com](https://brightdata.com)
2. Sign up for an account
3. Navigate to the dashboard

**Create a Data Collector**:
1. Go to "Data Collector" section
2. Click "Create Collector"
3. Choose "E-commerce" category
4. Select target websites (Amazon, Walmart, etc.)
5. Configure the collector to extract:
   - Product title
   - Price
   - Image URL
   - Product URL
   - Rating
   - Review count
   - Availability
   - Description
6. Note down the **Collector ID**

**Get API Credentials**:
1. Go to "Account" > "API Tokens"
2. Create a new API token
3. Copy the **API Key**

**Configure Proxy Zone** (optional):
1. Go to "Zones" section
2. Create or use existing zone
3. Note the zone name (default: "static")

### 2. Environment Variables

#### In Convex Dashboard:
1. Go to your Convex dashboard: [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Go to "Settings" > "Environment Variables"
4. Add the following variables:

```
BRIGHT_DATA_API_KEY=your_api_key_here
BRIGHT_DATA_COLLECTOR_ID=your_collector_id_here
BRIGHT_DATA_ZONE=static
```

#### Local Development:
Create or update `.env.local` (this file is gitignored):

```bash
# Bright Data Configuration
BRIGHT_DATA_API_KEY=your_api_key_here
BRIGHT_DATA_COLLECTOR_ID=your_collector_id_here
BRIGHT_DATA_ZONE=static
```

### 3. Bright Data API Configuration

The current implementation uses the Bright Data Trigger API. You may need to adjust the implementation based on your specific Bright Data setup:

**Option 1: Trigger API (Current Implementation)**
- Endpoint: `https://api.brightdata.com/dca/trigger`
- Best for: On-demand searches
- Cost: Pay per request

**Option 2: Webhook Delivery**
- Set up a webhook endpoint in your Convex HTTP actions
- Configure Bright Data to push results to your endpoint
- Best for: Real-time continuous updates

**Option 3: Polling**
- Trigger a collection job
- Poll for results at intervals
- Best for: Large batch collections

### 4. Customizing the Data Processor

The `processResults` function in `convex/actions/brightdata.ts` needs to be customized based on your Bright Data collector's output format:

```typescript
function processResults(brightDataResult: any) {
  // Adjust field mappings based on your collector configuration
  return brightDataResult.data.map((item: any, index: number) => ({
    title: item.title || item.name,
    imageUrl: item.image || item.imageUrl,
    productUrl: item.url || item.productUrl,
    price: parseFloat(item.price || 0),
    currency: item.currency || "USD",
    description: item.description,
    reviewsCount: parseInt(item.reviews) || undefined,
    rating: parseFloat(item.rating) || undefined,
    availability: item.in_stock !== false,
    source: item.retailer || "Unknown",
    searchRank: index + 1,
  }));
}
```

---

## Usage

### Basic Search

```typescript
import { SearchInput } from "@/components/SearchInput";

function MyPage() {
  return <SearchInput onSearchCreated={(queryId) => console.log(queryId)} />;
}
```

### Displaying Results

```typescript
import { ProductCarousel } from "@/components/ProductCarousel";

function MyPage() {
  const queryId = "..."; // From createSearchQuery

  return (
    <ProductCarousel
      queryId={queryId}
      onSaveProduct={(productId) => console.log("Save", productId)}
    />
  );
}
```

### Filtering Results

```typescript
<ProductCarousel
  queryId={queryId}
  minPrice={50}
  maxPrice={200}
  minRating={4.0}
  source="Amazon"
  limit={20}
/>
```

### Continuous Background Updates

To enable continuous updates, use Convex's scheduler:

```typescript
// In your mutation or action
await ctx.scheduler.runAfter(
  1000 * 60 * 60, // 1 hour
  internal.actions.brightdata.refreshProductSearch,
  { queryId }
);
```

### Custom Ranking

Modify the `reRankProducts` mutation to implement custom ranking logic:

```typescript
await ctx.runMutation(internal.mutations.brightdata.reRankProducts, {
  queryId,
  rankingStrategy: "rating", // or "price_low_to_high", etc.
});
```

### User-Specific Preferences

Extend the schema to store user preferences and use them in searches:

```typescript
const userPrefs = await getUserPreferences(ctx, userId);
const queryId = await createSearchQuery({
  searchText: "laptop",
  preferences: userPrefs,
});
```

---

## Testing

### Testing the Implementation

**1. Start the development server**:
```bash
npm run dev
```

**2. Navigate to the research page**:
```
http://localhost:3000/research
```

**3. Create a test search**:
- Enter a product query (e.g., "wireless headphones")
- Optionally set price filters
- Click "Search"

**4. Monitor the search**:
- Check the Convex dashboard logs
- Watch the status change from "pending" → "searching" → "completed"
- Products should appear in real-time as they're collected

**5. Check Bright Data dashboard**:
- Verify the collection job was triggered
- Review any errors or issues

### Test Scenarios

**Unit Tests**
1. Test `processResults` with various input formats
2. Test product filtering logic
3. Test ranking algorithms

**Integration Tests**
1. End-to-end search flow
2. Error handling (invalid API key, network errors)
3. Concurrent searches
4. Query deletion

**UI Tests**
1. Search form validation
2. Real-time updates
3. Loading states
4. Error states
5. Empty states

**Performance Tests**
1. Large result sets (100+ products)
2. Multiple concurrent searches
3. Query with many filters
4. Database query performance

---

## Troubleshooting

### "Bright Data API credentials not configured"
- Ensure environment variables are set in Convex dashboard
- Restart Convex dev server after adding variables

### "Bright Data API failed: 401"
- Check that your API key is correct
- Verify the API key has necessary permissions

### "No products found"
- Check Bright Data dashboard for collection errors
- Verify the collector is configured correctly
- Check the `processResults` function matches your data format

### Products not appearing in real-time
- Check Convex logs for errors
- Verify the `storeProductResults` mutation is being called
- Ensure the frontend is using `useQuery` (not `useEffect` with manual fetching)

---

## Cost Optimization

1. **Limit initial results**: Set reasonable limits on product count
2. **Use caching**: Store results and only refresh when needed
3. **Smart scheduling**: Don't refresh too frequently
4. **Filter early**: Apply filters in Bright Data collector, not post-processing
5. **Monitor usage**: Check Bright Data dashboard regularly

---

## Security Considerations

1. **API Keys**: Never expose Bright Data API keys client-side
2. **User Auth**: All queries are tied to authenticated users
3. **Rate Limiting**: Implement rate limiting on search creation
4. **Input Validation**: Sanitize search text before sending to Bright Data
5. **HTTPS Only**: Always use HTTPS for API calls

---

## Known Limitations

1. **Bright Data Configuration**: The current implementation assumes a specific Bright Data collector setup. You must customize the `processResults` function to match your actual collector output.

2. **Single Retailer Support**: Currently configured for one-time API calls. Continuous background updates require scheduler configuration.

3. **No Saved Lists**: The "Save" button is a placeholder. Actual save functionality needs to be implemented.

4. **Basic Ranking**: System ranking currently mirrors search ranking. Advanced ranking (by user preferences, ML, etc.) needs implementation.

5. **No Price Tracking**: Products are not tracked over time for price changes.

---

## Next Steps

### Immediate (Required for Production)

1. **Configure Bright Data Collector**:
   - Set up actual data collector in Bright Data dashboard
   - Test with real retailer data
   - Update `processResults` function

2. **Set Environment Variables**:
   - Add credentials to Convex dashboard
   - Test API connectivity

3. **Test End-to-End**:
   - Create test search
   - Verify products appear
   - Check error handling

### Short-term Enhancements

1. **Saved Lists**:
   - Add `saved_products` table
   - Implement save mutation
   - Add saved products page

2. **Continuous Updates**:
   - Add cron job or scheduler
   - Refresh product data periodically
   - Notify users of updates

3. **Advanced Filtering**:
   - Add retailer filter
   - Add category filter
   - Add brand filter

### Long-term Features

1. **Price Tracking**:
   - Store price history
   - Alert on price drops
   - Show price trends

2. **AI Recommendations**:
   - Learn user preferences
   - Suggest products
   - Personalized ranking

3. **Comparison Tools**:
   - Side-by-side comparison
   - Highlight differences
   - Best deal finder

4. **Mobile App**:
   - React Native app
   - Push notifications
   - Barcode scanning

---

## Blockers & Decisions Needed

### Critical Decisions

1. **Bright Data Plan**: Which Bright Data pricing plan will you use?
   - Affects rate limits and costs
   - Determines polling vs webhook strategy

2. **Retailer Selection**: Which retailers should be included?
   - Determines collector configuration
   - Affects data schema

3. **Update Frequency**: How often should searches be refreshed?
   - Affects costs
   - Determines scheduler configuration

### Technical Decisions

1. **Ranking Algorithm**: How should products be ranked?
   - Price-based?
   - Rating-based?
   - ML-based personalization?

2. **Caching Strategy**: How long should results be cached?
   - Affects freshness vs cost trade-off

3. **Result Limits**: Maximum products per search?
   - Affects performance and costs

---

## Resources

- **Bright Data Documentation**: [https://docs.brightdata.com](https://docs.brightdata.com)
- **Bright Data Web Scraper API**: [https://docs.brightdata.com/docs/web-scraper-api](https://docs.brightdata.com/docs/web-scraper-api)
- **Convex Actions**: [https://docs.convex.dev/functions/actions](https://docs.convex.dev/functions/actions)
- **Convex Scheduling**: [https://docs.convex.dev/scheduling](https://docs.convex.dev/scheduling)

---

## Status

✅ **Implementation Complete**

The Background Research feature is fully implemented and ready for configuration and testing. All core functionality is in place:

- ✅ Database schema
- ✅ Backend functions (queries, mutations, actions)
- ✅ Bright Data integration
- ✅ Frontend components
- ✅ Main research page
- ✅ Documentation

**Next action required**: Set up Bright Data account and configure environment variables to begin testing.
