# System Architecture

This document provides a detailed technical overview of the AI Voice Shopping Assistant architecture.

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Security](#security)
- [Scalability](#scalability)

---

## High-Level Overview

The AI Voice Shopping Assistant is a distributed system combining real-time voice AI, serverless backend, and modern frontend technologies.

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                           User Devices                          │
│                    (Browser, Mobile, Desktop)                   │
└───────┬────────────────────────────┬────────────────────────────┘
        │                            │
        │ HTTPS                      │ WebSocket
        │                            │
┌───────▼────────────────────────────▼─────────────────────────┐
│                     Next.js Frontend (Vercel)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ App Router  │  │ React        │  │ Tailwind CSS       │  │
│  │ Pages       │  │ Components   │  │ shadcn/ui          │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
└───────┬────────────────────────────┬────────────────────────┘
        │                            │
        │ Convex Client              │
        │ (Real-time sync)           │
        │                            │
┌───────▼────────────────────────────▼─────────────────────────┐
│              Convex Backend (Serverless)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Queries  │  │ Mutations│  │ Actions  │  │ HTTP Routes │ │
│  │          │  │          │  │          │  │ (Pipecat)   │ │
│  └──────────┘  └──────────┘  └────┬─────┘  └──────┬──────┘ │
│                                    │                 │        │
│  ┌─────────────────────────────────▼─────────────────▼─────┐ │
│  │              Database (Document Store)                   │ │
│  │  • voice_sessions  • saved_items   • user_preferences   │ │
│  │  • products        • queries       • interaction_signals│ │
│  └──────────────────────────────────────────────────────────┘ │
└───────┬──────────────────────────────────────────────────────┘
        │
        │ HTTP Callbacks
        │
┌───────▼──────────────────────────────────────────────────────┐
│          Pipecat Voice Agent (Python Server)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Voice Pipeline                        │   │
│  │  ┌────┐  ┌────┐  ┌────────┐  ┌────┐  ┌──────────┐  │   │
│  │  │VAD │→ │STT │→ │ Gemini │→ │TTS │→ │ WebSocket│  │   │
│  │  │    │  │    │  │  LLM   │  │    │  │/WebRTC   │  │   │
│  │  └────┘  └────┘  └───┬────┘  └────┘  └──────────┘  │   │
│  │                      │                               │   │
│  │               ┌──────▼──────┐                        │   │
│  │               │   Actions   │                        │   │
│  │               │  - Search   │                        │   │
│  │               │  - Save     │                        │   │
│  │               │  - Prefs    │                        │   │
│  │               └─────────────┘                        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
        │
        │ API Calls
        │
┌───────▼──────────────────────────────────────────────────────┐
│                    External Services                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │   Gemini    │  │    Clerk    │  │  Product Search APIs │ │
│  │   (Google)  │  │    Auth     │  │  (Google Shopping,   │ │
│  │             │  │             │  │   Amazon, etc.)      │ │
│  └─────────────┘  └─────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Frontend Layer (Next.js)

**Technology Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui components

**Key Components:**

#### Pages
- `/voice-shopper` - Voice shopping interface
- `/research` - Background research UI
- `/tasks` - Task management (demo)

#### Component Hierarchy

```
VoiceShopperPage
├── VoiceInputButton
│   ├── Mic icon with animation
│   └── Status indicator
├── VoiceAgentDisplay
│   ├── Conversation history
│   ├── Agent status badge
│   └── Message bubbles (user/agent/system)
└── ProductDisplay
    ├── Tabs (Current/Saved)
    ├── ProductCard[]
    │   ├── Image
    │   ├── Title/Description
    │   ├── Price
    │   ├── Actions (Save/View/Cart)
    │   └── Wishlist heart
    └── EmptyState
```

**State Management:**
- React hooks (useState, useEffect)
- Convex real-time queries (useQuery)
- Convex mutations (useMutation)
- Convex actions (useAction)

**Real-time Synchronization:**
```typescript
// Automatic updates when database changes
const products = useQuery(api.products.getFilteredProducts, { queryId });
const savedItems = useQuery(api.voiceShopper.getShoppingHistory);
```

### 2. Backend Layer (Convex)

**Technology Stack:**
- Convex (serverless TypeScript runtime)
- V8 Isolates for fast cold starts
- Real-time WebSocket protocol
- Document database with indexes

**Function Types:**

#### Queries (Read-Only)
```typescript
export const getShoppingHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    return ctx.db
      .query("saved_items")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
```

- Cached and reactive
- Automatically re-run when dependencies change
- Client receives real-time updates

#### Mutations (Write)
```typescript
export const saveShoppingItem = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    await ctx.db.insert("saved_items", { /* ... */ });
  },
});
```

- Transactional
- Atomic database operations
- Trigger query invalidation

#### Actions (External Calls)
```typescript
export const triggerBackgroundResearch = internalAction({
  args: { query: v.string(), /* ... */ },
  handler: async (ctx, args) => {
    // Call external APIs
    const results = await fetchProductsFromAPI(args.query);
    // Store results
    await ctx.runMutation(internal.research.storeResults, { results });
  },
});
```

- Can call external APIs
- Non-transactional
- Can run mutations internally

#### HTTP Routes
```typescript
http.route({
  path: "/pipecat/trigger-research",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Authenticate Pipecat server
    const secret = request.headers.get("X-Pipecat-Secret");
    if (secret !== process.env.PIPECAT_SERVER_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    // Trigger research
    await ctx.runAction(internal.research.triggerBackgroundResearch, { /* ... */ });
  }),
});
```

### 3. Voice Agent Layer (Pipecat)

**Technology Stack:**
- Python 3.10+
- Pipecat AI framework
- Google Gemini (LLM)
- Google TTS
- Silero VAD
- WebSocket server

**Pipeline Architecture:**

```python
pipeline = Pipeline([
    vad,                    # Voice Activity Detection
    sentence_aggregator,    # Group words into sentences
    llm_service,           # Gemini LLM processing
    llm_aggregator,        # Aggregate LLM responses
    tts_service,           # Text-to-Speech
])
```

**Processing Flow:**

1. **Audio Input** → Raw audio from user's microphone
2. **VAD** → Detect speech vs silence
3. **STT** → Convert speech to text (handled by LLM service)
4. **Sentence Aggregation** → Group tokens into complete sentences
5. **LLM Processing** → Gemini generates response + function calls
6. **Function Execution** → Custom actions (search, save, etc.)
7. **TTS** → Convert response text to speech
8. **Audio Output** → Stream to user

**Custom Actions:**

```python
class VoiceShopperActions:
    async def search_products(self, session_id, user_id, query, **filters):
        # Call Convex HTTP endpoint
        response = await self.client.post(
            f"{self.convex_url}/pipecat/trigger-research",
            json={...},
            headers={"X-Pipecat-Secret": self.secret}
        )
        return {"success": True, "message": "Found N products"}
    
    async def save_item(self, session_id, user_id, product_id, **details):
        # Save to user's list via Convex
        await self.log_conversation(...)
        return {"success": True}
    
    async def get_user_preferences(self, user_id):
        # Retrieve learned preferences
        return {"preferences": {...}}
```

---

## Data Flow

### Voice Shopping Flow

```
1. User Speaks
   └→ Browser captures audio
      └→ WebSocket sends to Pipecat
         └→ VAD detects speech
            └→ STT converts to text
               └→ Gemini LLM processes
                  ├→ Generates response
                  └→ Calls search_products()
                     └→ HTTP POST to Convex
                        └→ triggerBackgroundResearch action
                           └→ Fetch products (mock or real API)
                              └→ Store in database
                                 └→ Frontend query auto-updates
                                    └→ User sees products
               
2. Gemini Response
   └→ TTS converts to audio
      └→ WebSocket sends to browser
         └→ User hears response
```

### Preference Learning Flow

```
1. User Interaction
   ├→ View product
   ├→ Save product
   ├→ Click product
   ├→ Voice query
   └→ Purchase
      └→ logInteractionSignal mutation
         └→ Store in interaction_signals table
         
2. Periodic Analysis (scheduled or on-demand)
   └→ processSignalsAndUpdatePreferences action
      └→ Fetch last 7 days of signals
         └→ Aggregate by type, category, keywords
            └→ Call Gemini with structured schema
               └→ Extract preferences (style, budget, brands, colors)
                  └→ Update user_preferences table
                     └→ Use in future recommendations
```

### Background Research Flow

```
1. User Submits Search
   └→ createQuery mutation
      └→ Store in queries table (status: "pending")
         └→ triggerResearch action
            ├→ Fetch from Google Shopping API (or other)
            ├→ Parse and normalize results
            ├→ Apply user preferences for ranking
            └→ insertProducts mutation
               └→ Store in products table
                  └→ Update query status: "completed"
                     └→ Frontend query auto-updates
                        └→ ProductCarousel displays results
```

---

## Database Schema

### Core Tables

#### voice_sessions
Tracks active and completed voice shopping sessions.

```typescript
{
  sessionId: string,        // Unique session identifier
  userId: string,           // Clerk user ID
  startTime: number,        // Unix timestamp
  endTime?: number,         // Unix timestamp
  status: "active" | "completed" | "error"
}
// Indexes: by_user, by_session_id
```

#### saved_items
User's saved shopping items.

```typescript
{
  userId: string,           // Clerk user ID
  sessionId: string,        // Which session this was saved in
  productId: string,        // External product ID
  productName: string,
  description?: string,
  imageUrl?: string,
  productUrl?: string,
  price?: number,
  savedAt: number          // Unix timestamp
}
// Indexes: by_user, by_session
```

#### conversation_logs
Voice conversation history.

```typescript
{
  sessionId: string,
  speaker: string,          // "user" | "agent" | "system"
  text: string,             // What was said
  timestamp: number         // Unix timestamp
}
// Index: by_session
```

#### user_preferences
Learned user shopping preferences.

```typescript
{
  userId: Id<"preference_users">,
  style: string[],          // ["minimalist", "modern"]
  budget?: {
    min: number,
    max: number
  },
  size: string[],           // ["M", "L", "32x32"]
  productCategories: string[],
  brands: string[],
  colors: string[],
  lastUpdated: number
}
// Index: by_user_id
```

#### interaction_signals
User behavior tracking for preference learning.

```typescript
{
  userId: Id<"preference_users">,
  type: "view" | "click" | "save" | "purchase" | "dislike" | "voice_query",
  itemId?: string,
  queryText?: string,
  category?: string,
  timestamp: number,
  extractedKeywords?: string[]
}
// Indexes: by_user_id, by_user_id_timestamp
```

#### queries
Background research queries.

```typescript
{
  userId: string,
  searchText: string,
  status: "pending" | "searching" | "completed" | "failed",
  preferences?: {
    minPrice?: number,
    maxPrice?: number,
    minRating?: number,
    targetRetailers?: string[]
  },
  createdAt: number,
  updatedAt: number
}
// Indexes: by_user, by_user_and_status
```

#### products
Product search results.

```typescript
{
  queryId: Id<"queries">,
  title: string,
  imageUrl?: string,
  productUrl: string,
  price: number,
  currency: string,
  description?: string,
  reviewsCount?: number,
  rating?: number,
  availability: boolean,
  source: string,           // Retailer name
  searchRank: number,       // Original rank from API
  systemRank: number,       // Re-ranked based on preferences
  createdAt: number
}
// Indexes: by_query, by_query_and_rank, by_url_and_query
```

### Relationships

```
preference_users (1) ─────< (M) user_preferences
                    └─────< (M) interaction_signals

queries (1) ─────< (M) products

voice_sessions (1) ─────< (M) conversation_logs
               (1) ─────< (M) saved_items
```

---

## API Design

### Convex APIs

#### Client APIs (Frontend → Convex)

**Queries (Real-time reads):**
- `api.voiceShopper.getShoppingHistory` - Get saved items
- `api.voiceShopper.getActiveSessions` - Get active sessions
- `api.products.getFilteredProducts` - Get products for query
- `api.userPreferences.getUserPreferences` - Get user preferences

**Mutations (Writes):**
- `api.voiceShopper.saveShoppingItem` - Save a product
- `api.voiceShopper.endSession` - End voice session
- `api.userPreferences.updateUserPreferences` - Update preferences

**Actions (Complex operations):**
- `api.voiceShopper.initiateSession` - Start voice session
- `api.preferenceLearning.triggerPreferenceLearning` - Analyze behavior

#### Server APIs (Pipecat → Convex)

**HTTP Endpoints:**
- `POST /pipecat/log-conversation` - Log conversation turn
- `POST /pipecat/trigger-research` - Start product search
- `GET /health` - Health check

**Authentication:**
```typescript
const secretHeader = request.headers.get("X-Pipecat-Secret");
if (secretHeader !== process.env.PIPECAT_SERVER_SECRET) {
  return new Response("Unauthorized", { status: 401 });
}
```

### Pipecat APIs

**WebSocket Protocol:**
```
Client → Server: Audio stream (binary)
Server → Client: Audio stream (binary)

// Session initialization
ws://voice-agent-server:8000?sessionId=xxx&userId=yyy
```

**Function Calling Interface:**
```python
# LLM can invoke these functions
{
  "type": "function",
  "function": {
    "name": "search_products",
    "parameters": {
      "query": "gaming laptop",
      "max_price": 1500
    }
  }
}
```

---

## Security

### Authentication & Authorization

**Frontend:**
- Clerk authentication
- JWT tokens
- Protected routes via middleware

**Backend:**
- Clerk JWT validation
- Row-level security (userId filtering)
- Internal functions not exposed to clients

**Voice Agent:**
- Shared secret authentication
- HTTP header validation
- Session-based user identification

### Data Privacy

1. **User Isolation**: All queries filter by userId
2. **Session Security**: SessionId tied to userId
3. **Preference Privacy**: Preferences never shared between users
4. **Conversation Logs**: Stored securely, accessible only to user

### API Security

**Rate Limiting:**
```typescript
// Implement in HTTP routes
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000  // 1 minute
});
```

**CORS:**
```typescript
// Convex HTTP routes
headers: {
  "Access-Control-Allow-Origin": "https://your-domain.com",
  "Access-Control-Allow-Methods": "POST",
}
```

### Environment Variables

- Never commit to source control
- Use environment-specific values
- Rotate secrets periodically
- Use secret management services in production

---

## Scalability

### Frontend Scaling

- **CDN**: Vercel Edge Network
- **Caching**: Automatic static/dynamic caching
- **Global Distribution**: Edge functions
- **Capacity**: Auto-scales infinitely

### Backend Scaling

- **Convex**: Serverless, auto-scales
- **Database**: Distributed, no limits
- **Queries**: Cached and deduplicated
- **Real-time**: WebSocket automatically managed

### Voice Agent Scaling

**Current Architecture:**
- Single instance handles limited concurrent sessions
- Each session requires persistent WebSocket connection

**Scaling Strategy:**

1. **Horizontal Scaling:**
```
                Load Balancer (with sticky sessions)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    Instance 1     Instance 2     Instance 3
    (10 sessions) (10 sessions) (10 sessions)
```

2. **Session Affinity:**
- Use consistent hashing on sessionId
- Ensure reconnects go to same instance

3. **State Management:**
- Store session state in Redis
- Allow failover to different instance

4. **Resource Limits:**
- Max 10-20 concurrent sessions per instance
- Monitor CPU/memory usage
- Auto-scale based on metrics

### Database Indexing

**Critical Indexes:**
```typescript
// Fast user queries
.index("by_user", ["userId"])

// Fast session lookups
.index("by_session", ["sessionId"])

// Efficient preference analysis
.index("by_user_id_timestamp", ["userId", "timestamp"])

// Fast product filtering
.index("by_query_and_rank", ["queryId", "systemRank"])
```

### Performance Optimization

1. **Pagination**: Limit query results
2. **Caching**: Leverage Convex query caching
3. **Lazy Loading**: Load images on demand
4. **Debouncing**: Throttle frequent mutations
5. **Batch Operations**: Group related writes

---

## Monitoring & Observability

### Metrics to Track

**Voice Agent:**
- Concurrent sessions
- Average latency per pipeline stage
- Error rates
- Memory/CPU usage

**Backend:**
- Query execution time
- Mutation throughput
- Database size
- Action success rates

**Frontend:**
- Page load time
- Time to interactive
- WebSocket connection status
- Error boundaries triggered

### Logging

**Structured Logs:**
```python
logger.info(f"[Action] Searching products", extra={
    "session_id": session_id,
    "user_id": user_id,
    "query": query,
    "latency_ms": latency
})
```

### Alerting

**Critical Alerts:**
- Voice agent down
- Database connection errors
- Authentication failures
- High error rates (> 5%)

**Warning Alerts:**
- High latency (> 2s)
- Low disk space
- Memory usage > 80%
- Unusual traffic patterns

---

## Future Architecture Considerations

### Planned Improvements

1. **Multi-Language Support**
   - Language detection
   - Region-specific TTS voices
   - Translated UI

2. **Real Product APIs**
   - Google Shopping integration
   - Amazon Product API
   - Multi-retailer aggregation

3. **Advanced Preference Learning**
   - Visual preference extraction (images)
   - Seasonal preference shifts
   - Social/trending influences

4. **Mobile Applications**
   - React Native app
   - Native voice integration
   - Offline support

5. **Analytics Dashboard**
   - User behavior analytics
   - A/B testing framework
   - Conversion tracking

---

**For implementation details, see:**
- [README.md](./README.md) - Setup and usage
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [SETUP.md](./SETUP.md) - Development setup

