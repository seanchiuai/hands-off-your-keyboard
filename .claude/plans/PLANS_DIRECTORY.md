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

### 3. Background Research (`FEATURE_BACKGROUND_RESEARCH_IMPLEMENTATION.md`)
**Status**: ✅ Implemented & Tested
**Description**: AI-powered background product research using Google Gemini API with Search grounding. Automatically searches for products across retailers, processes results using AI, and ranks products based on user preferences.

**Key Components**:
- Google Gemini API integration with Search grounding
- Convex actions for asynchronous AI-powered search
- JSON and text response parsing
- Product filtering and re-ranking logic
- Query status tracking
- Real-time product streaming to frontend

**Tech Stack**: Next.js, Convex, Google Gemini API (gemini-2.5-flash)

---

### 4. UI Redesign (`FEATURE_UI_REDESIGN_IMPLEMENTATION.md`)
**Status**: 📋 Planned - Awaiting User Approval
**Description**: Complete UI overhaul to create a simplified, voice-first shopping experience with 4 main pages and persistent sidebar navigation. Transforms the app into a clean, minimal interface focused on voice interaction.

**Key Components**:
- Persistent sidebar navigation
- Voice-first main dashboard with large microphone button
- History page with conversation logs and preference management
- Saved products page with grid display
- Settings page with logout and configuration
- Responsive design for mobile, tablet, and desktop
- Integration with Voice Shopper, Background Research, and Preference Memory features

**Tech Stack**: Next.js 15, Tailwind CSS 4, shadcn/ui, Convex, Clerk

**Pages**:
1. Main Dashboard (`/`) - Voice interaction and product display
2. History (`/history`) - Past conversations and preference management
3. Saved Products (`/saved`) - Collection of saved items
4. Settings (`/settings`) - User profile and logout

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
**Total Plans**: 4
