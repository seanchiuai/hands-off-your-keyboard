# Playwright Scraper Integration Guide

This guide explains how to integrate Playwright-based web scrapers with your product search system.

## Overview

Playwright scrapers provide a fallback mechanism for extracting product data from retailers that don't offer APIs. While slower than API calls, they enable comprehensive coverage across any e-commerce website.

## Architecture

```
Voice Agent Request
      ↓
Search Orchestrator (convex/actions/searchOrchestrator.ts)
      ↓
Parallel API Calls:
  ├── SerpAPI (fast)
  ├── Amazon API (fast)
  ├── eBay API (fast)
  ├── Walmart API (fast)
  └── Playwright Scrapers (slow, fallback)
      ├── Best Buy
      ├── Target
      ├── Costco
      ├── B&H Photo
      └── Newegg
      ↓
Aggregate & Deduplicate Results
      ↓
Return to User
```

## Available Scrapers

| Retailer | File | Status | Avg. Speed |
|----------|------|--------|------------|
| Best Buy | `convex/actions/bestBuyScraper.ts` | ✅ Ready | 5-10s |
| Target | `convex/actions/playwrightScraper.ts` | 📝 Template | 5-10s |
| Costco | `convex/actions/playwrightScraper.ts` | 📝 Template | 5-10s |
| B&H Photo | `convex/actions/playwrightScraper.ts` | 📝 Template | 5-10s |
| Newegg | `convex/actions/playwrightScraper.ts` | 📝 Template | 5-10s |

## When to Use Playwright Scrapers

### ✅ Use Playwright When:
- User explicitly mentions a specific retailer ("find laptops at Best Buy")
- APIs don't return results from that retailer
- Need specialized retailer data (e.g., Costco member pricing)
- Researching niche products not well-covered by APIs

### ❌ Don't Use Playwright When:
- SerpAPI or other APIs return sufficient results
- Time-sensitive searches (voice interactions need < 3s response)
- High-volume automated searches (rate limiting risk)

## Integration Steps

### Step 1: Add Scraper to Orchestrator

**File**: `convex/actions/searchOrchestrator.ts`

```typescript
import { internal } from "../_generated/api";

export const orchestrateProductSearch = internalAction({
  // ... args

  handler: async (ctx, args) => {
    const searchPromises = [];

    // Existing API calls
    if (apiStrategy.useSerpAPI) {
      searchPromises.push(searchWithSerpAPI(ctx, args));
    }

    // NEW: Add Playwright scrapers
    if (apiStrategy.useBestBuy) {
      searchPromises.push(
        ctx.runAction(internal.actions.bestBuyScraper.scrapeBestBuy, {
          searchQuery: args.searchText,
          minPrice: args.preferences.minPrice,
          maxPrice: args.preferences.maxPrice,
          maxResults: 10,
        })
      );
    }

    // Wait for all searches
    const results = await Promise.allSettled(searchPromises);

    // ... aggregate and return
  },
});
```

### Step 2: Update API Strategy

Add logic to determine when to use scrapers:

```typescript
function determineAPIStrategy(searchText: string, preferences: any) {
  const lower = searchText.toLowerCase();

  return {
    useSerpAPI: true, // Always use for broad coverage

    // Use Best Buy scraper if mentioned or needed
    useBestBuy:
      lower.includes("best buy") ||
      lower.includes("bestbuy") ||
      preferences?.targetRetailers?.includes("Best Buy"),

    // Use Target scraper if mentioned
    useTarget:
      lower.includes("target") ||
      preferences?.targetRetailers?.includes("Target"),

    // Use Costco scraper if mentioned or want warehouse deals
    useCostco:
      lower.includes("costco") ||
      lower.includes("warehouse") ||
      preferences?.targetRetailers?.includes("Costco"),
  };
}
```

### Step 3: Handle Scraper Results

Process scraped data the same way as API results:

```typescript
function aggregateResults(results: PromiseSettledResult<any>[]): Product[] {
  const allProducts: Product[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      allProducts.push(...result.value);
    } else if (result.status === "rejected") {
      console.error("Search failed:", result.reason);
    }
  }

  return allProducts;
}
```

## Playwright MCP Tools Reference

### Available Browser Tools

These tools are available in your Convex actions:

#### 1. Navigate to URL
```typescript
await mcp__playwright__browser_navigate({ url: "https://www.bestbuy.com" });
```

#### 2. Take Snapshot
```typescript
const snapshot = await mcp__playwright__browser_snapshot();
// Returns accessible page structure for parsing
```

#### 3. Wait for Content
```typescript
// Wait for text to appear
await mcp__playwright__browser_wait_for({ text: "items found" });

// Wait for specific time
await mcp__playwright__browser_wait_for({ time: 5 }); // 5 seconds
```

