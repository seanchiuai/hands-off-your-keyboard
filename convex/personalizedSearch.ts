import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Get personalized search parameters based on user preferences
 * This query fetches the user's preferences to inform search
 */
export const getSearchPreferences = query({
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

    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    return preferences;
  },
});

/**
 * Generate personalized search query enhancement
 * Takes a user's search query and enhances it with their preferences
 */
export const enhanceSearchQuery = query({
  args: {
    originalQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        query: args.originalQuery,
        filters: {},
      };
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      return {
        query: args.originalQuery,
        filters: {},
      };
    }

    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (!preferences) {
      return {
        query: args.originalQuery,
        filters: {},
      };
    }

    // Build enhanced query with preference keywords
    const styleTerms = preferences.style.slice(0, 3).join(" ");
    const colorTerms = preferences.colors.slice(0, 2).join(" ");
    const enhancedQuery = `${args.originalQuery} ${styleTerms} ${colorTerms}`.trim();

    // Build search filters
    const filters = {
      minPrice: preferences.budget?.min,
      maxPrice: preferences.budget?.max,
      categories: preferences.productCategories,
      brands: preferences.brands,
      colors: preferences.colors,
      styles: preferences.style,
    };

    return {
      query: enhancedQuery,
      filters,
      preferences,
    };
  },
});

/**
 * Get product recommendations based on user preferences
 * This simulates a recommendation engine using stored preferences
 */
export const getRecommendations = query({
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

    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (!preferences) {
      return [];
    }

    // Get saved items as basis for recommendations
    const savedItems = await ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .take(args.limit || 10);

    return {
      preferences,
      savedItems,
      recommendationContext: {
        preferredCategories: preferences.productCategories,
        preferredBrands: preferences.brands,
        budgetRange: preferences.budget,
        stylePreferences: preferences.style,
      },
    };
  },
});

/**
 * Score and rank products based on user preferences
 * This can be used to re-rank search results
 */
export const scoreProducts = query({
  args: {
    products: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        category: v.optional(v.string()),
        price: v.optional(v.number()),
        brand: v.optional(v.string()),
        style: v.optional(v.array(v.string())),
        colors: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return products with default scores
      return args.products.map((p) => ({ ...p, score: 0 }));
    }

    const user = await ctx.db
      .query("preference_users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      return args.products.map((p) => ({ ...p, score: 0 }));
    }

    const preferences = await ctx.db
      .query("user_preferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (!preferences) {
      return args.products.map((p) => ({ ...p, score: 0 }));
    }

    // Score each product based on preference matching
    const scoredProducts = args.products.map((product) => {
      let score = 0;

      // Category match
      if (
        product.category &&
        preferences.productCategories.includes(product.category)
      ) {
        score += 30;
      }

      // Brand match
      if (product.brand && preferences.brands.includes(product.brand)) {
        score += 25;
      }

      // Style match
      if (product.style) {
        const styleMatches = product.style.filter((s) =>
          preferences.style.includes(s)
        ).length;
        score += styleMatches * 15;
      }

      // Color match
      if (product.colors) {
        const colorMatches = product.colors.filter((c) =>
          preferences.colors.includes(c)
        ).length;
        score += colorMatches * 10;
      }

      // Budget match
      if (product.price && preferences.budget) {
        const { min, max } = preferences.budget;
        if (product.price >= min && product.price <= max) {
          score += 20;
        } else if (product.price < min) {
          score -= 10;
        } else {
          score -= 5;
        }
      }

      return { ...product, score };
    });

    // Sort by score descending
    scoredProducts.sort((a, b) => b.score - a.score);

    return scoredProducts;
  },
});

/**
 * Get trending categories based on user's recent interactions
 */
export const getTrendingCategories = query({
  args: {},
  handler: async (ctx) => {
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

    // Get recent interactions (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSignals = await ctx.db
      .query("interaction_signals")
      .withIndex("by_user_id_timestamp", (q) =>
        q.eq("userId", user._id).gte("timestamp", thirtyDaysAgo)
      )
      .collect();

    // Count category occurrences
    const categoryCounts: Record<string, number> = {};
    recentSignals.forEach((signal) => {
      if (signal.category) {
        categoryCounts[signal.category] =
          (categoryCounts[signal.category] || 0) + 1;
      }
    });

    // Sort by count and return top categories
    const trending = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return trending;
  },
});
