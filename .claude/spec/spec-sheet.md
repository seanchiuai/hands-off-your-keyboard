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