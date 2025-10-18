# Plans Directory Overview

This directory contains implementation plans for all major features in the **Hands Off Your Keyboard** project. Each plan provides detailed step-by-step instructions, architecture decisions, database schemas, and error prevention strategies.

## Purpose

- **Pre-implementation reference**: Check this directory before implementing any new feature to see if a plan already exists
- **Consistency**: Ensures all implementations follow the same structure and best practices
- **Documentation**: Serves as living documentation of how features were designed and built
- **Modification tracking**: When users request changes to existing features, update the relevant plan to keep documentation in sync

## Available Plans

### 1. Voice Shopper (`feature_voice_shopper.md`)
**Status**: Planned
**Description**: Real-time AI voice agent integration using Pipecat and Gemini. Users can talk to an AI agent that clarifies requests, triggers product research, and displays results in an interactive carousel.

**Key Components**:
- Pipecat Python backend for voice processing
- Gemini LLM for conversation understanding
- Convex for data persistence
- Next.js frontend with product carousel
- Real-time voice interaction with speech-to-text and text-to-speech

**Tech Stack**: Next.js, Convex, Pipecat (Python + JS SDK), Gemini API

---

### 2. Preference Memory (`feature_preference_memory.md`)
**Status**: Planned
**Description**: Builds and maintains a memory of user shopping preferences for personalized recommendations. The system learns from user interactions (saves, clicks, purchases) and refines recommendations over time.

**Key Components**:
- User preference profiles stored in Convex
- Interaction signal tracking (views, clicks, saves, purchases)
- LLM-powered preference extraction from user behavior
- Real-time UI updates with reactive queries
- Manual preference editing interface

**Tech Stack**: Next.js, Convex, Gemini API, Convex Auth

---

### 3. Background Research (`feature_background_research.md`)
**Status**: Planned
**Description**: Continuous background product research using Bright Data's web scraping API. Automatically searches e-commerce sites, processes results, and ranks products based on user preferences.

**Key Components**:
- Google Gemini API integration with Search grounding
- Convex actions for asynchronous AI-powered search
- JSON and text response parsing
- Product filtering and re-ranking logic
- Query status tracking
- Scheduled continuous searches

**Tech Stack**: Next.js, Convex, Bright Data API

---

### 4. Multi-API Product Search (`FEATURE_MULTI_API_PRODUCT_SEARCH_IMPLEMENTATION.md`)
**Status**: Planned
**Description**: Enhances Background Research with multiple product search APIs for comprehensive results, better price comparison, and increased reliability. Aggregates data from SerpAPI, Amazon, eBay, Walmart, and custom Playwright scrapers.

**Key Components**:
- Search orchestrator for parallel API calls
- Amazon Product Advertising API integration
- eBay Finding API integration
- Walmart Open API integration
- Playwright MCP for custom retailer scraping
- Product deduplication and merging logic
- Multi-source ranking algorithm
- Source selection and filtering UI

**Tech Stack**: Next.js, Convex, SerpAPI, Amazon PA-API, eBay API, Walmart API, Playwright MCP

---

### 5. Playwright Scraper Integration (`FEATURE_PLAYWRIGHT_SCRAPER_INTEGRATION.md`)
**Status**: Planned
**Description**: Fallback web scraping mechanism for extracting product data from retailers without APIs. Enables comprehensive e-commerce coverage across Best Buy, Target, Costco, B&H Photo, and Newegg.

**Key Components**:
- Playwright-based scraper templates
- Search orchestrator integration for parallel scraping
- Best Buy scraper implementation
- Template-based scraper for multiple retailers
- Product extraction and normalization
- Performance optimization with caching

**Tech Stack**: Next.js, Convex, Playwright MCP, Best Buy/Target/Costco scrapers

---

### 6. SerpAPI Integration (`FEATURE_SERPAPI_INTEGRATION.md`)
**Status**: Planned
**Description**: Google Shopping product search integration via SerpAPI. Provides fast, API-based product search across major retailers with pricing, reviews, and availability data.

**Key Components**:
- SerpAPI key setup and configuration
- Environment variable management (local + Convex)
- Product search action integration
- Rate limiting and quota management
- Response parsing and normalization

**Tech Stack**: Next.js, Convex, SerpAPI

---

### 7. Voice Agent Pipecat Setup (`FEATURE_VOICE_AGENT_PIPECAT_SETUP.md`)
**Status**: In Progress
**Description**: Python-based real-time voice processing server using Pipecat AI. Handles microphone input, speech-to-text, LLM conversation with Gemini, and text-to-speech responses.

**Key Components**:
- Pipecat Python server setup
- Gemini API integration for conversation
- WebSocket connection management
- Environment configuration sync
- Audio processing pipeline
- Troubleshooting and debugging guides

**Tech Stack**: Python, Pipecat AI, Gemini API, WebSockets, Convex HTTP

---

## Plan Naming Convention

All feature plans follow this naming pattern:
```
feature_[FEATURE_DESCRIPTION].md
```

Examples:
- `feature_voice_shopper.md`
- `feature_preference_memory.md`
- `feature_background_research.md`

## When to Use Plans

### Before Implementation
1. **Always check this directory** when starting a new feature
2. If a plan exists, follow it step-by-step
3. If no plan exists, consider creating one for complex features
4. For simple features, you may proceed without a formal plan

### During Implementation
1. Reference the plan for architecture decisions
2. Follow the database schema exactly as specified
3. Use the error prevention guidelines
4. Cross-reference the testing scenarios

### After User Requests
1. If a user requests changes to an existing feature, **update the relevant plan**
2. If a user requests a new feature that relates to an existing plan, **modify that plan**
3. Keep plans in sync with actual implementation

## Plan Structure

Each plan follows a consistent structure:

1. **Context**: Tech stack and feature overview
2. **Implementation Steps**:
   - Manual Setup (user-required tasks)
   - Dependencies & Environment
   - Database Schema
   - Backend Functions
   - Frontend Components
   - Error Prevention
   - Testing
3. **Documentation Sources**: References used to create the plan

## Integration with CLAUDE.md

This directory is referenced in the main `CLAUDE.md` file under "Custom Agents, Plans, and Specification". Always consult both:
- This directory for feature-specific implementation details
- `/spec/spec-sheet.md` for high-level app goals and requirements
- `/.claude/agents` for specialized task automation

## Status Legend

- **Planned**: Design complete, not yet implemented
- **In Progress**: Currently being built
- **Completed**: Feature is live and functional
- **Modified**: Plan updated based on user feedback or implementation learnings

---

**Last Updated**: October 17, 2025
**Total Plans**: 8
