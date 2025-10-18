1. What This App Does
HANDS OFF YOUR KEYBOARD! is a voice-first shopping website where you talk to an AI assistant to find products. It listens, searches in real time, and shows a carousel of images, links, and short summaries you can quickly browse and save.

2. Core Features
- Voice Shopper: A real-time, conversational agent uses Google Gemini for understanding, planning, and summarizing, and Pipecat for low-latency speech in/out. It clarifies your request, triggers searches, and drives a live product carousel you can inspect, save, or ask to buy.
- Background Research: A custom research agent continuously crawls retailers and marketplaces, re-ranking results by price, reviews, and availability. It streams new options into the UI as you speak and refine your request.
- Preference Memory: The system learns your style, budget, sizes, and interaction signals from saves and purchases to personalize future searches. You can review, edit, or reset your learned profile at any time.

3. Tech Stack
- Framework: Next.js 15
- Database: Convex
- Auth: Clerk
- LLM Provider: Google Gemini (intent parsing, dialogue, summarization)
- Voice Provider: Pipecat (real-time STT/TTS)
- Research Agent: Custom crawling and ranking pipeline

4. UI Design Style
Modern, clean, intuitive UI without being flashy.

5. UI Structure
The app features a streamlined, single-page interface optimized for voice-first shopping:

**Layout:**
- Two-column layout: Voice agent on the left, workspace on the right
- No navigation between pages - everything on one screen
- Clean, minimal design focused on the conversation and results

**Left Panel: Voice Agent**
- Real-time conversation display showing user/agent dialogue
- Visual status indicators (listening, thinking, speaking, searching)
- Large microphone button for voice interaction
- Interim transcript display during speech
- Conversation history scrollable

**Right Panel: Main Workspace**
- Dynamic product display area showing search results in real-time
- Product carousel with images, prices, reviews, and buy links
- Save functionality for products
- Pinned queries for quick re-access
- Recently viewed items
- Status and tips section

**Design Principles:**
- Voice-first: Microphone interaction as the primary and only input method
- Single-page: All functionality accessible without navigation
- Real-time: Live updates as the agent searches and responds
- Minimal UI: Clean, uncluttered interface focused on conversation and results
- Visual feedback: Clear status indicators for agent activity