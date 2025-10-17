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
  handler: async (ctx, args) => {
    try {
      // Update query status to "searching"
      await ctx.runMutation(internal.mutations.brightdata.updateQueryStatus, {
        queryId: args.queryId,
        status: "searching",
      });

      // Get Bright Data configuration from environment variables
      const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY;
      const BRIGHT_DATA_COLLECTOR_ID = process.env.BRIGHT_DATA_COLLECTOR_ID;
      const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || "static";

      if (!BRIGHT_DATA_API_KEY || !BRIGHT_DATA_COLLECTOR_ID) {
        throw new Error(
          "Bright Data API credentials not configured. Please set BRIGHT_DATA_API_KEY and BRIGHT_DATA_COLLECTOR_ID environment variables."
        );
      }

      // Prepare the payload for Bright Data
      // Note: The exact structure depends on your Bright Data collector configuration
      const brightDataPayload = {
        collector: BRIGHT_DATA_COLLECTOR_ID,
        payload: {
          query: args.searchText,
          // Add any additional parameters based on preferences
          ...(args.preferences.minPrice && { min_price: args.preferences.minPrice }),
          ...(args.preferences.maxPrice && { max_price: args.preferences.maxPrice }),
          ...(args.preferences.minRating && { min_rating: args.preferences.minRating }),
          ...(args.preferences.targetRetailers && {
            retailers: args.preferences.targetRetailers,
          }),
        },
      };

      console.log("Initiating Bright Data search:", {
        queryId: args.queryId,
        searchText: args.searchText,
      });

      // Make request to Bright Data API
      // Note: This is a simplified example. Actual implementation depends on Bright Data API
      const response = await fetch("https://api.brightdata.com/dca/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
          "X-BD-Agent": BRIGHT_DATA_ZONE,
        },
        body: JSON.stringify(brightDataPayload),
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
      const storeResult = await ctx.runMutation(
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
 * Process raw Bright Data results into structured product data
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
  // This is a placeholder implementation
  // The actual structure depends on your Bright Data collector configuration

  if (!brightDataResult.data || !Array.isArray(brightDataResult.data)) {
    console.warn("No data found in Bright Data result");
    return [];
  }

  return brightDataResult.data.map((item: any, index: number) => ({
    title: item.title || item.name || "Untitled Product",
    imageUrl: item.image || item.imageUrl || item.image_url,
    productUrl: item.url || item.productUrl || item.product_url || "",
    price: parseFloat(item.price || item.price_value || 0),
    currency: item.currency || "USD",
    description: item.description || item.desc || undefined,
    reviewsCount: item.reviews_count || item.reviewCount || parseInt(item.reviews) || undefined,
    rating: item.rating ? parseFloat(item.rating) : undefined,
    availability: item.in_stock !== false && item.availability !== "out_of_stock",
    source: item.retailer || item.source || item.merchant || "Unknown",
    searchRank: index + 1,
  }));
}

/**
 * Action to manually trigger a re-search for an existing query
 * This can be used for continuous background research
 */
export const refreshProductSearch = internalAction({
  args: {
    queryId: v.id("queries"),
  },
  handler: async (ctx, args) => {
    // Get the original query details
    const query = await ctx.runQuery(internal.mutations.brightdata.getQueryById, {
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
