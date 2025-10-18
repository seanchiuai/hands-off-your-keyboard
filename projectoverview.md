# Hands Off Your Keyboard – Project Overview

## Purpose and Key Capabilities
Hands Off Your Keyboard delivers a voice-first shopping assistant that fuses conversational AI with background product research and preference learning. The system enables natural language product discovery, autonomous research across retailers, personalized preference modeling, and authenticated shopping list management within a modern web interface.【F:README.md†L1-L189】

## Technology Stack
- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui form the client experience for authenticated shopping flows.【F:README.md†L24-L33】
- **Backend:** Convex provides the real-time data layer and serverless actions, Clerk manages authentication, and Gemini powers preference intelligence.【F:README.md†L33-L37】
- **Voice Agent:** A Python Pipecat pipeline integrates Gemini 1.5 Flash, Cartesia TTS, Silero VAD, and WebSocket transport for bidirectional audio conversations.【F:README.md†L38-L82】【F:voice_agent/server.py†L1-L200】
- **Tooling & Dependencies:** npm scripts orchestrate parallel Next.js and Convex development, while dependencies span Convex, Clerk, Google AI SDKs, TanStack Table, shadcn/ui primitives, and TypeScript tooling.【F:package.json†L5-L64】

## Repository Structure Overview
- `app/` – Next.js App Router hierarchy hosting the landing experience, history views, and supporting routes. The root page coordinates voice sessions, Convex actions, and WebSocket audio streaming.【F:app/page.tsx†L14-L200】
- `components/` – Reusable UI and layout primitives such as the authenticated shell and voice controls.【F:components/AppShell.tsx†L1-L29】【F:components/VoiceInputButton.tsx†L1-L93】
- `hooks/` – Client hooks for media capture, playback, and responsive behavior; e.g., audio streaming integrates microphone access and playback queues for WebSocket sessions.【F:hooks/use-audio-stream.ts†L5-L175】
- `convex/` – Serverless actions, queries, HTTP endpoints, and schema definitions that persist sessions, products, research outputs, and preference data.【F:convex/voiceShopper.ts†L6-L194】【F:convex/research.ts†L5-L188】【F:convex/http.ts†L8-L200】【F:convex/schema.ts†L8-L165】
- `voice_agent/` – Python FastAPI service wrapping Pipecat pipelines plus custom Convex-integrated actions for search, saving items, and preference retrieval.【F:voice_agent/server.py†L1-L200】【F:voice_agent/actions.py†L13-L200】
- `app/globals.css` and `public/` – Global Tailwind theme tokens, gradients, and typography that deliver the dark, retail-focused visual identity.【F:app/globals.css†L1-L160】

## Application Architecture
### Frontend Flow
- The authenticated shell applies Clerk, Convex, and UI providers so signed-in users receive consistent navigation and theming.【F:app/layout.tsx†L1-L64】【F:components/AppShell.tsx†L1-L29】
- `app/page.tsx` orchestrates session lifecycle: it launches Convex voice sessions, streams microphone audio over WebSockets, plays synthesized speech, and renders live research results returned from Convex.【F:app/page.tsx†L37-L200】
- The `VoiceInputButton` component surfaces microphone status, animations, and start/stop controls, while `useAudioStream` encapsulates microphone capture, PCM conversion, and playback queues for streamed audio responses.【F:components/VoiceInputButton.tsx†L16-L92】【F:hooks/use-audio-stream.ts†L26-L175】
- Global styling defines brand colors, gradients, and Tailwind theme hooks that are reused across cards, buttons, and layout surfaces.【F:app/globals.css†L7-L160】

### Convex Backend
- Schema definitions cover research queries and products, voice sessions, saved items, conversation logs, structured preference profiles, and interaction signals, enabling both transactional and analytical use cases.【F:convex/schema.ts†L22-L164】
- `voiceShopper.ts` exposes authenticated actions to initiate and end sessions, save voiced shopping items, fetch history, and log conversation turns over secured HTTP callbacks.【F:convex/voiceShopper.ts†L6-L194】
- `research.ts` provides internal actions that perform (mock or SerpAPI-backed) product searches, persist results, and feed them back to the UI via Convex queries.【F:convex/research.ts†L5-L188】
- `http.ts` registers secret-protected HTTP endpoints the Python agent uses to log conversation transcripts and trigger background research, bridging the FastAPI service with Convex mutations and actions.【F:convex/http.ts†L8-L200】

### Voice Agent Service
- The FastAPI WebSocket server boots a Pipecat pipeline that chains WebSocket audio IO, LLM context management, Gemini inference, and Cartesia TTS before streaming speech back to the browser.【F:voice_agent/server.py†L65-L176】
- Custom action handlers authenticate against Convex HTTP routes to launch research jobs, save items, and retrieve stored preferences, exposing them to Gemini via function calls for tool-augmented conversations.【F:voice_agent/actions.py†L13-L200】

## Data Flow Summary
1. The user initiates a session from the Next.js client, which calls the Convex `initiateSession` action and opens a WebSocket to the voice agent.【F:app/page.tsx†L37-L118】【F:convex/voiceShopper.ts†L6-L38】
2. `useAudioStream` captures microphone audio, streams it to the Pipecat server, and plays synthesized responses while UI components track agent state.【F:app/page.tsx†L46-L118】【F:hooks/use-audio-stream.ts†L26-L175】
3. Gemini-driven conversations invoke Pipecat actions that call Convex HTTP endpoints to log dialog, trigger research, and save items; Convex writes data into typed tables defined in `schema.ts`.【F:voice_agent/actions.py†L116-L194】【F:convex/http.ts†L8-L200】【F:convex/schema.ts†L22-L164】
4. Research results and saved products are retrieved via Convex queries and rendered in the client’s product grids and history views.【F:app/page.tsx†L194-L200】【F:convex/voiceShopper.ts†L139-L194】

## Development and Operations
- Run `npm run dev` to start the Next.js frontend and Convex backend concurrently, while the Pipecat voice agent is launched separately via the Python environment (`python agent.py`).【F:package.json†L5-L12】【F:README.md†L161-L176】
- Environment variables spanning Clerk, Convex, Gemini, Cartesia, and Pipecat secrets must be configured in `.env.local` and the Python service to enable authenticated cross-service communication.【F:README.md†L120-L140】【F:voice_agent/server.py†L68-L100】

