/**
 * Constants for the collaborative writing feature
 */

// Post limits
export const MAX_WORDS = 500;
export const MAX_CONTENT_LENGTH = 5000; // Character limit for textarea

// Thread limits
export const MAX_THEME_LENGTH = 200;
export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 50;
export const DEFAULT_MIN_PARTICIPANTS = 2;
export const DEFAULT_MAX_PARTICIPANTS = 5;

// Thread statuses
export const THREAD_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

// User roles
export const USER_ROLE = {
  USER: 'user',
  MODERATOR: 'moderator',
  SUPER_ADMIN: 'super_admin'
};

// Warning statuses
export const WARNING_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved'
};

// Flag statuses
export const FLAG_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  DISMISSED: 'dismissed'
};

