# UI Redesign - Complete Implementation Guide

## Overview

This plan outlines the complete UI redesign of the Hands Off Your Keyboard app, transforming it into a simplified, voice-first shopping experience with 4 main pages and a persistent sidebar navigation.

**Tech Stack**: Next.js 15, Tailwind CSS 4, shadcn/ui, Convex, Clerk

**Core Functionality**:
- Voice-first interaction (no text input on main dashboard)
- 4 main pages: Dashboard, History, Saved Products, Settings
- Persistent sidebar navigation
- Clean, minimal design focused on essential features
- Integration with existing Voice Shopper, Background Research, and Preference Memory features

---

## Design Architecture

### Navigation Structure

```
├── Sidebar (persistent across all pages)
│   ├── Logo / App Name
│   ├── Dashboard Link
│   ├── History Link
│   ├── Saved Products Link
│   └── Settings Link
│
├── Main Dashboard (/)
│   ├── Microphone Button (large, prominent)
│   ├── Product Display Area
│   └── Product Cards (with Save buttons)
│
├── History (/history)
│   ├── Conversation List
│   ├── Preference Manager
│   └── Interaction Statistics
│
├── Saved Products (/saved)
│   ├── Product Grid
│   └── Remove/Unsave functionality
│
└── Settings (/settings)
    ├── User Profile Display
    ├── Logout Button
    └── App Configuration
```

---

## Implementation Plan

### Phase 1: Layout & Navigation

#### 1.1 Create Root Layout with Sidebar

**File**: `/app/layout.tsx`

**Requirements**:
- Wrap all pages with persistent sidebar
- Sidebar should be fixed on left side
- Main content area should occupy remaining space
- Responsive design (sidebar collapses on mobile)

**Components to Create**:
- `Sidebar.tsx` - Navigation component
  - Logo/brand at top
  - Navigation links (Dashboard, History, Saved, Settings)
  - Active state indication
  - Smooth transitions

**Styling Approach**:
```css
/* Layout Structure */
- Sidebar: Fixed left, 240px wide on desktop, full-width drawer on mobile
- Main content: ml-[240px] on desktop, full-width on mobile
- Background: Clean gradient or solid color
- Typography: Clear hierarchy with SF Pro or similar system font
```

**Database Requirements**: None (UI only)

---

#### 1.2 Update Routing Structure

**Pages to Create/Update**:

1. **`/app/page.tsx`** - Main Dashboard
   - Remove any existing complex UI
   - Focus on microphone button and product display

2. **`/app/history/page.tsx`** - History Page
   - New page for conversation history

3. **`/app/saved/page.tsx`** - Saved Products Page
   - New page for saved items display

4. **`/app/settings/page.tsx`** - Settings Page
   - New page for user settings

**Pages to Remove/Archive**:
- `/app/research/page.tsx` (functionality moves to main dashboard)
- `/app/tasks/page.tsx` (remove or archive)
- `/app/voice-shopper/page.tsx` (functionality moves to main dashboard)
- `/app/server/page.tsx` (remove or archive)
- `/app/font-test/page.tsx` (remove or archive)

---

### Phase 2: Main Dashboard (`/`)

#### 2.1 Voice Input Component

**Component**: `components/VoiceInput.tsx`

**Features**:
- Large, circular microphone button
- Visual feedback (pulsing animation when listening)
- Status display ("Listening...", "Processing...", "Searching...")
- WebSocket connection to Pipecat server
- Real-time transcription display (optional, small text)

**States**:
- `idle`: Microphone ready
- `listening`: Recording user voice
- `processing`: Sending to AI
- `searching`: Background research in progress
- `error`: Display error message

**UI Design**:
```
┌─────────────────────────────────────┐
│                                     │
│        [Large Mic Button]           │
│           (animated)                │
│                                     │
│     "Tap to start speaking"         │
│                                     │
└─────────────────────────────────────┘
```

