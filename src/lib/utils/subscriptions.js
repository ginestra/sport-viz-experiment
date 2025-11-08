/**
 * Subscription management utilities for Supabase real-time subscriptions
 * 
 * @module utils/subscriptions
 */

/**
 * Subscription manager class for handling multiple subscriptions
 */
export class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Add a subscription
   * @param {string} key - Unique key for this subscription
   * @param {Function} unsubscribe - Unsubscribe function
   */
  add(key, unsubscribe) {
    // Remove existing subscription with same key if it exists
    this.remove(key);
    
    this.subscriptions.set(key, unsubscribe);
  }

  /**
   * Remove a specific subscription
   * @param {string} key - Subscription key
   */
  remove(key) {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe && typeof unsubscribe === 'function') {
      try {
        unsubscribe();
      } catch (err) {
        console.error(`Error unsubscribing from ${key}:`, err);
      }
    }
    this.subscriptions.delete(key);
  }

  /**
   * Remove all subscriptions
   */
  removeAll() {
    for (const [key, unsubscribe] of this.subscriptions.entries()) {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (err) {
        console.error(`Error unsubscribing from ${key}:`, err);
      }
    }
    this.subscriptions.clear();
  }

  /**
   * Get count of active subscriptions
   * @returns {number} Number of active subscriptions
   */
  count() {
    return this.subscriptions.size;
  }

  /**
   * Check if a subscription exists
   * @param {string} key - Subscription key
   * @returns {boolean} True if subscription exists
   */
  has(key) {
    return this.subscriptions.has(key);
  }
}

/**
 * Create a subscription manager instance
 * @returns {SubscriptionManager} New subscription manager
 */
export function createSubscriptionManager() {
  return new SubscriptionManager();
}

