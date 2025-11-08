/**
 * Participants API - Centralized participant database operations
 */

import { supabase } from '../supabase/client.js';

/**
 * Get participants for a thread
 * @param {string} threadId - Thread UUID
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getParticipants(threadId) {
  if (!threadId) {
    return {
      data: null,
      error: { message: 'Thread ID is required', code: 'MISSING_ID' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_participants')
      .select('*')
      .eq('thread_id', threadId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error loading participants:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to load participants',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Join a thread as a participant
 * @param {string} threadId - Thread UUID
 * @param {string} userId - User UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function joinThread(threadId, userId) {
  if (!threadId || !userId) {
    return {
      data: null,
      error: { message: 'Thread ID and User ID are required', code: 'MISSING_FIELDS' }
    };
  }

  try {
    // Check if user is already a participant
    const { data: existing } = await supabase
      .from('thread_participants')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return {
        data: existing,
        error: null
      };
    }

    // Get current participants to determine turn order
    const { data: participants } = await supabase
      .from('thread_participants')
      .select('turn_order')
      .eq('thread_id', threadId);

    // Determine turn order (highest + 1, or 0 if first)
    const maxTurnOrder = participants && participants.length > 0
      ? Math.max(...participants.map(p => p.turn_order ?? -1))
      : -1;
    const newTurnOrder = maxTurnOrder + 1;

    const { data, error } = await supabase
      .from('thread_participants')
      .insert({
        thread_id: threadId,
        user_id: userId,
        turn_order: newTurnOrder
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate key error (user already joined)
      if (error.code === '23505' || error.message.includes('duplicate')) {
        return {
          data: null,
          error: { message: 'You are already a participant in this thread', code: 'ALREADY_JOINED' }
        };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error joining thread:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to join thread',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Update a participant's turn order
 * @param {string} participantId - Participant UUID
 * @param {number} turnOrder - New turn order
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateParticipantTurnOrder(participantId, turnOrder) {
  if (!participantId || turnOrder === undefined || turnOrder === null) {
    return {
      data: null,
      error: { message: 'Participant ID and turn order are required', code: 'MISSING_FIELDS' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_participants')
      .update({ turn_order: turnOrder })
      .eq('id', participantId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error updating participant turn order:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to update turn order',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Fix missing turn orders for participants in an active thread
 * @param {string} threadId - Thread UUID
 * @param {Array} participants - Array of participant objects
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fixParticipantTurnOrders(threadId, participants) {
  if (!threadId || !participants || participants.length === 0) {
    return { data: [], error: null };
  }

  try {
    const participantsWithoutTurnOrder = participants.filter(
      p => p.turn_order === null || p.turn_order === undefined
    );

    if (participantsWithoutTurnOrder.length === 0) {
      return { data: participants, error: null };
    }

    // Assign turn orders based on join order
    const updates = [];
    for (let i = 0; i < participants.length; i++) {
      if (participants[i].turn_order === null || participants[i].turn_order === undefined) {
        const { error } = await supabase
          .from('thread_participants')
          .update({ turn_order: i })
          .eq('id', participants[i].id);

        if (!error) {
          participants[i].turn_order = i;
        }
      }
    }

    return { data: participants, error: null };
  } catch (err) {
    console.error('Error fixing turn orders:', err);
    return {
      data: participants,
      error: {
        message: err.message || 'Failed to fix turn orders',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Get a participant by thread and user ID
 * @param {string} threadId - Thread UUID
 * @param {string} userId - User UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getParticipant(threadId, userId) {
  if (!threadId || !userId) {
    return {
      data: null,
      error: { message: 'Thread ID and User ID are required', code: 'MISSING_FIELDS' }
    };
  }

  try {
    const { data, error } = await supabase
      .from('thread_participants')
      .select('*')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }; // Not a participant (not an error)
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error loading participant:', err);
    return {
      data: null,
      error: {
        message: err.message || 'Failed to load participant',
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

