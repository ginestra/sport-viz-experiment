import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    // Initialize Supabase client with anon key for token verification
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = user.id;

    // Initialize admin client with service role key for deletion
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Delete user data in correct order (respecting foreign key constraints)
    // 1. Delete user's posts
    const { error: postsError } = await supabaseAdmin
      .from('thread_posts')
      .delete()
      .eq('user_id', userId);

    if (postsError) {
      console.error('Error deleting posts:', postsError);
      return res.status(500).json({ error: 'Failed to delete user posts' });
    }

    // 2. Delete user's thread participations
    const { error: participantsError } = await supabaseAdmin
      .from('thread_participants')
      .delete()
      .eq('user_id', userId);

    if (participantsError) {
      console.error('Error deleting participations:', participantsError);
      return res.status(500).json({ error: 'Failed to delete user participations' });
    }

    // 3. Handle threads created by user
    const { data: userThreads } = await supabaseAdmin
      .from('writing_threads')
      .select('id')
      .eq('created_by', userId);

    if (userThreads && userThreads.length > 0) {
      for (const thread of userThreads) {
        // Check if thread has other participants
        const { data: participants } = await supabaseAdmin
          .from('thread_participants')
          .select('user_id')
          .eq('thread_id', thread.id);

        // Delete thread (even if it has participants, as per GDPR right to erasure)
        // In a production system, you might want to transfer ownership instead
        const { error: threadError } = await supabaseAdmin
          .from('writing_threads')
          .delete()
          .eq('id', thread.id);

        if (threadError) {
          console.error('Error deleting thread:', threadError);
          // Continue with other deletions even if one fails
        }
      }
    }

    // 4. Delete user's auth account
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user account:', deleteError);
      return res.status(500).json({ error: 'Failed to delete user account' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Account and all associated data have been permanently deleted' 
    });

  } catch (error) {
    console.error('Error in delete-account handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

