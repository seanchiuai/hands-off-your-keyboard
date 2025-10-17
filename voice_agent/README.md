# Voice Shopper - Pipecat Voice Agent

This directory contains the Python-based Pipecat voice agent for the AI Voice Shopping Assistant.

## Overview

The Pipecat agent is the core voice processing component that enables real-time conversational shopping. It creates a pipeline that processes audio input, generates intelligent responses using Gemini, and streams audio output back to users.

### Key Features

- **Real-Time Voice Processing**: WebSocket-based bidirectional audio streaming
- **Voice Activity Detection (VAD)**: Silero VAD for accurate speech detection
- **Natural Language Understanding**: Gemini 1.5 Flash for conversational AI
- **Custom Function Calling**: Product search, item saving, preference retrieval
- **Text-to-Speech**: Google TTS for natural-sounding responses
- **Convex Integration**: HTTP callbacks for product research and data storage

### Architecture

```
User Audio Input
    ↓
WebSocket Transport
    ↓
Voice Activity Detection (Silero VAD)
    ↓
Sentence Aggregation
    ↓
Gemini LLM Processing
    ├→ Generate Response
    └→ Trigger Custom Actions
        ├→ search_products()
        ├→ save_item()
        └→ get_user_preferences()
            ↓
        HTTP POST to Convex
            ↓
        Database Updates
    ↓
Text-to-Speech (Google TTS)
    ↓
WebSocket Transport
    ↓
User Audio Output
```

## Setup

### 1. Install Dependencies

```bash
cd pipecat
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file with the following variables:

```env
# Google Gemini API Key
# Get from: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=your_google_api_key_here

# Convex HTTP URL (same as NEXT_PUBLIC_CONVEX_URL)
CONVEX_HTTP_URL=https://your-project.convex.cloud

# Shared secret for authenticating with Convex
# Must match PIPECAT_SERVER_SECRET in Convex Dashboard
PIPECAT_SERVER_SECRET=your_secure_secret_here

# Server Configuration (optional)
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

**Important**: The `PIPECAT_SERVER_SECRET` must match the value configured in your Convex Dashboard under Settings → Environment Variables.

### 3. Run the Agent

```bash
python agent.py
```

The server will start on `ws://localhost:8000` by default.

You should see:
```
=== Voice Shopper Agent ===
Initializing Pipecat voice agent...
Configuration validated successfully
Starting Voice Shopper Agent server on 0.0.0.0:8000
Convex backend: https://your-project.convex.cloud
Server is running! Connect WebSocket clients to ws://0.0.0.0:8000
```

## Detailed Architecture

### Pipeline Components

The Pipecat agent uses a modular pipeline architecture defined in `agent.py`:

```python
pipeline = Pipeline([
    vad,                    # Voice Activity Detection (Silero)
    sentence_aggregator,    # Group words into sentences
    llm_service,           # Gemini LLM (gemini-1.5-flash)
    llm_aggregator,        # Aggregate LLM responses
    tts_service,           # Google TTS (en-US-Neural2-F)
])
```

**Flow:**
1. Audio arrives via WebSocket
2. VAD detects speech vs silence
3. Speech converted to text (handled by LLM service)
4. Sentence aggregator groups tokens
5. Gemini processes text and decides actions
6. Custom actions execute (search, save, etc.)
7. Response converted to speech
8. Audio streamed back via WebSocket

### Custom Actions (`actions.py`)

The agent implements three custom actions that Gemini can invoke:

#### 1. `search_products()`
Triggers product search in the background.

```python
await self.actions.search_products(
    session_id="session_123",
    user_id="user_456",
    query="gaming laptop",
    max_price=1500,
    brands=["Dell", "ASUS"],
    categories=["electronics"]
)
```

**What it does:**
- Sends HTTP POST to Convex `/pipecat/trigger-research`
- Convex runs background product search
- Results stored in database
- Frontend automatically receives updates

#### 2. `save_item()`
Saves a product to the user's shopping list.

```python
await self.actions.save_item(
    session_id="session_123",
    user_id="user_456",
    product_id="prod_789",
    product_name="Dell XPS 15",
    price=1299.99
)
```

#### 3. `get_user_preferences()`
Retrieves learned user preferences for personalization.

```python
preferences = await self.actions.get_user_preferences(
    user_id="user_456"
)
# Returns: {style: ["modern"], budget: {min: 100, max: 2000}, ...}
```

### Convex Integration

The agent communicates with Convex via HTTP endpoints defined in `convex/http.ts`:

#### Endpoints Used

**1. Log Conversation** (`POST /pipecat/log-conversation`)
```json
{
  "sessionId": "session_123",
  "speaker": "user",
  "text": "I need a laptop",
  "timestamp": 1234567890
}
```

