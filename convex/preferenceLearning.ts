"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Internal action to process interaction signals and update preferences using LLM
 * This is called periodically or triggered after significant user interactions
 */
export const processSignalsAndUpdatePreferences = internalAction({
  args: {
    userId: v.id("preference_users"),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Get API key from environment
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        console.error("GOOGLE_GENERATIVE_AI_API_KEY environment variable not set");
        return { success: false, error: "API key not configured" };
      }

      // Fetch recent interaction signals (last 7 days)
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const signals: any[] = await ctx.runQuery(
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
      const aggregatedData: any = {
        totalInteractions: signals.length,
        saves: signals.filter((s: any) => s.type === "save"),
        purchases: signals.filter((s: any) => s.type === "purchase"),
        views: signals.filter((s: any) => s.type === "view"),
        voiceQueries: signals.filter((s: any) => s.type === "voice_query"),
        dislikes: signals.filter((s: any) => s.type === "dislike"),
        categories: [...new Set(signals.map((s: any) => s.category).filter(Boolean))],
        keywords: signals
          .flatMap((s: any) => s.extractedKeywords || [])
          .filter(Boolean),
      };

      // Prepare context for LLM
      const context: string = `
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
${aggregatedData.voiceQueries.slice(0, 10).map((q: any) => `- ${q.queryText}`).join("\n")}

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
      const result: any = await generateObject({
        model: google("gemini-2.0-flash-exp"),
        schema: z.object({
          style: z.array(z.string()).describe("Style preferences (e.g., minimalist, modern, vintage)"),
          budget: z.object({
            min: z.number(),
            max: z.number(),
          }).describe("Budget range in USD"),
          size: z.array(z.string()).describe("Size preferences"),
          productCategories: z.array(z.string()).describe("Product categories of interest"),
          brands: z.array(z.string()).describe("Preferred brands"),
          colors: z.array(z.string()).describe("Preferred colors"),
          confidence: z.enum(["low", "medium", "high"]).describe("Confidence level of the extracted preferences"),
        }),
        prompt: context,
      });

      const learnedPreferences: any = result.object;

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
  handler: async (ctx): Promise<any> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from database
    const user: any = await ctx.runQuery(internal.preferenceUsers.getUserByClerkId, {
      clerkUserId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Trigger the learning process
    const result: any = await ctx.runAction(
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
  handler: async (ctx, args): Promise<any> => {
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
        schema: z.object({
          keywords: z.array(z.string()).describe("Key terms extracted from the query"),
          category: z.string().describe("Product category mentioned"),
          style: z.array(z.string()).optional().describe("Style preferences mentioned"),
          priceRange: z.object({
            min: z.number(),
            max: z.number(),
          }).optional().describe("Price range mentioned"),
          colors: z.array(z.string()).optional().describe("Colors mentioned"),
        }),
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
