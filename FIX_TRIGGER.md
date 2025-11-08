# Fix Database Trigger Issue

## Problem
The database trigger `check_and_open_thread` is not automatically opening threads and assigning turn orders when participants join.

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- 1. Make sure the function is SECURITY DEFINER (bypasses RLS)
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

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_open_thread ON thread_participants;
CREATE TRIGGER trigger_auto_open_thread
  AFTER INSERT ON thread_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_and_open_thread();

-- 3. Add UPDATE policy for thread_participants (fallback)
DROP POLICY IF EXISTS "Users can update their own participant record" ON thread_participants;
CREATE POLICY "Users can update their own participant record"
  ON thread_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Verify It Works

After running the SQL:

1. Create a new thread with `min_participants: 2`
2. Have two users join
3. Check that:
   - Thread status changes to "active"
   - Both participants have `turn_order` values (0 and 1)
   - The first user (turn_order 0) can post

## Test

Run the test script:
```bash
npm run test:flow
```

All tests should pass once the trigger is working correctly.