**Integration**:
- Connects to Pipecat Python agent via WebSocket
- Triggers `voiceShopper.createSession` on start
- Logs interactions to `interaction_signals`
- Calls `research.triggerProductSearch` when intent detected

---

#### 2.2 Product Display Area

**Component**: `components/ProductDisplay.tsx`

**Features**:
- Grid layout for product cards
- Real-time updates as research completes
- Loading states for each product
- Empty state when no products

**Sub-component**: `components/ProductCard.tsx`

**Product Card Design**:
```
┌─────────────────────────┐
│   [Product Image]       │
│                         │
│   Product Name          │
│   Brief Description     │
│   Price                 │
│                         │
│   [Save Button]         │
└─────────────────────────┘
```

**Features per Card**:
- Product image (lazy loaded)
- Product name
- Short summary (1-2 lines)
- Price (if available)
- Link to product page (opens in new tab)
- Save button (heart icon or "Save" text)

**Database Integration**:
- Displays products from `research_results` table
- Save functionality writes to `saved_items`
- Logs "view" interaction to `interaction_signals`
- Logs "save" interaction when saved

---

#### 2.3 Conversation Display (Optional)

**Component**: `components/ConversationDisplay.tsx`

**Features**:
- Small transcript area (optional, can be hidden)
- Shows recent conversation turns
- User messages and AI responses
- Auto-scroll to latest message

**Placement**:
- Bottom or side panel
- Collapsible to save space
- Clear visual distinction from product area

---

### Phase 3: History Page (`/history`)

#### 3.1 Conversation History List

**Component**: `components/ConversationHistory.tsx`

**Features**:
- List of past voice sessions
- Each item shows:
  - Date/time
  - Brief summary of conversation
  - Number of products found
  - Click to expand details

**Database Queries**:
- Query `voice_sessions` table
- Filter by current user
- Sort by date (most recent first)
- Pagination (show 20 at a time)

**UI Design**:
```
┌─────────────────────────────────────┐
│  Oct 17, 2025 - 2:30 PM             │
│  "Looking for modern desk lamps"    │
│  5 products found                   │
│  [View Details]                     │
├─────────────────────────────────────┤
│  Oct 16, 2025 - 4:15 PM             │
│  "Need ergonomic office chairs"     │
│  8 products found                   │
│  [View Details]                     │
└─────────────────────────────────────┘
```

---

#### 3.2 Preference Manager

**Component**: `components/PreferenceManager.tsx` (reuse from Preference Memory feature)

**Features**:
- Display current user preferences
  - Style preferences (badges)
  - Budget range
  - Size preferences
  - Category preferences
  - Brand preferences
  - Color preferences
- Edit preferences manually
- Reset all preferences
- View learning statistics

**Integration**:
- Uses `UserProfileDisplay` component from preference memory plan
- Uses `PreferenceEditor` component for editing
- Connects to `user_preferences` table

---

#### 3.3 Interaction Statistics

**Component**: `components/InteractionStats.tsx`

**Features**:
- Total conversations
- Total products viewed
- Total products saved
- Most searched categories
- Activity over time (simple chart)

**Database Query**:
- `getInteractionStats` from `interactionSignals.ts`
- `getSavedItemsCount` from `preferenceItemsManagement.ts`

---

### Phase 4: Saved Products Page (`/saved`)

#### 4.1 Saved Products Grid

**Component**: `components/SavedProductsGrid.tsx`

**Features**:
- Grid layout (similar to main dashboard)
- All saved products displayed
- Each product card shows:
  - Image
  - Name
  - Save date
  - Link to product
  - Remove/Unsave button

**Database Query**:
- `saved_items.getSavedItems()` filtered by current user
- Real-time updates (Convex reactive)

**UI Design**:
```
┌──────────┬──────────┬──────────┐
│ Product  │ Product  │ Product  │
│    1     │    2     │    3     │
│ [Remove] │ [Remove] │ [Remove] │
├──────────┼──────────┼──────────┤
│ Product  │ Product  │ Product  │
│    4     │    5     │    6     │
│ [Remove] │ [Remove] │ [Remove] │
└──────────┴──────────┴──────────┘
```

