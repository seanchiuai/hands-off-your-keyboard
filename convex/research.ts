import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Background research action triggered by the Pipecat voice agent
 * This performs external product searches and stores results in the database
 */
export const triggerBackgroundResearch = internalAction({
  args: {
    query: v.string(),
    sessionId: v.string(),
    userId: v.string(),
    preferences: v.optional(
      v.object({
        minPrice: v.optional(v.number()),
        maxPrice: v.optional(v.number()),
        brands: v.optional(v.array(v.string())),
        categories: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    console.log(`[Research] Starting research for query: "${args.query}"`);

    try {
      // In production, this would integrate with real product search APIs:
      // - Google Shopping API
      // - Amazon Product Advertising API
      // - Custom product database APIs
      // - Web scraping services (Bright Data, ScrapingBee, etc.)

      // For MVP/demo purposes, we'll use a mock product search
      const searchResults = await performProductSearch(args.query, args.preferences);

      // Store the results in Convex for the frontend to query
      await ctx.runMutation(internal.research.storeResearchResults, {
        sessionId: args.sessionId,
        query: args.query,
        results: searchResults,
      });

      console.log(`[Research] Completed research for "${args.query}". Found ${searchResults.length} items.`);

      return {
        success: true,
        resultsCount: searchResults.length,
        sessionId: args.sessionId,
      };
    } catch (error) {
      console.error("[Research] Error during background research:", error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Internal mutation to store research results (called by triggerBackgroundResearch action)
 */
export const storeResearchResults = internalMutation({
  args: {
    sessionId: v.string(),
    query: v.string(),
    results: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        imageUrl: v.optional(v.string()),
        productUrl: v.string(),
        price: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("research_results", {
      sessionId: args.sessionId,
      query: args.query,
      results: args.results,
      timestamp: Date.now(),
    });
  },
});

/**
 * Helper function to perform product search
 * Supports both real API (SerpAPI) and mock data
 */
async function performProductSearch(
  query: string,
  preferences?: {
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    categories?: string[];
  }
): Promise<
  Array<{
    title: string;
    description: string;
    imageUrl?: string;
    productUrl: string;
    price: number;
  }>
> {
  // Check if real API key is available
  const serpApiKey = process.env.SERPAPI_KEY;
  
  if (serpApiKey) {
    try {
      console.log(`[Research] Using SerpAPI for query: "${query}"`);
      return await searchWithSerpAPI(query, preferences, serpApiKey);
    } catch (error) {
      console.error("[Research] SerpAPI failed, falling back to mock data:", error);
      // Fall through to mock data
    }
  } else {
    console.log(`[Research] No SERPAPI_KEY found, using mock data for: "${query}"`);
  }

  // Fallback to mock data
  const mockProducts = generateMockProducts(query, preferences);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return mockProducts;
}

/**
 * Search products using SerpAPI (Google Shopping)
 * Get free API key at: https://serpapi.com/
 */
async function searchWithSerpAPI(
  query: string,
  preferences?: {
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    categories?: string[];
  },
  apiKey?: string
): Promise<Array<{
  title: string;
  description: string;
  imageUrl?: string;
  productUrl: string;
  price: number;
}>> {
  // Build SerpAPI URL
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey || "",
    num: "10", // Number of results
  });

  // Add price filters if provided
  if (preferences?.minPrice || preferences?.maxPrice) {
    const minPrice = preferences.minPrice || 0;
    const maxPrice = preferences.maxPrice || 999999;
    params.append("tbs", `mr:1,price:1,ppr_min:${minPrice},ppr_max:${maxPrice}`);
  }

  const response = await fetch(`https://serpapi.com/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.shopping_results || data.shopping_results.length === 0) {
    console.log("[Research] No products found via SerpAPI");
    return [];
  }

  // Parse and normalize results
  const products = data.shopping_results
    .filter((item: any) => item.price && item.title)
    .map((item: any) => ({
      title: item.title || "Unknown Product",
      description: item.snippet || item.title || "",
      imageUrl: item.thumbnail || undefined,
      productUrl: item.link || item.product_link || "https://example.com",
      price: parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0,
    }))
    .filter((p: any) => p.price > 0); // Filter out items without valid prices

  console.log(`[Research] Found ${products.length} products via SerpAPI`);
  return products;
}

/**
 * Generate mock product data for demonstration
 * Remove this function in production and use real API calls
 */
function generateMockProducts(
  query: string,
  preferences?: {
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    categories?: string[];
  }
): Array<{
  title: string;
  description: string;
  imageUrl?: string;
  productUrl: string;
  price: number;
}> {
  const queryLower = query.toLowerCase();

  // Determine product category from query
  let category = "general";
  if (queryLower.includes("laptop") || queryLower.includes("computer")) {
    category = "electronics";
  } else if (queryLower.includes("chair") || queryLower.includes("desk") || queryLower.includes("furniture")) {
    category = "furniture";
  } else if (queryLower.includes("shoe") || queryLower.includes("shirt") || queryLower.includes("clothing")) {
    category = "clothing";
  } else if (queryLower.includes("headphone") || queryLower.includes("speaker")) {
    category = "audio";
  }

  const mockData: Record<string, Array<{
    title: string;
    description: string;
    imageUrl?: string;
    productUrl: string;
    basePrice: number;
  }>> = {
    electronics: [
      {
        title: "Dell XPS 15 Laptop",
        description: "15.6-inch Full HD display, Intel Core i7, 16GB RAM, 512GB SSD",
        imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400",
        productUrl: "https://example.com/products/dell-xps-15",
        basePrice: 1299.99,
      },
      {
        title: "MacBook Pro 14-inch",
        description: "Apple M3 chip, 16GB RAM, 512GB SSD, Stunning Retina display",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
        productUrl: "https://example.com/products/macbook-pro-14",
        basePrice: 1999.99,
      },
      {
        title: "HP Pavilion Gaming Laptop",
        description: "15.6-inch, AMD Ryzen 5, NVIDIA GTX 1650, 8GB RAM",
        imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400",
        productUrl: "https://example.com/products/hp-pavilion-gaming",
        basePrice: 899.99,
      },
    ],
    furniture: [
      {
        title: "Ergonomic Office Chair",
        description: "Mesh back, adjustable height, lumbar support, 360° swivel",
        imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
        productUrl: "https://example.com/products/ergonomic-chair",
        basePrice: 249.99,
      },
      {
        title: "Standing Desk with Electric Height Adjustment",
        description: "Programmable height settings, spacious work surface, cable management",
        imageUrl: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400",
        productUrl: "https://example.com/products/standing-desk",
        basePrice: 499.99,
      },
      {
        title: "Modern L-Shaped Desk",
        description: "Corner desk with storage shelves, sturdy construction, oak finish",
        imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400",
        productUrl: "https://example.com/products/l-shaped-desk",
        basePrice: 349.99,
      },
    ],
    clothing: [
      {
        title: "Nike Air Max Running Shoes",
        description: "Comfortable cushioning, breathable mesh, durable outsole",
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
        productUrl: "https://example.com/products/nike-air-max",
        basePrice: 129.99,
      },
      {
        title: "Adidas Ultraboost Running Shoes",
        description: "Energy-returning boost cushioning, Primeknit upper, continental rubber outsole",
        imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400",
        productUrl: "https://example.com/products/adidas-ultraboost",
        basePrice: 179.99,
      },
    ],
    audio: [
      {
        title: "Sony WH-1000XM5 Noise Cancelling Headphones",
        description: "Industry-leading noise cancellation, 30-hour battery, premium sound quality",
        imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400",
        productUrl: "https://example.com/products/sony-wh1000xm5",
        basePrice: 399.99,
      },
      {
        title: "Bose QuietComfort 45 Headphones",
        description: "World-class noise cancellation, comfortable design, 24-hour battery",
        imageUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400",
        productUrl: "https://example.com/products/bose-qc45",
        basePrice: 329.99,
      },
    ],
    general: [
      {
        title: "Premium Product for " + query,
        description: "High-quality item matching your search criteria",
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
        productUrl: "https://example.com/products/premium-" + query.replace(/\s/g, "-"),
        basePrice: 199.99,
      },
      {
        title: "Best Value " + query,
        description: "Great quality at an affordable price point",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        productUrl: "https://example.com/products/value-" + query.replace(/\s/g, "-"),
        basePrice: 99.99,
      },
    ],
  };

  let products = mockData[category] || mockData.general;

  // Filter by price preferences
  if (preferences?.minPrice !== undefined || preferences?.maxPrice !== undefined) {
    products = products.filter((p) => {
      const inRange =
        (preferences.minPrice === undefined || p.basePrice >= preferences.minPrice) &&
        (preferences.maxPrice === undefined || p.basePrice <= preferences.maxPrice);
      return inRange;
    });
  }

  // Add some price variation
  return products.map((p) => ({
    ...p,
    price: Math.round((p.basePrice + (Math.random() - 0.5) * 50) * 100) / 100,
  }));
}
