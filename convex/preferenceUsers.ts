import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get or create a user in the preference_users table
 * This function is called after a user authenticates with Clerk
 */
export const getOrCreateUser = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (existingUser) {
      // Update user info if provided
      if (args.name || args.email || args.imageUrl) {
        await ctx.db.patch(existingUser._id, {
          name: args.name || existingUser.name,
          email: args.email || existingUser.email,
          imageUrl: args.imageUrl || existingUser.imageUrl,
        });
      }
      return existingUser._id;
    }

    // Create new user with empty preferences
    const userId = await ctx.db.insert("preference_users", {
      clerkUserId: args.clerkUserId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });

    // Initialize empty preferences for new user
    await ctx.db.insert("user_preferences", {
      userId,
      style: [],
      size: [],
      productCategories: [],
      brands: [],
      colors: [],
      lastUpdated: Date.now(),
    });

    return userId;
  },
});

/**
 * Get user by Clerk user ID
 */
export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    return user;
  },
});

/**
 * Get current authenticated user
 * Uses Clerk authentication context
 */
export const getCurrentUser = query({
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

    return user;
  },
});

/**
 * Internal mutation to update user info
 */
export const updateUserInfo = internalMutation({
  args: {
    userId: v.id("preference_users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
  },
});
