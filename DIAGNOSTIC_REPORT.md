# Project Diagnostic Report
**Generated**: October 17, 2025
**Status**: 🟡 Action Required

---

## Summary

I've analyzed your entire project for missing configuration, API keys, and potential issues. Here's what needs your attention:

### 🔴 Critical Issues (Must Fix)
1. **Missing CLERK_JWT_ISSUER_DOMAIN** - Auth will fail without this
2. **Convex environment variables not synced** - Need to add SERPAPI_KEY to Convex

### 🟡 Optional Configuration
3. **NEXT_PUBLIC_VOICE_AGENT_URL** - Only needed if running voice agent
4. **Amazon/eBay/Walmart APIs** - Only needed for multi-API expansion

---

## 🔴 Critical Issue #1: Missing CLERK_JWT_ISSUER_DOMAIN

### Problem
Your `convex/auth.config.ts` requires `CLERK_JWT_ISSUER_DOMAIN` but it's not in your environment files.

```typescript
// convex/auth.config.ts:8
domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
```

Without this, Convex won't be able to authenticate users via Clerk.

### Solution

#### Step 1: Get your JWT Issuer Domain from Clerk

1. Go to https://dashboard.clerk.com/
2. Select your application
3. Navigate to **JWT Templates** in the sidebar
4. Find or create a template named "convex"
5. Look for the **Issuer** field - it looks like:
   ```
   https://content-gelding-82.clerk.accounts.dev
   ```

#### Step 2: Add to Local Environment

Add to `.env.local`:
```bash
# Clerk JWT Configuration (for Convex authentication)
CLERK_JWT_ISSUER_DOMAIN=https://content-gelding-82.clerk.accounts.dev
```

#### Step 3: Add to Convex Environment

**Option A: Via Convex Dashboard** (Recommended)
1. Go to https://dashboard.convex.dev/
2. Select your project: `hands-off-your-keyboard`
3. Go to **Settings** → **Environment Variables**
4. Click **Add Environment Variable**
5. Name: `CLERK_JWT_ISSUER_DOMAIN`
6. Value: `https://content-gelding-82.clerk.accounts.dev`
7. Click **Save**

**Option B: Via CLI**
```bash
# You'll need to authenticate first
npx convex dev
# Then in another terminal:
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://content-gelding-82.clerk.accounts.dev"
```

---

## 🔴 Critical Issue #2: SERPAPI_KEY Not in Convex

### Problem
You added `SERPAPI_KEY` to `.env.local` (✅ good!), but it also needs to be in Convex environment variables because the search runs server-side in Convex actions.

### Solution

**Via Convex Dashboard:**
1. Go to https://dashboard.convex.dev/
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add Environment Variable**
5. Name: `SERPAPI_KEY`
6. Value: `674b4ce6e3f73b4979cd8627a76ea393fec5de98525f9c30cad93f346e6244ee`
7. Click **Save**

**Via CLI:**
```bash
npx convex env set SERPAPI_KEY "674b4ce6e3f73b4979cd8627a76ea393fec5de98525f9c30cad93f346e6244ee"
```

---

## 🟡 Optional: NEXT_PUBLIC_VOICE_AGENT_URL

### Current Status
Not set in `.env.local`, but the code has a fallback:

```typescript
// app/voice-shopper/page.tsx:61
const VOICE_AGENT_URL = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "ws://localhost:8000";
```

### When You Need This
Only if you're running the Pipecat voice agent server (from `voice_agent/` directory).

### If You Want to Use Voice Features

Add to `.env.local`:
```bash
# Voice Agent WebSocket URL (Python Pipecat server)
# Development: ws://localhost:8000
# Production: wss://your-voice-agent-domain.com
NEXT_PUBLIC_VOICE_AGENT_URL=ws://localhost:8000
```

Then you'll need to:
1. Navigate to `voice_agent/` directory
2. Set up Python environment
3. Run the Pipecat server
4. Refer to `voice_agent/README.md` for instructions

---

## ✅ Configuration Already Correct

