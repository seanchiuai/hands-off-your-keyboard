# SerpAPI Setup Instructions

## 1. Get Your Free API Key

1. Go to https://serpapi.com/
2. Sign up for a free account
3. Navigate to your dashboard to find your API key
4. Free tier includes 100 searches/month

## 2. Add to Local Environment

The API key has been added to `.env.local`:

```bash
SERPAPI_KEY=your_actual_api_key_here
```

**Action Required:** Paste your actual SerpAPI key after `SERPAPI_KEY=` in `.env.local`

## 3. Add to Convex Environment Variables

Since the product search runs in Convex actions, you need to add the key to Convex as well:

### Option A: Via Convex Dashboard (Recommended)
1. Open your Convex dashboard: https://dashboard.convex.dev/
2. Select your project: `hands-off-your-keyboard`
3. Go to **Settings** → **Environment Variables**
4. Click **Add Environment Variable**
5. Name: `SERPAPI_KEY`
6. Value: Your SerpAPI key
7. Click **Save**

### Option B: Via CLI
```bash
npx convex env set SERPAPI_KEY your_actual_api_key_here
```

## 4. Verify It Works

After adding the key, test it by:

1. Starting the development server:
   ```bash
   npm run dev
   ```

2. Trigger a product search through the voice agent

3. Check the Convex logs - you should see:
   ```
   [SearchProducts] Using SerpAPI for query: "your query"
   [SearchProducts] Found X products via SerpAPI
   ```

## Current Implementation

SerpAPI is used in two places:
- `convex/research.ts` - Background research triggered by voice agent
- `convex/actions/searchProducts.ts` - Direct product searches

Both have automatic fallback to mock data if SerpAPI is unavailable.