#### 4. Click Elements
```typescript
await mcp__playwright__browser_click({
  element: "Next page button",
  ref: "button-next-page",
});
```

#### 5. Type Text
```typescript
await mcp__playwright__browser_type({
  element: "Search box",
  ref: "input-search",
  text: "wireless headphones",
  submit: true, // Press Enter after typing
});
```

#### 6. Take Screenshot (for debugging)
```typescript
await mcp__playwright__browser_take_screenshot({
  filename: "debug-screenshot.png",
});
```

#### 7. Evaluate JavaScript
```typescript
const data = await mcp__playwright__browser_evaluate({
  function: "() => { return document.querySelectorAll('.product').length; }",
});
```

#### 8. Close Browser
```typescript
await mcp__playwright__browser_close();
```

## Building a New Scraper

### Template Structure

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const scrapeRetailer = internalAction({
  args: {
    searchQuery: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`[Retailer] Starting search for: "${args.searchQuery}"`);

    try {
      // 1. Build search URL
      const searchUrl = buildSearchUrl(args.searchQuery, args.minPrice, args.maxPrice);

      // 2. Navigate to page (using Playwright MCP)
      // await mcp__playwright__browser_navigate({ url: searchUrl });

      // 3. Wait for results to load
      // await mcp__playwright__browser_wait_for({ text: "results", time: 10 });

      // 4. Capture page snapshot
      // const snapshot = await mcp__playwright__browser_snapshot();

      // 5. Extract products from snapshot
      // const products = parseProducts(snapshot);

      // 6. Filter by price
      // const filtered = filterByPrice(products, args.minPrice, args.maxPrice);

      // 7. Return results
      // return filtered.slice(0, args.maxResults || 10);

      // For now, return empty array (placeholder)
      return [];
    } catch (error) {
      console.error("[Retailer] Scraping error:", error);
      return [];
    }
  },
});

function buildSearchUrl(query: string, minPrice?: number, maxPrice?: number): string {
  // Build retailer-specific search URL with filters
  return `https://retailer.com/search?q=${encodeURIComponent(query)}`;
}

function parseProducts(snapshot: any): Product[] {
  // Extract product data from page snapshot
  // Look for product cards, titles, prices, images, etc.
  return [];
}

function filterByPrice(products: Product[], minPrice?: number, maxPrice?: number): Product[] {
  return products.filter(p => {
    if (minPrice && p.price < minPrice) return false;
    if (maxPrice && p.price > maxPrice) return false;
    return true;
  });
}
```

### Step-by-Step Process

#### 1. Research the Target Website
- Open the retailer's search page
- Inspect the HTML structure
- Identify CSS selectors for:
  - Product containers
  - Product titles
  - Prices
  - Images
  - URLs
  - Ratings/reviews

#### 2. Build the Search URL
```typescript
// Example: Best Buy
const baseUrl = "https://www.bestbuy.com/site/searchpage.jsp";
const params = new URLSearchParams({
  st: query,
  // Add price filters
  qp: `currentprice_facet=Price~${minPrice} to ${maxPrice}`,
});
return `${baseUrl}?${params.toString()}`;
```

#### 3. Navigate and Wait
```typescript
// Navigate to search page
await mcp__playwright__browser_navigate({ url: searchUrl });

// Wait for products to load
await mcp__playwright__browser_wait_for({
  text: "items found", // Or other indicator that page loaded
  time: 10, // Timeout in seconds
});
```

#### 4. Capture Page Data
```typescript
// Get accessible snapshot of page
const snapshot = await mcp__playwright__browser_snapshot();

// Or evaluate JavaScript to extract data
const productData = await mcp__playwright__browser_evaluate({
  function: `() => {
    const products = [];
    document.querySelectorAll('.product-card').forEach(card => {
      products.push({
        title: card.querySelector('.product-title')?.textContent,
        price: card.querySelector('.price')?.textContent,
        url: card.querySelector('a')?.href,
      });
    });
    return products;
  }`,
});
```

#### 5. Parse and Structure Data
```typescript
function parseProducts(snapshot: any): Product[] {
  // Parse the snapshot or evaluated data
  // Extract structured product information

  return products.map(p => ({
    title: p.title || "Unknown Product",
    price: parsePrice(p.price),
    productUrl: p.url || "",
    imageUrl: p.image,
    source: "Retailer Name",
    rating: parseRating(p.rating),
    reviewCount: parseReviewCount(p.reviews),
  }));
}
```

## Testing Your Scraper

### Local Testing

1. **Create a test action**:
```typescript
// In convex/actions/testScraper.ts
export const testBestBuyScraper = action({
  handler: async (ctx) => {
    const results = await ctx.runAction(internal.actions.bestBuyScraper.scrapeBestBuy, {
      searchQuery: "laptop",
      minPrice: 500,
      maxPrice: 1000,
      maxResults: 5,
    });

    console.log("Test results:", results);
    return results;
  },
});
```

2. **Run the test**:
```bash
npx convex dev
# In another terminal:
npx convex run actions/testScraper:testBestBuyScraper
```

3. **Check logs**:
- Watch Convex dashboard for console logs
- Verify product data is correctly structured
- Check for errors or timeouts

### Testing Checklist

- [ ] Search returns results for common queries
- [ ] Price filtering works correctly
- [ ] All required fields are populated (title, price, URL)
- [ ] Handles "no results" gracefully
- [ ] Timeout doesn't crash the scraper
- [ ] Products are properly formatted for storage

## Performance Optimization

### 1. Parallel Scraping
```typescript
// Scrape multiple retailers in parallel
const scrapers = [
  ctx.runAction(internal.actions.bestBuyScraper.scrapeBestBuy, args),
  ctx.runAction(internal.actions.targetScraper.scrapeTarget, args),
];

