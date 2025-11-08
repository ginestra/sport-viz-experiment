import { supabase } from '../supabase/client.js';
import { user } from '../../stores/auth.js';
import { get } from 'svelte/store';

/**
 * Flag a post
 * @param {string} postId - Post ID to flag
 * @param {string} reason - Reason for flagging
 * @returns {Promise<{data, error}>}
 */
export async function flagPost(postId, reason) {
  const currentUser = get(user);
  if (!currentUser) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    // Check if user has already flagged this post
    const { data: existing } = await supabase
      .from('post_flags')
      .select('id')
      .eq('post_id', postId)
      .eq('flagged_by', currentUser.id)
      .single();

    if (existing) {
      return { data: null, error: { message: 'You have already flagged this post' } };
    }

    const { data, error } = await supabase
      .from('post_flags')
      .insert({
        post_id: postId,
        flagged_by: currentUser.id,
        reason,
        status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error flagging post:', err);
    return { data: null, error: err };
  }
}

/**
 * Get flags for a post
 * @param {string} postId - Post ID
 * @returns {Promise<Array>}
 */
export async function getPostFlags(postId) {
  try {
    const { data, error } = await supabase
      .from('post_flags')
      .select(`
        *,
        flagged_by_user:auth.users!post_flags_flagged_by_fkey(email)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching flags:', err);
    return [];
  }
}

/**
 * Get all pending flags
 * @returns {Promise<Array>}
 */
export async function getPendingFlags() {
  try {
    const { data, error } = await supabase
      .from('post_flags')
      .select(`
        *,
        post:thread_posts(id, content, thread_id, user_id),
        flagged_by_user:auth.users!post_flags_flagged_by_fkey(email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching pending flags:', err);
    return [];
  }
}

/**
 * Update flag status (for moderators/admins)
 * @param {string} flagId - Flag ID
 * @param {string} status - New status ('reviewed', 'resolved', 'dismissed')
 * @returns {Promise<{data, error}>}
 */
export async function updateFlagStatus(flagId, status) {
  const currentUser = get(user);
  if (!currentUser) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    const { data, error } = await supabase
      .from('post_flags')
      .update({
        status,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', flagId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error updating flag status:', err);
    return { data: null, error: err };
  }
}