**Interactions**:
- Click product → Open product URL in new tab
- Click Remove → Remove from saved_items
- Log "dislike" interaction when removed

---

#### 4.2 Empty State

**Component**: Part of `SavedProductsGrid.tsx`

**Design**:
```
┌─────────────────────────────────────┐
│                                     │
│        [Empty Box Icon]             │
│                                     │
│    No saved products yet            │
│                                     │
│    Start shopping to save items!    │
│                                     │
│    [Go to Dashboard]                │
│                                     │
└─────────────────────────────────────┘
```

---

### Phase 5: Settings Page (`/settings`)

#### 5.1 User Profile Section

**Component**: `components/UserProfileSection.tsx`

**Features**:
- Display user info from Clerk
  - Profile picture
  - Name
  - Email
- Option to edit profile (link to Clerk User Profile)

---

#### 5.2 Logout Button

**Component**: Part of settings page

**Features**:
- Prominent logout button
- Confirmation dialog
- Redirect to sign-in after logout

**Implementation**:
```typescript
import { useClerk } from "@clerk/nextjs";

const { signOut } = useClerk();

const handleLogout = async () => {
  await signOut();
  // Redirect handled automatically by Clerk
};
```

---

#### 5.3 App Configuration

**Component**: `components/AppSettings.tsx`

**Features**:
- Theme toggle (if implementing dark/light mode)
- Voice settings
  - Enable/disable voice feedback
  - Adjust TTS speed
- Notification preferences
- Data & privacy settings
  - Clear conversation history
  - Reset preferences
  - Delete account option

---

### Phase 6: Responsive Design

#### 6.1 Mobile Layout

**Requirements**:
- Sidebar collapses to hamburger menu on mobile
- Product grid adapts (1 column on mobile, 2 on tablet, 3+ on desktop)
- Microphone button remains accessible and prominent
- Touch-friendly button sizes (min 44x44px)

**Breakpoints**:
```css
/* Mobile: 0-640px */
- Sidebar: Hidden, hamburger menu
- Products: 1 column grid
- Microphone: Full-width button

/* Tablet: 641-1024px */
- Sidebar: Hidden, hamburger menu
- Products: 2 column grid
- Microphone: Large centered button

/* Desktop: 1025px+ */
- Sidebar: Fixed, always visible
- Products: 3+ column grid
- Microphone: Large centered button
```

---

#### 6.2 Sidebar Mobile Menu

**Component**: `components/MobileSidebar.tsx`

**Features**:
- Slide-in drawer from left
- Same navigation links as desktop sidebar
- Close button or backdrop click to dismiss
- Smooth animations

---

### Phase 7: Integration with Existing Features

#### 7.1 Voice Shopper Integration

**Main Dashboard** uses Voice Shopper feature:
- Microphone button → `voiceShopper.createSession`
- WebSocket connection to Pipecat agent
- Conversation logging → `conversation_logs`
- Product results → `research_results`

**Files to Reference**:
- `convex/voiceShopper.ts`
- `convex/research.ts`
- `pipecat/agent.py`

---

#### 7.2 Background Research Integration

**Main Dashboard** triggers Background Research:
- When user voice intent is understood, trigger `research.triggerProductSearch`
- Display loading state while research runs
- Stream results to product display as they arrive
- Uses Gemini API with Search grounding

**Files to Reference**:
- `convex/actions/brightdata.ts` (now uses Gemini)
- `convex/research.ts`

---

#### 7.3 Preference Memory Integration

**History Page** manages Preference Memory:
- Display preferences from `user_preferences`
- Edit preferences → `updateUserPreferences`
- View interaction history → `interaction_signals`
- Trigger learning → `processSignalsAndUpdatePreferences`

**Main Dashboard** uses preferences:
- Auto-enhance search with user preferences
- Rank products by preference match
- Log all interactions for learning

