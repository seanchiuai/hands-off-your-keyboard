# Best Buy Product Scraper Agent

## Purpose
Scrapes Best Buy product listings when API coverage is insufficient or when users specifically request Best Buy products.

## When to Use
- User explicitly mentions "Best Buy" in their search
- Other APIs don't return sufficient Best Buy results
- User wants to compare prices specifically at Best Buy
- Background research needs Best Buy data for completeness

## Available Tools
- Playwright MCP (browser automation)
- Convex actions (data processing and storage)

## Implementation Location
`convex/actions/bestBuyScraper.ts`

## Process Flow

### 1. Initialize Search
```typescript
// Build search URL with filters
const searchUrl = buildSearchUrl(query, minPrice, maxPrice);
// Example: https://www.bestbuy.com/site/searchpage.jsp?st=laptop&qp=currentprice_facet=Price~500 to 1000
```

### 2. Navigate to Best Buy
```typescript
// Using Playwright MCP
await mcp__playwright__browser_navigate({ url: searchUrl });
```

### 3. Wait for Page Load
```typescript
// Wait for search results to appear
await mcp__playwright__browser_wait_for({
  text: "items found", // Best Buy shows "X items found"
  time: 10, // 10 second timeout
});
```

### 4. Capture Page Snapshot
```typescript
// Get accessible page structure
const snapshot = await mcp__playwright__browser_snapshot();
```

### 5. Extract Product Data
From the snapshot, extract:
- **Title**: Look for `.sku-title`, `.sku-header`, or `[data-test="sku-title"]`
- **Price**: Look for `.priceView-customer-price`, `.priceView-hero-price`
- **Image**: Look for `.product-image img[src]`
- **URL**: Look for `.sku-title a[href]`
- **SKU**: Look for `[data-sku-id]` attribute
- **Rating**: Look for `[data-rating]` or `.c-stars`
- **Reviews**: Look for `.c-reviews-v4`, `.ugc-c-reviews-link`

### 6. Parse and Filter
```typescript
const products = parseSnapshotForProducts(snapshot);

// Filter by price if needed
const filtered = products.filter(p => {
  if (minPrice && p.price < minPrice) return false;
  if (maxPrice && p.price > maxPrice) return false;
  return true;
});

// Limit results (typically 10-20 products)
return filtered.slice(0, maxResults);
```

### 7. Return Structured Data
```typescript
interface BestBuyProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl?: string;
  sku?: string;
  modelNumber?: string;
  rating?: number;
  reviewCount?: number;
  source: "Best Buy";
}
```

## Best Buy Page Structure

### Search Results Page
```
URL: https://www.bestbuy.com/site/searchpage.jsp?st={query}

Structure:
├── .shop-sku-list-item (each product)
│   ├── [data-sku-id] (SKU number)
│   ├── .sku-title (product name)
│   │   └── a[href] (product URL)
│   ├── .priceView-customer-price
│   │   └── span (price text)
│   ├── .product-image
│   │   └── img[src] (product image)
│   ├── [data-rating] (star rating)
│   └── .c-reviews-v4 (review count)
```

### Price Filter URL Parameters
```
?qp=currentprice_facet=Price~{min} to {max}

Examples:
- $0-$500: ?qp=currentprice_facet=Price~0 to 500
- $500+: ?qp=currentprice_facet=Price~500 to 999999
```

## Error Handling

### Page Load Failures
```typescript
try {
  await browser_navigate({ url: searchUrl });
} catch (error) {
  console.error("[Best Buy] Navigation failed:", error);
  return []; // Return empty results
}
```

### Timeout Handling
```typescript
// If page doesn't load in 10 seconds, abort
await browser_wait_for({ time: 10 });

if (!pageLoaded) {
  console.log("[Best Buy] Page load timeout");
  return [];
}
```

### No Results Found
```typescript
if (snapshot.includes("0 items found") || snapshot.includes("no results")) {
  console.log("[Best Buy] No products found for query");
  return [];
}
```

### Price Parsing Errors
```typescript
function parsePrice(priceText: string): number {
  try {
    const cleaned = priceText.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  } catch {
    return 0; // Default to 0 if parsing fails
  }
}
```

## Performance Considerations

### Scraping Speed
- Average time: 5-10 seconds per search
- Slower than API calls but provides Best Buy-specific data

### Rate Limiting
- Implement delays between requests (2-3 seconds)
- Use rotating user agents to avoid blocking
- Cache results for 1 hour to reduce repeated scraping

### Cost
- Computational cost only (server resources)
- No API fees unlike SerpAPI

## Testing Checklist

- [ ] Search returns results for common products (laptop, TV, headphones)
- [ ] Price filtering works correctly
- [ ] All product fields are extracted (title, price, image, URL)
- [ ] Handles "no results" gracefully
- [ ] Timeout doesn't crash the action
- [ ] Products are properly structured for storage in Convex

## Example Usage

### From Search Orchestrator
```typescript
// In convex/actions/searchOrchestrator.ts

if (shouldSearchBestBuy(query, preferences)) {
  const bestBuyProducts = await ctx.runAction(
    internal.actions.bestBuyScraper.scrapeBestBuy,
    {
      searchQuery: query,
      minPrice: preferences.minPrice,
      maxPrice: preferences.maxPrice,
      maxResults: 20,
    }
  );

  allProducts.push(...bestBuyProducts);
}
```

### Direct Testing
```typescript
// Test the scraper directly
const results = await ctx.runAction(internal.actions.bestBuyScraper.scrapeBestBuy, {
  searchQuery: "wireless headphones",
  minPrice: 100,
  maxPrice: 400,
  maxResults: 10,
});

console.log(`Found ${results.length} Best Buy products`);
```

## Debugging

### Enable Verbose Logging
```typescript
console.log("[Best Buy] Search URL:", searchUrl);
console.log("[Best Buy] Snapshot:", snapshot);
console.log("[Best Buy] Extracted products:", products);
```

### Check Playwright MCP Connection
```typescript
// Verify browser tools are available
const available = await checkPlaywrightMCPAvailable();
if (!available) {
  console.error("[Best Buy] Playwright MCP not available");
  return [];
}
```

### Inspect Page Structure
```typescript
// Take a screenshot for debugging
await mcp__playwright__browser_take_screenshot({
  filename: "bestbuy-search-debug.png",
});
```

## Future Enhancements

1. **Product Availability**: Scrape in-store vs online availability
2. **Deals/Sales**: Extract special pricing and promotions
3. **Specifications**: Scrape detailed product specs from detail pages
4. **Store Locator**: Include which stores have the product in stock
5. **Price History**: Track Best Buy price changes over time

## Maintenance

### Update Selectors When Best Buy Changes
Best Buy may update their website structure. If scraping breaks:

1. Check if selectors changed:
   - Inspect the Best Buy search page
   - Update CSS selectors in `parseSnapshotForProducts()`

2. Test with multiple product categories:
   - Electronics
   - Appliances
   - Computers
   - TVs & Home Theater

3. Verify price filters still work:
   - Test with various price ranges
   - Check URL parameter format

## References

- Best Buy Search Page: https://www.bestbuy.com/site/searchpage.jsp
- Playwright MCP Documentation: Available in Claude Code environment
- Convex Actions Guide: https://docs.convex.dev/functions/actions
