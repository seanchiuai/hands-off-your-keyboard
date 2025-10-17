# Preference Memory Feature - Setup & Documentation

## Overview

The Preference Memory feature automatically learns and stores user preferences for personalized shopping recommendations. It uses Convex for real-time data storage and Google Gemini for LLM-based preference learning.

## Features Implemented

### Backend (Convex)

1. **Database Schema** (`convex/schema.ts`)
   - `preference_users`: User profiles linked to Clerk authentication
   - `user_preferences`: Structured preference storage (style, budget, size, categories, brands, colors)
   - `interaction_signals`: User behavior tracking (views, clicks, saves, purchases, voice queries)
   - Integration with existing `saved_items` table for preference extraction

2. **User Management** (`convex/preferenceUsers.ts`)
   - `getOrCreateUser`: Create or update user profile
   - `getUserByClerkId`: Fetch user by Clerk ID
   - `getCurrentUser`: Get authenticated user
   - `updateUserInfo`: Internal user info updates

3. **Preference CRUD** (`convex/userPreferences.ts`)
   - `getUserPreferences`: Query user preferences
   - `getPreferencesByUserId`: Get preferences by user ID
   - `updateUserPreferences`: Manual preference updates
   - `internalUpdatePreferences`: System-driven preference updates (for LLM)
   - `resetPreferences`: Clear all preferences

4. **Saved Items Management** (`convex/preferenceItemsManagement.ts`)
   - `saveItemForPreferences`: Save items with preference extraction
   - `getSavedItems`: Retrieve saved items
   - `removeSavedItem`: Remove saved items (logs as dislike)
   - `getSavedItemsCount`: Get count of saved items

5. **Interaction Logging** (`convex/interactionSignals.ts`)
   - `logInteraction`: Track user interactions
   - `getRecentInteractions`: Fetch recent interactions
   - `getInteractionsInTimeWindow`: Internal query for learning
   - `getVoiceQueryHistory`: Get voice query history
   - `getInteractionStats`: Activity statistics
   - `cleanupOldInteractions`: Privacy/cleanup utility

6. **LLM-Based Learning** (`convex/preferenceLearning.ts`)
   - `processSignalsAndUpdatePreferences`: Analyze interactions with Gemini
   - `triggerPreferenceLearning`: User-triggered preference update
   - `analyzeVoiceQuery`: Real-time voice query analysis

7. **Personalized Search** (`convex/personalizedSearch.ts`)
   - `getSearchPreferences`: Fetch user preferences for search
   - `enhanceSearchQuery`: Add preference keywords to queries
   - `getRecommendations`: Generate personalized recommendations
   - `scoreProducts`: Rank products by preference match
   - `getTrendingCategories`: Show trending user categories

### Frontend (React Components)

1. **UserProfileDisplay** (`components/UserProfileDisplay.tsx`)
   - Display user preferences with visual badges
   - Show activity statistics
   - Display trending categories
   - Trigger preference learning

2. **PreferenceEditor** (`components/PreferenceEditor.tsx`)
   - Edit all preference fields
   - Add/remove style, size, category, brand, color preferences
   - Set budget range
   - Real-time validation and saving

## Setup Instructions

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

## Testing Recommendations

### 1. Manual Testing

1. **User Profile Creation**
   - Sign in with Clerk
   - Verify user created in `preference_users` table
   - Verify empty preferences created in `user_preferences` table

2. **Preference Editing**
   - Open PreferenceEditor
   - Add style preferences (e.g., "minimalist", "modern")
   - Set budget range (e.g., $50-$200)
   - Add size preferences (e.g., "M", "L")
   - Save and verify in database

3. **Interaction Logging**
   - View products (log "view" interactions)
   - Save items (log "save" interactions)
   - Make voice queries (log "voice_query" interactions)
   - Verify interactions in `interaction_signals` table

4. **Preference Learning**
   - Log 10+ interactions across different categories
   - Trigger preference learning
   - Verify preferences updated based on interactions

5. **Personalized Search**
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

## Performance Considerations

1. **Rate Limiting**
   - Consider adding rate limits to `logInteraction` mutation
   - Prevent spam from malicious users

2. **Batch Updates**
   - Consider batching interaction signals before triggering learning
   - Schedule preference learning via cron jobs instead of real-time

3. **Caching**
   - User preferences are reactive (Convex handles caching)
   - Search enhancements can be cached client-side

4. **Database Indexes**
   - All required indexes are defined in schema
   - Monitor query performance in Convex dashboard

## Privacy & Data Management

1. **Data Retention**
   - Use `cleanupOldInteractions` to remove old signals
   - Consider GDPR compliance for user data

2. **User Control**
   - Users can view all their data (preferences, interactions)
   - Users can manually edit preferences
   - Users can reset preferences

3. **Transparency**
   - Show users what data is being collected
   - Show users how preferences are learned
   - Provide opt-out mechanisms if needed

## Next Steps

1. **Schedule Automated Learning**
   - Create a cron job to run preference learning weekly
   - Process users with significant new interactions

2. **Improve Recommendation Engine**
   - Integrate with external product APIs
   - Use collaborative filtering for "users like you"

3. **Add More Signals**
   - Track dwell time on products
   - Track scroll behavior
   - Track purchase completion

4. **A/B Testing**
   - Test different learning thresholds
   - Test different scoring algorithms
   - Measure conversion rates with/without personalization

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

## Support & Documentation

- Convex Documentation: https://docs.convex.dev
- Google Gemini API: https://ai.google.dev/docs
- Clerk Authentication: https://clerk.com/docs
- AI SDK Documentation: https://sdk.vercel.ai/docs

For issues specific to this implementation, check the implementation plan at:
`.claude/plans/feature_preference_memory.md`
