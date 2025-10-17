"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Internal action to initiate product search using Bright Data
 * This action will be triggered when a new search query is created
 */
export const initiateProductSearch = internalAction({
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

      // Get Bright Data configuration from environment variables
      const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY;
      const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || "serp_api1";

      if (!BRIGHT_DATA_API_KEY) {
        throw new Error(
          "Bright Data API credentials not configured. Please set BRIGHT_DATA_API_KEY environment variable."
        );
      }

      // Build Google Shopping URL with query parameters
      const searchParams = new URLSearchParams({
        q: args.searchText,
        tbm: "shop", // Google Shopping
        hl: "en", // Language: English
        gl: "us", // Country: United States
        num: "20", // Number of results
      });

      // Add price filter if specified
      if (args.preferences.minPrice || args.preferences.maxPrice) {
        const minPrice = args.preferences.minPrice || 0;
        const maxPrice = args.preferences.maxPrice || 999999;
        searchParams.append("tbs", `price:1,ppr_min:${minPrice},ppr_max:${maxPrice}`);
      }

      const googleShoppingUrl = `https://www.google.com/search?${searchParams.toString()}&brd_json=1`;

      console.log("Initiating Bright Data SERP API search:", {
        queryId: args.queryId,
        searchText: args.searchText,
        url: googleShoppingUrl,
      });

      // Make request to Bright Data SERP API
      const response = await fetch("https://api.brightdata.com/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
        },
        body: JSON.stringify({
          zone: BRIGHT_DATA_ZONE,
          url: googleShoppingUrl,
          format: "json",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Bright Data API Error:", {
          status: response.status,
          body: errorBody,
        });
        throw new Error(`Bright Data API failed: ${response.status} - ${errorBody}`);
      }

      const brightDataResult = await response.json();
      console.log("Bright Data response received:", {
        queryId: args.queryId,
        resultCount: brightDataResult.data?.length || 0,
      });

      // Process the raw data from Bright Data
      const processedProducts = processResults(brightDataResult);

      // Store the processed products using internal mutation
      const storeResult: any = await ctx.runMutation(
        internal.mutations.brightdata.storeProductResults,
        {
          queryId: args.queryId,
          products: processedProducts,
        }
      );

      console.log("Products stored successfully:", {
        queryId: args.queryId,
        count: storeResult.count,
      });

      // Update query status to "completed"
      await ctx.runMutation(internal.mutations.brightdata.updateQueryStatus, {
        queryId: args.queryId,
        status: "completed",
      });

      return { success: true, count: storeResult.count };
    } catch (error) {
      console.error("Error in initiateProductSearch:", error);

      // Update query status to "failed"
      try {
        await ctx.runMutation(internal.mutations.brightdata.updateQueryStatus, {
          queryId: args.queryId,
          status: "failed",
        });
      } catch (updateError) {
        console.error("Failed to update query status to failed:", updateError);
      }

      throw error;
    }
  },
});

/**
 * Process raw Bright Data SERP API results into structured product data
 */
function processResults(brightDataResult: any): Array<{
  title: string;
  imageUrl?: string;
  productUrl: string;
  price: number;
  currency: string;
  description?: string;
  reviewsCount?: number;
  rating?: number;
  availability: boolean;
  source: string;
  searchRank: number;
}> {
  try {
    // SERP API returns shopping results in different possible formats
    let shoppingResults: any[] = [];

    // Check for standard SERP API response structure
    if (brightDataResult.shopping_results && Array.isArray(brightDataResult.shopping_results)) {
      shoppingResults = brightDataResult.shopping_results;
    } else if (brightDataResult.inline_shopping && Array.isArray(brightDataResult.inline_shopping)) {
      shoppingResults = brightDataResult.inline_shopping;
    } else if (brightDataResult.results && Array.isArray(brightDataResult.results)) {
      shoppingResults = brightDataResult.results.filter((r: any) => r.type === "shopping");
    } else if (Array.isArray(brightDataResult)) {
      // If the result is directly an array
      shoppingResults = brightDataResult;
    }

    if (shoppingResults.length === 0) {
      console.warn("No shopping results found in Bright Data SERP API response");
      return [];
    }

    console.log(`Processing ${shoppingResults.length} shopping results from Bright Data`);

    return shoppingResults
      .map((item: any, index: number) => {
        try {
          // Extract price (handle different formats like "$123.45" or "123.45")
          let price = 0;
          if (item.price) {
            if (typeof item.price === "number") {
              price = item.price;
            } else if (typeof item.price === "string") {
              price = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
            } else if (item.price.value) {
              price = parseFloat(item.price.value);
            }
          }

          // Extract rating
          let rating: number | undefined;
          if (item.rating) {
            rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating);
          }

          // Extract review count
          let reviewsCount: number | undefined;
          if (item.reviews) {
            reviewsCount = typeof item.reviews === "number" ? item.reviews : parseInt(item.reviews);
          } else if (item.reviews_count) {
            reviewsCount = typeof item.reviews_count === "number" ? item.reviews_count : parseInt(item.reviews_count);
          }

          return {
            title: item.title || item.name || "Untitled Product",
            imageUrl: item.thumbnail || item.image || item.imageUrl,
            productUrl: item.link || item.url || item.productUrl || "",
            price,
            currency: item.currency || "USD",
            description: item.snippet || item.description || undefined,
            reviewsCount,
            rating,
            availability: item.availability !== "Out of stock" && item.in_stock !== false,
            source: item.source || item.merchant || item.seller || "Google Shopping",
            searchRank: index + 1,
          };
        } catch (itemError) {
          console.error("Error processing individual product:", itemError);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.price > 0);
  } catch (error) {
    console.error("Error processing Bright Data results:", error);
    return [];
  }
}

/**
 * Action to manually trigger a re-search for an existing query
 * This can be used for continuous background research
 */
export const refreshProductSearch = internalAction({
  args: {
    queryId: v.id("queries"),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get the original query details
    const query: any = await ctx.runQuery(internal.mutations.brightdata.getQueryById, {
      queryId: args.queryId,
    });

    if (!query) {
      throw new Error("Query not found");
    }

    // Re-run the search with the same parameters
    return await ctx.runAction(internal.actions.brightdata.initiateProductSearch, {
      queryId: args.queryId,
      searchText: query.searchText,
      preferences: query.preferences || {},
    });
  },
});
