# Voice Shopper - Pipecat Python Agent

This directory contains the Python-based Pipecat voice agent for the Voice Shopper feature.

## Overview

The Pipecat agent handles real-time voice interactions with users, including:
- Speech-to-Text (STT) processing
- Natural language understanding via Gemini LLM
- Custom actions for product research
- Text-to-Speech (TTS) responses
- Integration with Convex backend via HTTP callbacks

## Setup

### 1. Install Dependencies

```bash
cd pipecat
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required variables:
- `GOOGLE_API_KEY`: Your Google Gemini API key
- `CONVEX_HTTP_URL`: Your Convex deployment URL (e.g., https://your-deployment.convex.cloud)
- `PIPECAT_SERVER_SECRET`: A shared secret key for authenticating with Convex httpActions (must match the value in Convex dashboard)

### 3. Run the Agent

```bash
python agent.py
```

The server will start on `http://localhost:8000` by default.

## Architecture

The Pipecat agent uses a pipeline architecture:

```
User Voice → STT → LLM (Gemini) → Custom Actions → TTS → User Audio
                                     ↓
                                Convex Backend
```

### Custom Actions

The agent implements custom actions that the LLM can invoke:
- `search_products`: Triggers product research via Convex
- `save_item`: Saves a product to the user's list
- `get_preferences`: Retrieves user shopping preferences

### Convex Integration

The agent communicates with Convex via HTTP endpoints:
- `POST /pipecat/log-conversation`: Logs conversation turns
- `POST /pipecat/trigger-research`: Initiates product searches

## Deployment

For production deployment:

1. **Option A: Self-hosted**
   - Deploy to a cloud provider (AWS, GCP, Azure)
   - Use a process manager (PM2, systemd)
   - Set up reverse proxy (nginx, Caddy)
   - Configure SSL/TLS certificates

2. **Option B: Pipecat Cloud**
   - Follow Pipecat Cloud deployment instructions
   - Configure environment variables in the cloud dashboard

## Development

To modify the agent behavior:
- Edit `agent.py` to change the pipeline or add custom actions
- Update `prompts.py` to customize LLM system prompts
- Modify `actions.py` to add new custom actions

## Troubleshooting

**Connection Issues:**
- Verify `CONVEX_HTTP_URL` is correct and accessible
- Check that `PIPECAT_SERVER_SECRET` matches between Python and Convex

**Audio Quality Issues:**
- Adjust STT/TTS provider settings
- Check network latency and bandwidth
- Consider using a different transport (WebRTC vs WebSocket)

**LLM Response Issues:**
- Review and adjust system prompts
- Check Gemini API quota and rate limits
- Monitor token usage and costs
