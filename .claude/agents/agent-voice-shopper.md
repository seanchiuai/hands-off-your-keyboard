```yaml
name: agent-pipecat-voice-shopper
description: Implements a Voice Shopper feature using Pipecat for conversational AI and Convex for backend data and orchestration.
model: inherit
color: purple
tech_stack:
  framework: Next.js
  database: Convex
  auth: Clerk
  provider: Pipecat
generated: 2025-10-17T03:14:00Z
documentation_sources: [
  "https://docs.pipecat.ai/",
  "https://github.com/pipecat-ai/pipecat",
  "https://github.com/pipecat-ai/examples/tree/main/simple-chatbot",
  "https://www.convex.dev/docs/actions",
  "https://www.convex.dev/docs/best-practices",
  "https://www.convex.dev/docs/authentication/clerk"
]
---

# Agent: Voice Shopper Implementation with Pipecat

## Agent Overview
**Purpose**: This agent facilitates the implementation of a "Voice Shopper" feature. It enables users to interact with a real-time AI voice agent powered by Pipecat, which clarifies requests, triggers background research, and presents interactive carousels of images, URLs, and summaries. Convex handles data persistence, orchestration of backend tasks, and integration with the shopping experience, while Clerk manages user authentication.
**Tech Stack**: Next.js (frontend), Convex (backend, database), Clerk (authentication), Pipecat (AI voice agent framework).
**Source**: Pipecat official documentation, Pipecat GitHub examples, Convex Developer Hub.

## Critical Implementation Knowledge
### 1. Pipecat Latest Updates 🚨
Pipecat is an open-source Python framework designed for building real-time voice and multimodal conversational AI agents. It leverages a pipeline architecture to orchestrate various AI services (Speech-to-Text, Text-to-Speech, Large Language Models) and network transports (WebSockets, WebRTC) for ultra-low latency interactions. [cite: Pipecat API documentation 1, Pipecat Voice Agent Builder 1, Pipecat Voice Agent Builder 4] The framework emphasizes modularity and extensibility, allowing developers to integrate various third-party AI providers. The core agent logic resides in a Python server, while client applications (like Next.js) communicate with it via real-time protocols. [cite: Pipecat Voice Agent Builder 4]

### 2. Common Pitfalls & Solutions 🚨
*   **Real-time Latency**: Achieving ultra-low latency for natural conversation is challenging. Pipecat's pipeline architecture is designed for this, but network conditions, AI service response times, and inefficient processing within the agent can introduce delays.
    *   **Solution**: Optimize AI service calls, ensure efficient audio processing, and use fast, reliable network transports (WebRTC/WebSockets). Profile each stage of the Pipecat pipeline to identify bottlenecks.
*   **Complex State Management**: Managing conversational state across multiple turns, especially with multimodal interactions and external research, can become complex.
    *   **Solution**: Design clear state machines or flow control within the Pipecat agent. Use Convex for persisting relevant conversational context or user preferences that need to survive across sessions or agent restarts.
*   **Frontend-Backend Communication**: Differentiating between real-time streaming communication (Pipecat client to Pipecat server) and persistent data operations (Next.js to Convex, or Pipecat server to Convex) is crucial.
    *   **Solution**: Establish direct WebSocket/WebRTC connections from the Next.js frontend to the Pipecat Python server for live audio/video streams. Use Convex `actions` and `mutations` for all database interactions and non-real-time backend logic.
*   **Convex External API Calls**: Convex `queries` and `mutations` *cannot* make external `fetch` calls. Attempting to do so will result in runtime errors.
    *   **Solution**: Always use Convex `actions` for any interaction with external services, including calling into the Pipecat server (for orchestration, not real-time stream) or other research APIs. [cite: Convex actions external API call best practices 1]
*   **Authentication & Authorization**: Ensuring secure communication between the Next.js client, Convex, and the Pipecat server, and properly handling user authentication with Clerk.
    *   **Solution**: Use Clerk for authenticating users on the Next.js frontend and integrating with Convex. For Pipecat, consider API keys for a Pipecat Cloud service, or implement secure mechanisms (e.g., token-based authentication) if self-hosting the Pipecat server and needing to call Convex functions.

### 3. Best Practices 🚨
*   **Convex Actions for External Integration**: Use Convex `actions` for initiating Pipecat sessions (e.g., requesting a session token or room URL from a Pipecat management service), triggering background research, and any communication with external services that isn't a direct real-time stream. [cite: Convex actions external API call best practices 1]
*   **Convex for Data Persistence**: All user-related data, conversation history summaries, saved shopping items, and research results should be stored in Convex via `mutations`.
*   **Convex for Orchestration**: Leverage `internalActions` within Convex to handle complex background tasks that the Pipecat agent might trigger (e.g., calling a third-party product API, summarizing external content). The Pipecat Python server can call these Convex `internalActions` via `httpAction` endpoints.
*   **Separate Pipecat Deployment**: The Pipecat Python agent server should be deployed as a separate service, optimized for real-time performance. It will communicate with the Next.js frontend directly for streaming.
*   **Client SDKs**: Utilize Pipecat's JavaScript/React SDKs for seamless frontend integration within Next.js. [cite: Pipecat Next.js integration example 1]
*   **Robust Error Handling**: Implement comprehensive error handling for both the Pipecat agent (e.g., gracefully handling failed LLM calls or STT/TTS issues) and Convex functions (e.g., validating inputs, handling API call failures).
*   **Schema Validation**: Always define and validate arguments and return types for all Convex functions using `v`. [cite: Discover gists · GitHub 2, Discover gists · GitHub 3]
*   **Access Control**: Secure all public Convex `query`, `mutation`, and `action` functions with proper authentication and authorization checks, especially using Clerk's `ctx.auth.getUserIdentity()`. [cite: Discover gists · GitHub 3]

## Implementation Steps

The implementation involves three main components: the Next.js frontend, the Convex backend, and the Pipecat Python agent server.

### Backend Implementation

The Pipecat agent (Python) runs independently and handles real-time voice and multimodal interaction. Convex handles data persistence, authentication integration with Clerk, and acts as an orchestration layer for non-real-time backend tasks triggered by either the frontend or the Pipecat agent.

#### Convex Functions (Primary)

1.  **`api/voiceShopper.ts`**:
    *   **`initiateSession` (action)**: Called by the Next.js frontend. Authenticates the user with Clerk. Calls an external Pipecat management service (or a self-hosted endpoint) to provision a new conversational session, returning connection details (e.g., WebRTC room ID, WebSocket URL, temporary token) to the frontend.
    *   **`saveShoppingItem` (mutation)**: Called by the Next.js frontend to save an item presented by the AI agent (from the carousel) into the Convex database. Requires user authentication.
    *   **`getShoppingHistory` (query)**: Called by the Next.js frontend to display previously saved shopping items for the authenticated user.
    *   **`logConversationTurn` (mutation)**: Called by the Pipecat Python server (via an `httpAction`) to persist segments of the conversation history for later review or analytics.
2.  **`api/research.ts`**:
    *   **`triggerBackgroundResearch` (internalAction)**: Called by the Pipecat Python server (via an `httpAction`). This action will perform external searches, call third-party APIs (e.g., product databases), process the results, and then store structured data into Convex via a `mutation`. This leverages Convex's capability to run complex, non-deterministic logic.
3.  **`http.ts`**:
    *   **`logConversationHttp` (httpAction)**: An HTTP endpoint exposed for the Pipecat Python server to call. This `httpAction` would internally call `api.voiceShopper.logConversationTurn` to persist data.
    *   **`triggerResearchHttp` (httpAction)**: An HTTP endpoint for the Pipecat Python server to call, which internally invokes `internal.research.triggerBackgroundResearch`.
    *   These `httpActions` should include custom authentication (e.g., a shared secret API key) to ensure only the Pipecat server can call them.

### Frontend Integration

The Next.js frontend will be responsible for rendering the UI, capturing user audio, playing back agent responses, and displaying multimodal content (e.g., the interactive carousel).

1.  **Voice Input Component**: A React component that uses the Pipecat JS/React SDK to capture microphone input, establish a WebSocket/WebRTC connection to the Pipecat Python server, and stream audio data.
2.  **Multimodal Output Component**: A React component that listens for multimodal output from the Pipecat Python server (e.g., text, images, URLs for the carousel) and renders them interactively.
3.  **Convex Hooks**: Use `useMutation` and `useQuery` hooks from `convex/react` to interact with Convex functions for:
    *   Initiating a session: Call `api.voiceShopper.initiateSession`.
    *   Saving items: Call `api.voiceShopper.saveShoppingItem`.
    *   Displaying history: Use `api.voiceShopper.getShoppingHistory`.
4.  **Clerk Integration**: Use Clerk hooks to manage user authentication and pass user identity to Convex mutations/actions where needed.

## Code Patterns

### Convex Backend Functions

*   **`convex/voiceShopper.ts`**:
    ```typescript
    import { v } from "convex/values";
    import { action, mutation, query } from "./_generated/server";
    import { api, internal } from "./_generated/api";

    // Example for initiating a session with an external Pipecat orchestration service
    export const initiateSession = action({
      args: { userId: v.id("users") }, // Assuming Clerk integration maps to a Convex user ID
      handler: async (ctx, args) => {
        // Authenticate with Clerk
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Unauthorized");
        }
        // Example: Call an external Pipecat management service to get session details
        // This service would be responsible for spinning up/managing Pipecat Python instances
        const response = await fetch("https://pipecat-cloud-manager.example.com/start-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.PIPEC_CLOUD_MANAGER_API_KEY}`,
          },
          body: JSON.stringify({ userId: args.userId }),
        });
        if (!response.ok) {
          throw new Error(`Failed to initiate Pipecat session: ${response.statusText}`);
        }
        const sessionDetails = await response.json();
        // You might want to store session details in Convex for tracking
        await ctx.runMutation(internal.voiceShopper.storeSessionInfo, {
          sessionId: sessionDetails.sessionId,
          userId: args.userId,
          startTime: Date.now(),
        });
        return sessionDetails; // e.g., { sessionId: "...", wsUrl: "wss://..." }
      },
    });

    // Internal mutation to store session info (called by initiateSession action)
    export const storeSessionInfo = mutation({
      args: { sessionId: v.string(), userId: v.id("users"), startTime: v.number() },
      handler: async (ctx, args) => {
        // Add access control if this mutation could be called by others
        await ctx.db.insert("voice_sessions", {
          sessionId: args.sessionId,
          userId: args.userId,
          startTime: args.startTime,
          status: "active",
        });
      },
    });

    export const saveShoppingItem = mutation({
      args: {
        userId: v.id("users"),
        sessionId: v.string(),
        productId: v.string(),
        productName: v.string(),
        imageUrl: v.optional(v.string()),
        price: v.number(),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity || identity.subject !== args.userId.toString()) { // Example check if userId matches authenticated user
          throw new Error("Unauthorized to save item for this user");
        }
        await ctx.db.insert("saved_items", {
          userId: args.userId,
          sessionId: args.sessionId,
          productId: args.productId,
          productName: args.productName,
          imageUrl: args.imageUrl,
          price: args.price,
          savedAt: Date.now(),
        });
      },
    });

    export const getShoppingHistory = query({
      args: { userId: v.id("users") },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity || identity.subject !== args.userId.toString()) {
          return []; // Or throw error, depending on desired behavior
        }
        return ctx.db
          .query("saved_items")
          .filter((q) => q.eq(q.field("userId"), args.userId))
          .order("desc")
          .collect();
      },
    });

    // Internal mutation (called by httpAction from Pipecat server)
    export const logConversationTurn = mutation({
      args: { sessionId: v.string(), speaker: v.string(), text: v.string(), timestamp: v.number() },
      handler: async (ctx, args) => {
        // Add specific authorization check for Pipecat server if needed (e.g., token)
        await ctx.db.insert("conversation_logs", {
          sessionId: args.sessionId,
          speaker: args.speaker,
          text: args.text,
          timestamp: args.timestamp,
        });
      },
    });
    ```

*   **`convex/research.ts`**:
    ```typescript
    import { v } from "convex/values";
    import { internalAction, mutation } from "./_generated/server";
    import { internal } from "./_generated/api";

    export const triggerBackgroundResearch = internalAction({
      args: { query: v.string(), sessionId: v.string(), userId: v.id("users") },
      handler: async (ctx, args) => {
        // Here, integrate with external search APIs (e.g., Google Shopping API, a custom product database)
        // This is where complex business logic or third-party integrations go.
        console.log(`Performing research for query: "${args.query}"`);
        const searchResults = await fetch(`https://external-search.example.com/api?q=${encodeURIComponent(args.query)}`, {
            headers: { 'Authorization': `Bearer ${process.env.EXTERNAL_SEARCH_API_KEY}` }
        }).then(res => res.json());

        const relevantItems = searchResults.items.map((item: any) => ({
            title: item.title,
            description: item.description,
            imageUrl: item.image,
            productUrl: item.link,
            price: item.price,
        }));

        // Store the results in Convex for the frontend to query and the agent to reference
        await ctx.runMutation(internal.research.storeResearchResults, {
          sessionId: args.sessionId,
          query: args.query,
          results: relevantItems,
        });

        return { success: true, resultsCount: relevantItems.length };
      },
    });

    // Internal mutation to store research results (called by triggerBackgroundResearch action)
    export const storeResearchResults = mutation({
      args: {
        sessionId: v.string(),
        query: v.string(),
        results: v.array(
          v.object({
            title: v.string(),
            description: v.string(),
            imageUrl: v.optional(v.string()),
            productUrl: v.string(),
            price: v.number(),
          }),
        ),
      },
      handler: async (ctx, args) => {
        await ctx.db.insert("research_results", {
          sessionId: args.sessionId,
          query: args.query,
          results: args.results,
          timestamp: Date.now(),
        });
      },
    });
    ```

*   **`convex/http.ts`**:
    ```typescript
    import { httpRouter } from "convex/server";
    import { httpAction } from "./_generated/server";
    import { internal } from "./_generated/api";
    import { v } from "convex/values";

    const http = httpRouter();

    // HTTP endpoint for Pipecat server to log conversation turns
    http.route({
      path: "/pipecat/log-conversation",
      method: "POST",
      handler: httpAction(async (ctx, request) => {
        // Implement custom authorization here for Pipecat server
        const secretHeader = request.headers.get("X-Pipecat-Secret");
        if (secretHeader !== process.env.PIPEC_SERVER_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { sessionId, speaker, text, timestamp } = body;

        // Validate incoming data
        try {
          v.object({
            sessionId: v.string(),
            speaker: v.string(),
            text: v.string(),
            timestamp: v.number(),
          }).parse(body);
        } catch (error) {
          return new Response(`Invalid request body: ${error}`, { status: 400 });
        }

        await ctx.runMutation(internal.voiceShopper.logConversationTurn, {
          sessionId,
          speaker,
          text,
          timestamp,
        });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }),
    });

    // HTTP endpoint for Pipecat server to trigger background research
    http.route({
      path: "/pipecat/trigger-research",
      method: "POST",
      handler: httpAction(async (ctx, request) => {
        const secretHeader = request.headers.get("X-Pipecat-Secret");
        if (secretHeader !== process.env.PIPEC_SERVER_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { query, sessionId, userId } = body;

        try {
          v.object({
            query: v.string(),
            sessionId: v.string(),
            userId: v.id("users"),
          }).parse(body);
        } catch (error) {
          return new Response(`Invalid request body: ${error}`, { status: 400 });
        }

        await ctx.runAction(internal.research.triggerBackgroundResearch, {
          query,
          sessionId,
          userId,
        });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }),
    });

    export default http;
    ```

## Testing & Debugging

*   **Convex Dashboard**: Monitor Convex function invocations, logs, and database changes in real-time. Use the dashboard to inspect `_generated` types and schema.
*   **Unit Tests for Convex Functions**: Write unit tests for your `queries`, `mutations`, and `actions` to ensure correct data handling and external API interactions.
*   **Pipecat Agent Logging**: Configure comprehensive logging for your Python Pipecat server to track conversation flow, AI service responses, and any errors.
*   **Network Tab**: For frontend debugging, use browser developer tools to inspect WebSocket/WebRTC connections to the Pipecat server and HTTP requests to Convex.
*   **Clerk Dashboard**: Monitor user sessions and authentication events via the Clerk dashboard.
*   **End-to-End Testing**: Simulate user interactions to test the full flow from voice input, through Pipecat, Convex, and back to the frontend display.

## Environment Variables

### Next.js Frontend
*   `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL.
*   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key.
*   `CLERK_SECRET_KEY`: Your Clerk secret key (for backend validation if needed).
*   `NEXT_PUBLIC_PIPEC_WS_URL`: The WebSocket or WebRTC signaling URL for your Pipecat Python server.

### Convex Backend
*   `CONVEX_DEPLOYMENT`: Automatically set by Convex.
*   `CLERK_WEBHOOK_SECRET`: Secret for Clerk webhooks (if handling Clerk events directly in Convex `httpActions`).
*   `PIPEC_CLOUD_MANAGER_API_KEY`: API key for calling a Pipecat cloud management service (if used for session provisioning).
*   `PIPEC_SERVER_SECRET`: A shared secret key used to authenticate requests from the Pipecat Python server to Convex `httpActions`.
*   `EXTERNAL_SEARCH_API_KEY`: API key for any external search or product APIs called by Convex actions.

### Pipecat Python Server
*   `CONVEX_HTTP_URL`: The base URL for your Convex `httpActions` (e.g., `https://<YOUR_CONVEX_URL>.convex.cloud/api`).
*   `PIPEC_SERVER_SECRET`: The same shared secret key as defined in Convex, used for authenticating calls to Convex `httpActions`.
*   `OPENAI_API_KEY` (or similar for chosen LLM/STT/TTS providers): API keys for any AI services Pipecat integrates with.
*   `DAILY_API_KEY` (if using Daily.co for WebRTC transport): API key for Daily.co.

## Success Metrics

*   **Real-time Responsiveness**: The AI voice agent responds within 500-800ms for typical turns, providing a natural conversational flow.
*   **Accurate Understanding**: The agent accurately clarifies user requests and performs relevant background research.
*   **Multimodal Display**: Interactive carousels of images, URLs, and summaries are presented correctly and are actionable.
*   **Data Persistence**: User conversations, saved shopping items, and research results are accurately stored in Convex.
*   **Secure Authentication**: Clerk and Convex auth are correctly integrated, ensuring only authenticated users can access their data and initiate sessions.
*   **Convex Functionality**:
    *   `api.voiceShopper.initiateSession` successfully returns session details.
    *   `api.voiceShopper.saveShoppingItem` successfully persists items to the `saved_items` table.
    *   `api.voiceShopper.getShoppingHistory` retrieves the correct shopping history for the authenticated user.
    *   `http.pipecat.logConversationHttp` (and underlying `internal.voiceShopper.logConversationTurn`) correctly logs conversation turns from the Pipecat server.
    *   `http.pipecat.triggerResearchHttp` (and underlying `internal.research.triggerBackgroundResearch`) correctly triggers external research and stores results.
```