import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

/**
 * HTTP endpoint for Pipecat server to log conversation turns
 * This allows the Python Pipecat agent to persist conversation data to Convex
 */
http.route({
  path: "/pipecat/log-conversation",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Implement custom authorization for Pipecat server
    const secretHeader = request.headers.get("X-Pipecat-Secret");
    const expectedSecret = process.env.PIPECAT_SERVER_SECRET;

    if (!expectedSecret) {
      console.error("[HTTP] PIPECAT_SERVER_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (secretHeader !== expectedSecret) {
      console.warn("[HTTP] Unauthorized request to log-conversation endpoint");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { sessionId, speaker, text, timestamp } = body;

      // Validate incoming data
      if (!sessionId || typeof sessionId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid sessionId" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!speaker || typeof speaker !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid speaker" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!text || typeof text !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid text" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!timestamp || typeof timestamp !== "number") {
        return new Response(
          JSON.stringify({ error: "Invalid timestamp" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Call internal mutation to store the conversation turn
      await ctx.runMutation(internal.voiceShopper.logConversationTurn, {
        sessionId,
        speaker,
        text,
        timestamp,
      });

      console.log(`[HTTP] Logged conversation turn for session ${sessionId}`);

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[HTTP] Error logging conversation:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * HTTP endpoint for Pipecat server to trigger background research
 * This allows the Python agent to initiate product searches
 */
http.route({
  path: "/pipecat/trigger-research",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Implement custom authorization for Pipecat server
    const secretHeader = request.headers.get("X-Pipecat-Secret");
    const expectedSecret = process.env.PIPECAT_SERVER_SECRET;

    if (!expectedSecret) {
      console.error("[HTTP] PIPECAT_SERVER_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (secretHeader !== expectedSecret) {
      console.warn("[HTTP] Unauthorized request to trigger-research endpoint");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { query, sessionId, userId, preferences } = body;

      // Validate required fields
      if (!query || typeof query !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid query" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!sessionId || typeof sessionId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid sessionId" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!userId || typeof userId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid userId" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[HTTP] Triggering research for query: "${query}"`);

      // Verify session exists and matches the provided userId
      const session = await ctx.runQuery(internal.voiceShopper.getSessionByIdInternal, {
        sessionId,
      });

      if (!session) {
        console.warn(`[HTTP] Session not found: ${sessionId}`);
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      if (session.userId !== userId) {
        console.warn(`[HTTP] Session/User mismatch. Session userId: ${session.userId}, Provided: ${userId}`);
        return new Response(
          JSON.stringify({ error: "Session/User mismatch" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Call internal action to perform background research
      const result = await ctx.runAction(internal.research.triggerBackgroundResearch, {
        query,
        sessionId,
        userId,
        preferences: preferences || undefined,
      });

      console.log(`[HTTP] Research completed for session ${sessionId}`);

      return new Response(
        JSON.stringify({
          success: true,
          resultsCount: result.resultsCount,
          sessionId: result.sessionId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[HTTP] Error triggering research:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Health check endpoint for monitoring
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: Date.now(),
        service: "voice-shopper-convex",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
