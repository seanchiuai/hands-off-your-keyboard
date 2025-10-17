# Preference Memory Feature - Complete Implementation Guide

## Overview

The Preference Memory feature automatically learns and stores user preferences for personalized shopping recommendations. It uses Convex for real-time data storage and Google Gemini for LLM-based preference learning.

**Tech Stack**: Next.js, Convex, Google Gemini

**Core Functionality**:
- Automatic learning from user behavior and interactions
- Manual preference editing by users
- Real-time personalized search and recommendations
- Voice query analysis for preference extraction
- Activity tracking and statistics

---

## Implementation Plan

### 1. Manual Setup (User Required)
- [ ] Create Convex project via `npx convex dev` (first time will prompt for GitHub login and project creation)
- [ ] Configure Convex dashboard for project overview
- [ ] Generate Convex deploy key (if manual deployments needed, though `npx convex deploy` handles this)
- [ ] Set up Convex authentication provider (e.g., Clerk or Auth0) dashboard configuration
- [ ] Configure Convex billing (understand Free/Starter plan limits vs. usage-based Professional plan)

### 2. Dependencies & Environment
- [ ] Install: `convex`, `react`, `react-dom`, `next`, `@convex-dev/react`, `@convex-dev/auth`, `@ai-sdk/google` (for Gemini LLM interaction)
- [ ] Env vars: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_AUTH_CLIENT_ID`, `CONVEX_AUTH_DOMAIN` (for Auth0/Clerk), `GOOGLE_GENERATIVE_AI_API_KEY` (for Gemini)

### 3. Database Schema
- [ ] Structure:
    ```typescript
    // convex/schema.ts
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      preference_users: defineTable({
        clerkUserId: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
      .index("by_clerk_id", ["clerkUserId"]),

      user_preferences: defineTable({
        userId: v.id("preference_users"),
        style: v.array(v.string()), // e.g., ["minimalist", "boho"]
        budget: v.optional(v.object({
          min: v.number(),
          max: v.number(),
        })),
        size: v.array(v.string()), // e.g., ["L", "XL"]
        categories: v.array(v.string()), // e.g., ["furniture", "electronics"]
        brands: v.array(v.string()), // e.g., ["IKEA", "Wayfair"]
        colors: v.array(v.string()), // e.g., ["blue", "white"]
        lastUpdated: v.number(),
      })
      .index("by_user_id", ["userId"]),

      saved_items: defineTable({
        userId: v.id("preference_users"),
        productId: v.string(), // External product ID
        productName: v.string(),
        productUrl: v.string(),
        imageUrl: v.string(),
        summary: v.string(),
        savedAt: v.number(),
        // Extracted preferences from saved item
        implicitStyle: v.optional(v.array(v.string())),
        implicitBudget: v.optional(v.number()),
      })
      .index("by_user_id", ["userId"])
      .index("by_user_and_product", ["userId", "productId"]),

      interaction_signals: defineTable({
        userId: v.id("preference_users"),
        type: v.union(
          v.literal("view"),
          v.literal("click"),
          v.literal("save"),
          v.literal("purchase"),
          v.literal("dislike"),
          v.literal("voice_query")
        ),
        itemId: v.optional(v.string()), // Product ID, if applicable
        category: v.optional(v.string()),
        queryText: v.optional(v.string()), // The user's voice query
        timestamp: v.number(),
        // LLM analysis of interaction
        extractedKeywords: v.optional(v.array(v.string())),
      })
      .index("by_user_id", ["userId"])
      .index("by_user_and_timestamp", ["userId", "timestamp"]),
    });
    ```

### 4. Backend Functions
- [ ] Functions:
    - `preference_users.getOrCreateUser`: Mutation to find or create a user document on first login, including initial empty preferences
    - `user_preferences.getUserPreferences`: Query to fetch the authenticated user's preference profile
    - `user_preferences.updateUserPreferences`: Mutation to explicitly update user preferences (e.g., from an "Edit Profile" page)
    - `saved_items.saveItem`: Mutation to record a product saved by the user. Includes extracting implicit preferences from the item's attributes
    - `saved_items.getSavedItems`: Query to fetch a user's saved items
    - `interaction_signals.logInteraction`: Mutation to log user interactions (view, click, save, purchase, dislike, voice queries)
    - `preference_learning.processSignalsAndUpdatePreferences`: **Action** (scheduled or triggered) to asynchronously process recent `interaction_signals` and `saved_items` for a user. This action will call the Gemini LLM via `@ai-sdk/google` to extract and refine preferences, then use a mutation to update `user_preferences`
    - `personalized_search.getRecommendations`: Query (or Action for external API calls) that uses `user_preferences` to inform product search parameters

### 5. Frontend
- [ ] Components:
    - `ConvexClientProvider`: Wraps the Next.js app to provide Convex context and authentication
    - `UserProfileDisplay`: React Client Component to display current preferences using `useQuery(api.user_preferences.getUserPreferences)`
    - `PreferenceEditor`: React Client Component for users to manually edit their preference profile, triggering `useMutation(api.user_preferences.updateUserPreferences)`
    - `ProductCarouselItem`: Displays product details, including a "Save" button that triggers `useMutation(api.saved_items.saveItem)` and `useMutation(api.interaction_signals.logInteraction)`
    - `VoiceAgent`: Interacts with Pipecat and Gemini, passing user queries to Convex actions (e.g., `api.interaction_signals.logInteraction` for the query itself, and potentially `api.personalized_search.getRecommendations`)
- [ ] State: Utilize Convex's reactive queries (`useQuery`) to automatically update UI components when underlying data (user preferences, saved items) changes in the database. Avoid redundant client-side state for data managed by Convex

### 6. Error Prevention
- [ ] API errors: Implement `try/catch` blocks in Convex functions and client-side mutation calls
- [ ] Validation: Use `v.string()`, `v.number()`, `v.array()`, `v.object()` for schema validation. Implement additional input validation in mutation arguments
- [ ] Rate limiting: Apply rate limiting to key public mutations (e.g., `saveItem`, `logInteraction`) to prevent abuse
- [ ] Auth: Ensure all sensitive queries and mutations check `ctx.auth.getUserIdentity()` to verify user identity and authorization
- [ ] Type safety: Leverage TypeScript for end-to-end type safety (Convex generates types from schema and functions)
- [ ] Boundaries: Use indexes (`.index()`) for efficient data retrieval to avoid fetching and filtering large datasets in memory. Limit the scope of data loaded by queries

---

## Implementation Details

### Features Implemented

#### Backend (Convex)

**1. Database Schema** (`convex/schema.ts`)
- `preference_users`: User profiles linked to Clerk authentication
- `user_preferences`: Structured preference storage (style, budget, size, categories, brands, colors)
- `interaction_signals`: User behavior tracking (views, clicks, saves, purchases, voice queries)
- Integration with existing `saved_items` table for preference extraction

**2. User Management** (`convex/preferenceUsers.ts`)
- `getOrCreateUser`: Create or update user profile
- `getUserByClerkId`: Fetch user by Clerk ID
- `getCurrentUser`: Get authenticated user
- `updateUserInfo`: Internal user info updates

**3. Preference CRUD** (`convex/userPreferences.ts`)
- `getUserPreferences`: Query user preferences
- `getPreferencesByUserId`: Get preferences by user ID
- `updateUserPreferences`: Manual preference updates
- `internalUpdatePreferences`: System-driven preference updates (for LLM)
- `resetPreferences`: Clear all preferences

**4. Saved Items Management** (`convex/preferenceItemsManagement.ts`)
- `saveItemForPreferences`: Save items with preference extraction
- `getSavedItems`: Retrieve saved items
- `removeSavedItem`: Remove saved items (logs as dislike)
- `getSavedItemsCount`: Get count of saved items

**5. Interaction Logging** (`convex/interactionSignals.ts`)
- `logInteraction`: Track user interactions
- `getRecentInteractions`: Fetch recent interactions
- `getInteractionsInTimeWindow`: Internal query for learning
- `getVoiceQueryHistory`: Get voice query history
- `getInteractionStats`: Activity statistics
- `cleanupOldInteractions`: Privacy/cleanup utility

**6. LLM-Based Learning** (`convex/preferenceLearning.ts`)
- `processSignalsAndUpdatePreferences`: Analyze interactions with Gemini
- `triggerPreferenceLearning`: User-triggered preference update
- `analyzeVoiceQuery`: Real-time voice query analysis

**7. Personalized Search** (`convex/personalizedSearch.ts`)
- `getSearchPreferences`: Fetch user preferences for search
- `enhanceSearchQuery`: Add preference keywords to queries
- `getRecommendations`: Generate personalized recommendations
- `scoreProducts`: Rank products by preference match
- `getTrendingCategories`: Show trending user categories

#### Frontend (React Components)

**1. UserProfileDisplay** (`components/UserProfileDisplay.tsx`)
- Display user preferences with visual badges
- Show activity statistics
- Display trending categories
- Trigger preference learning

**2. PreferenceEditor** (`components/PreferenceEditor.tsx`)
- Edit all preference fields
- Add/remove style, size, category, brand, color preferences
- Set budget range
- Real-time validation and saving

---

## Setup Guide

### 1. Environment Variables

Add to your `.env.local` file:

```bash
# Google Gemini API Key (required for preference learning)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

