# Voice Shopper Feature - Setup & Deployment Guide

This guide covers the complete setup and deployment of the Voice Shopper feature, including the Pipecat Python agent, Convex backend, and Next.js frontend.

## Overview

The Voice Shopper feature consists of three main components:

1. **Next.js Frontend** - User interface with voice controls and product display
2. **Convex Backend** - Real-time database, authentication, and orchestration
3. **Pipecat Python Agent** - Voice processing server with AI capabilities

## Prerequisites

- Node.js 20+ and npm
- Python 3.9+ and pip
- A Convex account (free tier available)
- A Clerk account for authentication
- A Google Cloud account for Gemini API access

## Part 1: Convex Backend Setup

### 1.1 Configure Environment Variables

The Convex backend requires the following environment variable to be set in the Convex dashboard:

```bash
PIPECAT_SERVER_SECRET=<generate-a-random-secret-key>
```

To set this:
1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Select your project
3. Navigate to "Settings" → "Environment Variables"
4. Add the variable: `PIPECAT_SERVER_SECRET`
5. Generate a secure random value (use: `openssl rand -base64 32`)

### 1.2 Deploy Schema Updates

The Voice Shopper tables have been added to `convex/schema.ts`. Deploy the schema:

```bash
npx convex dev
```

This will:
- Create the new tables: `shopping_preferences`, `saved_items`, `voice_sessions`, `conversation_logs`, `research_results`
- Generate TypeScript types
- Deploy the schema to Convex

### 1.3 Verify Convex Functions

Check that these functions are deployed:
- `convex/voiceShopper.ts` - Session management, item saving, preferences
- `convex/research.ts` - Background product research
- `convex/http.ts` - HTTP endpoints for Pipecat integration

## Part 2: Pipecat Python Agent Setup

### 2.1 Navigate to Pipecat Directory

```bash
cd pipecat
```

### 2.2 Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `pipecat-ai[google,webrtc]` - Pipecat framework with Google and WebRTC support
- `python-dotenv` - Environment variable management
- `uvicorn`, `fastapi` - Web server
- `websockets` - WebSocket communication
- `google-generativeai` - Gemini LLM integration
- `httpx` - HTTP client for calling Convex

### 2.4 Configure Environment Variables

Create a `.env` file in the `pipecat` directory:

```bash
cp .env.example .env
```

Edit `pipecat/.env` and set these values:

```env
# Google Gemini API Key
GOOGLE_API_KEY=<your-google-api-key>

# Convex Configuration
CONVEX_HTTP_URL=<your-convex-deployment-url>
# Example: https://happy-animal-123.convex.cloud

# Pipecat Server Secret (MUST match Convex environment variable)
PIPECAT_SERVER_SECRET=<same-secret-as-convex>

# Server Configuration (optional)
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

#### Getting Google Gemini API Key:
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key or use an existing one
3. Copy the API key to `GOOGLE_API_KEY`

#### Getting Convex HTTP URL:
1. Run `npx convex dev` in your main project directory
2. Copy the deployment URL (e.g., `https://happy-animal-123.convex.cloud`)
3. Paste it as `CONVEX_HTTP_URL`

### 2.5 Test the Pipecat Agent

Run the agent locally:

```bash
python agent.py
```

You should see:
```
=== Voice Shopper Agent ===
Initializing Pipecat voice agent...
Configuration validated successfully
Starting Voice Shopper Agent server on 0.0.0.0:8000
Server is running! Connect WebSocket clients to ws://0.0.0.0:8000
```

## Part 3: Next.js Frontend Setup

### 3.1 Environment Variables

The Next.js app needs the following in `.env.local`:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Pipecat Server Secret (for future WebSocket integration)
PIPECAT_SERVER_SECRET=<same-secret-as-before>
```

These should already be configured from your existing setup.

### 3.2 Run the Frontend

```bash
npm run dev
```

### 3.3 Access Voice Shopper

Navigate to: http://localhost:3000/voice-shopper

## Part 4: Testing the Integration

### 4.1 Test Frontend Only (Without Pipecat)

1. Open http://localhost:3000/voice-shopper
2. Click the microphone button
3. You should see a mock conversation and product results
4. This demonstrates the UI without real voice processing

### 4.2 Test Convex HTTP Endpoints

Test the Convex httpActions with curl:

```bash
# Test conversation logging
curl -X POST https://YOUR_CONVEX_URL.convex.cloud/pipecat/log-conversation \
  -H "X-Pipecat-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "speaker": "user",
    "text": "Hello",
    "timestamp": 1234567890000
  }'

# Test research trigger
curl -X POST https://YOUR_CONVEX_URL.convex.cloud/pipecat/trigger-research \
  -H "X-Pipecat-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "laptop",
    "sessionId": "test-session",
    "userId": "test-user"
  }'
```

Replace:
- `YOUR_CONVEX_URL` with your actual Convex URL
- `YOUR_SECRET` with your `PIPECAT_SERVER_SECRET`

### 4.3 Test Full Integration (Production Setup)

For full voice integration, you need to:

1. **Deploy the Pipecat Server** to a cloud provider (see Part 5)
2. **Update Frontend WebSocket URL** in `app/voice-shopper/page.tsx`
3. **Establish WebSocket connection** from frontend to Pipecat server

## Part 5: Production Deployment

### 5.1 Deploy Pipecat Python Server

#### Option A: Self-Hosted (AWS, GCP, Azure, DigitalOcean)

1. **Provision a server** (minimum specs: 1 vCPU, 2GB RAM)

2. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv
   ```

