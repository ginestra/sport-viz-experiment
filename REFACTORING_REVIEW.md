# Refactoring Review - Collaborative Writing Feature

## Overview
This document identifies refactoring opportunities in the `feature/collaborative-writing` branch to improve code quality, maintainability, and consistency.

## 🔴 High Priority Refactoring

### 1. Code Duplication: Word Count Function
**Issue**: `getWordCount` is duplicated in multiple places
- `src/lib/utils/sanitize.js` (line 54) - ✅ Correct implementation
- `src/routes/collaborative/Thread.svelte` (line 369) - ❌ Duplicate
- `src/components/collaborative/PostForm.svelte` (line 16) - ❌ Inline duplicate

**Fix**: 
- Remove duplicate from `Thread.svelte`
- Import from `sanitize.js` in both files
- Update `PostForm.svelte` to use the utility

**Files to modify:**
- `src/routes/collaborative/Thread.svelte`
- `src/components/collaborative/PostForm.svelte`

### 2. Code Duplication: Source Sanitization
**Issue**: Source sanitization logic is duplicated
- `src/lib/utils/sanitize.js` has `sanitizeSource()` function
- `src/routes/collaborative/Thread.svelte` (lines 339-343) has inline sanitization

**Fix**: Use `sanitizeSource()` from utils instead of inline logic

**Files to modify:**
- `src/routes/collaborative/Thread.svelte`

### 3. Large Component: Thread.svelte (984 lines)
**Issue**: `Thread.svelte` is too large and handles too many responsibilities:
- Thread loading and state management
- Post loading and management
- Participant management
- Turn order logic
- View mode switching (read/write)
- Color generation
- Real-time subscriptions
- Post submission

**Fix**: Extract into smaller components:
- `ThreadHeader.svelte` - Thread info and participants
- `PostListView.svelte` - Write mode post list
- `ReadView.svelte` - Read mode continuous story
- `ThreadControls.svelte` - Join thread, post form, etc.

**Files to create:**
- `src/components/collaborative/ThreadHeader.svelte`
- `src/components/collaborative/PostListView.svelte`
- `src/components/collaborative/ReadView.svelte`
- `src/components/collaborative/ThreadControls.svelte`

**Files to modify:**
- `src/routes/collaborative/Thread.svelte` (reduce to ~300-400 lines)

### 4. Missing Utility: Color Generation
**Issue**: Color generation logic is embedded in `Thread.svelte`

**Fix**: Extract to utility function

**Files to create:**
- `src/lib/utils/colors.js` - `generateContributorColor(userId)`

**Files to modify:**
- `src/routes/collaborative/Thread.svelte`

## 🟡 Medium Priority Refactoring

### 5. Database Query Abstraction
**Issue**: Direct Supabase queries scattered throughout components (29 instances)

**Fix**: Create a service/API layer for database operations

**Files to create:**
- `src/lib/api/threads.js` - Thread CRUD operations
- `src/lib/api/posts.js` - Post operations
- `src/lib/api/participants.js` - Participant operations
- `src/lib/api/profiles.js` - Profile operations

**Benefits:**
- Centralized error handling
- Easier to mock for testing
- Consistent query patterns
- Type safety (if using TypeScript in future)

**Example structure:**
```javascript
// src/lib/api/threads.js
export async function getThread(threadId) { ... }
export async function createThread(threadData) { ... }
export async function updateThread(threadId, updates) { ... }
export async function getThreads() { ... }
```

### 6. Profile Loading Duplication
**Issue**: Profile loading logic is duplicated in multiple components

**Fix**: Create utility function for loading profiles

**Files to create:**
- `src/lib/api/profiles.js` - `loadProfiles(userIds)`

**Files to modify:**
- `src/routes/collaborative/Thread.svelte`
- `src/routes/collaborative/Index.svelte`
- Any other components loading profiles

### 7. Error Handling Consistency
**Issue**: Error handling patterns vary across components

**Fix**: Create consistent error handling utilities

**Files to create:**
- `src/lib/utils/errors.js` - Error formatting and display helpers

**Pattern to standardize:**
```javascript
function handleError(error, context) {
  // Log error
  // Format user-friendly message
  // Return consistent error object
}
```

### 8. URL Parameter Extraction
**Issue**: Thread ID extraction from URL is duplicated

**Fix**: Create utility or use router params properly

**Files to modify:**
- `src/routes/collaborative/Thread.svelte` (lines 15-20)

