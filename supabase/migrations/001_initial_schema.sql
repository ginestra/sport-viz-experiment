-- Collaborative Writing Platform - Complete Database Schema
-- Run this entire file in Supabase SQL Editor (one click!)

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: writing_threads
CREATE TABLE IF NOT EXISTS writing_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL,
  min_participants INTEGER NOT NULL DEFAULT 2,
  max_participants INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE
);

-- Table: thread_participants
CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES writing_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  turn_order INTEGER,
  UNIQUE(thread_id, user_id)
);

-- Table: thread_posts
CREATE TABLE IF NOT EXISTS thread_posts (
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

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: user_roles (Moderation System)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'super_admin')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: user_warnings (Moderation System)
CREATE TABLE IF NOT EXISTS user_warnings (
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

-- Table: user_blocks (Moderation System)
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unblocked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Table: post_flags (Moderation System)
CREATE TABLE IF NOT EXISTS post_flags (
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

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_thread_participants_user_id ON thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_posts_thread_id ON thread_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_posts_user_id ON thread_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_user_id ON user_blocks(user_id);
-- Partial unique index: only one active block per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_blocks_active_unique ON user_blocks(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_post_flags_post_id ON post_flags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_flags_status ON post_flags(status);

-- ============================================
-- 3. CREATE FUNCTIONS
-- ============================================

-- Function: Check if user is admin/moderator
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

-- Function: Get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM user_roles WHERE user_id = user_uuid),
    'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is participant in thread (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_thread_participant(thread_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM thread_participants
    WHERE thread_id = thread_uuid
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-open thread when minimum participants join
-- SECURITY DEFINER allows the function to bypass RLS when updating records
CREATE OR REPLACE FUNCTION check_and_open_thread()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  thread_record writing_threads%ROWTYPE;
  participant_count INTEGER;
BEGIN
  -- Get the thread information
  SELECT * INTO thread_record
  FROM writing_threads
  WHERE id = NEW.thread_id;

  -- Count current participants
  SELECT COUNT(*) INTO participant_count
  FROM thread_participants
  WHERE thread_id = NEW.thread_id;

  -- If thread is waiting and we've reached minimum participants, open it
  IF thread_record.status = 'waiting' AND participant_count >= thread_record.min_participants THEN
    -- Assign turn orders to all participants
    UPDATE thread_participants
    SET turn_order = subquery.row_number - 1
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at) as row_number
      FROM thread_participants
      WHERE thread_id = NEW.thread_id
    ) AS subquery
    WHERE thread_participants.id = subquery.id;

    -- Update thread status
    UPDATE writing_threads
    SET status = 'active',
        opened_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-open thread when participant joins
DROP TRIGGER IF EXISTS trigger_auto_open_thread ON thread_participants;
CREATE TRIGGER trigger_auto_open_thread
  AFTER INSERT ON thread_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_and_open_thread();

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE writing_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_flags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE ROW LEVEL SECURITY POLICIES
-- ============================================

-- Drop existing policies if they exist (for re-running the migration)
DROP POLICY IF EXISTS "Users can read threads they participate in" ON writing_threads;
DROP POLICY IF EXISTS "Users can read all threads" ON writing_threads;
DROP POLICY IF EXISTS "Users can create threads" ON writing_threads;
DROP POLICY IF EXISTS "Users can update threads they created" ON writing_threads;
DROP POLICY IF EXISTS "Users can read participants in threads they're in" ON thread_participants;
DROP POLICY IF EXISTS "Users can read participants in accessible threads" ON thread_participants;
DROP POLICY IF EXISTS "Users can read participants" ON thread_participants;
DROP POLICY IF EXISTS "Users can join threads" ON thread_participants;
DROP POLICY IF EXISTS "Users can read non-removed posts in threads they participate in" ON thread_posts;
DROP POLICY IF EXISTS "Users can create posts in threads they participate in" ON thread_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON thread_posts;
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Only super_admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Only super_admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read their own warnings" ON user_warnings;
DROP POLICY IF EXISTS "Moderators and admins can create warnings" ON user_warnings;
DROP POLICY IF EXISTS "Users can update their own warnings to resolve" ON user_warnings;
DROP POLICY IF EXISTS "Users can read their own block status" ON user_blocks;
DROP POLICY IF EXISTS "Moderators and admins can create/update blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can create flags" ON post_flags;
DROP POLICY IF EXISTS "Users can read flags they created" ON post_flags;
DROP POLICY IF EXISTS "Moderators and admins can update flag status" ON post_flags;

