"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

/**
 * Internal action to process interaction signals and update preferences using LLM
 * This is called periodically or triggered after significant user interactions
 */
export const processSignalsAndUpdatePreferences = internalAction({
  args: {
    userId: v.id("preference_users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get API key from environment
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        console.error("GOOGLE_GENERATIVE_AI_API_KEY environment variable not set");
        return { success: false, error: "API key not configured" };
      }

      // Fetch recent interaction signals (last 7 days)
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const signals = await ctx.runQuery(
        internal.interactionSignals.getInteractionsInTimeWindow,
        {
          userId: args.userId,
          startTime: oneWeekAgo,
        }
      );

      if (signals.length === 0) {
        console.log(`No signals found for user ${args.userId}`);
        return { success: true, message: "No signals to process" };
      }

      // Aggregate signal data
      const aggregatedData = {
        totalInteractions: signals.length,
        saves: signals.filter((s) => s.type === "save"),
        purchases: signals.filter((s) => s.type === "purchase"),
        views: signals.filter((s) => s.type === "view"),
        voiceQueries: signals.filter((s) => s.type === "voice_query"),
        dislikes: signals.filter((s) => s.type === "dislike"),
        categories: [...new Set(signals.map((s) => s.category).filter(Boolean))],
        keywords: signals
          .flatMap((s) => s.extractedKeywords || [])
          .filter(Boolean),
      };

      // Prepare context for LLM
      const context = `
You are analyzing user shopping behavior to extract preferences. Based on the following interaction data, identify the user's preferences.

Interaction Summary:
- Total interactions: ${aggregatedData.totalInteractions}
- Items saved: ${aggregatedData.saves.length}
- Items purchased: ${aggregatedData.purchases.length}
- Items viewed: ${aggregatedData.views.length}
- Voice queries: ${aggregatedData.voiceQueries.length}
- Items disliked: ${aggregatedData.dislikes.length}

Categories of interest: ${aggregatedData.categories.join(", ")}
Keywords from interactions: ${aggregatedData.keywords.slice(0, 50).join(", ")}

Voice queries (recent):
${aggregatedData.voiceQueries.slice(0, 10).map((q) => `- ${q.queryText}`).join("\n")}

Based on this data, extract the user's preferences for:
1. Style preferences (e.g., minimalist, modern, vintage, boho, industrial)
2. Budget range (min and max in USD)
3. Size preferences (clothing sizes, furniture dimensions, etc.)
4. Product categories they're interested in
5. Brand preferences
6. Color preferences

Return structured data that can be used to personalize future recommendations.
`;

      // Call Gemini LLM to extract preferences
      const result = await generateObject({
        model: google("gemini-2.0-flash-exp"),
        schema: {
          type: "object",
          properties: {
            style: {
              type: "array",
              items: { type: "string" },
              description: "Style preferences (e.g., minimalist, modern, vintage)",
            },
            budget: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
              },
              required: ["min", "max"],
              description: "Budget range in USD",
            },
            size: {
              type: "array",
              items: { type: "string" },
              description: "Size preferences",
            },
            productCategories: {
              type: "array",
              items: { type: "string" },
              description: "Product categories of interest",
            },
            brands: {
              type: "array",
              items: { type: "string" },
              description: "Preferred brands",
            },
            colors: {
              type: "array",
              items: { type: "string" },
              description: "Preferred colors",
            },
            confidence: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Confidence level of the extracted preferences",
            },
          },
          required: [
            "style",
            "budget",
            "size",
            "productCategories",
            "brands",
            "colors",
            "confidence",
          ],
        },
        prompt: context,
      });

      const learnedPreferences = result.object;

      // Only update if confidence is medium or high
      if (
        learnedPreferences.confidence === "low" &&
        aggregatedData.totalInteractions < 10
      ) {
        console.log(
          `Low confidence preferences for user ${args.userId}, skipping update`
        );
        return {
          success: true,
          message: "Insufficient data for confident update",
        };
      }

      // Update preferences via internal mutation
      await ctx.runMutation(internal.userPreferences.internalUpdatePreferences, {
        userId: args.userId,
        style: learnedPreferences.style,
        budget: learnedPreferences.budget,
        size: learnedPreferences.size,
        productCategories: learnedPreferences.productCategories,
        brands: learnedPreferences.brands,
        colors: learnedPreferences.colors,
      });

      console.log(`Successfully updated preferences for user ${args.userId}`);
      return {
        success: true,
        preferences: learnedPreferences,
        signalsProcessed: signals.length,
      };
    } catch (error) {
      console.error("Error in processSignalsAndUpdatePreferences:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Public action to trigger preference learning for the current user
 * This allows users to manually request preference analysis
 */
export const triggerPreferenceLearning = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from database
    const user = await ctx.runQuery(internal.preferenceUsers.getUserByClerkId, {
      clerkUserId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Trigger the learning process
    const result = await ctx.runAction(
      internal.preferenceLearning.processSignalsAndUpdatePreferences,
      {
        userId: user._id,
      }
    );

    return result;
  },
});

/**
 * Action to analyze a voice query and extract immediate preferences
 * This provides real-time preference extraction from voice interactions
 */
export const analyzeVoiceQuery = action({
  args: {
    queryText: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("API key not configured");
    }

    try {
      // Extract preferences from the voice query
      const result = await generateObject({
        model: google("gemini-2.0-flash-exp"),
        schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Key terms extracted from the query",
            },
            category: {
              type: "string",
              description: "Product category mentioned",
            },
            style: {
              type: "array",
              items: { type: "string" },
              description: "Style preferences mentioned",
            },
            priceRange: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
              },
              description: "Price range mentioned",
            },
            colors: {
              type: "array",
              items: { type: "string" },
              description: "Colors mentioned",
            },
          },
          required: ["keywords", "category"],
        },
        prompt: `Analyze the following shopping query and extract structured information:

Query: "${args.queryText}"

Extract:
1. Key search keywords
2. Product category
3. Style preferences (if mentioned)
4. Price range (if mentioned)
5. Colors (if mentioned)

Be specific and extract only what's explicitly stated or strongly implied.`,
      });

      return result.object;
    } catch (error) {
      console.error("Error analyzing voice query:", error);
      throw new Error("Failed to analyze query");
    }
  },
});
