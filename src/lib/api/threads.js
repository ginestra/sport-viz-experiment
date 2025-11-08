/**
 * Thread API - Centralized thread database operations
 * 
 * @module api/threads
 */

import { supabase } from '../supabase/client.js';
import { THREAD_STATUS } from '../constants/collaborative.js';
import { handleApiError, logError, ERROR_CODES } from '../utils/errors.js';

/**
 * Get all threads
 * @returns {Promise<{data: Array<Object>|null, error: {message: string, code: string}|null}>}
 * @example
 * const { data, error } = await getThreads();
 * if (error) {
 *   console.error('Failed to load threads:', error.message);
 * } else {
 *   console.log('Loaded threads:', data);
 * }
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
            code: ERROR_CODES.SCHEMA_NOT_FOUND
          }
        };
      }
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    logError(err, 'getThreads');
    return handleApiError({ error: err }, 'getThreads');
  }
}

/**
 * Get a single thread by ID
 * @param {string} threadId - Thread UUID
 * @returns {Promise<{data: Object|null, error: {message: string, code: string}|null}>}
 * @example
 * const { data, error } = await getThread('thread-uuid');
 * if (error) {
 *   if (error.code === 'NOT_FOUND') {
 *     console.log('Thread does not exist');
 *   }
 * }
 */
export async function getThread(threadId) {
  if (!threadId) {
    return {
      data: null,
      error: { message: 'Thread ID is required', code: ERROR_CODES.MISSING_ID }
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
        return { data: null, error: { message: 'Thread not found', code: ERROR_CODES.NOT_FOUND } };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    logError(err, 'getThread', { threadId });
    return handleApiError({ error: err }, 'getThread');
  }
}

/**
 * Create a new thread
 * @param {Object} threadData - Thread data
 * @param {string} threadData.theme - Thread theme/topic
 * @param {number} [threadData.min_participants=2] - Minimum participants required
 * @param {number} [threadData.max_participants=5] - Maximum participants allowed
 * @param {string} threadData.created_by - User ID of thread creator
 * @returns {Promise<{data: Object|null, error: {message: string, code: string}|null}>}
 * @example
 * const { data, error } = await createThread({
 *   theme: 'Climate Change Solutions',
 *   min_participants: 3,
 *   max_participants: 10,
 *   created_by: 'user-uuid'
 * });
 */
export async function createThread(threadData) {
  if (!threadData.theme || !threadData.created_by) {
    return {
      data: null,
      error: { message: 'Theme and created_by are required', code: ERROR_CODES.MISSING_FIELDS }
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
    logError(err, 'createThread', { threadData });
    return handleApiError({ error: err }, 'createThread');
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

