/**
 * Posts API - Centralized post database operations
 */

import { supabase } from '../supabase/client.js';

/**
 * Get posts for a thread
 * @param {string} threadId - Thread UUID
 * @param {Object} options - Options (includeRemoved: boolean)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getPosts(threadId, options = {}) {
  if (!threadId) {
    return {
      data: null,
      error: { message: 'Thread ID is required', code: 'MISSING_ID' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_posts')
      .select('*')
      .eq('thread_id', threadId)
      .order('post_order', { ascending: true });

    if (error) throw error;

    let posts = data || [];

    // Filter out removed posts unless explicitly requested
    if (!options.includeRemoved) {
      posts = posts.filter(p => !p.is_removed);
    }

    return { data: posts, error: null };
  } catch (err) {
    console.error('Error loading posts:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to load posts',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Create a new post
 * @param {Object} postData - Post data (thread_id, user_id, content, post_order, sources, plagiarism_confirmed)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createPost(postData) {
  if (!postData.thread_id || !postData.user_id || !postData.content) {
    return {
      data: null,
      error: { message: 'thread_id, user_id, and content are required', code: 'MISSING_FIELDS' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_posts')
      .insert({
        thread_id: postData.thread_id,
        user_id: postData.user_id,
        content: postData.content,
        post_order: postData.post_order ?? 0,
        sources: postData.sources || [],
        plagiarism_confirmed: postData.plagiarism_confirmed || false
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error creating post:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to create post',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Update a post
 * @param {string} postId - Post UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updatePost(postId, updates) {
  if (!postId) {
    return {
      data: null,
      error: { message: 'Post ID is required', code: 'MISSING_ID' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error updating post:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to update post',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Remove a post (soft delete)
 * @param {string} postId - Post UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function removePost(postId) {
  return updatePost(postId, { is_removed: true });
}

/**
 * Get a single post by ID
 * @param {string} postId - Post UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getPost(postId) {
  if (!postId) {
    return {
      data: null,
      error: { message: 'Post ID is required', code: 'MISSING_ID' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: { message: 'Post not found', code: 'NOT_FOUND' } };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error loading post:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to load post',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

