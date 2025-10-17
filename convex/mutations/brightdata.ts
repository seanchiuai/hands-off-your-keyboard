import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Internal mutation to store product results from Bright Data
 */
export const storeProductResults = internalMutation({
  args: {
    queryId: v.id("queries"),
    products: v.array(
      v.object({
        title: v.string(),
        imageUrl: v.optional(v.string()),
        productUrl: v.string(),
        price: v.number(),
        currency: v.string(),
        description: v.optional(v.string()),
        reviewsCount: v.optional(v.number()),
        rating: v.optional(v.number()),
        availability: v.boolean(),
        source: v.string(),
        searchRank: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const insertedIds: Id<"products">[] = [];

    // Process each product
    for (let i = 0; i < args.products.length; i++) {
      const product = args.products[i];

      // Check if product already exists for this query
      const existing = await ctx.db
        .query("products")
        .withIndex("by_url_and_query", (q) =>
          q.eq("productUrl", product.productUrl).eq("queryId", args.queryId)
        )
        .first();

      // Calculate system rank - for now, use search rank
      // In the future, this could incorporate user preferences, ratings, etc.
      const systemRank = product.searchRank;

      if (existing) {
        // Update existing product with latest data
        await ctx.db.patch(existing._id, {
          title: product.title,
          imageUrl: product.imageUrl,
          price: product.price,
          currency: product.currency,
          description: product.description,
          reviewsCount: product.reviewsCount,
          rating: product.rating,
          availability: product.availability,
          source: product.source,
          searchRank: product.searchRank,
          systemRank,
          createdAt: Date.now(),
        });
        insertedIds.push(existing._id);
      } else {
        // Insert new product
        const newId = await ctx.db.insert("products", {
          queryId: args.queryId,
          title: product.title,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          price: product.price,
          currency: product.currency,
          description: product.description,
          reviewsCount: product.reviewsCount,
          rating: product.rating,
          availability: product.availability,
          source: product.source,
          searchRank: product.searchRank,
          systemRank,
          createdAt: Date.now(),
        });
        insertedIds.push(newId);
      }
    }

    console.log(`Stored ${insertedIds.length} products for query ${args.queryId}`);

    return { count: insertedIds.length, productIds: insertedIds };
  },
});

/**
 * Internal mutation to update query status
 */
export const updateQueryStatus = internalMutation({
  args: {
    queryId: v.id("queries"),
    status: v.union(
      v.literal("pending"),
      v.literal("searching"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }

    await ctx.db.patch(args.queryId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    console.log(`Updated query ${args.queryId} status to: ${args.status}`);

    return { success: true };
  },
});

/**
 * Internal query to get a query by ID (for use in actions)
 */
export const getQueryById = internalQuery({
  args: { queryId: v.id("queries") },
  handler: async (ctx, args) => {
    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }
    return query;
  },
});

/**
 * Internal mutation to re-rank products based on custom logic
 * This can be called after storing products to apply user-specific ranking
 */
export const reRankProducts = internalMutation({
  args: {
    queryId: v.id("queries"),
    rankingStrategy: v.optional(
      v.union(
        v.literal("price_low_to_high"),
        v.literal("price_high_to_low"),
        v.literal("rating"),
        v.literal("reviews"),
        v.literal("availability")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get all products for this query
    const products = await ctx.db
      .query("products")
      .withIndex("by_query", (q) => q.eq("queryId", args.queryId))
      .collect();

    if (products.length === 0) {
      return { success: true, rerankedCount: 0 };
    }

    // Sort products based on strategy
    const strategy = args.rankingStrategy || "price_low_to_high";
    let sortedProducts = [...products];

    switch (strategy) {
      case "price_low_to_high":
        sortedProducts.sort((a, b) => a.price - b.price);
        break;
      case "price_high_to_low":
        sortedProducts.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "reviews":
        sortedProducts.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        break;
      case "availability":
        sortedProducts.sort((a, b) => {
          if (a.availability === b.availability) return 0;
          return a.availability ? -1 : 1;
        });
        break;
    }

    // Update system rank for each product
    for (let i = 0; i < sortedProducts.length; i++) {
      await ctx.db.patch(sortedProducts[i]._id, {
        systemRank: i + 1,
      });
    }

    console.log(
      `Re-ranked ${sortedProducts.length} products for query ${args.queryId} using strategy: ${strategy}`
    );

    return { success: true, rerankedCount: sortedProducts.length };
  },
});
