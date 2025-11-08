import { supabase } from '../supabase/client.js';
import { user } from '../../stores/auth.js';
import { get } from 'svelte/store';

/**
 * Get warnings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getUserWarnings(userId) {
  try {
    const { data, error } = await supabase
      .from('user_warnings')
      .select(`
        *,
        warned_by_user:auth.users!user_warnings_warned_by_fkey(email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching warnings:', err);
    return [];
  }
}

/**
 * Get active (unresolved) warnings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getActiveWarnings(userId) {
  try {
    const { data, error } = await supabase
      .from('user_warnings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching active warnings:', err);
    return [];
  }
}

/**
 * Create a warning for a user
 * @param {string} userId - User ID to warn
 * @param {string} reason - Reason for warning
 * @param {string} postId - Optional post ID related to warning
 * @param {string} threadId - Optional thread ID related to warning
 * @returns {Promise<{data, error}>}
 */
export async function warnUser(userId, reason, postId = null, threadId = null) {
  const currentUser = get(user);
  if (!currentUser) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    const { data, error } = await supabase
      .from('user_warnings')
      .insert({
        user_id: userId,
        warned_by: currentUser.id,
        reason,
        post_id: postId,
        thread_id: threadId
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error creating warning:', err);
    return { data: null, error: err };
  }
}

/**
 * Resolve a warning (user has rectified the issue)
 * @param {string} warningId - Warning ID
 * @returns {Promise<{data, error}>}
 */
export async function resolveWarning(warningId) {
  try {
    const { data, error } = await supabase
      .from('user_warnings')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', warningId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error resolving warning:', err);
    return { data: null, error: err };
  }
}

