import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Log a user interaction signal
 * This is used to track user behavior for preference learning
 */
export const logInteraction = mutation({
  args: {
    type: v.union(
      v.literal("view"),
      v.literal("click"),
      v.literal("save"),
      v.literal("purchase"),
      v.literal("dislike"),
      v.literal("voice_query")
    ),
    itemId: v.optional(v.string()),
    queryText: v.optional(v.string()),
    category: v.optional(v.string()),
    extractedKeywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Insert interaction signal
    const signalId = await ctx.db.insert("interaction_signals", {
      userId: user._id,
      type: args.type,
      itemId: args.itemId,
      queryText: args.queryText,
      category: args.category,
      timestamp: Date.now(),
      extractedKeywords: args.extractedKeywords,
    });

    return signalId;
  },
});

/**
 * Get recent interaction signals for the current user
 */
export const getRecentInteractions = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("view"),
        v.literal("click"),
        v.literal("save"),
        v.literal("purchase"),
        v.literal("dislike"),
        v.literal("voice_query")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      return [];
    }

    let query = ctx.db
      .query("interaction_signals")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc");

    const signals = await query.take(args.limit || 100);

    // Filter by type if specified
    if (args.type) {
      return signals.filter((s) => s.type === args.type);
    }

    return signals;
  },
});

/**
 * Get interaction signals within a time window (internal use for learning)
 */
export const getInteractionsInTimeWindow = internalQuery({
  args: {
    userId: v.id("preference_users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const endTime = args.endTime || Date.now();

    const signals = await ctx.db
      .query("interaction_signals")
      .withIndex("by_user_id_timestamp", (q) =>
        q.eq("userId", args.userId).gte("timestamp", args.startTime)
      )
      .filter((q) => q.lte(q.field("timestamp"), endTime))
      .collect();

    return signals;
  },
});

/**
 * Get all voice query interactions for learning
 */
export const getVoiceQueryHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      return [];
    }

    const signals = await ctx.db
      .query("interaction_signals")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    return signals.filter((s) => s.type === "voice_query" && s.queryText);
  },
});

/**
 * Get interaction statistics for the current user
 */
export const getInteractionStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      return null;
    }

    const signals = await ctx.db
      .query("interaction_signals")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const stats = {
      total: signals.length,
      views: signals.filter((s) => s.type === "view").length,
      clicks: signals.filter((s) => s.type === "click").length,
      saves: signals.filter((s) => s.type === "save").length,
      purchases: signals.filter((s) => s.type === "purchase").length,
      dislikes: signals.filter((s) => s.type === "dislike").length,
      voiceQueries: signals.filter((s) => s.type === "voice_query").length,
    };

    return stats;
  },
});

/**
 * Delete old interaction signals (for privacy/cleanup)
 */
export const cleanupOldInteractions = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldSignals = await ctx.db
      .query("interaction_signals")
      .withIndex("by_user_id_timestamp", (q) =>
        q.eq("userId", user._id).lt("timestamp", cutoffTime)
      )
      .collect();

    // Delete old signals
    for (const signal of oldSignals) {
      await ctx.db.delete(signal._id);
    }

    return oldSignals.length;
  },
});
