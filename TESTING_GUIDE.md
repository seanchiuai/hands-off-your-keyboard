# Testing Guide - Voice Shopping Assistant

This guide walks you through testing the actual implementation step by step.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Convex account and deployment
- Clerk account and setup
- Google Gemini API key
- (Optional) SerpAPI key for real product search

---

## Step 1: Backend Setup (Convex)

### 1.1 Deploy Convex

```bash
npx convex dev
```

This should:
- Create `.env.local` with `NEXT_PUBLIC_CONVEX_URL`
- Deploy your schema and functions
- Open the Convex dashboard

### 1.2 Configure Environment Variables in Convex Dashboard

Go to Settings → Environment Variables and add:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
PIPECAT_SERVER_SECRET=your_secure_secret_here
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
SERPAPI_KEY=your_serpapi_key_here (optional)
```

### 1.3 Verify Convex Functions

```bash
# Test a query
npx convex run queries:list

# Should return empty array or existing data
```

---

## Step 2: Frontend Setup (Next.js)

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Configure .env.local

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_VOICE_AGENT_URL=ws://localhost:8000
```

### 2.3 Test Frontend (Without Voice)

```bash
npm run dev
```

Visit:
- http://localhost:3000 - Should load
- http://localhost:3000/research - Should show search interface
- http://localhost:3000/voice-shopper - Should show voice interface (voice won't work yet)

**What to Test:**
- ✅ Authentication works (sign up/sign in)
- ✅ Research page loads
- ✅ Can create a search query
- ✅ Products display (will be mock data unless SERPAPI_KEY set)
- ✅ Can save products
- ✅ Saved items show in "Saved Items" tab

---

## Step 3: Voice Agent Setup (Pipecat)

### 3.1 Install Python Dependencies

```bash
cd pipecat
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3.2 Configure Pipecat .env

Create `pipecat/.env`:

```env
GOOGLE_API_KEY=your_gemini_key_here
CONVEX_HTTP_URL=https://your-project.convex.cloud
PIPECAT_SERVER_SECRET=same_secret_as_convex
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

### 3.3 Test Pipecat Agent

**Terminal 1: Start the Agent**
```bash
cd pipecat
source venv/bin/activate
python agent.py
```

You should see:
```
=== Voice Shopper Agent ===
Initializing Pipecat voice agent...
Configuration validated successfully
Starting Voice Shopper Agent server on 0.0.0.0:8000
Convex backend: https://your-project.convex.cloud
Server is running! Connect WebSocket clients to ws://0.0.0.0:8000
```

**Terminal 2: Test Connection**
```bash
cd pipecat
python test_agent.py
```

You should see:
```
==================================================
Testing Pipecat Voice Agent
==================================================

Connecting to ws://localhost:8000?sessionId=test_123&userId=test_user...
✅ Connected successfully!
📤 Sent: {"type": "text", "data": {"text": "Hello, can you hear me?"}}
📥 Received: ...
✅ Agent responded!

==================================================
Test complete!
==================================================
```

---

## Step 4: End-to-End Voice Testing

### 4.1 Start All Services

**Terminal 1: Convex (if not already running)**
```bash
npx convex dev
```

**Terminal 2: Pipecat Agent**
```bash
cd pipecat
source venv/bin/activate
python agent.py
```

**Terminal 3: Next.js Frontend**
```bash
npm run dev
```

### 4.2 Test Voice Shopping

1. **Open Browser**: http://localhost:3000/voice-shopper
2. **Sign In**: Use Clerk authentication
3. **Start Session**: Click the microphone button
4. **Grant Permissions**: Allow microphone access when prompted
5. **Test Conversation**:
   - Speak: "I need a gaming laptop"
   - Agent should respond and ask clarifying questions
   - Speak: "Under $1500"
   - Agent should search for products
   - Products should appear in the UI

### 4.3 Expected Behavior

**Voice Input**: ✅ Should capture your voice
**WebSocket Connection**: ✅ Should show "Voice agent connected!" toast
**Agent Status**: ✅ Should show "Listening..." / "Thinking..." / "Speaking..."
**Audio Response**: ⚠️ May or may not work (depends on audio format compatibility)
**Product Search**: ✅ Should trigger and show results
**Save Functionality**: ✅ Should save products to your list

---

## Step 5: Verify Each Feature

### Feature 1: Interactive UI ✅
- **Test**: Browse research page, view products
- **Expected**: Products display in cards with images, prices, descriptions
- **Status**: Should work completely