-- Policies for writing_threads
-- Allow all authenticated users to read threads so they can discover and join them
CREATE POLICY "Users can read all threads"
  ON writing_threads FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    OR is_admin_or_moderator(auth.uid())
  );

CREATE POLICY "Users can create threads"
  ON writing_threads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update threads they created"
  ON writing_threads FOR UPDATE
  USING (created_by = auth.uid() OR is_admin_or_moderator(auth.uid()));

-- Policies for thread_participants
-- Use SECURITY DEFINER function to check participation without RLS recursion
CREATE POLICY "Users can read participants in threads they're in"
  ON thread_participants FOR SELECT
  USING (
    -- User is the participant themselves
    user_id = auth.uid()
    -- Or user is a participant in this thread (using function to avoid recursion)
    OR is_thread_participant(thread_participants.thread_id, auth.uid())
    -- Or user created the thread
    OR EXISTS (
      SELECT 1 FROM writing_threads
      WHERE writing_threads.id = thread_participants.thread_id
      AND writing_threads.created_by = auth.uid()
    )
    -- Or user is admin/moderator
    OR is_admin_or_moderator(auth.uid())
  );

CREATE POLICY "Users can join threads"
  ON thread_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record"
  ON thread_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for thread_posts
-- Use SECURITY DEFINER function to avoid RLS recursion
CREATE POLICY "Users can read non-removed posts in threads they participate in"
  ON thread_posts FOR SELECT
  USING (
    (is_removed = false AND is_thread_participant(thread_posts.thread_id, auth.uid()))
    OR is_admin_or_moderator(auth.uid())
  );

CREATE POLICY "Users can create posts in threads they participate in"
  ON thread_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_thread_participant(thread_posts.thread_id, auth.uid())
  );

CREATE POLICY "Users can update their own posts"
  ON thread_posts FOR UPDATE
  USING (user_id = auth.uid() OR is_admin_or_moderator(auth.uid()));

-- Policies for user_roles
CREATE POLICY "Users can read their own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_moderator(auth.uid()));

CREATE POLICY "Only super_admins can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
  );

CREATE POLICY "Only super_admins can update roles"
  ON user_roles FOR UPDATE
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Policies for user_warnings
CREATE POLICY "Users can read their own warnings"
  ON user_warnings FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators and admins can create warnings"
  ON user_warnings FOR INSERT
  WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can update their own warnings to resolve"
  ON user_warnings FOR UPDATE
  USING (
    (user_id = auth.uid() AND is_resolved = false)
    OR is_admin_or_moderator(auth.uid())
  );

-- Policies for user_blocks
CREATE POLICY "Users can read their own block status"
  ON user_blocks FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators and admins can create/update blocks"
  ON user_blocks FOR ALL
  USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Policies for post_flags
CREATE POLICY "Users can create flags"
  ON post_flags FOR INSERT
  WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Users can read flags they created"
  ON post_flags FOR SELECT
  USING (flagged_by = auth.uid() OR is_admin_or_moderator(auth.uid()));

CREATE POLICY "Moderators and admins can update flag status"
  ON post_flags FOR UPDATE
  USING (is_admin_or_moderator(auth.uid()));

-- Policies for user_profiles
CREATE POLICY "Users can read all profiles"
  ON user_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DONE! 
-- ============================================
-- 
-- IMPORTANT: After running this migration:
-- 1. Assign yourself as super_admin (see below)
-- 2. The database trigger will automatically open threads when minimum participants join
--
-- Assign yourself as super_admin:
-- 1. Go to Authentication > Users in Supabase dashboard
-- 2. Find your user and copy the User UID
-- 3. Run this SQL (replace 'your-user-id-here' with your actual UID):
--
-- INSERT INTO user_roles (user_id, role, assigned_by)
-- VALUES ('your-user-id-here', 'super_admin', 'your-user-id-here');
-- ============================================