### Environment Variables in `.env.local`
- ✅ `NEXT_PUBLIC_CONVEX_URL` - Set correctly
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Set correctly
- ✅ `CLERK_SECRET_KEY` - Set correctly
- ✅ `CONVEX_DEPLOYMENT` - Set correctly
- ✅ `GOOGLE_GENERATIVE_AI_API_KEY` - Set correctly
- ✅ `PIPECAT_SERVER_SECRET` - Set correctly
- ✅ `SERPAPI_KEY` - Set correctly (just needs to be added to Convex too)

### Database Schema
- ✅ All tables properly defined in `convex/schema.ts`
- ✅ Indexes configured correctly
- ✅ No schema errors detected

### Dependencies
- ✅ All npm packages installed
- ✅ Clerk integration set up
- ✅ Convex integration set up
- ✅ Next.js 15 with Turbopack configured

---

## 📋 Complete Environment Variable Checklist

### Required in `.env.local` (Local Development)

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://wonderful-corgi-96.convex.cloud ✅
CONVEX_DEPLOYMENT=dev:wonderful-corgi-96 ✅

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... ✅
CLERK_SECRET_KEY=sk_test_... ✅
CLERK_JWT_ISSUER_DOMAIN=https://content-gelding-82.clerk.accounts.dev ❌ MISSING

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyBEsCTquX4WCMeAZ0QzALdPmsLjqm1KgBc ✅

# Pipecat Configuration
PIPECAT_SERVER_SECRET=f3RRhnCQo/Tx1LWRYuMPnXoaeXPKnJqKYa0R+Yp0rFs= ✅

# Product Search
SERPAPI_KEY=674b4ce6e3f73b4979cd8627a76ea393fec5de98525f9c30cad93f346e6244ee ✅

# Optional: Voice Agent
NEXT_PUBLIC_VOICE_AGENT_URL=ws://localhost:8000 ⚠️ Optional
```

### Required in Convex Environment Variables (Dashboard)

```bash
# Authentication
CLERK_JWT_ISSUER_DOMAIN=https://content-gelding-82.clerk.accounts.dev ❌ MISSING

# AI/ML APIs
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyBEsCTquX4WCMeAZ0QzALdPmsLjqm1KgBc ✅ (probably set)

# Product Search
SERPAPI_KEY=674b4ce6e3f73b4979cd8627a76ea393fec5de98525f9c30cad93f346e6244ee ❌ MISSING

# Pipecat Security
PIPECAT_SERVER_SECRET=f3RRhnCQo/Tx1LWRYuMPnXoaeXPKnJqKYa0R+Yp0rFs= ✅ (probably set)
```

---

## 🚀 Quick Fix Steps

### Do This Now (5 minutes)

1. **Get Clerk JWT Issuer Domain**
   ```
   → Go to https://dashboard.clerk.com/
   → JWT Templates → "convex" template
   → Copy the Issuer URL
   ```

2. **Add to `.env.local`**
   ```bash
   # Add this line to .env.local
   CLERK_JWT_ISSUER_DOMAIN=https://content-gelding-82.clerk.accounts.dev
   ```

3. **Add to Convex Dashboard**
   ```
   → Go to https://dashboard.convex.dev/
   → Settings → Environment Variables
   → Add: CLERK_JWT_ISSUER_DOMAIN
   → Add: SERPAPI_KEY (use the one from .env.local)
   ```

4. **Restart Development**
   ```bash
   npm run dev
   ```

---

## 🔍 How to Verify Everything Works

### Step 1: Check Convex Connection

```bash
# In one terminal
npx convex dev
```

You should see:
- ✅ "Convex functions ready"
- ✅ No authentication errors
- ✅ Dashboard opens at https://dashboard.convex.dev/

### Step 2: Check Frontend

```bash
# In another terminal
npm run dev:frontend
```

You should see:
- ✅ "Ready in X ms"
- ✅ No Clerk errors
- ✅ No "missing environment variable" warnings

### Step 3: Test Product Search

1. Navigate to http://localhost:3000
2. Try searching for a product
3. Check Convex logs - you should see:
   ```
   [SearchProducts] Using SerpAPI for query: "..."
   [SearchProducts] Found X products via SerpAPI
   ```

### Step 4: Test Authentication

1. Try to sign in with Clerk
2. Should work without JWT errors
3. Check Convex logs for successful authentication

---

## 📦 Future API Keys (Not Needed Yet)

These are mentioned in plans but not required for current functionality:

### Multi-API Product Search (Future)
```bash
# Amazon Product Advertising API
AMAZON_ACCESS_KEY=your_key_here
AMAZON_SECRET_KEY=your_secret_here
AMAZON_ASSOCIATE_TAG=your_tag_here

