# Supabase Database Schema

This document describes the database schema for the collaborative writing platform, including the moderation system.

## Tables

### 1. writing_threads
```sql
CREATE TABLE writing_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL,
  min_participants INTEGER NOT NULL DEFAULT 2,
  max_participants INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE
);
```

### 2. thread_participants
```sql
CREATE TABLE thread_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES writing_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  turn_order INTEGER,
  UNIQUE(thread_id, user_id)
);
```

### 3. thread_posts
```sql
CREATE TABLE thread_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES writing_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  plagiarism_confirmed BOOLEAN NOT NULL DEFAULT false,
  post_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_removed BOOLEAN NOT NULL DEFAULT false,
  removed_by UUID REFERENCES auth.users(id),
  removed_at TIMESTAMP WITH TIME ZONE,
  removal_reason TEXT
);
```

### 4. user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 5. user_roles (Moderation System)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'super_admin')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 6. user_warnings (Moderation System)
```sql
CREATE TABLE user_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  post_id UUID REFERENCES thread_posts(id),
  thread_id UUID REFERENCES writing_threads(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false
);
```

### 7. user_blocks (Moderation System)
```sql
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unblocked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Partial unique index: only one active block per user
CREATE UNIQUE INDEX idx_user_blocks_active_unique ON user_blocks(user_id) WHERE is_active = true;
```

### 8. post_flags (Moderation System)
```sql
CREATE TABLE post_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES thread_posts(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, flagged_by)
);
```

## Row Level Security (RLS) Policies

### writing_threads
- All authenticated users can read all threads (to discover and join them)
- Users can create threads
- Users can update threads they created
- Moderators and admins can read all threads

### user_profiles
- All authenticated users can read all profiles
- Users can create their own profile
- Users can update their own profile

### thread_posts
- Users can read non-removed posts in threads they participate in
- Users can create posts in threads they participate in
- Users can update their own posts
- Moderators and admins can read all posts (including removed)
- Only admins can remove posts

### user_roles
- Users can read their own role
- Only super_admins can read all roles
- Only super_admins can assign roles

### user_warnings
- Users can read their own warnings
- Moderators and admins can read all warnings
- Only moderators and admins can create warnings
- Users can update their own warnings to mark as resolved

### user_blocks
- Users can read their own block status
- Moderators and admins can read all blocks
- Only moderators and admins can create/update blocks

### post_flags
- Users can create flags
- Users can read flags they created
- Moderators and admins can read all flags
- Only moderators and admins can update flag status

## Indexes

```sql
CREATE INDEX idx_thread_participants_user_id ON thread_participants(user_id);
CREATE INDEX idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX idx_thread_posts_thread_id ON thread_posts(thread_id);
CREATE INDEX idx_thread_posts_user_id ON thread_posts(user_id);
CREATE INDEX idx_user_warnings_user_id ON user_warnings(user_id);
CREATE INDEX idx_user_blocks_user_id ON user_blocks(user_id);
CREATE INDEX idx_post_flags_post_id ON post_flags(post_id);
CREATE INDEX idx_post_flags_status ON post_flags(status);
```

## Functions

### Check if user is admin/moderator
```sql
CREATE OR REPLACE FUNCTION is_admin_or_moderator(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND role IN ('moderator', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Get user role
```sql
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM user_roles WHERE user_id = user_uuid),
    'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

