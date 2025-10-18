# Multi-API Product Search - Complete Implementation Guide

## Overview

This feature enhances the existing Background Research system by adding multiple product search APIs to provide more comprehensive results, better price comparison, and increased reliability through redundancy.

**Tech Stack**: Next.js, Convex, SerpAPI (Google Shopping), Amazon API, eBay API, Walmart API, Playwright MCP (for custom scraping)

**Core Functionality**:
- Aggregate products from multiple sources (SerpAPI, Amazon, eBay, Walmart, custom scrapers)
- Deduplicate and merge results intelligently
- Rank by best price, availability, and user preferences
- Fallback mechanism when one API fails
- Source-specific optimizations

---

## Architecture

### API Priority & Use Cases

1. **SerpAPI (Primary - Already Implemented)** ✅
   - **Use**: General product search across many retailers
   - **Coverage**: Google Shopping aggregation
   - **Speed**: Fast (1-3 seconds)
   - **Cost**: $50/month for 5,000 searches
   - **When to use**: First attempt for all searches

2. **Amazon Product Advertising API (High Priority)**
   - **Use**: Amazon-specific products with Prime info
   - **Coverage**: 12+ million products
   - **Speed**: Fast (1-2 seconds)
   - **Cost**: Free (commission-based affiliate program)
   - **When to use**: User mentions "Prime" or search is likely Amazon product

3. **eBay Finding API (Medium Priority)**
   - **Use**: Auction items, used/refurbished products, collectibles
   - **Coverage**: 1.3 billion listings
   - **Speed**: Fast (1-2 seconds)
   - **Cost**: Free with limits (5,000 calls/day)
   - **When to use**: User wants "deals", "used", "cheap", or collectibles

4. **Walmart Open API (Medium Priority)**
   - **Use**: Walmart products with in-store availability
   - **Coverage**: Millions of products
   - **Speed**: Medium (2-4 seconds)
   - **Cost**: Free (affiliate program)
   - **When to use**: User mentions "Walmart" or wants in-store pickup

5. **Playwright MCP Scraper (Fallback/Specialized)**
   - **Use**: Niche retailers not covered by APIs
   - **Coverage**: Any website with product listings
   - **Speed**: Slow (5-15 seconds)
   - **Cost**: Computational only
   - **When to use**: Specific retailer requested or APIs fail

---

## Implementation Plan

### Phase 1: Enhanced Search Orchestration

#### 1.1 Create API Aggregator System

**File**: `convex/actions/searchOrchestrator.ts`

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Orchestrates product searches across multiple APIs
 * Runs searches in parallel when possible, aggregates results
 */