**Get your API key:**
1. Visit https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy and paste into `.env.local`

### 2. Convex Deployment

The schema has been updated with new tables. Deploy the changes:

```bash
npx convex dev
```

This will:
- Create new database tables
- Deploy all Convex functions
- Generate TypeScript types

### 3. Initialize User Preferences

When a user first logs in with Clerk, you need to initialize their preference profile:

```typescript
// In your app's authentication handler
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const getOrCreateUser = useMutation(api.preferenceUsers.getOrCreateUser);

// Call when user authenticates
await getOrCreateUser({
  clerkUserId: user.id,
  name: user.fullName,
  email: user.primaryEmailAddress?.emailAddress,
  imageUrl: user.imageUrl,
});
```

---

## Usage Examples

### 1. Display User Profile

```typescript
import { UserProfileDisplay } from "@/components/UserProfileDisplay";

export default function ProfilePage() {
  return (
    <UserProfileDisplay
      onEditClick={() => {
        // Navigate to edit page or open dialog
      }}
      onLearnClick={async () => {
        // Trigger preference learning
        await triggerPreferenceLearning();
      }}
    />
  );
}
```

### 2. Edit Preferences

```typescript
import { PreferenceEditor } from "@/components/PreferenceEditor";

export default function EditPreferencesPage() {
  return (
    <PreferenceEditor
      onSave={() => {
        // Handle successful save (e.g., navigate back)
      }}
      onCancel={() => {
        // Handle cancel (e.g., navigate back)
      }}
    />
  );
}
```

