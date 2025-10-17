import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed")),
    userId: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Background Research feature tables
  queries: defineTable({
    userId: v.string(),
    searchText: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("searching"),
      v.literal("completed"),
      v.literal("failed")
    ),
    preferences: v.optional(v.object({
      minPrice: v.optional(v.number()),
      maxPrice: v.optional(v.number()),
      minRating: v.optional(v.number()),
      targetRetailers: v.optional(v.array(v.string())),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  products: defineTable({
    queryId: v.id("queries"),
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
    systemRank: v.number(),
    createdAt: v.number(),
  })
    .index("by_query", ["queryId"])
    .index("by_query_and_rank", ["queryId", "systemRank"])
    .index("by_url_and_query", ["productUrl", "queryId"]),

  // Voice Shopper Tables
  shopping_preferences: defineTable({
    userId: v.string(),
    preferenceKey: v.string(),
    preferenceValue: v.string(),
  }).index("by_user", ["userId"]),

  saved_items: defineTable({
    userId: v.string(),
    sessionId: v.string(),
    productId: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    price: v.optional(v.number()),
    savedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  voice_sessions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("error")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_session_id", ["sessionId"]),

  conversation_logs: defineTable({
    sessionId: v.string(),
    speaker: v.string(),
    text: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),

  research_results: defineTable({
    sessionId: v.string(),
    query: v.string(),
    results: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        imageUrl: v.optional(v.string()),
        productUrl: v.string(),
        price: v.number(),
      })
    ),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),

  // Preference Memory - User profiles linked to Clerk authentication
  preference_users: defineTable({
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  // Preference Memory - Structured user preferences for personalization
  user_preferences: defineTable({
    userId: v.id("preference_users"),
    style: v.array(v.string()), // e.g., ["minimalist", "boho", "modern"]
    budget: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    size: v.array(v.string()), // e.g., ["M", "L", "32x32"]
    productCategories: v.array(v.string()), // e.g., ["furniture", "electronics", "clothing"]
    brands: v.array(v.string()), // e.g., ["IKEA", "Wayfair", "Nike"]
    colors: v.array(v.string()), // e.g., ["blue", "black", "neutral"]
    lastUpdated: v.number(),
  }).index("by_user_id", ["userId"]),

  // Preference Memory - Interaction signals for learning user behavior
  interaction_signals: defineTable({
    userId: v.id("preference_users"),
    type: v.union(
      v.literal("view"),
      v.literal("click"),
      v.literal("save"),
      v.literal("purchase"),
      v.literal("dislike"),
      v.literal("voice_query")
    ),
    itemId: v.optional(v.string()), // Product ID, if applicable
    queryText: v.optional(v.string()), // Voice query text
    category: v.optional(v.string()),
    timestamp: v.number(),
    // LLM-extracted preferences from interaction
    extractedKeywords: v.optional(v.array(v.string())),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_timestamp", ["userId", "timestamp"]),
});
