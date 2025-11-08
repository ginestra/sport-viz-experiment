/**
 * Thread API - Centralized thread database operations
 */

import { supabase } from '../supabase/client.js';
import { THREAD_STATUS } from '../constants/collaborative.js';

/**
 * Get all threads
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getThreads() {
  try {
    const { data, error } = await supabase
      .from('writing_threads')
      .select(`
        *,
        thread_participants(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Check if it's a table not found error
      if (error.message && error.message.includes('schema cache')) {
        return {
          data: null,
          error: {
            message: 'Database not set up yet. Please run the SQL schema from SUPABASE_SCHEMA.md in your Supabase SQL Editor.',
            code: 'SCHEMA_NOT_FOUND'
          }
        };
      }
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error loading threads:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to load threads',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Get a single thread by ID
 * @param {string} threadId - Thread UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getThread(threadId) {
  if (!threadId) {
    return {
      data: null,
      error: { message: 'Thread ID is required', code: 'MISSING_ID' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('writing_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { data: null, error: { message: 'Thread not found', code: 'NOT_FOUND' } };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error loading thread:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to load thread',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Create a new thread
 * @param {Object} threadData - Thread data (theme, min_participants, max_participants, created_by)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createThread(threadData) {
  if (!threadData.theme || !threadData.created_by) {
    return {
      data: null,
      error: { message: 'Theme and created_by are required', code: 'MISSING_FIELDS' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('writing_threads')
      .insert({
        theme: threadData.theme,
        min_participants: threadData.min_participants || 2,
        max_participants: threadData.max_participants || 5,
        created_by: threadData.created_by,
        status: THREAD_STATUS.WAITING
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error creating thread:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to create thread',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Update a thread
 * @param {string} threadId - Thread UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateThread(threadId, updates) {
  if (!threadId) {
    return {
      data: null,
      error: { message: 'Thread ID is required', code: 'MISSING_ID' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('writing_threads')
      .update(updates)
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error updating thread:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to update thread',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Open a thread (change status from waiting to active)
 * @param {string} threadId - Thread UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function openThread(threadId) {
  return updateThread(threadId, { status: THREAD_STATUS.ACTIVE });
}

/**
 * Subscribe to thread changes
 * @param {Function} callback - Callback function to call on changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToThreads(callback) {
  const subscription = supabase
    .channel('threads_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'writing_threads' },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Subscribe to a specific thread's changes
 * @param {string} threadId - Thread UUID
 * @param {Object} callbacks - Object with callback functions (onThreadUpdate, onParticipantChange, onPostChange)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToThread(threadId, callbacks = {}) {
  const channel = supabase.channel(`thread_${threadId}`);

  if (callbacks.onPostChange) {
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: 'thread_posts', filter: `thread_id=eq.${threadId}` },
      callbacks.onPostChange
    );
  }

  if (callbacks.onParticipantChange) {
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: 'thread_participants', filter: `thread_id=eq.${threadId}` },
      callbacks.onParticipantChange
    );
  }

  if (callbacks.onThreadUpdate) {
    channel.on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'writing_threads', filter: `id=eq.${threadId}` },
      callbacks.onThreadUpdate
    );
  }

  channel.subscribe();

  return () => {
    channel.unsubscribe();
  };
}

