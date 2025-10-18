# Voice Agent Setup Guide - Fix Microphone Issue

## 🎤 Why Your Microphone Isn't Working

The voice shopping feature requires a **separate Python server** (Pipecat voice agent) to be running. This server processes the audio, talks to Google Gemini AI, and sends responses back.

**Current status:** The Pipecat server is NOT running, so the microphone can't connect.

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Install Python Dependencies

```bash
# Navigate to voice_agent directory
cd voice_agent

# Create virtual environment (if not already created)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Mac/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

**What this does:** Installs Pipecat AI and all required voice processing libraries.

---

### Step 2: Verify Environment Variables

I've already updated `voice_agent/.env` with your configuration:

```env
GOOGLE_API_KEY=AIzaSyBEsCTquX4WCMeAZ0QzALdPmsLjqm1KgBc
CONVEX_HTTP_URL=https://wonderful-corgi-96.convex.cloud
PIPECAT_SERVER_SECRET=f3RRhnCQo/Tx1LWRYuMPnXoaeXPKnJqKYa0R+Yp0rFs=
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

All values are synced with your main `.env.local` file ✅

---

### Step 3: Start the Voice Agent Server

```bash
# Make sure you're in voice_agent directory and venv is activated
python agent.py
```

**Expected output:**
```
=== Voice Shopper Agent ===
Initializing Pipecat voice agent...
Configuration validated successfully
Starting Voice Shopper Agent server on 0.0.0.0:8000
Convex backend: https://wonderful-corgi-96.convex.cloud
Server is running! Connect WebSocket clients to ws://0.0.0.0:8000
```

**Keep this terminal open** - the server needs to stay running!

---

### Step 4: Test the Microphone

1. **Make sure the voice agent is running** (Step 3)
2. **In a NEW terminal**, start your Next.js frontend:
   ```bash
   cd /Users/rishabhbansal/Documents/GitHub/hands-off-your-keyboard
   npm run dev
   ```
3. **Open browser**: http://localhost:3000/voice-shopper
4. **Click the microphone button**
5. **Allow microphone access** when prompted
6. **Start talking!** Say something like: "I'm looking for a laptop under $1000"

**Expected result:**
- Microphone button turns active
- Your speech is transcribed
- AI responds with voice
- Products appear on the right side

---

## 🔧 Complete Architecture

```
┌─────────────────┐
│  Browser (You)  │
│  Microphone 🎤  │
└────────┬────────┘
         │ Audio Stream
         ↓
┌─────────────────────────────────┐
│  Next.js Frontend               │
│  http://localhost:3000          │
│  /voice-shopper page            │
└────────┬────────────────────────┘
         │ WebSocket
         │ ws://localhost:8000
         ↓
┌─────────────────────────────────┐
│  Pipecat Voice Agent (Python)   │
│  voice_agent/agent.py           │
│  Port: 8000                     │
│                                 │
│  Components:                    │
│  - Voice Activity Detection     │
│  - Speech-to-Text               │
│  - Google Gemini AI             │
│  - Text-to-Speech               │
└────────┬────────────────────────┘
         │ HTTP Requests
         │ /pipecat/trigger-research
         ↓
┌─────────────────────────────────┐
│  Convex Backend                 │
│  https://wonderful-corgi-96...  │
│                                 │
│  - Product search (SerpAPI)     │
│  - Database storage             │
│  - User preferences             │
└─────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'pipecat'"

**Solution:**
```bash
cd voice_agent
source venv/bin/activate
pip install -r requirements.txt
```

### Error: "Connection refused" in browser

**Solution:**
- Make sure `python agent.py` is running
- Check that it says "Server is running" in the terminal
- Verify it's listening on port 8000

### Error: "Invalid API key" from Gemini

**Solution:**
Your Google API key looks correct, but if it fails:
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Update `voice_agent/.env` with the new key
4. Restart `python agent.py`

### Microphone permission denied

**Solution:**
- Click the 🔒 icon in your browser's address bar
- Allow microphone access
- Refresh the page
- Try again

### Voice agent connects but no audio response

**Solution:**
- Check browser console (F12) for errors
- Verify your speakers/headphones are working
- Check volume isn't muted
- Try a different browser (Chrome recommended)

### "PIPECAT_SERVER_SECRET mismatch" error

**Solution:**
The secrets must match in 3 places:
1. `voice_agent/.env` ✅ (I already fixed this)
2. Main `.env.local` ✅ (Already correct)
3. Convex environment variables (check Convex dashboard)

---

## 📊 Running Both Servers Together

You'll need **2 terminal windows**:

### Terminal 1: Pipecat Voice Agent
```bash
cd voice_agent
source venv/bin/activate
python agent.py

# Should see: "Server is running!"
# Keep this running
```

### Terminal 2: Next.js Frontend
```bash
cd /Users/rishabhbansal/Documents/GitHub/hands-off-your-keyboard
npm run dev

# Should see: "Ready in X ms"
# Keep this running too
```

Then open: http://localhost:3000/voice-shopper

---

## 🎯 Testing Checklist

After starting both servers:

- [ ] Pipecat agent shows "Server is running!"
- [ ] Next.js shows "Ready" at http://localhost:3000
- [ ] Can navigate to /voice-shopper page
- [ ] Microphone button is visible
- [ ] Clicking mic asks for permission
- [ ] After allowing, mic button turns active
- [ ] Speaking shows transcription in conversation
- [ ] AI responds with voice
- [ ] Products appear when you ask for them
- [ ] Can save products to favorites

---

## 💡 Quick Voice Testing Commands

Try saying these to test the system:

1. **Basic search:**
   - "I'm looking for a laptop"
   - "Show me wireless headphones"
   - "Find gaming keyboards"

2. **With filters:**
   - "I need a laptop under $1000"
   - "Show me headphones between $100 and $300"
   - "Find Nike running shoes"

3. **Saving items:**
   - "Save the second one"
   - "Add that to my favorites"
   - "Remember this product"

---

## 🚀 Production Deployment (Future)

When you're ready to deploy:

1. **Deploy Pipecat agent** to a cloud server (AWS, GCP, etc.)
2. **Get SSL certificate** for secure WebSocket (wss://)
3. **Update frontend .env:**
   ```env
   NEXT_PUBLIC_VOICE_AGENT_URL=wss://voice.yourdomain.com
   ```
4. **Configure firewall** to allow WebSocket connections on port 8000
5. **Use process manager** (PM2, systemd) to keep agent running

---

## 📚 Additional Resources

- **Pipecat Documentation**: https://docs.pipecat.ai/
- **Google Gemini API**: https://ai.google.dev/
- **Voice Agent README**: `voice_agent/README.md` (detailed architecture)
- **WebSocket Testing**: Use `wscat -c ws://localhost:8000` to test connection

---

## 🎉 Summary

**Before:** Microphone not working ❌

**After these steps:**
1. Install Python dependencies ✅
2. Environment variables configured ✅
3. Start voice agent server ✅
4. Start Next.js frontend ✅
5. Microphone working with AI voice shopping! ✅

**Time required:** ~5 minutes
**Difficulty:** Easy (just follow the steps)

---

_Created: October 17, 2025_
_Status: Ready to use!_