3. **Deploy code:**
   ```bash
   git clone <your-repo>
   cd pipecat
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Set environment variables** in `/etc/environment` or using systemd

5. **Create systemd service** (`/etc/systemd/system/pipecat-agent.service`):
   ```ini
   [Unit]
   Description=Pipecat Voice Shopping Agent
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/pipecat
   Environment="PATH=/path/to/pipecat/venv/bin"
   ExecStart=/path/to/pipecat/venv/bin/python agent.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

6. **Start and enable service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start pipecat-agent
   sudo systemctl enable pipecat-agent
   ```

7. **Set up reverse proxy** with nginx or Caddy for SSL/TLS

#### Option B: Pipecat Cloud (Recommended for Production)

1. Create account at https://pipecat.ai
2. Follow Pipecat Cloud deployment instructions
3. Configure environment variables in cloud dashboard
4. Deploy using Pipecat CLI

### 5.2 Deploy Convex Backend

Convex is already deployed when you run `npx convex dev`. For production:

```bash
npx convex deploy
```

### 5.3 Deploy Next.js Frontend

Deploy to Vercel (recommended):

```bash
vercel deploy --prod
```

Or other platforms:
- Netlify
- AWS Amplify
- Google Cloud Run

## Part 6: Configuration & Optimization

### 6.1 Gemini API Rate Limits

Monitor your Gemini API usage:
- Free tier: 60 requests per minute
- Consider upgrading for production use
- Implement rate limiting in the Pipecat agent

### 6.2 WebSocket Connection

The current implementation uses a mock WebSocket. For production:

1. **Update frontend** (`app/voice-shopper/page.tsx`):
   ```typescript
   const ws = new WebSocket(`wss://your-pipecat-server.com?sessionId=${result.sessionId}`);

   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     // Handle agent responses, product data, etc.
   };
   ```

2. **Update Pipecat agent** to handle authentication:
   ```python
   # In agent.py
   async def handle_session(self, websocket, path):
       # Parse sessionId from query params
       query = parse_qs(urlparse(path).query)
       session_id = query.get('sessionId', [None])[0]

       # Validate session with Convex
       # Then proceed with pipeline
   ```

### 6.3 Security Considerations

1. **Secrets Management:**
   - Never commit secrets to git
   - Use environment variables
   - Rotate `PIPECAT_SERVER_SECRET` periodically

2. **WebSocket Security:**
   - Use WSS (WebSocket Secure) in production
   - Validate session tokens
   - Implement rate limiting

3. **API Keys:**
   - Restrict Gemini API key to specific IP addresses
   - Monitor usage and set billing alerts
   - Use separate keys for dev/staging/production

## Part 7: Troubleshooting

### Common Issues

**Issue: Pipecat agent can't connect to Convex**
- Verify `CONVEX_HTTP_URL` is correct
- Check `PIPECAT_SERVER_SECRET` matches between Convex and Pipecat
- Ensure network allows outbound HTTPS connections

**Issue: "Unauthorized" when calling httpActions**
- Verify `X-Pipecat-Secret` header matches `PIPECAT_SERVER_SECRET`
- Check Convex environment variables are set correctly

**Issue: Gemini API errors**
- Verify `GOOGLE_API_KEY` is valid
- Check API quota and rate limits
- Review Gemini API status page

**Issue: Frontend can't connect to Pipecat**
- Verify Pipecat server is running
- Check WebSocket URL and port
- Look for CORS issues (if applicable)

## Part 8: Next Steps

### Immediate Enhancements

1. **Implement Real WebSocket Communication:**
   - Replace mock data in frontend
   - Establish persistent WebSocket connections
   - Handle reconnection logic

2. **Integrate Real Product APIs:**
   - Replace mock products in `convex/research.ts`
   - Implement Google Shopping API
   - Add Amazon Product Advertising API
   - Configure web scraping service (Bright Data, ScrapingBee)

3. **Add Voice Processing:**
   - Configure STT (Speech-to-Text) provider
   - Configure TTS (Text-to-Speech) provider
   - Fine-tune audio quality settings

### Future Features

1. **Enhanced Preferences:**
   - Learn from user behavior
   - Implement preference memory across sessions
   - Personalized recommendations

2. **Multi-modal Interactions:**
   - Show images during conversation
   - Support text input alongside voice
   - Add video product demos

3. **Advanced Shopping Features:**
   - Price tracking and alerts
   - Comparison shopping
   - Purchase integration (if applicable)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Pipecat documentation: https://docs.pipecat.ai
3. Review Convex documentation: https://docs.convex.dev
4. Check your application logs

## Summary

You've successfully set up:
- ✅ Convex backend with voice shopping tables and functions
- ✅ Python Pipecat agent for voice processing
- ✅ Next.js frontend with voice UI components
- ✅ HTTP integration between components
- ✅ Mock data for local testing

The system is ready for local testing. Follow Part 5 for production deployment.
