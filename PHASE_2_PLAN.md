# Phase 2 Refactoring Plan

## Overview
Phase 2 focuses on **component splitting** to improve maintainability and reduce the size of `Thread.svelte` (currently 972 lines).

## Current State
- `Thread.svelte`: 972 lines (target: < 400 lines)
- Responsibilities: Thread loading, post management, participant management, turn logic, view modes, real-time subscriptions

## Phase 2 Goals

### 1. Extract ReadView Component
**Purpose**: Separate read mode logic from write mode

**New File**: `src/components/collaborative/ReadView.svelte`

**Props**:
- `posts` - Array of posts
- `contributorColors` - Map of user_id -> color
- `getContributorName` - Function to get display name

**Responsibilities**:
- Display continuous story view
- Show contributors legend
- Handle paragraph splitting

**Estimated Lines**: ~150 lines

### 2. Extract PostListView Component
**Purpose**: Separate write mode post display

**New File**: `src/components/collaborative/PostListView.svelte`

**Props**:
- `posts` - Array of posts
- `contributorColors` - Map of user_id -> color
- `getContributorName` - Function to get display name
- `currentUserId` - Current user ID for "You" display

**Responsibilities**:
- Display posts in write mode
- Show post metadata (author, date, order)
- Display sources and plagiarism badge
- Handle flag button

**Estimated Lines**: ~200 lines

### 3. Extract ThreadHeader Component
**Purpose**: Separate thread header and metadata

**New File**: `src/components/collaborative/ThreadHeader.svelte`

**Props**:
- `thread` - Thread object
- `participants` - Array of participants
- `participantProfiles` - Map of user_id -> display_name
- `currentUserId` - Current user ID

**Responsibilities**:
- Display thread theme
- Show status badge
- Display participant count
- Show participants list with turn order

**Estimated Lines**: ~100 lines

### 4. Extract ThreadControls Component
**Purpose**: Separate thread interaction controls

**New File**: `src/components/collaborative/ThreadControls.svelte`

**Props**:
- `thread` - Thread object
- `isParticipant` - Boolean
- `canPost` - Boolean
- `isBlocked` - Boolean
- `participants` - Array of participants
- `onJoin` - Function to join thread
- `onPostSubmit` - Function to submit post

**Responsibilities**:
- Show waiting notice
- Display join button
- Show post form or wait message
- Handle thread status-based UI

**Estimated Lines**: ~150 lines

### 5. Extract ViewModeToggle Component
**Purpose**: Separate view mode toggle button

**New File**: `src/components/collaborative/ViewModeToggle.svelte`

**Props**:
- `viewMode` - Current view mode ('write' | 'read')
- `onModeChange` - Function to change mode
- `postsCount` - Number of posts

**Responsibilities**:
- Display toggle buttons
- Handle mode switching
- Only show when posts exist

**Estimated Lines**: ~50 lines

## After Phase 2

**Thread.svelte** will be reduced to:
- State management (~50 lines)
- Data loading functions (~150 lines)
- Real-time subscriptions (~50 lines)
- Component composition (~100 lines)
- **Total: ~350 lines** ✅

## Additional Quick Wins (Before Phase 2)

### A. Remove Debug Console Logs
**Issue**: Debug `console.log` statements in production code

**Files to modify**:
- `src/routes/collaborative/Thread.svelte` (lines 93-100, 170-175)

**Fix**: Remove or make conditional on dev mode

### B. Use Status Constants
**Issue**: String literals for thread statuses

**Fix**: Use `THREAD_STATUS` from constants

**Files to modify**:
- `src/routes/collaborative/Thread.svelte` (7 instances)

### C. Extract Profile Loading Utility
**Issue**: Profile loading duplicated in Thread.svelte and Index.svelte

**Fix**: Create `loadProfiles(userIds)` utility

**Files to create**:
- `src/lib/api/profiles.js`

**Files to modify**:
- `src/routes/collaborative/Thread.svelte`
- `src/routes/collaborative/Index.svelte`

### D. Extract URL Parameter Utility
**Issue**: Thread ID extraction logic in Thread.svelte

**Fix**: Create `extractThreadId($location)` utility

**Files to create**:
- `src/lib/utils/router.js`

**Files to modify**:
- `src/routes/collaborative/Thread.svelte`

## Recommended Order

1. **Quick Wins First** (30 minutes):
   - Remove debug logs
   - Use status constants
   - Extract profile loading utility
   - Extract URL parameter utility

2. **Then Phase 2** (2-3 hours):
   - Extract ViewModeToggle (easiest)
   - Extract ReadView
   - Extract PostListView
   - Extract ThreadHeader
   - Extract ThreadControls
   - Refactor Thread.svelte to use new components

## Benefits After Phase 2

- ✅ Smaller, focused components
- ✅ Easier to test individual components
- ✅ Better code reusability
- ✅ Improved maintainability
- ✅ Clearer separation of concerns