### 3. Log User Interactions

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function ProductCard({ product }) {
  const logInteraction = useMutation(api.interactionSignals.logInteraction);

  const handleView = async () => {
    await logInteraction({
      type: "view",
      itemId: product.id,
      category: product.category,
    });
  };

  const handleSave = async () => {
    await logInteraction({
      type: "save",
      itemId: product.id,
      category: product.category,
      extractedKeywords: product.tags, // Style tags, colors, etc.
    });
  };

  return (
    <div onMouseEnter={handleView}>
      <h3>{product.name}</h3>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### 4. Log Voice Queries

```typescript
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

function VoiceSearch() {
  const logInteraction = useMutation(api.interactionSignals.logInteraction);
  const analyzeQuery = useAction(api.preferenceLearning.analyzeVoiceQuery);

  const handleVoiceQuery = async (transcript: string) => {
    // Analyze query with LLM
    const analysis = await analyzeQuery({ queryText: transcript });

    // Log the interaction
    await logInteraction({
      type: "voice_query",
      queryText: transcript,
      category: analysis.category,
      extractedKeywords: analysis.keywords,
    });
  };

  return <button onClick={() => handleVoiceQuery("...")}>Voice Search</button>;
}
```

### 5. Trigger Preference Learning

```typescript
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

function LearnPreferencesButton() {
  const { toast } = useToast();
  const triggerLearning = useAction(api.preferenceLearning.triggerPreferenceLearning);

  const handleClick = async () => {
    const result = await triggerLearning();

    if (result.success) {
      toast({
        title: "Preferences Updated",
        description: `Analyzed ${result.signalsProcessed} interactions to update your profile.`,
      });
    }
  };

  return <button onClick={handleClick}>Update My Profile</button>;
}
```

### 6. Use Personalized Search

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function PersonalizedSearch() {
  const searchEnhancement = useQuery(api.personalizedSearch.enhanceSearchQuery, {
    originalQuery: "modern chair",
  });

  if (!searchEnhancement) return <div>Loading...</div>;

  return (
    <div>
      <p>Enhanced Query: {searchEnhancement.query}</p>
      <p>Budget: ${searchEnhancement.filters.minPrice} - ${searchEnhancement.filters.maxPrice}</p>
      <p>Preferred Brands: {searchEnhancement.filters.brands?.join(", ")}</p>
    </div>
  );
}
```

### 7. Score and Rank Products

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function ProductList({ products }) {
  const scoredProducts = useQuery(api.personalizedSearch.scoreProducts, {
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      brand: p.brand,
      style: p.styleTags,
      colors: p.colorTags,
    })),
  });

  if (!scoredProducts) return <div>Loading...</div>;

  return (
    <div>
      {scoredProducts.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>Relevance Score: {product.score}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### 1. Manual Testing

**User Profile Creation**
- Sign in with Clerk
- Verify user created in `preference_users` table
- Verify empty preferences created in `user_preferences` table

**Preference Editing**
- Open PreferenceEditor
- Add style preferences (e.g., "minimalist", "modern")
- Set budget range (e.g., $50-$200)
- Add size preferences (e.g., "M", "L")
- Save and verify in database

**Interaction Logging**
- View products (log "view" interactions)
- Save items (log "save" interactions)
- Make voice queries (log "voice_query" interactions)
- Verify interactions in `interaction_signals` table

**Preference Learning**
- Log 10+ interactions across different categories
- Trigger preference learning
- Verify preferences updated based on interactions

**Personalized Search**
- Search for products
- Verify enhanced query includes preference keywords
- Verify products ranked by preference match

### 2. Integration Testing

Test the full workflow:
1. New user signs in
2. Interacts with products (views, saves, voice queries)
3. Preferences automatically learned after threshold
4. Search results personalized based on learned preferences
5. User can view and edit their profile

### 3. Edge Cases

- User with no interactions (should show empty preferences)
- User with minimal interactions (learning should wait for confidence)
- Invalid budget ranges (validate min < max)
- Empty arrays in preferences (handle gracefully)
- API key not configured (graceful error handling)
- LLM timeout or error (retry or fallback)

### 4. Test Scenarios
- User login and initial preference profile creation
- User explicitly updates preferences, and UI reflects changes
- User saves an item, verifying `saved_items` and `interaction_signals` are updated
- Automated background learning process updates `user_preferences` based on new signals
- `getRecommendations` query returns relevant items based on the updated preference profile
- Unauthorized access attempts to user data are rejected
- Rate limits prevent excessive interaction logging from a single user

---

## Performance Considerations

### 1. Rate Limiting
- Consider adding rate limits to `logInteraction` mutation
- Prevent spam from malicious users

### 2. Batch Updates
- Consider batching interaction signals before triggering learning
- Schedule preference learning via cron jobs instead of real-time

### 3. Caching
- User preferences are reactive (Convex handles caching)
- Search enhancements can be cached client-side

### 4. Database Indexes
- All required indexes are defined in schema
- Monitor query performance in Convex dashboard

---

## Privacy & Data Management

### 1. Data Retention
- Use `cleanupOldInteractions` to remove old signals
- Consider GDPR compliance for user data

### 2. User Control
- Users can view all their data (preferences, interactions)
- Users can manually edit preferences
- Users can reset preferences

### 3. Transparency
- Show users what data is being collected
- Show users how preferences are learned
- Provide opt-out mechanisms if needed

---

## Troubleshooting

### Issue: Preferences not updating

**Solution:**
- Check Gemini API key is set in environment variables
- Verify sufficient interaction signals (10+ recommended)
- Check Convex logs for errors in `processSignalsAndUpdatePreferences`

### Issue: LLM timeout

**Solution:**
- Reduce the number of signals processed per batch
- Implement retry logic with exponential backoff
- Consider using a smaller model or faster API endpoint

### Issue: Type errors in frontend

**Solution:**
- Run `npx convex dev` to regenerate TypeScript types
- Ensure `convex/_generated` folder is not gitignored

### Issue: User not found

**Solution:**
- Ensure `getOrCreateUser` is called after Clerk authentication
- Check Clerk user ID matches database `clerkUserId` field

---

## Next Steps

### 1. Schedule Automated Learning
- Create a cron job to run preference learning weekly
- Process users with significant new interactions

### 2. Improve Recommendation Engine
- Integrate with external product APIs
- Use collaborative filtering for "users like you"

### 3. Add More Signals
- Track dwell time on products
- Track scroll behavior
- Track purchase completion

### 4. A/B Testing
- Test different learning thresholds
- Test different scoring algorithms
- Measure conversion rates with/without personalization

---

## Resources

- **Convex Documentation**: [https://docs.convex.dev](https://docs.convex.dev)
- **Google Gemini API**: [https://ai.google.dev/docs](https://ai.google.dev/docs)
- **Clerk Authentication**: [https://clerk.com/docs](https://clerk.com/docs)
- **AI SDK Documentation**: [https://sdk.vercel.ai/docs](https://sdk.vercel.ai/docs)

---

## Status

✅ **Implementation Complete**

The Preference Memory feature is fully implemented and ready for use. All core functionality is in place:

- ✅ Database schema with user profiles and preferences
- ✅ Backend functions for CRUD operations
- ✅ LLM-based preference learning
- ✅ Interaction tracking and logging
- ✅ Personalized search and recommendations
- ✅ Frontend components for profile display and editing
- ✅ Documentation and usage examples

**Next action required**: Set up Google Gemini API key and begin testing with user interactions.
