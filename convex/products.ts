import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get all products for a specific query, ordered by system rank
 */
export const getProductsForQuery = query({
  args: {
    queryId: v.id("queries"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the query belongs to the user
    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }
    if (query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Get products ordered by system rank
    const products = await ctx.db
      .query("products")
      .withIndex("by_query_and_rank", (q) => q.eq("queryId", args.queryId))
      .order("asc")
      .take(args.limit || 100);

    return products;
  },
});

/**
 * Get products for a query with filtering options
 */
export const getFilteredProducts = query({
  args: {
    queryId: v.id("queries"),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minRating: v.optional(v.number()),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the query belongs to the user
    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }
    if (query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Get all products for the query
    let products = await ctx.db
      .query("products")
      .withIndex("by_query_and_rank", (q) => q.eq("queryId", args.queryId))
      .order("asc")
      .collect();

    // Apply filters
    if (args.minPrice !== undefined) {
      products = products.filter((p) => p.price >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= args.maxPrice!);
    }
    if (args.minRating !== undefined) {
      products = products.filter((p) => (p.rating || 0) >= args.minRating!);
    }
    if (args.source !== undefined) {
      products = products.filter((p) => p.source === args.source);
    }

    // Apply limit
    if (args.limit !== undefined) {
      products = products.slice(0, args.limit);
    }

    return products;
  },
});

/**
 * Get a single product by ID
 */
export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify the product's query belongs to the user
    const query = await ctx.db.get(product.queryId);
    if (!query || query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return product;
  },
});

/**
 * Internal mutation to store product results from Bright Data
 */
export const storeProducts = internalMutation({
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

      const systemRank = i + 1; // Simple ranking for now

      if (existing) {
        // Update existing product
        await ctx.db.patch(existing._id, {
          ...product,
          systemRank,
          createdAt: Date.now(),
        });
        insertedIds.push(existing._id);
      } else {
        // Insert new product
        const newId = await ctx.db.insert("products", {
          queryId: args.queryId,
          ...product,
          systemRank,
          createdAt: Date.now(),
        });
        insertedIds.push(newId);
      }
    }

    return { count: insertedIds.length, productIds: insertedIds };
  },
});

/**
 * Save a product from research results to user's saved items
 */
export const saveProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the product
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify the query belongs to the user
    const query = await ctx.db.get(product.queryId);
    if (!query || query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Check if already saved
    const existing = await ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Save the product
    const savedId = await ctx.db.insert("saved_items", {
      userId: identity.subject,
      sessionId: `research_${Date.now()}`,
      productId: args.productId,
      productName: product.title,
      description: product.description,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
      price: product.price,
      savedAt: Date.now(),
    });

    return savedId;
  },
});

/**
 * Delete all products for a query
 */
export const deleteProductsForQuery = mutation({
  args: { queryId: v.id("queries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the query belongs to the user
    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }
    if (query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all products for this query
    const products = await ctx.db
      .query("products")
      .withIndex("by_query", (q) => q.eq("queryId", args.queryId))
      .collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return { deletedCount: products.length };
  },
});
