import { supabase } from '../supabase/client.js';
import { user } from '../../stores/auth.js';
import { get } from 'svelte/store';

/**
 * Check if a user is blocked
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isUserBlocked(userId) {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking block status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error in isUserBlocked:', err);
    return false;
  }
}

/**
 * Get block information for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getUserBlock(userId) {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        *,
        blocked_by_user:auth.users!user_blocks_blocked_by_fkey(email)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching block:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getUserBlock:', err);
    return null;
  }
}

/**
 * Block a user
 * @param {string} userId - User ID to block
 * @param {string} reason - Reason for blocking
 * @returns {Promise<{data, error}>}
 */
export async function blockUser(userId, reason) {
  const currentUser = get(user);
  if (!currentUser) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    // First, deactivate any existing blocks
    await supabase
      .from('user_blocks')
      .update({ is_active: false, unblocked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Create new block
    const { data, error } = await supabase
      .from('user_blocks')
      .insert({
        user_id: userId,
        blocked_by: currentUser.id,
        reason,
        is_active: true
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error blocking user:', err);
    return { data: null, error: err };
  }
}

/**
 * Unblock a user
 * @param {string} userId - User ID to unblock
 * @returns {Promise<{data, error}>}
 */
export async function unblockUser(userId) {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .update({
        is_active: false,
        unblocked_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error unblocking user:', err);
    return { data: null, error: err };
  }
}

/**
 * Get all blocked users
 * @returns {Promise<Array>}
 */
export async function getAllBlockedUsers() {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        *,
        user:auth.users!user_blocks_user_id_fkey(email),
        blocked_by_user:auth.users!user_blocks_blocked_by_fkey(email)
      `)
      .eq('is_active', true)
      .order('blocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching blocked users:', err);
    return [];
  }
}