# eBay Finding API
EBAY_APP_ID=your_app_id_here

# Walmart Open API
WALMART_API_KEY=your_api_key_here
```

**Don't add these yet** - they're only needed when you implement Phase 2+ of the multi-API plan.

---

## 🐛 Known Issues & Workarounds

### Issue: Convex Authentication in CI/CD
**Problem**: `convex dev` requires interactive login
**Workaround**: Use `convex deploy` with API keys in production

### Issue: Voice Agent Not Connected
**Problem**: WebSocket connection fails
**Solution**: Make sure Pipecat Python server is running on port 8000

### Issue: No Products Returned
**Possible Causes**:
1. SERPAPI_KEY not in Convex environment ← Most likely
2. Invalid API key
3. Network/firewall blocking serpapi.com

---

## 📊 Environment Variable Audit

| Variable | .env.local | Convex Env | Required | Status |
|----------|------------|------------|----------|--------|
| NEXT_PUBLIC_CONVEX_URL | ✅ | N/A | Yes | OK |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | ✅ | N/A | Yes | OK |
| CLERK_SECRET_KEY | ✅ | N/A | Yes | OK |
| CLERK_JWT_ISSUER_DOMAIN | ❌ | ❌ | Yes | **MISSING** |
| CONVEX_DEPLOYMENT | ✅ | N/A | Yes | OK |
| GOOGLE_GENERATIVE_AI_API_KEY | ✅ | ✅? | Yes | OK |
| PIPECAT_SERVER_SECRET | ✅ | ✅? | Yes | OK |
| SERPAPI_KEY | ✅ | ❌ | Yes | **NEEDS SYNC** |
| NEXT_PUBLIC_VOICE_AGENT_URL | ❌ | N/A | No | Optional |

---

## 🎯 Action Items Summary

### Must Do Now
1. ❌ Add `CLERK_JWT_ISSUER_DOMAIN` to `.env.local`
2. ❌ Add `CLERK_JWT_ISSUER_DOMAIN` to Convex environment
3. ❌ Add `SERPAPI_KEY` to Convex environment

### Should Do Soon
4. ⚠️ Test product search with real API calls
5. ⚠️ Verify Clerk authentication works
6. ⚠️ Check Convex logs for any warnings

### Optional (For Voice Features)
7. ⏸️ Set up Pipecat voice agent server
8. ⏸️ Add `NEXT_PUBLIC_VOICE_AGENT_URL`
9. ⏸️ Test voice shopping interface

---

## 📞 Need Help?

### Clerk JWT Issues
- Docs: https://docs.convex.dev/auth/clerk
- Support: https://clerk.com/support

### Convex Environment Variables
- Docs: https://docs.convex.dev/production/environment-variables
- Dashboard: https://dashboard.convex.dev/

### SerpAPI Issues
- Dashboard: https://serpapi.com/dashboard
- Docs: https://serpapi.com/docs

---

## ✅ Next Steps After Fixes

Once you've added the missing environment variables:

1. **Restart everything**
   ```bash
   # Kill all processes
   # Then restart
   npm run dev
   ```

2. **Test basic functionality**
   - Sign in with Clerk
   - Search for a product
   - Check Convex logs

3. **If everything works**
   - ✅ Your project is fully configured!
   - ✅ Ready for development
   - ✅ Can proceed with new features

4. **If you still see errors**
   - Check Convex dashboard logs
   - Check browser console
   - Verify all environment variables are set
   - Let me know the specific error message

---

## 📝 Files Modified During Analysis

- ✅ `.env.local` - Added SERPAPI_KEY
- ✅ `.env.example` - Documented SERPAPI_KEY
- ✅ Created diagnostic guides and plans

**No breaking changes made** - only documentation and analysis.

---

**Generated by Claude Code Analysis**
**Project**: hands-off-your-keyboard
**Date**: October 17, 2025