**Files to Reference**:
- `convex/userPreferences.ts`
- `convex/preferenceLearning.ts`
- `convex/personalizedSearch.ts`

---

### Phase 8: Styling & Design System

#### 8.1 Color Palette

**Primary Colors**:
```css
--primary: /* Main brand color */
--primary-foreground: /* Text on primary */
--secondary: /* Accent color */
--secondary-foreground: /* Text on secondary */
```

**Neutral Colors**:
```css
--background: /* Page background */
--foreground: /* Main text color */
--muted: /* Subtle background */
--muted-foreground: /* Subtle text */
--border: /* Border color */
```

**Semantic Colors**:
```css
--destructive: /* Delete/remove actions */
--success: /* Success states */
--warning: /* Warning states */
```

---

#### 8.2 Typography

**Font Stack**:
- Primary: SF Pro Display / Inter / System UI
- Monospace: SF Mono / Consolas

**Text Scales**:
```css
text-xs: 0.75rem
text-sm: 0.875rem
text-base: 1rem
text-lg: 1.125rem
text-xl: 1.25rem
text-2xl: 1.5rem
text-3xl: 1.875rem
text-4xl: 2.25rem
```

---

#### 8.3 Component Library

**Use shadcn/ui components**:
- Button (for microphone, save, logout)
- Card (for product cards)
- Badge (for preference tags)
- Dialog (for confirmations)
- Dropdown Menu (for user menu)
- Sheet (for mobile sidebar)
- Skeleton (for loading states)
- Toast (for notifications)

**Custom Components**:
- VoiceInput (microphone with animations)
- ProductCard (product display)
- ConversationBubble (chat messages)

---

### Phase 9: Error Handling & Edge Cases

#### 9.1 Voice Input Errors

**Scenarios**:
- Microphone permission denied
- WebSocket connection failed
- Pipecat server unreachable
- Speech recognition timeout

**Handling**:
- Clear error messages
- Retry button
- Fallback to text input (if needed)
- Help text explaining what went wrong

---

#### 9.2 Product Search Errors

**Scenarios**:
- No products found
- API rate limit exceeded
- Network error
- Invalid search query

**Handling**:
- Empty state with helpful message
- Suggestion to rephrase query
- Manual retry button
- Log errors for debugging

---

#### 9.3 Authentication Errors

**Scenarios**:
- User not logged in
- Session expired
- Clerk authentication failed

**Handling**:
- Redirect to sign-in page
- Clear session data
- Show error toast
- Preserve user intent (return to page after login)

---

### Phase 10: Performance Optimization

#### 10.1 Image Loading

**Strategy**:
- Lazy load product images
- Use Next.js Image component
- Blur placeholder while loading
- Responsive image sizes

**Implementation**:
```typescript
import Image from "next/image";

<Image
  src={product.imageUrl}
  alt={product.name}
  width={300}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/..."
/>
```

---

#### 10.2 Data Fetching

**Strategy**:
- Use Convex reactive queries for real-time updates
- Implement pagination for history (20 items at a time)
- Debounce preference editor saves
- Prefetch data on navigation hover

---

#### 10.3 Bundle Optimization

**Strategy**:
- Code split by route (Next.js automatic)
- Dynamic imports for heavy components
- Tree-shake unused shadcn/ui components
- Optimize images with WebP format

---

## Implementation Checklist

### Setup
- [ ] Review existing codebase structure
- [ ] Identify pages/components to remove or archive
- [ ] Set up new routing structure
- [ ] Configure Tailwind CSS theme

### Phase 1: Layout & Navigation
- [ ] Create `Sidebar.tsx` component
- [ ] Update root layout to include sidebar
- [ ] Implement mobile sidebar (drawer)
- [ ] Test navigation between pages
- [ ] Style sidebar with active states

