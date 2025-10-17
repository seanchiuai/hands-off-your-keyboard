import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save an item for preference learning
 * This leverages the existing saved_items table and adds preference extraction
 */
export const saveItemForPreferences = mutation({
  args: {
    sessionId: v.string(),
    productId: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    // Preference extraction fields
    implicitStyle: v.optional(v.array(v.string())),
    implicitColors: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
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

    // Check if item is already saved
    const existingItem = await ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existingItem) {
      return existingItem._id;
    }

    // Save the item
    const itemId = await ctx.db.insert("saved_items", {
      userId: identity.subject,
      sessionId: args.sessionId,
      productId: args.productId,
      productName: args.productName,
      description: args.description,
      imageUrl: args.imageUrl,
      productUrl: args.productUrl,
      price: args.price,
      savedAt: Date.now(),
    });

    // Log this as a save interaction signal
    await ctx.db.insert("interaction_signals", {
      userId: user._id,
      type: "save",
      itemId: args.productId,
      category: args.category,
      timestamp: Date.now(),
      extractedKeywords: [
        ...(args.implicitStyle || []),
        ...(args.implicitColors || []),
      ],
    });

    return itemId;
  },
});

/**
 * Get saved items for the current user
 */
export const getSavedItems = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let query = ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    if (args.sessionId) {
      const items = await query.collect();
      return items.filter((item) => item.sessionId === args.sessionId);
    }

    return await query.collect();
  },
});

/**
 * Remove a saved item
 */
export const removeSavedItem = mutation({
  args: {
    itemId: v.id("saved_items"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    if (item.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.itemId);

    // Log as dislike interaction
    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (user) {
      await ctx.db.insert("interaction_signals", {
        userId: user._id,
        type: "dislike",
        itemId: item.productId,
        timestamp: Date.now(),
      });
    }
  },
});

/**
 * Get count of saved items for the current user
 */
export const getSavedItemsCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const items = await ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return items.length;
  },
});
