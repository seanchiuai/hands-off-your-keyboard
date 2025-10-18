"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Playwright-based web scraper for specific retailers
 * Uses browser automation to extract product data when APIs aren't available
 *
 * Supported retailers:
 * - Best Buy
 * - Target
 * - Costco
 * - B&H Photo
 * - Newegg
 */

interface ScrapedProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl?: string;
  description?: string;
  rating?: number;
  reviewsCount?: number;
  source: string;
}

export const scrapeRetailer = internalAction({
  args: {
    retailer: v.string(), // "bestbuy", "target", "costco", etc.
    searchText: v.string(),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ScrapedProduct[]> => {
    console.log(`[Playwright Scraper] Scraping ${args.retailer} for: "${args.searchText}"`);

    const maxResults = args.maxResults || 10;

    try {
      switch (args.retailer.toLowerCase()) {
        case "bestbuy":
          return await scrapeBestBuy(args.searchText, args.minPrice, args.maxPrice, maxResults);

        case "target":
          return await scrapeTarget(args.searchText, args.minPrice, args.maxPrice, maxResults);

        case "costco":
          return await scrapeCostco(args.searchText, args.minPrice, args.maxPrice, maxResults);

        case "bhphoto":
        case "bh":
          return await scrapeBHPhoto(args.searchText, args.minPrice, args.maxPrice, maxResults);

        case "newegg":
          return await scrapeNewegg(args.searchText, args.minPrice, args.maxPrice, maxResults);

        default:
          console.log(`[Playwright Scraper] Unsupported retailer: ${args.retailer}`);
          return [];
      }
    } catch (error) {
      console.error(`[Playwright Scraper] Error scraping ${args.retailer}:`, error);
      return [];
    }
  },
});

/**
 * Best Buy Scraper
 * URL: https://www.bestbuy.com/
 */
async function scrapeBestBuy(
  query: string,
  minPrice?: number,
  maxPrice?: number,
  maxResults: number = 10
): Promise<ScrapedProduct[]> {
  // NOTE: This is a template for Playwright integration
  // In production, this would use the Playwright MCP browser automation tools
  // The actual implementation would require:
  // 1. Browser navigation to bestbuy.com/site/searchpage.jsp
  // 2. Input search query
  // 3. Extract product data from search results
  // 4. Parse prices, titles, images, URLs

  console.log("[Best Buy] Starting scrape for:", query);

  // Mock implementation - replace with actual Playwright calls
  const products: ScrapedProduct[] = [];

  // Simulate scraping logic
  const searchUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(query)}`;
  console.log("[Best Buy] Search URL:", searchUrl);

  // In production, would use:
  // - mcp__playwright__browser_navigate to go to search page
  // - mcp__playwright__browser_snapshot to get page structure
  // - mcp__playwright__browser_evaluate to extract product data
  // - Parse results and filter by price

  // Example of what the extraction would look like:
  /*
  const productElements = await extractProductElements();

  for (const element of productElements.slice(0, maxResults)) {
    const title = element.querySelector('.sku-title')?.textContent || '';
    const priceText = element.querySelector('.priceView-customer-price span')?.textContent || '0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    const imageUrl = element.querySelector('.product-image img')?.src;
    const productUrl = element.querySelector('.sku-title a')?.href;
    const rating = parseFloat(element.querySelector('.c-stars')?.getAttribute('data-rating') || '0');

    if (minPrice && price < minPrice) continue;
    if (maxPrice && price > maxPrice) continue;

    products.push({
      title,
      price,
      productUrl: productUrl || '',
      imageUrl,
      rating: rating > 0 ? rating : undefined,
      source: 'Best Buy (Scraped)',
    });
  }
  */

  return products;
}

/**
 * Target Scraper
 * URL: https://www.target.com/
 */
async function scrapeTarget(
  query: string,
  minPrice?: number,
  maxPrice?: number,
  maxResults: number = 10
): Promise<ScrapedProduct[]> {
  console.log("[Target] Starting scrape for:", query);

  const searchUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`;
  console.log("[Target] Search URL:", searchUrl);

  // Mock implementation
  // In production, would scrape Target's search results page
  // Target uses React, so would need to wait for dynamic content

  const products: ScrapedProduct[] = [];

  // Scraping selectors for Target:
  // - Product card: [data-test="product-card"]
  // - Title: [data-test="product-title"]
  // - Price: [data-test="product-price"]
  // - Image: img[alt="product image"]
  // - Rating: .styles__StarsWrapper

  return products;
}

/**
 * Costco Scraper
 * URL: https://www.costco.com/
 */
async function scrapeCostco(
  query: string,
  minPrice?: number,
  maxPrice?: number,
  maxResults: number = 10
): Promise<ScrapedProduct[]> {
  console.log("[Costco] Starting scrape for:", query);

  const searchUrl = `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(query)}`;
  console.log("[Costco] Search URL:", searchUrl);

  const products: ScrapedProduct[] = [];

  // Scraping selectors for Costco:
  // - Product: .product-tile
  // - Title: .description a
  // - Price: .price
  // - Image: .product-image-url img
  // - Member price vs non-member price

  return products;
}

/**
 * B&H Photo Scraper
 * URL: https://www.bhphotovideo.com/
 */
async function scrapeBHPhoto(
  query: string,
  minPrice?: number,
  maxPrice?: number,
  maxResults: number = 10
): Promise<ScrapedProduct[]> {
  console.log("[B&H Photo] Starting scrape for:", query);

  const searchUrl = `https://www.bhphotovideo.com/c/search?q=${encodeURIComponent(query)}`;
  console.log("[B&H Photo] Search URL:", searchUrl);

  const products: ScrapedProduct[] = [];

  // Scraping selectors for B&H:
  // - Product: [data-selenium="miniProductPage"]
  // - Title: [data-selenium="itemTitle"]
  // - Price: [data-selenium="pricingPrice"]
  // - Image: [data-selenium="productImage"]
  // - Rating: .sr-only (contains rating text)

  return products;
}

/**
 * Newegg Scraper
 * URL: https://www.newegg.com/
 */
async function scrapeNewegg(
  query: string,
  minPrice?: number,
  maxPrice?: number,
  maxResults: number = 10
): Promise<ScrapedProduct[]> {
  console.log("[Newegg] Starting scrape for:", query);

  const searchUrl = `https://www.newegg.com/p/pl?d=${encodeURIComponent(query)}`;
  console.log("[Newegg] Search URL:", searchUrl);

  const products: ScrapedProduct[] = [];

  // Scraping selectors for Newegg:
  // - Product: .item-cell
  // - Title: .item-title
  // - Price: .price-current strong
  // - Image: .item-img img
  // - Rating: .item-rating (egg rating system)

  return products;
}

/**
 * Helper function to clean and parse price strings
 */
function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

/**
 * Helper function to validate URLs
 */
function ensureAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http")) {
    return url;
  }
  return new URL(url, baseUrl).toString();
}
