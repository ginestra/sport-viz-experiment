# Collaborative Writing Feature - Testing Checklist

## Authentication Flow

### Sign Up
- [ ] Can create account with email/password
- [ ] Consent checkbox is required
- [ ] Privacy Policy and Terms links work
- [ ] Error handling for invalid email/password
- [ ] Error handling for existing email
- [ ] Redirects to collaborative page after signup

### Sign In
- [ ] Can sign in with email/password
- [ ] Error handling for wrong credentials
- [ ] Redirects to collaborative page after signin
- [ ] Session persists on page refresh

### OAuth (GitHub/Google)
- [ ] GitHub OAuth button works (if enabled)
- [ ] Google OAuth button works (if enabled)
- [ ] Redirects correctly after OAuth
- [ ] User state is properly set after OAuth
- [ ] Error message shows if provider not enabled

### Sign Out
- [ ] Sign out button works
- [ ] Redirects to home page
- [ ] Session is cleared

## Thread Management

### Create Thread
- [ ] Can create thread when logged in
- [ ] Cannot create thread when not logged in
- [ ] Cannot create thread when blocked
- [ ] Theme validation (required, max 200 chars)
- [ ] Min participants validation (2-50)
- [ ] Max participants validation (>= min, max 50)
- [ ] Creator automatically joins thread
- [ ] Redirects to thread page after creation
- [ ] Thread appears in thread list

### View Thread List
- [ ] Shows all threads when logged in
- [ ] Shows empty state when no threads
- [ ] Shows error if database not set up
- [ ] Real-time updates when new threads created
- [ ] Thread cards show correct information
- [ ] Can click thread to view details

### Join Thread
- [ ] Can join waiting thread
- [ ] Cannot join if already participant
- [ ] Cannot join if blocked
- [ ] Cannot join if thread is full
- [ ] Thread auto-opens when min participants reached
- [ ] Turn orders assigned correctly
- [ ] Real-time update when someone joins

## Posting

### Create Post
- [ ] Can only post when it's your turn
- [ ] Cannot post if not participant
- [ ] Cannot post if thread is waiting
- [ ] Word count validation (max 500 words)
- [ ] Word count updates in real-time
- [ ] Plagiarism checkbox is required
- [ ] Can add multiple sources
- [ ] Can remove sources
- [ ] Post appears immediately after submission
- [ ] Turn passes to next participant after posting
- [ ] Cannot post again until next turn

### View Posts
- [ ] Posts display in correct order
- [ ] Shows post author
- [ ] Shows sources if provided
- [ ] Shows plagiarism confirmation badge
- [ ] Shows post date/time
- [ ] Real-time updates when new posts added
- [ ] Removed posts don't show (unless admin)

## Turn-Based System

### Turn Order
- [ ] Turn order is based on join order
- [ ] First post is from turn_order 0
- [ ] Turns cycle correctly through participants
- [ ] Correct user can post at correct time
- [ ] Other users see "waiting for your turn" message

### Thread Status
- [ ] Thread starts as "waiting"
- [ ] Thread changes to "active" when min participants join
- [ ] Database trigger auto-opens thread
- [ ] Turn orders assigned when thread opens

## Moderation Features

### User Warnings
- [ ] Warning banner shows for warned users
- [ ] Can resolve warning
- [ ] Warning disappears after resolution
- [ ] Moderators can create warnings
- [ ] Users can see their own warnings

### User Blocks
- [ ] Blocked users see block banner
- [ ] Blocked users cannot create threads
- [ ] Blocked users cannot join threads
- [ ] Blocked users cannot post
- [ ] Moderators can block users

### Post Flagging
- [ ] Users can flag posts
- [ ] Flag button appears on posts
- [ ] Cannot flag own posts (or can?)
- [ ] Moderators see flagged posts
- [ ] Moderators can review flags

### Moderation Dashboard
- [ ] Only moderators/admins can access
- [ ] Shows list of warnings
- [ ] Shows list of blocks
- [ ] Shows list of flagged posts
- [ ] Can create warnings
- [ ] Can block users
- [ ] Can remove posts

## Account Management

### Account Settings
- [ ] Can access settings page
- [ ] Shows user email
- [ ] Can export user data
- [ ] Can delete account
- [ ] Account deletion requires confirmation
- [ ] Account deletion works via API

## Real-Time Updates

### Thread List
- [ ] Updates when new thread created
- [ ] Updates when thread status changes
- [ ] Updates when participants join

### Thread View
- [ ] Updates when new post added
- [ ] Updates when participant joins
- [ ] Updates when thread status changes
- [ ] Updates when turn changes

## Error Handling

### Network Errors
- [ ] Graceful error messages
- [ ] Retry options where appropriate
- [ ] No crashes on errors

### Validation Errors
- [ ] Clear error messages
- [ ] Errors show in UI
- [ ] Form validation prevents invalid submissions

### Permission Errors
- [ ] Clear messages for unauthorized actions
- [ ] Redirects to login if needed
- [ ] Shows appropriate error for blocked users

## Edge Cases

### Empty States
- [ ] Empty thread list shows helpful message
- [ ] Empty thread shows waiting message
- [ ] No posts shows appropriate message

### Boundary Conditions
- [ ] Min participants (2)
- [ ] Max participants (50)
- [ ] Max words (500)
- [ ] Empty content
- [ ] Very long content

### Concurrent Actions
- [ ] Multiple users joining simultaneously
- [ ] Multiple users posting simultaneously
- [ ] Thread opening while users viewing

## UI/UX

### Loading States
- [ ] Loading indicators show during operations
- [ ] Buttons disabled during submission
- [ ] No double submissions

### Responsive Design
- [ ] Works on mobile
- [ ] Works on tablet
- [ ] Works on desktop

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Focus states visible

## Security

### Authentication
- [ ] Cannot access protected routes without login
- [ ] Session expires appropriately
- [ ] OAuth redirects are secure

### Data Access
- [ ] Users can only see their own data
- [ ] RLS policies work correctly
- [ ] Cannot access other users' posts
- [ ] Cannot modify other users' posts

## Performance

### Loading
- [ ] Pages load quickly
- [ ] Real-time updates don't cause lag
- [ ] Large thread lists render efficiently