const results = await Promise.allSettled(scrapers);
```

### 2. Timeout Management
```typescript
// Set reasonable timeouts (10 seconds max)
const timeout = 10000; // 10 seconds

const scraperPromise = ctx.runAction(scraper, args);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Scraper timeout")), timeout)
);

try {
  return await Promise.race([scraperPromise, timeoutPromise]);
} catch (error) {
  console.error("Scraper failed:", error);
  return [];
}
```

### 3. Caching Results
```typescript
// Cache scraper results for 1 hour
const cacheKey = `scraper:${retailer}:${searchQuery}`;
const cached = await ctx.runQuery(internal.cache.get, { key: cacheKey });

if (cached && Date.now() - cached.timestamp < 3600000) {
  return cached.results;
}

// Run scraper and cache results
const results = await runScraper();
await ctx.runMutation(internal.cache.set, {
  key: cacheKey,
  results,
  timestamp: Date.now(),
});
```

## Debugging Tips

### 1. Enable Verbose Logging
```typescript
console.log("[Scraper] URL:", searchUrl);
console.log("[Scraper] Snapshot:", snapshot);
console.log("[Scraper] Parsed products:", products);
```

### 2. Take Screenshots
```typescript
// Capture what the browser sees
await mcp__playwright__browser_take_screenshot({
  filename: `debug-${retailer}-${Date.now()}.png`,
});
```

### 3. Inspect Snapshots
```typescript
// Log the snapshot to see page structure
const snapshot = await mcp__playwright__browser_snapshot();
console.log("Page snapshot:", JSON.stringify(snapshot, null, 2));
```

### 4. Test Selectors
```typescript
// Test if your selectors work
const count = await mcp__playwright__browser_evaluate({
  function: "() => document.querySelectorAll('.product-card').length",
});
console.log(`Found ${count} product elements`);
```

## Best Practices

### 1. Respectful Scraping
- Add delays between requests (2-3 seconds)
- Don't overwhelm servers with rapid requests
- Use caching to reduce load
- Respect robots.txt

### 2. Error Handling
- Always use try/catch blocks
- Return empty array on failures
- Log errors for debugging
- Don't crash the entire search

### 3. Data Validation
```typescript
function validateProduct(product: any): boolean {
  return !!(
    product.title &&
    product.price > 0 &&
    product.productUrl &&
    product.source
  );
}

const validProducts = products.filter(validateProduct);
```

### 4. Selector Maintenance
- Document CSS selectors used
- Create tests for selector changes
- Monitor for website updates
- Have fallback selectors

## Troubleshooting

### Problem: No products found
**Solution**: Check if:
- Search URL is correct
- Page loaded successfully
- Selectors are still valid (website may have changed)
- Price filters are working

### Problem: Scraper timeout
**Solution**:
- Increase timeout duration
- Check if website is slow/down
- Reduce max results to speed up parsing

### Problem: Incorrect prices
**Solution**:
- Verify price parsing logic
- Check for sale/member prices
- Handle currency symbols correctly
- Test with multiple products

### Problem: Missing images
**Solution**:
- Check if image URLs are relative (convert to absolute)
- Verify image selector
- Handle lazy-loaded images

## Cost Considerations

- **Computational Cost**: Scrapers use server resources (CPU, memory)
- **Time Cost**: Slower than APIs (5-10s vs 1-2s)
- **Maintenance Cost**: Need updates when websites change

**Recommendation**: Use scrapers as a supplement to APIs, not a replacement.

## Next Steps

1. ✅ Test Best Buy scraper with real searches
2. [ ] Build Target scraper using same pattern
3. [ ] Build Costco scraper
4. [ ] Add scraper selection logic to orchestrator
5. [ ] Monitor performance and error rates
6. [ ] Set up alerts for scraper failures

## Resources

- Playwright MCP Tools: Available in Claude Code environment
- Convex Actions: https://docs.convex.dev/functions/actions
- CSS Selectors Guide: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