export const orchestrateProductSearch = internalAction({
  args: {
    queryId: v.id("queries"),
    searchText: v.string(),
    preferences: v.object({
      minPrice: v.optional(v.number()),
      maxPrice: v.optional(v.number()),
      minRating: v.optional(v.number()),
      targetRetailers: v.optional(v.array(v.string())),
      includeUsed: v.optional(v.boolean()),
      preferPrime: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // Determine which APIs to use based on search context
    const apiStrategy = determineAPIStrategy(args.searchText, args.preferences);

    // Run API searches in parallel
    const searchPromises = [];

    if (apiStrategy.useSerpAPI) {
      searchPromises.push(searchWithSerpAPI(ctx, args));
    }

    if (apiStrategy.useAmazon) {
      searchPromises.push(searchWithAmazon(ctx, args));
    }

    if (apiStrategy.useEbay) {
      searchPromises.push(searchWithEbay(ctx, args));
    }

    if (apiStrategy.useWalmart) {
      searchPromises.push(searchWithWalmart(ctx, args));
    }

    // Wait for all API calls to complete
    const results = await Promise.allSettled(searchPromises);

    // Aggregate successful results
    const allProducts = aggregateResults(results);

    // Deduplicate and merge similar products
    const mergedProducts = deduplicateProducts(allProducts);

    // Rank products by price, rating, availability
    const rankedProducts = rankProducts(mergedProducts, args.preferences);

    // Store results
    await ctx.runMutation(internal.mutations.brightdata.storeProductResults, {
      queryId: args.queryId,
      products: rankedProducts,
    });

    return { success: true, count: rankedProducts.length };
  },
});

/**
 * Determines which APIs to use based on search context
 */
function determineAPIStrategy(searchText: string, preferences: any) {
  const lower = searchText.toLowerCase();

  return {
    useSerpAPI: true, // Always use SerpAPI for broad coverage
    useAmazon: preferences?.preferPrime || lower.includes("prime") || lower.includes("amazon"),
    useEbay: preferences?.includeUsed || lower.includes("used") || lower.includes("deal") || lower.includes("auction"),
    useWalmart: lower.includes("walmart") || preferences?.targetRetailers?.includes("Walmart"),
    usePlaywright: false, // Only use on-demand for specific retailers
  };
}
```

#### 1.2 Implement Deduplication & Merging

**File**: `convex/lib/productMerging.ts`

```typescript
/**
 * Deduplicates products by matching titles and normalizing prices
 * Merges product data from multiple sources to create best composite listing
 */

export interface Product {
  title: string;
  price: number;
  productUrl: string;
  source: string;
  imageUrl?: string;
  description?: string;
  rating?: number;
  reviewsCount?: number;
}

export function deduplicateProducts(products: Product[]): Product[] {
  const productMap = new Map<string, Product[]>();

  // Group similar products
  for (const product of products) {
    const normalizedTitle = normalizeTitle(product.title);

    if (!productMap.has(normalizedTitle)) {
      productMap.set(normalizedTitle, []);
    }
    productMap.get(normalizedTitle)!.push(product);
  }

  // Merge grouped products
  const merged: Product[] = [];

  for (const [_, group] of productMap) {
    if (group.length === 1) {
      merged.push(group[0]);
    } else {
      merged.push(mergeSimilarProducts(group));
    }
  }

  return merged;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50); // Use first 50 chars for matching
}

function mergeSimilarProducts(products: Product[]): Product {
  // Pick the product with the best price
  const bestPrice = products.sort((a, b) => a.price - b.price)[0];

  // Aggregate review data
  const totalReviews = products.reduce((sum, p) => sum + (p.reviewsCount || 0), 0);
  const avgRating = products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length;

  // Create composite product with best info from each source
  return {
    ...bestPrice,
    rating: avgRating > 0 ? avgRating : undefined,
    reviewsCount: totalReviews > 0 ? totalReviews : undefined,
    description: products.find(p => p.description)?.description || bestPrice.description,
    imageUrl: products.find(p => p.imageUrl)?.imageUrl || bestPrice.imageUrl,
    // Add metadata about available sources
    alternativeSources: products.map(p => ({ source: p.source, price: p.price, url: p.productUrl })),
  };
}
```

### Phase 2: Individual API Integrations

#### 2.1 Amazon Product Advertising API

**Setup**:
1. Sign up at https://affiliate-program.amazon.com/
2. Register for Product Advertising API access
3. Get Access Key, Secret Key, and Associate Tag

**File**: `convex/actions/amazonAPI.ts`

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Search Amazon products using Product Advertising API
 * Requires: AWS credentials + Amazon Associate Tag
 */
export const searchAmazon = internalAction({
  args: {
    searchText: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const accessKey = process.env.AMAZON_ACCESS_KEY;
    const secretKey = process.env.AMAZON_SECRET_KEY;
    const associateTag = process.env.AMAZON_ASSOCIATE_TAG;

    if (!accessKey || !secretKey || !associateTag) {
      console.log("[Amazon API] Credentials not configured");
      return [];
    }

    try {
      // Amazon requires AWS Signature Version 4 signing
      const signedRequest = createAmazonSignedRequest({
        keywords: args.searchText,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        accessKey,
        secretKey,
        associateTag,
      });

      const response = await fetch(signedRequest.url, {
        method: "POST",
        headers: signedRequest.headers,
        body: signedRequest.body,
      });

      if (!response.ok) {
        throw new Error(`Amazon API error: ${response.statusText}`);
      }

      const data = await response.json();

      return parseAmazonResults(data);
    } catch (error) {
      console.error("[Amazon API] Error:", error);
      return [];
    }
  },
});

// Helper functions for Amazon API signing (AWS Signature V4)
// Full implementation would go here
```

**Environment Variables**:
```bash
AMAZON_ACCESS_KEY=your_access_key
AMAZON_SECRET_KEY=your_secret_key
AMAZON_ASSOCIATE_TAG=your_associate_tag
```

#### 2.2 eBay Finding API

**Setup**:
1. Create developer account at https://developer.ebay.com/
2. Get App ID (Client ID)
3. Free tier: 5,000 calls/day

**File**: `convex/actions/ebayAPI.ts`

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const searchEbay = internalAction({
  args: {
    searchText: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    includeUsed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const appId = process.env.EBAY_APP_ID;

    if (!appId) {
      console.log("[eBay API] App ID not configured");
      return [];
    }

    try {
      const params = new URLSearchParams({
        "OPERATION-NAME": "findItemsAdvanced",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": appId,
        "RESPONSE-DATA-FORMAT": "JSON",
        keywords: args.searchText,
        "paginationInput.entriesPerPage": "100",
      });

      // Add price filters
      if (args.minPrice || args.maxPrice) {
        let filterIndex = 0;

        if (args.minPrice) {
          params.append(`itemFilter(${filterIndex}).name`, "MinPrice");
          params.append(`itemFilter(${filterIndex}).value`, args.minPrice.toString());
          filterIndex++;
        }

        if (args.maxPrice) {
          params.append(`itemFilter(${filterIndex}).name`, "MaxPrice");
          params.append(`itemFilter(${filterIndex}).value`, args.maxPrice.toString());
          filterIndex++;
        }
      }

      // Filter by condition (new vs used)
      if (!args.includeUsed) {
        params.append("itemFilter(0).name", "Condition");
        params.append("itemFilter(0).value", "New");
      }

      const response = await fetch(
        `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`eBay API error: ${response.statusText}`);
      }

      const data = await response.json();

      return parseEbayResults(data);
    } catch (error) {
      console.error("[eBay API] Error:", error);
      return [];
    }
  },
});

function parseEbayResults(data: any) {
  const items = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];

  return items.map((item: any) => ({
    title: item.title?.[0] || "Unknown Product",
    price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || "0"),
    productUrl: item.viewItemURL?.[0] || "",
    imageUrl: item.galleryURL?.[0],
    source: "eBay",
    description: item.subtitle?.[0] || "",
    rating: undefined, // eBay doesn't provide rating in Finding API
    reviewsCount: undefined,
  }));
}
```

**Environment Variables**:
```bash
EBAY_APP_ID=your_ebay_app_id
```

#### 2.3 Walmart Open API

**Setup**:
1. Apply at https://developer.walmart.com/
2. Get API Key and Affiliate ID
3. Free access for affiliates

**File**: `convex/actions/walmartAPI.ts`

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const searchWalmart = internalAction({
  args: {
    searchText: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.WALMART_API_KEY;

    if (!apiKey) {
      console.log("[Walmart API] API key not configured");
      return [];
    }

    try {
      const params = new URLSearchParams({
        query: args.searchText,
        format: "json",
      });

      const response = await fetch(
        `https://api.walmartlabs.com/v1/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Walmart API error: ${response.statusText}`);
      }

      const data = await response.json();

      let items = data.items || [];

      // Filter by price
      if (args.minPrice || args.maxPrice) {
        items = items.filter((item: any) => {
          const price = item.salePrice || 0;
          return (
            (!args.minPrice || price >= args.minPrice) &&
            (!args.maxPrice || price <= args.maxPrice)
          );
        });
      }

      return parseWalmartResults(items);
    } catch (error) {
      console.error("[Walmart API] Error:", error);
      return [];
    }
  },
});

function parseWalmartResults(items: any[]) {
  return items.map((item: any) => ({
    title: item.name || "Unknown Product",
    price: item.salePrice || 0,
    productUrl: item.productUrl || "",
    imageUrl: item.thumbnailImage,
    source: "Walmart",
    description: item.shortDescription || "",
    rating: item.customerRating,
    reviewsCount: item.numReviews,
  }));
}
```

**Environment Variables**:
```bash
WALMART_API_KEY=your_walmart_api_key
```

### Phase 3: Playwright MCP Integration for Custom Scraping

#### 3.1 Playwright Scraper for Specific Retailers

**File**: `convex/actions/playwrightScraper.ts`

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Uses Playwright MCP to scrape specific retailers
 * Only use when APIs don't cover a specific retailer
 */
export const scrapeRetailerProducts = internalAction({
  args: {
    retailer: v.string(), // e.g., "bestbuy", "target", "costco"
    searchText: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`[Playwright] Scraping ${args.retailer} for: ${args.searchText}`);

    try {
      // This would integrate with Playwright MCP
      // The actual implementation would use the Playwright MCP tools
      // For now, this is a placeholder for the architecture

      const scraper = getRetailerScraper(args.retailer);

      if (!scraper) {
        console.log(`[Playwright] No scraper configured for ${args.retailer}`);
        return [];
      }

      const products = await scraper.search({
        query: args.searchText,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
      });

      return products;
    } catch (error) {
      console.error(`[Playwright] Error scraping ${args.retailer}:`, error);
      return [];
    }
  },
});

// Retailer-specific scraper configurations
function getRetailerScraper(retailer: string) {
  const scrapers: Record<string, any> = {
    bestbuy: {
      search: async (params: any) => {
        // Playwright scraping logic for Best Buy
        // Would use MCP browser tools to:
        // 1. Navigate to bestbuy.com/search
        // 2. Enter search query
        // 3. Extract product cards
        // 4. Parse prices, images, titles
        return [];
      },
    },
    target: {
      search: async (params: any) => {
        // Target-specific scraping
        return [];
      },
    },
    costco: {
      search: async (params: any) => {
        // Costco-specific scraping
        return [];
      },
    },
  };

  return scrapers[retailer.toLowerCase()];
}
```

#### 3.2 Best Buy Scraper Example (Using Playwright MCP)

**File**: `.claude/agents/scraper-bestbuy.md`

```markdown
# Best Buy Product Scraper Agent

**Purpose**: Scrape Best Buy product listings when API coverage is insufficient

**When to use**: User specifically requests Best Buy, or other APIs don't find Best Buy results

**Tools available**: Playwright MCP (browser automation)

**Process**:

1. Navigate to bestbuy.com/site/searchpage.jsp
2. Enter search query in search box
3. Apply price filters if provided
4. Wait for product grid to load
5. Extract product data:
   - Title from .sku-title
   - Price from .priceView-customer-price
   - Image from .product-image img
   - URL from .sku-title a[href]
   - Rating from .c-stars (if available)
6. Return structured product array

**Error handling**:
- Timeout if page doesn't load in 10s
- Return empty array on errors
- Log all failures for debugging
```

### Phase 4: Schema & Data Model Updates

#### 4.1 Update Schema for Multi-Source Products

**File**: `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables

  products: defineTable({
    queryId: v.id("queries"),
    title: v.string(),
    imageUrl: v.optional(v.string()),
    productUrl: v.string(),
    price: v.number(),
    currency: v.string(),
    description: v.optional(v.string()),
    reviewsCount: v.optional(v.number()),
    rating: v.optional(v.number()),
    availability: v.boolean(),
    source: v.string(), // "SerpAPI", "Amazon", "eBay", "Walmart", "Playwright:BestBuy"
    searchRank: v.number(),
    systemRank: v.number(),
    createdAt: v.number(),

    // NEW: Multi-source metadata
    alternativeSources: v.optional(
      v.array(
        v.object({
          source: v.string(),
          price: v.number(),
          url: v.string(),
        })
      )
    ),

    // NEW: Deduplication tracking
    normalizedTitle: v.string(), // For matching similar products
    isDuplicate: v.optional(v.boolean()),
    primaryProductId: v.optional(v.id("products")), // Link to primary if duplicate
  })
    .index("by_query", ["queryId"])
    .index("by_query_and_rank", ["queryId", "systemRank"])
    .index("by_normalized_title", ["queryId", "normalizedTitle"]), // For deduplication
});
```

### Phase 5: Frontend Updates

#### 5.1 Multi-Source Product Display

**File**: `components/ProductCard.tsx` (enhancement)

```typescript
// Add source badges and alternative pricing
<div className="flex items-center gap-2">
  <Badge variant="outline">{product.source}</Badge>

  {product.alternativeSources && product.alternativeSources.length > 0 && (
    <Popover>
      <PopoverTrigger>
        <Badge variant="secondary">
          +{product.alternativeSources.length} more sources
        </Badge>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <p className="font-medium">Also available at:</p>
          {product.alternativeSources.map((alt, i) => (
            <div key={i} className="flex justify-between">
              <span>{alt.source}</span>
              <span className="font-medium">${alt.price}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )}
</div>
```

#### 5.2 Source Filter UI

**File**: `components/SearchInput.tsx` (enhancement)

```typescript
// Add source selection
<div className="space-y-2">
  <label>Search Sources</label>
  <div className="flex flex-wrap gap-2">
    <Checkbox id="serpapi" defaultChecked>
      <label htmlFor="serpapi">Google Shopping</label>
    </Checkbox>
    <Checkbox id="amazon">
      <label htmlFor="amazon">Amazon</label>
    </Checkbox>
    <Checkbox id="ebay">
      <label htmlFor="ebay">eBay</label>
    </Checkbox>
    <Checkbox id="walmart">
      <label htmlFor="walmart">Walmart</label>
    </Checkbox>
  </div>
</div>
```

---

## Testing Plan

### Unit Tests

1. **Deduplication Logic**
   - Test with identical products from different sources
   - Test with slightly different titles
   - Test price merging

2. **API Parsers**
   - Test Amazon response parsing
   - Test eBay response parsing
   - Test Walmart response parsing
   - Test error handling for malformed responses

### Integration Tests

1. **Multi-API Search**
   - Test parallel API calls
   - Test fallback when one API fails
   - Test aggregation of results

2. **Playwright Scraping**
   - Test Best Buy scraper
   - Test timeout handling
   - Test error recovery

### Performance Tests

1. **Latency**
   - Measure time for parallel API calls vs sequential
   - Target: < 5 seconds for all APIs combined

2. **Cost**
   - Track API usage and estimate monthly costs
   - Monitor free tier limits

---

## Environment Variables Summary

Add to `.env.local` and Convex dashboard:

```bash
# Already configured
SERPAPI_KEY=your_serpapi_key

# New API keys to add
AMAZON_ACCESS_KEY=your_amazon_access_key
AMAZON_SECRET_KEY=your_amazon_secret_key
AMAZON_ASSOCIATE_TAG=your_amazon_associate_tag

EBAY_APP_ID=your_ebay_app_id

WALMART_API_KEY=your_walmart_api_key
```

---

## Rollout Strategy

### Week 1: Foundation
- ✅ SerpAPI already working
- [ ] Create orchestrator system
- [ ] Implement deduplication logic
- [ ] Update schema

### Week 2: Amazon Integration
- [ ] Set up Amazon Product Advertising API account
- [ ] Implement Amazon search action
- [ ] Test with real queries
- [ ] Add to orchestrator

### Week 3: eBay Integration
- [ ] Set up eBay developer account
- [ ] Implement eBay Finding API
- [ ] Test with various product categories
- [ ] Add to orchestrator

### Week 4: Walmart + Playwright
- [ ] Set up Walmart API
- [ ] Implement Walmart search
- [ ] Build Best Buy Playwright scraper
- [ ] Create scraper agent template
- [ ] Full end-to-end testing

### Week 5: Polish & Optimize
- [ ] UI enhancements (source badges, filters)
- [ ] Performance optimization
- [ ] Cost monitoring
- [ ] Documentation

---

## Cost Analysis

| API | Free Tier | Paid Tier | Notes |
|-----|-----------|-----------|-------|
| SerpAPI | 100 searches/month | $50/month for 5,000 | Already in use |
| Amazon PA-API | Free (commission-based) | Free (commission-based) | Must drive sales |
| eBay Finding | 5,000 calls/day | Free | Very generous |
| Walmart | Free (affiliate) | Free (affiliate) | Must be affiliate |
| Playwright | Free (compute only) | Free (compute only) | Uses server resources |

**Estimated Monthly Cost** (assuming 1,000 searches/month):
- SerpAPI: $10
- Amazon: $0
- eBay: $0
- Walmart: $0
- Total: ~$10/month

---

## Success Metrics

1. **Coverage**: % of searches that return results from 2+ sources
2. **Deduplication Accuracy**: % of duplicates correctly identified
3. **Price Advantage**: Average $ saved by finding better prices
4. **Response Time**: Average time to complete multi-API search
5. **API Reliability**: % of searches with at least one successful API call

**Targets**:
- 80% of searches have 2+ sources
- 95% deduplication accuracy
- < 5 second average response time
- 99% have at least one successful API

---

## Next Steps After Implementation

1. **Machine Learning for Deduplication**
   - Use ML to match products with different titles
   - Train on user feedback (same product or not)

2. **Price Tracking**
   - Store historical prices from all sources
   - Alert users to price drops
   - Show price history graphs

3. **Affiliate Revenue**
   - Track which products users click/buy
   - Optimize for high-commission sources
   - A/B test source prioritization

4. **API Load Balancing**
   - Rotate APIs to stay within free tiers
   - Cache results to reduce API calls
   - Implement request queuing

---

## Resources

- **Amazon Product Advertising API**: https://webservices.amazon.com/paapi5/documentation/
- **eBay Finding API**: https://developer.ebay.com/devzone/finding/Concepts/FindingAPIGuide.html
- **Walmart Open API**: https://developer.walmart.com/
- **Playwright MCP**: Available in Claude Code environment

---

## Status

**Status**: Implementation Plan Complete - Ready to Execute

This plan provides a complete roadmap for adding multi-API product search to the existing Background Research feature. Implementation can proceed in phases for gradual rollout and testing.
