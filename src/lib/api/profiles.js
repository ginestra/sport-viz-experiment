/**
 * Profile API functions for loading user profiles
 */

import { supabase } from '../supabase/client.js';

/**
 * Load profiles for multiple users
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Map of user_id -> display_name
 */
export async function loadProfiles(userIds) {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  try {
    const { data: profilesData, error } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    if (error) {
      console.error('Error loading profiles:', error);
      return {};
    }

    // Convert array to map for easier lookup
    const profilesMap = {};
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap[profile.user_id] = profile.display_name;
      });
    }

    return profilesMap;
  } catch (err) {
    console.error('Error loading profiles:', err);
    return {};
  }
}

/**
 * Load a single user's profile
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Profile object or null
 */
export async function loadProfile(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not an error)
      if (error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error loading profile:', err);
    return null;
  }
}

/**
 * Ensure user has a profile (create default if missing)
 * @param {string} userId - User ID
 * @param {string} email - User email (for default display name)
 * @returns {Promise<Object>} Profile object
 */
export async function ensureProfile(userId, email) {
  if (!userId) return null;

  // Check if profile exists
  let profile = await loadProfile(userId);

  // If no profile exists, create one with email username as default
  if (!profile && email) {
    const defaultName = email.split('@')[0];
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: defaultName
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    profile = data;
  }

  return profile;
}

