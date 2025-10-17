"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Internal action to search for products using SerpAPI or mock data
 * This replaces the BrightData action with a working implementation
 */
export const searchProducts = internalAction({
  args: {
    queryId: v.id("queries"),
    searchText: v.string(),
    preferences: v.object({
      minPrice: v.optional(v.number()),
      maxPrice: v.optional(v.number()),
      minRating: v.optional(v.number()),
      targetRetailers: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Update query status to "searching"
      await ctx.runMutation(internal.mutations.brightdata.updateQueryStatus, {
        queryId: args.queryId,
        status: "searching",
      });

      console.log(`[SearchProducts] Starting search for: "${args.searchText}"`);

      // Perform the search (SerpAPI or mock)
      const products = await performProductSearch(
        args.searchText,
        {
          minPrice: args.preferences.minPrice,
          maxPrice: args.preferences.maxPrice,
        }
      );

      console.log(`[SearchProducts] Found ${products.length} products`);

      // Convert to the format expected by the store mutation
      const productsToStore = products.map((product, index) => ({
        title: product.title,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        price: product.price,
        currency: "USD",
        description: product.description,
        reviewsCount: undefined,
        rating: undefined,
        availability: true,
        source: product.source, // "serpapi" or "mock"
        searchRank: index + 1,
      }));

      // Store the products
      const storeResult: any = await ctx.runMutation(
        internal.mutations.brightdata.storeProductResults,
        {
          queryId: args.queryId,
          products: productsToStore,
        }
      );

      console.log(`[SearchProducts] Stored ${storeResult.count} products`);

      // Update query status to "completed"
      await ctx.runMutation(internal.mutations.brightdata.updateQueryStatus, {
        queryId: args.queryId,
        status: "completed",
      });

      return { success: true, count: storeResult.count };
    } catch (error) {
      console.error("[SearchProducts] Error:", error);

      // Update query status to "failed"
      try {
        await ctx.runMutation(internal.mutations.brightdata.updateQueryStatus, {
          queryId: args.queryId,
          status: "failed",
        });
      } catch (updateError) {
        console.error("[SearchProducts] Failed to update query status:", updateError);
      }

      throw error;
    }
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
  }
): Promise<
  Array<{
    title: string;
    description: string;
    imageUrl?: string;
    productUrl: string;
    price: number;
    source: string;
  }>
> {
  // Check if real API key is available
  const serpApiKey = process.env.SERPAPI_KEY;
  
  if (serpApiKey) {
    try {
      console.log(`[SearchProducts] Using SerpAPI for query: "${query}"`);
      const results = await searchWithSerpAPI(query, preferences, serpApiKey);
      return results.map(r => ({ ...r, source: "serpapi" }));
    } catch (error) {
      console.error("[SearchProducts] SerpAPI failed, falling back to mock data:", error);
      // Fall through to mock data
    }
  } else {
    console.log(`[SearchProducts] No SERPAPI_KEY found, using mock data for: "${query}"`);
  }

  // Fallback to mock data
  const mockProducts = generateMockProducts(query, preferences);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return mockProducts.map(p => ({ ...p, source: "mock" }));
}

/**
 * Search products using SerpAPI (Google Shopping)
 */
async function searchWithSerpAPI(
  query: string,
  preferences?: {
    minPrice?: number;
    maxPrice?: number;
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
    num: "10",
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
    console.log("[SearchProducts] No products found via SerpAPI");
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
    .filter((p: any) => p.price > 0);

  console.log(`[SearchProducts] Found ${products.length} products via SerpAPI`);
  return products;
}

/**
 * Generate mock product data for demonstration
 */
function generateMockProducts(
  query: string,
  preferences?: {
    minPrice?: number;
    maxPrice?: number;
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

