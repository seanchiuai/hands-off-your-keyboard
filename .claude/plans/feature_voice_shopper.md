# Roadmap: Voice Shopper

## Context
- Stack: Next.js, convex, Pipecat (Python backend, JS client SDK), Gemini (via AI SDK)
- Feature: Talk to a real-time AI voice agent that clarifies your request, triggers background research, and presents an interactive carousel of images, URLs, and summaries you can inspect, save, or ask to buy.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Pipecat Cloud account
- [ ] Configure Pipecat Cloud dashboard
- [ ] Generate Pipecat Public API key for client-side interaction (or server-side proxy)
- [ ] Generate Pipecat Private API key for CLI/server-side deployment
- [ ] Create Google Cloud Project for Gemini API
- [ ] Enable Gemini API (e.g., `generativeai.googleapis.com`)
- [ ] Generate Gemini API key
- [ ] Configure billing for Pipecat Cloud and Google Cloud (Gemini)

### 2. Dependencies & Environment

#### Backend (Pipecat Agent - Python)
- [ ] Install: `pipecat-ai[google,webrtc]`, `python-dotenv`, `uvicorn`, `fastapi`, `convex`
- [ ] Env vars:
    - `PIPECATH_API_KEY_PUBLIC` (or `PIPECATH_API_KEY_PRIVATE` for deployment)
    - `GOOGLE_API_KEY` (for Gemini)
    - `CONVEX_DEPLOYMENT_URL`

#### Frontend (Next.js)
- [ ] Install: `react`, `react-dom`, `next`, `@pipecat-ai/client-js`, `@ai-sdk/google`, `@convex-dev/react`, `@convex-dev/nextjs`
- [ ] Env vars:
    - `NEXT_PUBLIC_PIPECATH_API_KEY_PUBLIC` (proxied via Next.js API route or kept server-side)
    - `NEXT_PUBLIC_CONVEX_URL`
    - `NEXT_PUBLIC_AGENT_NAME`

### 3. Database Schema (Convex)
- [ ] Table: `shopping_preferences`
    - `userId`: `string` (or `id('users')`)
    - `preferenceKey`: `string` (e.g., "brand", "price_range", "material")
    - `preferenceValue`: `string`
- [ ] Table: `saved_items`
    - `userId`: `string` (or `id('users')`)
    - `productId`: `string` (external product ID)
    - `name`: `string`
    - `description`: `string`
    - `imageUrl`: `string`
    - `productUrl`: `string`
    - `savedAt`: `number` (timestamp)

### 4. Backend Functions (Convex & Pipecat Agent)

#### Convex Functions
- [ ] `savePreference(userId, preferenceKey, preferenceValue)`: Store user shopping preferences.
- [ ] `getPreferences(userId)`: Retrieve user shopping preferences.
- [ ] `saveItem(userId, productId, name, description, imageUrl, productUrl)`: Save a product to user's list.
- [ ] `getSavedItems(userId)`: Retrieve user's saved products.

#### Pipecat Agent (Python)
- [ ] `agent.py`:
    - `initializeAgent(geminiApiKey, convexDeploymentUrl)`: Setup Pipecat pipeline with Gemini LLM, STT, and TTS.
    - `handleVoiceInput(audioStream)`: Process real-time user voice input.
    - `processUserIntent(transcript, userId)`: Use Gemini to understand user intent and trigger custom actions.
    - `triggerProductResearch(query, preferences)`:
        - Call external product search API (mock for MVP).
        - Format results (images, URLs, summaries) for frontend carousel.
    - `clarifyRequest(initialRequest)`: Use Gemini to ask follow-up questions for ambiguous requests.
    - `saveProduct(userId, productDetails)`: Invoke Convex `saveItem` function.
    - `getShoppingMemory(userId)`: Invoke Convex `getPreferences` and `getSavedItems` functions.
    - `respondWithVoice(text)`: Convert LLM response to speech.
    - `sendCarouselData(productData)`: Send structured product data to frontend via WebSocket.

### 5. Frontend

#### Components
- [ ] `VoiceInputButton`: Initiates/stops voice recording, displays mic status.
- [ ] `ProductCarousel`: Displays product images, titles, summaries, and URLs in an interactive scrollable view.
- [ ] `ProductCard`: Individual component within the carousel, with "Save" and "Details" actions.
- [ ] `SavedItemsList`: Displays user's saved products (for later implementation, beyond initial carousel).
- [ ] `VoiceAgentDisplay`: Shows agent's verbal responses (text form) and current state (e.g., "Searching...", "Listening...").

#### State (React Context or Zustand/Jotai)
- [ ] `isListening`: Boolean, current microphone activity.
- [ ] `agentSpeaking`: Boolean, agent currently generating speech.
- [ ] `conversationHistory`: Array of `{speaker: 'user' | 'agent', text: string}`.
- [ ] `currentProducts`: Array of `{id, name, description, imageUrl, productUrl}` for carousel.
- [ ] `currentQuery`: String, the latest user query.
- [ ] `systemMessage`: String, for status updates or error messages.

### 6. Error Prevention
- [ ] API errors: Implement robust try/catch for Pipecat, Gemini, and Convex API calls.
- [ ] Validation: Frontend input validation, backend validation for all incoming data.
- [ ] Rate limiting: Graceful handling of Pipecat and Gemini rate limits (e.g., exponential backoff).
- [ ] Auth: Secure handling of API keys (server-side for sensitive keys, environment variables).
- [ ] Type safety: Use TypeScript for frontend, Python type hints for backend.
- [ ] Boundaries: Implement timeouts for external API calls, maximum conversation length.
- [ ] Network: Handle WebSocket/WebRTC connection loss and reconnection logic.

### 7. Testing
- [ ] Unit tests for Convex database functions.
- [ ] Unit tests for Pipecat agent custom actions (product research, save/retrieve).
- [ ] Integration tests:
    - Frontend voice input -> Pipecat agent -> Gemini -> Mock product search -> Frontend carousel update.
    - Frontend save item -> Pipecat agent -> Convex.
    - User interruption during agent speech.
- [ ] End-to-end (E2E) tests: Simulate user voice interaction and verify UI responses.