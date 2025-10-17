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
The app features a simplified, voice-first interface with 4 main pages and a persistent sidebar:

**Navigation:**
- Persistent sidebar on the left for all pages
- Simple navigation between pages
- Clean, minimal design

**Pages:**
1. **Main Dashboard** (`/`)
   - Primary interaction point for voice shopping
   - Large microphone button for voice interaction
   - Product display area showing search results
   - Save button for each product
   - No text input - purely voice-driven

2. **History** (`/history`)
   - View past conversations with AI
   - Manage AI's memory of user preferences
   - Edit or reset learned preferences
   - Review interaction history

3. **Saved Products** (`/saved`)
   - Collection of all saved products
   - Product cards with images, names, and links
   - Option to remove saved items

4. **Settings** (`/settings`)
   - User account information
   - Logout functionality
   - App configuration options

**Design Principles:**
- Voice-first: Microphone interaction as the primary input method
- Minimal UI: Clean, uncluttered interface focused on essential features
- Clear hierarchy: Easy navigation between the 4 main pages
- Consistent layout: Sidebar always present for quick access