### Feature 2: List Saving ✅
- **Test**: Click "Save" on a product, check "Saved Items" tab
- **Expected**: Product appears in saved items
- **Status**: Should work completely

### Feature 3: Preference Memory ✅
- **Test**: Save multiple products, interact with the system
- **Expected**: Preferences are tracked in database
- **Verify**: Check Convex dashboard → Data → interaction_signals
- **Status**: Should work completely

### Feature 4: Background Research ⚠️
- **Test**: Search for "laptop" in research page
- **Expected**: 
  - Without SERPAPI_KEY: Shows mock products
  - With SERPAPI_KEY: Shows real Google Shopping results
- **Status**: Works with mock data, real API requires key

### Feature 5: Voice Agent ⚠️
- **Test**: Voice conversation end-to-end
- **Expected**: 
  - WebSocket connects ✅
  - Audio is captured ✅
  - Gemini processes text ⚠️ (needs testing)
  - TTS audio plays ⚠️ (may have format issues)
- **Status**: Partially working, needs verification

### Feature 6: Gemini + Pipecat Integration ⚠️
- **Test**: Complete voice interaction with function calls
- **Expected**:
  - Voice → Text → Gemini → Response → Voice ⚠️
  - Function calls trigger product search ⚠️
  - Results sync to frontend ✅
- **Status**: Architecture correct, needs end-to-end testing

---

## Known Issues and Workarounds

### Issue 1: Audio Format Compatibility

**Problem**: Frontend sends Int16 PCM, Pipecat may expect different format

**Workaround**: 
- Test with simple WebSocket messages first (text-based)
- Verify Pipecat logs show received data
- May need to adjust audio encoding

### Issue 2: No Audio Output

**Problem**: Agent processes voice but no audio response plays

**Workaround**:
- Check browser console for audio decoding errors
- Verify audio context is initialized
- May need to adjust TTS output format

### Issue 3: Session Not Tracked

**Problem**: Sessions don't show in Convex database

**Workaround**:
- Verify `PIPECAT_SERVER_SECRET` matches between Pipecat and Convex
- Check Convex dashboard logs for HTTP endpoint calls
- Ensure WebSocket URL includes sessionId and userId

---

## Debugging Checklist

### Voice Agent Not Starting
- [ ] Python dependencies installed?
- [ ] `.env` file configured in `pipecat/`?
- [ ] `GOOGLE_API_KEY` valid?
- [ ] Port 8000 available?

### WebSocket Won't Connect
- [ ] Pipecat agent running?
- [ ] Correct URL in `.env.local`?
- [ ] Firewall blocking port 8000?
- [ ] Check browser console for errors

### No Audio Response
- [ ] Microphone permissions granted?
- [ ] Audio context initialized?
- [ ] Check browser console for audio errors
- [ ] Try different browser (Chrome recommended)

### Products Not Showing
- [ ] Convex deployed?
- [ ] Environment variables set in Convex?
- [ ] Check Convex dashboard logs
- [ ] Research action completing successfully?

### Function Calls Not Working
- [ ] `PIPECAT_SERVER_SECRET` matches?
- [ ] HTTP endpoints accessible?
- [ ] Check Pipecat logs for HTTP requests
- [ ] Check Convex logs for incoming requests

---

## Success Criteria

### Minimum Working State (Core Features)
- [x] UI displays and is interactive
- [x] Can save products to list
- [x] Preferences are tracked
- [ ] Voice WebSocket connects
- [ ] Can speak and agent responds (even if just text)
- [ ] Product search triggers from voice

### Full Working State (All Features)
- [ ] Voice conversation works end-to-end
- [ ] Audio input and output working
- [ ] Real-time voice interaction smooth
- [ ] Product search from voice commands
- [ ] Save products via voice
- [ ] Preferences learned from interactions

---

## Next Steps After Testing

1. **If Core Features Work**:
   - Document what works and what doesn't
   - Fix audio format issues
   - Improve error handling

2. **If Voice Doesn't Work**:
   - Isolate issue (WebSocket, audio, Pipecat, Gemini)
   - Test with simpler Pipecat example
   - Consider alternative audio libraries

3. **To Add Real Product Search**:
   - Get SerpAPI key (https://serpapi.com/)
   - Add `SERPAPI_KEY` to Convex environment
   - Test with real searches
   - Monitor API usage and costs

---

## Support

If you encounter issues:
1. Check logs in all three terminals
2. Review browser console
3. Check Convex dashboard logs
4. Verify all environment variables
5. Test each component individually

**Remember**: The architecture is sound, but some components may need fine-tuning for your specific environment.

