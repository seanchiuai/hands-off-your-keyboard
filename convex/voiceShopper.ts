import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Initiates a new voice shopping session
 * This action should be called from the frontend when the user starts a voice session
 */
export const initiateSession = action({
  args: {},
  handler: async (ctx, args) => {
    // Authenticate with Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: User must be logged in to start a voice session");
    }

    const userId = identity.subject;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store session info in the database
    await ctx.runMutation(internal.voiceShopper.storeSessionInfo, {
      sessionId,
      userId,
      startTime: Date.now(),
    });

    // In a production setup, this would call an external Pipecat management service
    // to provision a new conversational session
    // For now, we'll return session details for the frontend to use
    return {
      sessionId,
      userId,
      // In production, this would include WebRTC room ID, WebSocket URL, etc.
      // wsUrl: "wss://pipecat-server.example.com/session/" + sessionId,
      // rtcRoomId: sessionId,
    };
  },
});

/**
 * Internal mutation to store session info (called by initiateSession action)
 */
export const storeSessionInfo = internalMutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("voice_sessions", {
      sessionId: args.sessionId,
      userId: args.userId,
      startTime: args.startTime,
      status: "active",
    });
  },
});

/**
 * End a voice shopping session
 */
export const endSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const session = await ctx.db
      .query("voice_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== identity.subject) {
      throw new Error("Unauthorized: Cannot end another user's session");
    }

    await ctx.db.patch(session._id, {
      status: "completed",
      endTime: Date.now(),
    });
  },
});

/**
 * Save a shopping item from the voice conversation
 */
export const saveShoppingItem = mutation({
  args: {
    sessionId: v.string(),
    productId: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: User must be logged in to save items");
    }

    const userId = identity.subject;

    // Verify the session belongs to this user
    const session = await ctx.db
      .query("voice_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.userId !== userId) {
      throw new Error("Unauthorized: Invalid session");
    }

    await ctx.db.insert("saved_items", {
      userId,
      sessionId: args.sessionId,
      productId: args.productId,
      productName: args.productName,
      description: args.description,
      imageUrl: args.imageUrl,
      productUrl: args.productUrl,
      price: args.price,
      savedAt: Date.now(),
    });
  },
});

/**
 * Get shopping history for the authenticated user
 */
export const getShoppingHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 50;

    return ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get saved items for a specific session
 */
export const getSessionItems = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Verify the session belongs to this user
    const session = await ctx.db
      .query("voice_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.userId !== userId) {
      return [];
    }

    return ctx.db
      .query("saved_items")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

/**
 * Save a user's shopping preference
 */
export const savePreference = mutation({
  args: {
    preferenceKey: v.string(),
    preferenceValue: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    // Check if preference already exists
    const existing = await ctx.db
      .query("shopping_preferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("preferenceKey"), args.preferenceKey))
      .first();

    if (existing) {
      // Update existing preference
      await ctx.db.patch(existing._id, {
        preferenceValue: args.preferenceValue,
      });
    } else {
      // Create new preference
      await ctx.db.insert("shopping_preferences", {
        userId,
        preferenceKey: args.preferenceKey,
        preferenceValue: args.preferenceValue,
      });
    }
  },
});

/**
 * Get all shopping preferences for the authenticated user
 */
export const getPreferences = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    return ctx.db
      .query("shopping_preferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Internal mutation to log conversation turns (called by httpAction from Pipecat server)
 */
export const logConversationTurn = internalMutation({
  args: {
    sessionId: v.string(),
    speaker: v.string(),
    text: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversation_logs", {
      sessionId: args.sessionId,
      speaker: args.speaker,
      text: args.text,
      timestamp: args.timestamp,
    });
  },
});

/**
 * Get conversation history for a session
 */
export const getConversationHistory = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Verify the session belongs to this user
    const session = await ctx.db
      .query("voice_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.userId !== userId) {
      return [];
    }

    const limit = args.limit ?? 100;

    return ctx.db
      .query("conversation_logs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .take(limit);
  },
});

/**
 * Get active sessions for the authenticated user
 */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    return ctx.db
      .query("voice_sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();
  },
});

/**
 * Get all voice sessions (history) for the authenticated user
 */
export const getAllSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 100;

    return ctx.db
      .query("voice_sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});
