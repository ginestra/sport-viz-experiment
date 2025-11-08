# Moderation System Documentation

This document describes the moderation system implemented for the collaborative writing platform.

## Overview

The moderation system provides tools for super admins and moderators to maintain a safe and respectful community. It includes user warnings, blocking, post flagging, and post removal capabilities.

## Roles

### User (Default)
- Can create threads and posts
- Can flag posts
- Can see their own warnings
- Cannot access moderation panel

### Moderator
- All user permissions
- Can warn users
- Can block/unblock users
- Can view and manage flagged posts
- Can dismiss flags
- Cannot remove posts (super admin only)

### Super Admin
- All moderator permissions
- Can remove posts
- Can assign roles to users
- Full access to all moderation features

## Features

### 1. User Warnings (Yellow Card System)

**Purpose**: Warn users about rule violations with the ability to rectify.

**How it works**:
- Moderators and admins can issue warnings to users
- Warnings are displayed prominently to the user
- Users can mark warnings as resolved after rectifying their actions
- Warnings can be linked to specific posts or threads

**Database Table**: `user_warnings`
- `user_id`: User being warned
- `warned_by`: Moderator/admin issuing warning
- `reason`: Explanation of the violation
- `post_id`: Optional related post
- `thread_id`: Optional related thread
- `is_resolved`: Whether user has resolved the issue
- `resolved_at`: When warning was resolved

**UI Components**:
- `UserWarningBanner.svelte`: Displays active warnings to users
- Moderation panel: Allows creating warnings

### 2. User Blocking

**Purpose**: Prevent users from creating new content when they violate rules.

**How it works**:
- Moderators and admins can block users
- Blocked users cannot create threads or posts
- Blocked users see a banner explaining their block status
- Blocks can be removed (unblocked) by moderators/admins

**Database Table**: `user_blocks`
- `user_id`: User being blocked
- `blocked_by`: Moderator/admin issuing block
- `reason`: Explanation of the block
- `is_active`: Whether block is currently active
- `blocked_at`: When block was issued
- `unblocked_at`: When block was removed

**UI Components**:
- `BlockedUserBanner.svelte`: Displays block status to users
- Moderation panel: Allows blocking/unblocking users

### 3. Post Flagging

**Purpose**: Allow users to report problematic content.

**How it works**:
- Any user can flag a post
- Users can only flag a post once
- Flags are reviewed by moderators/admins
- Flag status can be: pending, reviewed, resolved, dismissed

**Database Table**: `post_flags`
- `post_id`: Post being flagged
- `flagged_by`: User who flagged
- `reason`: Reason for flagging
- `status`: Current status of flag
- `reviewed_by`: Moderator/admin who reviewed
- `reviewed_at`: When flag was reviewed

**UI Components**:
- `FlagPostButton.svelte`: Button to flag posts
- Moderation panel: Shows all pending flags

**Flag Reasons**:
- Spam or advertising
- Inappropriate content
- Harassment or bullying
- Plagiarism
- Off-topic
- Other

### 4. Post Removal

**Purpose**: Remove posts that violate rules (super admin only).

**How it works**:
- Only super admins can remove posts
- Removed posts are marked but not deleted (for audit trail)
- Removal reason is recorded
- Removed posts are hidden from normal view

**Database Fields** (in `thread_posts`):
- `is_removed`: Boolean flag
- `removed_by`: Admin who removed
- `removed_at`: When post was removed
- `removal_reason`: Why post was removed

**UI**: Moderation panel (super admin only)

## Moderation Panel

**Route**: `/collaborative/moderation`

**Access**: Moderators and super admins only

**Features**:
1. **Flagged Posts Tab**
   - View all pending flags
   - See post content and flag details
   - Actions: Remove post (admin only), Warn user, Block user, Dismiss flag

2. **Warn User Tab**
   - Form to issue warnings
   - Can link to specific posts/threads
   - Requires user ID/email and reason

3. **Blocked Users Tab**
   - View all currently blocked users
   - See block reasons and details
   - Unblock users

## Database Schema

See `SUPABASE_SCHEMA.md` for complete schema details.

### Key Tables:
- `user_roles`: Stores user roles (user, moderator, super_admin)
- `user_warnings`: Stores warnings issued to users
- `user_blocks`: Stores user blocks
- `post_flags`: Stores post flags
- `thread_posts`: Extended with removal fields

## Row Level Security (RLS)

RLS policies ensure:
- Users can only see their own warnings/blocks
- Moderators/admins can see all warnings/blocks
- Users can create flags
- Only moderators/admins can manage flags
- Only super admins can remove posts

## API Functions

### Roles (`src/lib/moderation/roles.js`)
- `getUserRole(userId)`: Get user's role
- `isModeratorOrAdmin(userId)`: Check if user is moderator/admin
- `isSuperAdmin(userId)`: Check if user is super admin

### Warnings (`src/lib/moderation/warnings.js`)
- `getUserWarnings(userId)`: Get all warnings for user
- `getActiveWarnings(userId)`: Get unresolved warnings
- `warnUser(userId, reason, postId, threadId)`: Issue warning
- `resolveWarning(warningId)`: Mark warning as resolved

### Blocks (`src/lib/moderation/blocks.js`)
- `isUserBlocked(userId)`: Check if user is blocked
- `getUserBlock(userId)`: Get block information
- `blockUser(userId, reason)`: Block a user
- `unblockUser(userId)`: Unblock a user
- `getAllBlockedUsers()`: Get all blocked users

### Flags (`src/lib/moderation/flags.js`)
- `flagPost(postId, reason)`: Flag a post
- `getPostFlags(postId)`: Get flags for a post
- `getPendingFlags()`: Get all pending flags
- `updateFlagStatus(flagId, status)`: Update flag status

## Setup Instructions

### 1. Database Setup

Run the SQL from `SUPABASE_SCHEMA.md` in your Supabase SQL editor to create:
- Tables: `user_roles`, `user_warnings`, `user_blocks`, `post_flags`
- RLS policies
- Indexes
- Functions

### 2. Assign Initial Super Admin

```sql
-- Replace 'your-user-id' with your actual user ID
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES ('your-user-id', 'super_admin', 'your-user-id');
```

### 3. Assign Moderators

```sql
-- Replace 'moderator-user-id' with moderator's user ID
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES ('moderator-user-id', 'moderator', 'your-user-id');
```

## Usage Workflow

### Warning a User
1. Go to Moderation Panel → Warn User tab
2. Enter user ID/email
3. Enter reason
4. Optionally link to post/thread
5. Submit

### Blocking a User
1. Go to Moderation Panel → Blocked Users tab
2. Click "Block New User"
3. Enter user ID/email and reason
4. Submit

### Handling Flagged Posts
1. Go to Moderation Panel → Flagged Posts tab
2. Review flagged post
3. Choose action:
   - Remove Post (admin only)
   - Warn User
   - Block User
   - Dismiss Flag

### Removing a Post
1. In Flagged Posts tab, click "Remove Post"
2. Enter removal reason
3. Confirm

## Security Considerations

- All moderation actions are logged with user IDs
- RLS policies prevent unauthorized access
- Role checks are performed both client-side and server-side
- Blocked users are prevented from creating content
- Removed posts are preserved for audit trail

## Future Enhancements

Consider adding:
- Automatic unblocking after time period
- Warning escalation (multiple warnings → auto-block)
- Email notifications for warnings/blocks
- Moderation activity dashboard
- Appeal system for blocks
- Bulk moderation actions