**2. Trigger Research** (`POST /pipecat/trigger-research`)
```json
{
  "query": "gaming laptop",
  "sessionId": "session_123",
  "userId": "user_456",
  "preferences": {
    "maxPrice": 1500,
    "brands": ["Dell", "ASUS"]
  }
}
```

**Authentication:**
All requests include `X-Pipecat-Secret` header for authentication.

### System Prompts (`prompts.py`)

The agent's conversational behavior is defined by system prompts:

- **Main Prompt**: Defines the agent's role, guidelines, and example conversations
- **Clarification Prompt**: Helps agent ask relevant follow-up questions
- **Results Summary**: Formats product results for natural conversation

**Key Guidelines:**
- Be conversational and friendly
- Ask clarifying questions when needed
- Keep responses concise for voice
- Use function calls when appropriate

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

## Integration with Frontend

The frontend (Next.js) connects to the Pipecat agent via WebSocket.

### Frontend Setup

In `app/voice-shopper/page.tsx`, the frontend:

1. **Establishes WebSocket connection:**
```typescript
const ws = new WebSocket(`ws://localhost:8000?sessionId=${sessionId}`);
```

2. **Sends audio data:**
```typescript
// Capture microphone audio
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// Process and send to WebSocket
ws.send(audioData);
```

3. **Receives audio responses:**
```typescript
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Play audio response
    playAudio(event.data);
  }
};
```

### Environment Configuration

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_VOICE_AGENT_URL=ws://localhost:8000
```

For production, change to your deployed voice agent URL:
```env
NEXT_PUBLIC_VOICE_AGENT_URL=wss://voice.yourdomain.com
```

### Testing the Integration

1. **Start the Pipecat agent:**
```bash
cd pipecat
source venv/bin/activate
python agent.py
```

2. **Start the frontend:**
```bash
npm run dev
```

3. **Test voice conversation:**
   - Navigate to http://localhost:3000/voice-shopper
   - Click the microphone button
   - Allow microphone access
   - Speak: "I need a gaming laptop under $1500"
   - The agent should respond and search for products

### Debugging

**Enable verbose logging:**
```python
# In agent.py
logging.basicConfig(level=logging.DEBUG)
```

**Check WebSocket connection:**
```bash
# Terminal 1: Agent logs
python agent.py

# Terminal 2: Test WebSocket
wscat -c ws://localhost:8000?sessionId=test123
```

**Monitor Convex calls:**
- Open Convex Dashboard → Logs
- Watch for HTTP requests from Pipecat
- Check function execution logs

## Development

### Modifying Agent Behavior

**1. Change LLM Model:**
```python
# In agent.py, line 96
llm_service = GoogleLLMService(
    api_key=self.google_api_key,
    model="gemini-1.5-pro",  # Use Pro instead of Flash
)
```

**2. Change Voice:**
```python
# In agent.py, line 102
tts_service = GoogleTTSService(
    api_key=self.google_api_key,
    voice_id="en-US-Neural2-J",  # Male voice
)
```

**3. Add New Custom Action:**

In `actions.py`:
```python
def get_tool_definitions(self) -> List[Dict[str, Any]]:
    return [
        # ... existing tools ...
        {
            "type": "function",
            "function": {
                "name": "compare_prices",
                "description": "Compare prices across retailers",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_name": {"type": "string"}
                    },
                    "required": ["product_name"]
                }
            }
        }
    ]

async def compare_prices(self, session_id: str, user_id: str, product_name: str):
    # Implementation
    pass
```

In `agent.py`:
```python
# Register the new function
llm_service.register_function("compare_prices",
    lambda args: self.actions.compare_prices(session_id, user_id, **args))
```

**4. Customize System Prompt:**

Edit `prompts.py`:
```python
def get_system_prompt() -> str:
    return """You are a helpful shopping assistant specialized in electronics.
    
Your expertise:
- Tech products (laptops, phones, accessories)
- Price comparison and value assessment
- Technical specifications
    
...
"""
```

### Adding Product Search APIs

The current implementation uses mock data in `convex/research.ts`. To integrate real APIs:

1. **Choose API provider:**
   - ✅ Google Gemini API with Search grounding (implemented in background research)
   - Google Shopping API
   - Amazon Product Advertising API
   - RapidAPI (multiple sources)

2. **Update research action:**

In `convex/research.ts`, replace `performProductSearch()`:
```typescript
async function performProductSearch(query: string, preferences?: any) {
  const response = await fetch(
    `https://api.example.com/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SHOPPING_API_KEY}`
      }
    }
  );
  
  const data = await response.json();
  return data.products.map(p => ({
    title: p.name,
    description: p.description,
    imageUrl: p.image,
    productUrl: p.url,
    price: p.price
  }));
}
```

3. **Add API key to Convex environment variables**

4. **Test integration:**
```bash
# From Convex dashboard, run:
npx convex run research:triggerBackgroundResearch --arg query="laptop"
```

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
