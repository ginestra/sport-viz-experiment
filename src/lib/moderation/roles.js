import { supabase } from '../supabase/client.js';
import { user } from '../../stores/auth.js';
import { get } from 'svelte/store';

let roleCache = new Map();

/**
 * Get the role of a user
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<string>} - User role ('user', 'moderator', or 'super_admin')
 */
export async function getUserRole(userId = null) {
  const targetUserId = userId || get(user)?.id;
  if (!targetUserId) return 'user';

  // Check cache first
  if (roleCache.has(targetUserId)) {
    return roleCache.get(targetUserId);
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user role:', error);
      return 'user';
    }

    const role = data?.role || 'user';
    roleCache.set(targetUserId, role);
    return role;
  } catch (err) {
    console.error('Error in getUserRole:', err);
    return 'user';
  }
}

/**
 * Check if user is a moderator or admin
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<boolean>}
 */
export async function isModeratorOrAdmin(userId = null) {
  const role = await getUserRole(userId);
  return role === 'moderator' || role === 'super_admin';
}

/**
 * Check if user is a super admin
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<boolean>}
 */
export async function isSuperAdmin(userId = null) {
  const role = await getUserRole(userId);
  return role === 'super_admin';
}

/**
 * Check if user is a moderator
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<boolean>}
 */
export async function isModerator(userId = null) {
  const role = await getUserRole(userId);
  return role === 'moderator';
}

/**
 * Clear role cache for a user
 * @param {string} userId - User ID
 */
export function clearRoleCache(userId) {
  roleCache.delete(userId);
}

/**
 * Clear all role cache
 */
export function clearAllRoleCache() {
  roleCache.clear();
}

