import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Create a new search query and initiate background research
 */
export const createSearchQuery = mutation({
  args: {
    searchText: v.string(),
    preferences: v.optional(
      v.object({
        minPrice: v.optional(v.number()),
        maxPrice: v.optional(v.number()),
        minRating: v.optional(v.number()),
        targetRetailers: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Create the query record
    const queryId = await ctx.db.insert("queries", {
      userId: identity.subject,
      searchText: args.searchText,
      status: "pending",
      preferences: args.preferences,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule the Bright Data search action to run immediately
    // This will use Bright Data SERP API for real product searches
    await ctx.scheduler.runAfter(
      0,
      internal.actions.brightdata.initiateProductSearch,
      {
        queryId,
        searchText: args.searchText,
        preferences: args.preferences || {},
      }
    );

    return queryId;
  },
});

/**
 * Get the status of a search query
 */
export const getQueryStatus = query({
  args: { queryId: v.id("queries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }

    if (query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return query;
  },
});

/**
 * Get all queries for the current user
 */
export const getUserQueries = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("searching"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let queries;

    if (args.status) {
      // Filter by status
      queries = await ctx.db
        .query("queries")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", identity.subject).eq("status", args.status!)
        )
        .order("desc")
        .take(args.limit || 50);
    } else {
      // Get all queries for user
      queries = await ctx.db
        .query("queries")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .order("desc")
        .take(args.limit || 50);
    }

    return queries;
  },
});

/**
 * Update query status (internal use)
 */
export const updateQueryStatus = mutation({
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }

    if (query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.queryId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a query and all its associated products
 */
export const deleteQuery = mutation({
  args: { queryId: v.id("queries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const query = await ctx.db.get(args.queryId);
    if (!query) {
      throw new Error("Query not found");
    }

    if (query.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all associated products
    const products = await ctx.db
      .query("products")
      .withIndex("by_query", (q) => q.eq("queryId", args.queryId))
      .collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    // Delete the query
    await ctx.db.delete(args.queryId);

    return { success: true, deletedProducts: products.length };
  },
});

/**
 * Get the most recent active query for the user
 */
export const getActiveQuery = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the most recent searching or pending query
    const searchingQuery = await ctx.db
      .query("queries")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "searching")
      )
      .order("desc")
      .first();

    if (searchingQuery) {
      return searchingQuery;
    }

    // If no searching query, get the most recent pending query
    const pendingQuery = await ctx.db
      .query("queries")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "pending")
      )
      .order("desc")
      .first();

    return pendingQuery || null;
  },
});
