# Background Research Feature - Setup Guide

This guide will help you set up and configure the Background Research feature that uses Bright Data to continuously crawl retailers and find products based on user queries.

## Overview

The Background Research feature allows users to:
- Search for products across multiple retailers
- Apply filters (price range, rating, availability)
- View real-time results as they are collected
- Track search history and status

## Architecture

### Backend (Convex)

1. **Database Schema** (`convex/schema.ts`):
   - `queries` table: Stores user search queries and their status
   - `products` table: Stores product results from Bright Data

2. **Query Functions** (`convex/queries.ts`):
   - `createSearchQuery`: Creates a new search and triggers the action
   - `getQueryStatus`: Gets the current status of a search
   - `getUserQueries`: Gets user's search history
   - `deleteQuery`: Deletes a query and its products

3. **Product Functions** (`convex/products.ts`):
   - `getProductsForQuery`: Gets all products for a query
   - `getFilteredProducts`: Gets products with filtering
   - `storeProducts`: Internal mutation to store results

4. **Actions** (`convex/actions/brightdata.ts`):
   - `initiateProductSearch`: Calls Bright Data API and processes results
   - `refreshProductSearch`: Re-runs a search for continuous updates

5. **Mutations** (`convex/mutations/brightdata.ts`):
   - `storeProductResults`: Stores processed products in database
   - `updateQueryStatus`: Updates search status
   - `reRankProducts`: Re-ranks products by different criteria

### Frontend (Next.js + React)

1. **Components**:
   - `SearchInput`: Form to create new searches with preferences
   - `ProductCard`: Displays individual product information
   - `ProductCarousel`: Grid display of products with real-time updates

2. **Pages**:
   - `/app/research/page.tsx`: Main research interface with tabs

## Setup Instructions

### 1. Bright Data Account Setup

1. **Create a Bright Data account**:
   - Go to [https://brightdata.com](https://brightdata.com)
   - Sign up for an account
   - Navigate to the dashboard

2. **Create a Data Collector**:
   - Go to "Data Collector" section
   - Click "Create Collector"
   - Choose "E-commerce" category
   - Select target websites (Amazon, Walmart, etc.)
   - Configure the collector to extract:
     - Product title
     - Price
     - Image URL
     - Product URL
     - Rating
     - Review count
     - Availability
     - Description
   - Note down the **Collector ID**

3. **Get API Credentials**:
   - Go to "Account" > "API Tokens"
   - Create a new API token
   - Copy the **API Key**

4. **Configure Proxy Zone** (optional):
   - Go to "Zones" section
   - Create or use existing zone
   - Note the zone name (default: "static")

### 2. Environment Variables

Add the following environment variables to your Convex deployment:

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

#### Option 1: Trigger API (Current Implementation)
- Endpoint: `https://api.brightdata.com/dca/trigger`
- Best for: On-demand searches
- Cost: Pay per request

#### Option 2: Webhook Delivery
- Set up a webhook endpoint in your Convex HTTP actions
- Configure Bright Data to push results to your endpoint
- Best for: Real-time continuous updates

#### Option 3: Polling
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

### 5. Testing the Implementation

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the research page**:
   ```
   http://localhost:3000/research
   ```

3. **Create a test search**:
   - Enter a product query (e.g., "wireless headphones")
   - Optionally set price filters
   - Click "Search"

4. **Monitor the search**:
   - Check the Convex dashboard logs
   - Watch the status change from "pending" → "searching" → "completed"
   - Products should appear in real-time as they're collected

5. **Check Bright Data dashboard**:
   - Verify the collection job was triggered
   - Review any errors or issues

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

## Advanced Features

### Continuous Background Updates

To enable continuous updates, you can use Convex's scheduler:

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

## Cost Optimization

1. **Limit initial results**: Set reasonable limits on product count
2. **Use caching**: Store results and only refresh when needed
3. **Smart scheduling**: Don't refresh too frequently
4. **Filter early**: Apply filters in Bright Data collector, not post-processing
5. **Monitor usage**: Check Bright Data dashboard regularly

## Security Considerations

1. **API Keys**: Never expose Bright Data API keys client-side
2. **User Auth**: All queries are tied to authenticated users
3. **Rate Limiting**: Implement rate limiting on search creation
4. **Input Validation**: Sanitize search text before sending to Bright Data
5. **HTTPS Only**: Always use HTTPS for API calls

## Next Steps

1. **Add more retailers**: Configure additional sources in Bright Data
2. **Implement saving**: Add functionality to save products to user lists
3. **Email notifications**: Notify users when searches complete
4. **Price tracking**: Track price changes over time
5. **AI recommendations**: Use AI to suggest products based on user behavior

## Support

For issues related to:
- **Bright Data**: [Bright Data Support](https://help.brightdata.com)
- **Convex**: [Convex Docs](https://docs.convex.dev)
- **This Implementation**: Check the code comments and implementation plan

## Resources

- [Bright Data Documentation](https://docs.brightdata.com)
- [Bright Data Web Scraper API](https://docs.brightdata.com/docs/web-scraper-api)
- [Convex Actions](https://docs.convex.dev/functions/actions)
- [Convex Scheduling](https://docs.convex.dev/scheduling)
