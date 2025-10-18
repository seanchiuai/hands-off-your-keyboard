"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Internal action to initiate product search using Gemini API with Google Search grounding
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

      // Get Gemini API key from environment variables
      const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      if (!GEMINI_API_KEY) {
        throw new Error(
          "Gemini API key not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable."
        );
      }

      console.log("Initiating Gemini API product search:", {
        queryId: args.queryId,
        searchText: args.searchText,
        preferences: args.preferences,
      });

      // Build search query with price constraints
      let searchQuery = `Find products for: ${args.searchText}`;
      if (args.preferences.minPrice || args.preferences.maxPrice) {
        const minPrice = args.preferences.minPrice || 0;
        const maxPrice = args.preferences.maxPrice || 999999;
        searchQuery += ` with price range $${minPrice} to $${maxPrice}`;
      }

      // Make request to Gemini API with Google Search grounding
      // Using gemini-2.5-flash for the latest stable model with grounding support
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${searchQuery}.

Please provide a list of at least 10 products with the following information for each:
- Product title
- Price (in USD)
- Product URL (actual shopping link)
- Brief description
- Merchant/retailer name
- Rating (if available)
- Number of reviews (if available)

Format the response as a JSON array of objects with these fields: title, price, productUrl, description, source, rating, reviewCount, availability.`,
                  },
                ],
              },
            ],
            tools: [
              {
                google_search: {},
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API Error:", {
          status: response.status,
          body: errorBody,
        });
        throw new Error(`Gemini API failed: ${response.status} - ${errorBody}`);
      }

      const geminiResult = await response.json();
      console.log("Gemini API response received:", {
        queryId: args.queryId,
      });

      // Process the Gemini API response
      const processedProducts = processGeminiResults(geminiResult);

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
 * Process Gemini API results into structured product data
 */
function processGeminiResults(geminiResult: any): Array<{
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
    // Extract text from Gemini response
    const candidates = geminiResult.candidates;
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      console.warn("No candidates found in Gemini API response");
      return [];
    }

    const firstCandidate = candidates[0];
    const content = firstCandidate.content;

    if (!content || !content.parts || !Array.isArray(content.parts)) {
      console.warn("No content parts found in Gemini API response");
      return [];
    }

    // Extract text from parts
    let responseText = "";
    for (const part of content.parts) {
      if (part.text) {
        responseText += part.text;
      }
    }

    if (!responseText) {
      console.warn("No text found in Gemini API response");
      return [];
    }

    console.log("Gemini response text:", responseText.substring(0, 500) + "...");

    // Try to extract JSON array from the response
    let products: any[] = [];

    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        products = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("Failed to parse JSON from Gemini response:", parseError);
      }
    }

    // If JSON parsing failed, try to extract product information from the text
    if (!Array.isArray(products) || products.length === 0) {
      console.log("Attempting to extract products from text format");
      products = extractProductsFromText(responseText);
    }

    if (products.length === 0) {
      console.warn("No products extracted from Gemini API response");
      return [];
    }

    console.log(`Processing ${products.length} products from Gemini API`);

    // Format products to match expected structure
    return products
      .map((item: any, index: number) => {
        try {
          // Extract price (handle different formats)
          let price = 0;
          if (item.price !== undefined) {
            if (typeof item.price === "number") {
              price = item.price;
            } else if (typeof item.price === "string") {
              price = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
            }
          }

          // Extract rating
          let rating: number | undefined;
          if (item.rating !== undefined) {
            rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating);
            if (rating !== undefined && isNaN(rating)) rating = undefined;
          }

          // Extract review count
          let reviewsCount: number | undefined;
          if (item.reviewCount !== undefined) {
            reviewsCount = typeof item.reviewCount === "number" ? item.reviewCount : parseInt(item.reviewCount);
            if (reviewsCount !== undefined && isNaN(reviewsCount)) reviewsCount = undefined;
          }

          return {
            title: item.title || "Untitled Product",
            imageUrl: item.imageUrl,
            productUrl: item.productUrl || item.url || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.title || "")}`,
            price,
            currency: "USD",
            description: item.description,
            reviewsCount,
            rating,
            availability: item.availability !== false,
            source: item.source || item.merchant || "Online Retailer",
            searchRank: index + 1,
          };
        } catch (itemError) {
          console.error("Error processing individual product:", itemError);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.price > 0);
  } catch (error) {
    console.error("Error processing Gemini results:", error);
    return [];
  }
}

/**
 * Extract product information from text format when JSON parsing fails
 */
function extractProductsFromText(text: string): any[] {
  const products: any[] = [];

  // This is a fallback - try to parse structured text
  // Split by numbered items (1., 2., etc.)
  const items = text.split(/\n\d+\.\s+/);

  for (const item of items.slice(1)) { // Skip first empty split
    try {
      const titleMatch = item.match(/(?:Title|Product):\s*(.+?)(?:\n|$)/i);
      const priceMatch = item.match(/Price:\s*\$?(\d+(?:\.\d{2})?)/i);
      const urlMatch = item.match(/(?:URL|Link):\s*(.+?)(?:\n|$)/i);
      const descMatch = item.match(/Description:\s*(.+?)(?:\n|$)/i);
      const sourceMatch = item.match(/(?:Source|Merchant|Retailer):\s*(.+?)(?:\n|$)/i);
      const ratingMatch = item.match(/Rating:\s*(\d+(?:\.\d+)?)/i);

      if (titleMatch && priceMatch) {
        products.push({
          title: titleMatch[1].trim(),
          price: parseFloat(priceMatch[1]),
          productUrl: urlMatch ? urlMatch[1].trim() : undefined,
          description: descMatch ? descMatch[1].trim() : undefined,
          source: sourceMatch ? sourceMatch[1].trim() : undefined,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
          availability: true,
        });
      }
    } catch (e) {
      console.error("Error parsing text item:", e);
    }
  }

  return products;
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
