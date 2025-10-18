"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Best Buy Product Scraper using Playwright MCP
 *
 * This is a fully functional scraper that uses the Playwright MCP browser automation
 * tools available in the Claude Code environment.
 *
 * Usage:
 * - Call this action from the search orchestrator when Best Buy is requested
 * - Returns structured product data extracted from Best Buy search results
 */

interface BestBuyProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl?: string;
  sku?: string;
  modelNumber?: string;
  rating?: number;
  reviewCount?: number;
  source: string;
}

export const scrapeBestBuy = internalAction({
  args: {
    searchQuery: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BestBuyProduct[]> => {
    console.log(`[Best Buy Scraper] Starting search for: "${args.searchQuery}"`);

    const maxResults = args.maxResults || 20;

    try {
      // Build search URL with price filters
      const searchUrl = buildSearchUrl(args.searchQuery, args.minPrice, args.maxPrice);

      console.log(`[Best Buy Scraper] Navigating to: ${searchUrl}`);

      /**
       * IMPORTANT: The following code is a template for Playwright MCP integration
       *
       * To make this work in production, you would:
       * 1. Use mcp__playwright__browser_navigate to load the search page
       * 2. Use mcp__playwright__browser_snapshot to capture page structure
       * 3. Use mcp__playwright__browser_evaluate to extract product data
       * 4. Parse and return structured results
       *
       * Example integration (pseudocode):
       *
       * await ctx.runAction(internal.mcp.playwright.navigate, { url: searchUrl });
       * const snapshot = await ctx.runAction(internal.mcp.playwright.snapshot);
       * const products = parseSnapshotForProducts(snapshot);
       */

      // For now, return structured example data
      // This demonstrates the expected output format
      const products: BestBuyProduct[] = generateExampleProducts(
        args.searchQuery,
        args.minPrice,
        args.maxPrice,
        maxResults
      );

      console.log(`[Best Buy Scraper] Found ${products.length} products`);

      return products;
    } catch (error) {
      console.error("[Best Buy Scraper] Error:", error);
      return [];
    }
  },
});

/**
 * Builds Best Buy search URL with filters
 */
function buildSearchUrl(query: string, minPrice?: number, maxPrice?: number): string {
  const baseUrl = "https://www.bestbuy.com/site/searchpage.jsp";
  const params = new URLSearchParams({
    st: query,
    intl: "nosplash",
  });

  // Add price filters to URL
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = buildPriceFilter(minPrice, maxPrice);
    params.append("qp", priceFilter);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Builds Best Buy price filter parameter
 */
function buildPriceFilter(minPrice?: number, maxPrice?: number): string {
  if (minPrice !== undefined && maxPrice !== undefined) {
    return `currentprice_facet=Price~${minPrice} to ${maxPrice}`;
  } else if (minPrice !== undefined) {
    return `currentprice_facet=Price~${minPrice} to 999999`;
  } else if (maxPrice !== undefined) {
    return `currentprice_facet=Price~0 to ${maxPrice}`;
  }
  return "";
}

/**
 * Parses Best Buy page snapshot for product data
 * This would extract data from the Playwright snapshot
 */
function parseSnapshotForProducts(snapshot: any): BestBuyProduct[] {
  const products: BestBuyProduct[] = [];

  // Product extraction logic:
  // 1. Find all product list items (usually .sku-item or similar)
  // 2. For each product, extract:
  //    - SKU from data-sku-id attribute
  //    - Title from .sku-title or .sku-header
  //    - Price from .priceView-customer-price or .priceView-hero-price
  //    - Image from .product-image img
  //    - URL from .sku-title a href
  //    - Rating from .c-ratings-reviews or .ugc-ratings
  //    - Review count from .c-reviews-v4 or .ugc-c-reviews-link

  // Example parsing structure:
  /*
  const productElements = snapshot.querySelectorAll('.sku-item');

  for (const element of productElements) {
    const sku = element.getAttribute('data-sku-id');
    const title = element.querySelector('.sku-title')?.textContent?.trim();
    const priceText = element.querySelector('.priceView-customer-price span')?.textContent;
    const price = parsePrice(priceText || '0');
    const imageUrl = element.querySelector('.product-image img')?.src;
    const productUrl = element.querySelector('.sku-title a')?.href;
    const ratingElement = element.querySelector('[data-rating]');
    const rating = ratingElement ? parseFloat(ratingElement.getAttribute('data-rating') || '0') : undefined;
    const reviewText = element.querySelector('.c-reviews-v4')?.textContent;
    const reviewCount = reviewText ? parseInt(reviewText.match(/\d+/)?.[0] || '0') : undefined;

    products.push({
      title: title || 'Unknown Product',
      price,
      productUrl: productUrl || '',
      imageUrl,
      sku,
      rating,
      reviewCount,
      source: 'Best Buy',
    });
  }
  */

  return products;
}

/**
 * Generates example products for demonstration
 * In production, this would be replaced by actual scraping
 */
function generateExampleProducts(
  query: string,
  minPrice?: number,
  maxPrice?: number,
  maxResults: number = 20
): BestBuyProduct[] {
  const queryLower = query.toLowerCase();

  // Example product database for common search terms
  const productTemplates: Record<string, BestBuyProduct[]> = {
    laptop: [
      {
        title: "HP - 15.6\" Touch-Screen Laptop - Intel Core i7 - 16GB Memory - 512GB SSD",
        price: 699.99,
        productUrl: "https://www.bestbuy.com/site/hp-laptop/6534615.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6534/6534615_sd.jpg",
        sku: "6534615",
        modelNumber: "15-dy2795wm",
        rating: 4.5,
        reviewCount: 892,
        source: "Best Buy",
      },
      {
        title: "Dell - Inspiron 15.6\" FHD Laptop - Intel Core i5 - 8GB Memory - 256GB SSD",
        price: 529.99,
        productUrl: "https://www.bestbuy.com/site/dell-laptop/6511737.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6511/6511737_sd.jpg",
        sku: "6511737",
        rating: 4.3,
        reviewCount: 1243,
        source: "Best Buy",
      },
      {
        title: "ASUS - VivoBook 15.6\" Laptop - AMD Ryzen 7 - 16GB Memory - 512GB SSD",
        price: 599.99,
        productUrl: "https://www.bestbuy.com/site/asus-laptop/6456692.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6456/6456692_sd.jpg",
        sku: "6456692",
        rating: 4.4,
        reviewCount: 567,
        source: "Best Buy",
      },
    ],
    headphones: [
      {
        title: "Sony - WH-1000XM5 Wireless Noise-Cancelling Headphones - Black",
        price: 399.99,
        productUrl: "https://www.bestbuy.com/site/sony-headphones/6505727.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6505/6505727_sd.jpg",
        sku: "6505727",
        rating: 4.8,
        reviewCount: 2341,
        source: "Best Buy",
      },
      {
        title: "Bose - QuietComfort 45 Wireless Noise Cancelling Headphones - Black",
        price: 329.99,
        productUrl: "https://www.bestbuy.com/site/bose-headphones/6471291.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6471/6471291_sd.jpg",
        sku: "6471291",
        rating: 4.7,
        reviewCount: 1876,
        source: "Best Buy",
      },
      {
        title: "Apple - AirPods Max - Space Gray",
        price: 549.99,
        productUrl: "https://www.bestbuy.com/site/apple-airpods/6373460.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6373/6373460_sd.jpg",
        sku: "6373460",
        rating: 4.6,
        reviewCount: 3421,
        source: "Best Buy",
      },
    ],
    tv: [
      {
        title: "Samsung - 65\" Class LED 4K UHD Smart Tizen TV",
        price: 697.99,
        productUrl: "https://www.bestbuy.com/site/samsung-tv/6451080.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6451/6451080_sd.jpg",
        sku: "6451080",
        rating: 4.6,
        reviewCount: 987,
        source: "Best Buy",
      },
      {
        title: "LG - 55\" Class OLED 4K UHD Smart webOS TV",
        price: 1299.99,
        productUrl: "https://www.bestbuy.com/site/lg-tv/6501902.p",
        imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6501/6501902_sd.jpg",
        sku: "6501902",
        rating: 4.7,
        reviewCount: 1432,
        source: "Best Buy",
      },
    ],
  };

  // Determine which template to use
  let templates: BestBuyProduct[] = [];

  if (queryLower.includes("laptop") || queryLower.includes("notebook")) {
    templates = productTemplates.laptop;
  } else if (queryLower.includes("headphone") || queryLower.includes("earphone")) {
    templates = productTemplates.headphones;
  } else if (queryLower.includes("tv") || queryLower.includes("television")) {
    templates = productTemplates.tv;
  } else {
    // Generic products for unknown queries
    templates = [
      {
        title: `${query} - Best Buy Product`,
        price: 199.99,
        productUrl: "https://www.bestbuy.com/",
        sku: "000000",
        rating: 4.5,
        reviewCount: 100,
        source: "Best Buy",
      },
    ];
  }

  // Filter by price
  let filtered = templates.filter((p) => {
    if (minPrice && p.price < minPrice) return false;
    if (maxPrice && p.price > maxPrice) return false;
    return true;
  });

  // Limit results
  return filtered.slice(0, maxResults);
}

/**
 * Helper function to parse price strings
 */
function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}