### Phase 2: Main Dashboard
- [ ] Create `VoiceInput.tsx` component
- [ ] Implement microphone button with animations
- [ ] Set up WebSocket connection to Pipecat
- [ ] Create `ProductDisplay.tsx` component
- [ ] Create `ProductCard.tsx` component
- [ ] Integrate with `voiceShopper` Convex functions
- [ ] Integrate with `research` Convex functions
- [ ] Test voice input → product display flow
- [ ] Add loading states
- [ ] Add error handling

### Phase 3: History Page
- [ ] Create `ConversationHistory.tsx` component
- [ ] Query `voice_sessions` from Convex
- [ ] Implement conversation list with details
- [ ] Integrate `PreferenceManager.tsx` (from existing plan)
- [ ] Create `InteractionStats.tsx` component
- [ ] Query interaction statistics
- [ ] Test preference editing
- [ ] Test preference learning trigger

### Phase 4: Saved Products Page
- [ ] Create `SavedProductsGrid.tsx` component
- [ ] Query `saved_items` from Convex
- [ ] Implement remove/unsave functionality
- [ ] Create empty state component
- [ ] Test save → view → remove flow
- [ ] Add loading and error states

### Phase 5: Settings Page
- [ ] Create `UserProfileSection.tsx` component
- [ ] Display Clerk user info
- [ ] Implement logout button with confirmation
- [ ] Create `AppSettings.tsx` component
- [ ] Add data management options
- [ ] Test logout flow

### Phase 6: Responsive Design
- [ ] Test all pages on mobile (375px width)
- [ ] Test all pages on tablet (768px width)
- [ ] Test all pages on desktop (1440px width)
- [ ] Fix any responsive issues
- [ ] Optimize touch targets for mobile

### Phase 7: Integration Testing
- [ ] Test complete voice shopping flow
- [ ] Test preference learning from interactions
- [ ] Test product saving and viewing
- [ ] Test conversation history
- [ ] Test all navigation paths
- [ ] Test authentication flow

### Phase 8: Polish & Optimization
- [ ] Implement loading skeletons
- [ ] Add micro-interactions and animations
- [ ] Optimize images
- [ ] Test performance with Lighthouse
- [ ] Fix any accessibility issues
- [ ] Add error boundaries

---

## File Structure

```
/app
├── layout.tsx (root layout with sidebar)
├── page.tsx (main dashboard)
├── history
│   └── page.tsx
├── saved
│   └── page.tsx
└── settings
    └── page.tsx

/components
├── Sidebar.tsx
├── MobileSidebar.tsx
├── VoiceInput.tsx
├── ProductDisplay.tsx
├── ProductCard.tsx
├── ConversationDisplay.tsx
├── ConversationHistory.tsx
├── PreferenceManager.tsx (reuse existing)
├── InteractionStats.tsx
├── SavedProductsGrid.tsx
├── UserProfileSection.tsx
└── AppSettings.tsx

/convex
├── voiceShopper.ts (existing)
├── research.ts (existing)
├── userPreferences.ts (existing)
├── preferenceLearning.ts (existing)
├── personalizedSearch.ts (existing)
├── saved_items.ts (existing)
└── interaction_signals.ts (existing)
```

---

## Design Mockups

### Main Dashboard Layout