**Better approach:**
- Use router params if supported by svelte-spa-router
- Or create utility: `extractThreadId($location)`

## 🟢 Low Priority / Nice to Have

### 9. Constants Extraction
**Issue**: Magic numbers and strings scattered throughout

**Fix**: Extract to constants file

**Files to create:**
- `src/lib/constants/collaborative.js`

**Constants to extract:**
- `MAX_WORDS = 500`
- `MAX_THEME_LENGTH = 200`
- `MIN_PARTICIPANTS = 2`
- `MAX_PARTICIPANTS = 50`
- Thread statuses: `'waiting'`, `'active'`, `'completed'`

### 10. Type Definitions (Future)
**Issue**: No type definitions for data structures

**Fix**: Add JSDoc comments or consider TypeScript migration

**Benefits:**
- Better IDE autocomplete
- Catch errors at development time
- Self-documenting code

### 11. Component Props Validation
**Issue**: No prop validation for Svelte components

**Fix**: Add prop validation or use TypeScript

### 12. Real-time Subscription Management
**Issue**: Subscription cleanup could be more robust

**Fix**: Create subscription manager utility

**Files to create:**
- `src/lib/utils/subscriptions.js` - Helper for managing Supabase subscriptions

## 📋 Refactoring Checklist

### Phase 1: Quick Wins (High Impact, Low Effort) ✅ COMPLETED
- [x] Remove duplicate `getWordCount` function
- [x] Use `sanitizeSource` from utils
- [x] Extract color generation to utility
- [x] Extract constants
- [x] Remove debug console logs
- [x] Use status constants throughout
- [x] Extract profile loading utility
- [x] Extract URL parameter utility

### Phase 2: Component Splitting (Medium Effort) ✅ COMPLETED
- [x] Split `Thread.svelte` into smaller components
- [x] Extract `ViewModeToggle` component
- [x] Extract `ReadView` component
- [x] Extract `PostListView` component
- [x] Extract `ThreadHeader` component
- [x] Extract `ThreadControls` component
- [x] Refactor `Thread.svelte` to use new components

### Phase 3: API Layer (Higher Effort)
- [ ] Create `threads.js` API module
- [ ] Create `posts.js` API module
- [ ] Create `participants.js` API module
- [ ] Create `profiles.js` API module
- [ ] Refactor components to use API layer

### Phase 4: Polish (Ongoing)
- [ ] Standardize error handling
- [ ] Add JSDoc comments
- [ ] Improve subscription management
- [ ] Add prop validation

## 🎯 Recommended Starting Point

Start with **Phase 1** as these are quick wins that will immediately improve code quality:

1. **Remove duplicate `getWordCount`** - 5 minutes
2. **Use `sanitizeSource` utility** - 5 minutes
3. **Extract color generation** - 10 minutes
4. **Extract constants** - 15 minutes

Total time: ~35 minutes for significant improvement.

## 📊 Metrics

**Current State:**
- Largest file: `Thread.svelte` (984 lines)
- Code duplication: 3 instances of word count logic
- Direct DB queries: 29 instances across 5 files
- Components: 6 route components, 6 shared components

**Target State:**
- Largest file: < 400 lines
- Code duplication: 0 instances
- Direct DB queries: 0 (all through API layer)
- Components: Better organized, single responsibility

## 🔍 Files Requiring Attention

### High Priority
1. `src/routes/collaborative/Thread.svelte` - Too large, needs splitting
2. `src/components/collaborative/PostForm.svelte` - Duplicate word count
3. `src/routes/collaborative/Thread.svelte` - Duplicate sanitization

### Medium Priority
4. `src/routes/collaborative/Index.svelte` - Could use API layer
5. `src/routes/collaborative/CreateThread.svelte` - Could use API layer
6. `src/routes/collaborative/AccountSettings.svelte` - Could use API layer

### Low Priority
7. All route components - Could benefit from API layer abstraction

## ✅ What's Already Good

- Good separation of concerns in moderation system (`lib/moderation/`)
- Utilities are well-organized (`lib/utils/`)
- Components are generally well-structured
- Good use of Svelte stores for state management
- Comprehensive documentation (SUPABASE_SCHEMA.md, etc.)

## 🚀 Next Steps

1. Review this document
2. Prioritize refactoring tasks
3. Start with Phase 1 (quick wins)
4. Create issues/tasks for Phase 2-4
5. Test after each refactoring phase

