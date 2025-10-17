import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user preferences for the authenticated user
 */
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
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

    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    return preferences;
  },
});

/**
 * Get preferences for a specific user by user ID (internal use)
 */
export const getPreferencesByUserId = query({
  args: { userId: v.id("preference_users") },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    return preferences;
  },
});

/**
 * Update user preferences (partial update)
 * Users can manually edit their preferences through the UI
 */
export const updateUserPreferences = mutation({
  args: {
    style: v.optional(v.array(v.string())),
    budget: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    size: v.optional(v.array(v.string())),
    productCategories: v.optional(v.array(v.string())),
    brands: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
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

    const existingPreferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (!existingPreferences) {
      throw new Error("Preferences not found");
    }

    // Merge the updates with existing preferences
    await ctx.db.patch(existingPreferences._id, {
      ...args,
      lastUpdated: Date.now(),
    });

    return existingPreferences._id;
  },
});

/**
 * Internal mutation to update preferences (used by LLM learning)
 * This allows the system to update preferences based on learned behavior
 */
export const internalUpdatePreferences = internalMutation({
  args: {
    userId: v.id("preference_users"),
    style: v.optional(v.array(v.string())),
    budget: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    size: v.optional(v.array(v.string())),
    productCategories: v.optional(v.array(v.string())),
    brands: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    const existingPreferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!existingPreferences) {
      // Create new preferences if they don't exist
      await ctx.db.insert("user_preferences", {
        userId,
        style: updates.style || [],
        size: updates.size || [],
        productCategories: updates.productCategories || [],
        brands: updates.brands || [],
        colors: updates.colors || [],
        budget: updates.budget,
        lastUpdated: Date.now(),
      });
    } else {
      // Merge updates with existing preferences
      await ctx.db.patch(existingPreferences._id, {
        ...updates,
        lastUpdated: Date.now(),
      });
    }
  },
});

/**
 * Reset user preferences to empty state
 */
export const resetPreferences = mutation({
  args: {},
  handler: async (ctx) => {
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

    const existingPreferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, {
        style: [],
        size: [],
        productCategories: [],
        brands: [],
        colors: [],
        budget: undefined,
        lastUpdated: Date.now(),
      });
    }
  },
});