```
┌──────────┬────────────────────────────────────────────┐
│          │                                            │
│  Logo    │            Main Dashboard                  │
│          │                                            │
│ ───────  │  ┌────────────────────────────────────┐   │
│          │  │                                    │   │
│ [Home]   │  │      [Large Microphone Button]     │   │
│          │  │         (with animation)           │   │
│ [History]│  │                                    │   │
│          │  │    "Tap to start speaking..."      │   │
│ [Saved]  │  │                                    │   │
│          │  └────────────────────────────────────┘   │
│ [Settings]│                                           │
│          │  ┌──────────┬──────────┬──────────┐       │
│          │  │ Product  │ Product  │ Product  │       │
│          │  │    1     │    2     │    3     │       │
│          │  │ [Save]   │ [Save]   │ [Save]   │       │
│          │  └──────────┴──────────┴──────────┘       │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

### History Page Layout

```
┌──────────┬────────────────────────────────────────────┐
│          │                                            │
│  Logo    │              History                       │
│          │                                            │
│ ───────  │  Conversation History                      │
│          │  ┌────────────────────────────────────┐   │
│ [Home]   │  │ Oct 17, 2025 - 2:30 PM             │   │
│          │  │ "Looking for modern lamps"         │   │
│ [History]│  │ 5 products • [View Details]        │   │
│          │  ├────────────────────────────────────┤   │
│ [Saved]  │  │ Oct 16, 2025 - 4:15 PM             │   │
│          │  │ "Office chairs under $200"         │   │
│ [Settings]│  │ 8 products • [View Details]        │   │
│          │  └────────────────────────────────────┘   │
│          │                                            │
│          │  Your Preferences                          │
│          │  ┌────────────────────────────────────┐   │
│          │  │ Style: [Modern] [Minimalist]       │   │
│          │  │ Budget: $50 - $200                 │   │
│          │  │ [Edit Preferences]                 │   │
│          │  └────────────────────────────────────┘   │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
- Sidebar navigation component
- Product card component
- Voice input button states
- Preference display logic

### Integration Tests
- Voice input → product search → display
- Product save → saved products page
- Preference edit → update → display
- Conversation log → history page

### E2E Tests (Playwright/Cypress)
1. User logs in
2. Clicks microphone button
3. Voice input processed
4. Products displayed
5. User saves a product
6. Navigates to saved products page
7. Verifies product is saved
8. Removes product
9. Navigates to history page
10. Views past conversation
11. Edits preferences
12. Navigates to settings
13. Logs out

---

## Migration Strategy

### Step 1: Archive Old Pages
- Move old pages to `/app/_archive` folder
- Keep them for reference during migration
- Do not delete immediately

### Step 2: Build New Structure
- Build new pages one at a time
- Test each page independently
- Ensure no broken links

### Step 3: Migrate Features
- Move voice shopper to main dashboard
- Move preference memory to history page
- Move saved items to saved products page

### Step 4: Clean Up
- Remove archived pages once migration complete
- Remove unused components
- Update imports and references

---

## Success Criteria

### Functionality
- ✅ User can use voice to search for products
- ✅ Products display correctly with images and info
- ✅ User can save and view saved products
- ✅ User can view conversation history
- ✅ User can manage preferences
- ✅ User can log out

### Performance
- ✅ Initial page load < 2 seconds
- ✅ Voice input latency < 500ms
- ✅ Product images load progressively
- ✅ Smooth animations (60fps)

### UX
- ✅ Clear navigation between pages
- ✅ Responsive on all screen sizes
- ✅ Intuitive microphone interaction
- ✅ Clear loading and error states
- ✅ Accessible (keyboard navigation, screen readers)

### Design
- ✅ Clean, modern aesthetic
- ✅ Consistent color scheme
- ✅ Clear typography hierarchy
- ✅ Proper spacing and alignment

---

## Resources

- **Next.js App Router**: [https://nextjs.org/docs/app](https://nextjs.org/docs/app)
- **Tailwind CSS**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **shadcn/ui**: [https://ui.shadcn.com](https://ui.shadcn.com)
- **Convex React**: [https://docs.convex.dev/client/react](https://docs.convex.dev/client/react)
- **Clerk Next.js**: [https://clerk.com/docs/quickstarts/nextjs](https://clerk.com/docs/quickstarts/nextjs)

---

## Status

📋 **Plan Complete - Ready for Review**

This plan outlines the complete UI redesign with:
- ✅ 4 main pages (Dashboard, History, Saved, Settings)
- ✅ Persistent sidebar navigation
- ✅ Voice-first main dashboard
- ✅ Integration with all existing features
- ✅ Responsive design strategy
- ✅ Step-by-step implementation checklist

**Next action required**: User approval to begin implementation.
