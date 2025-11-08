/**
 * Error handling utilities for consistent error management
 */

/**
 * Standard error codes used across the application
 */
export const ERROR_CODES = {
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Database errors
  SCHEMA_NOT_FOUND: 'SCHEMA_NOT_FOUND',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Business logic errors
  MISSING_FIELDS: 'MISSING_FIELDS',
  MISSING_ID: 'MISSING_ID',
  ALREADY_JOINED: 'ALREADY_JOINED',
  THREAD_FULL: 'THREAD_FULL',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_STATE: 'INVALID_STATE'
};

/**
 * Create a standardized error object
 * @param {string} message - Human-readable error message
 * @param {string} code - Error code from ERROR_CODES
 * @param {Error} originalError - Original error object (optional)
 * @returns {Object} Standardized error object
 */
export function createError(message, code = ERROR_CODES.UNKNOWN_ERROR, originalError = null) {
  const error = {
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // Include original error details in development
  if (originalError && import.meta.env.DEV) {
    error.originalError = {
      message: originalError.message,
      stack: originalError.stack,
      name: originalError.name
    };
  }

  return error;
}

/**
 * Extract error message from various error formats
 * @param {Error|Object|string} error - Error in various formats
 * @returns {string} Error message
 */
export function getErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  if (error.error && error.error.message) return error.error.message;
  
  return 'An unknown error occurred';
}

/**
 * Extract error code from error object
 * @param {Error|Object} error - Error object
 * @returns {string} Error code
 */
export function getErrorCode(error) {
  if (!error) return ERROR_CODES.UNKNOWN_ERROR;
  
  if (error.code) return error.code;
  
  if (error.error && error.error.code) return error.error.code;
  
  // Map common Supabase error codes
  if (error.code === 'PGRST116') return ERROR_CODES.NOT_FOUND;
  if (error.code === '23505') return ERROR_CODES.DUPLICATE_ENTRY;
  if (error.code === '23503') return ERROR_CODES.FOREIGN_KEY_VIOLATION;
  
  return ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Check if error is a specific type
 * @param {Error|Object} error - Error object
 * @param {string} code - Error code to check
 * @returns {boolean} True if error matches code
 */
export function isErrorCode(error, code) {
  return getErrorCode(error) === code;
}

/**
 * Format error for user display
 * @param {Error|Object|string} error - Error in various formats
 * @param {string} context - Context where error occurred (optional)
 * @returns {string} User-friendly error message
 */
export function formatErrorForUser(error, context = '') {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  // Provide user-friendly messages for common errors
  const userFriendlyMessages = {
    [ERROR_CODES.SCHEMA_NOT_FOUND]: 'Database not set up yet. Please run the SQL schema from SUPABASE_SCHEMA.md in your Supabase SQL Editor.',
    [ERROR_CODES.NOT_FOUND]: 'The requested item was not found.',
    [ERROR_CODES.DUPLICATE_ENTRY]: 'This item already exists.',
    [ERROR_CODES.ALREADY_JOINED]: 'You are already a participant in this thread.',
    [ERROR_CODES.THREAD_FULL]: 'This thread has reached its maximum number of participants.',
    [ERROR_CODES.NOT_YOUR_TURN]: 'It\'s not your turn yet. Please wait for other participants to post.',
    [ERROR_CODES.UNAUTHORIZED]: 'You must be logged in to perform this action.',
    [ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
    [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
    [ERROR_CODES.MISSING_FIELDS]: 'Please fill in all required fields.',
    [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.'
  };
  
  // Use user-friendly message if available, otherwise use original message
  const friendlyMessage = userFriendlyMessages[code] || message;
  
  // Add context if provided
  if (context) {
    return `${context}: ${friendlyMessage}`;
  }
  
  return friendlyMessage;
}

/**
 * Log error with context
 * @param {Error|Object|string} error - Error to log
 * @param {string} context - Context where error occurred
 * @param {Object} additionalInfo - Additional information to log
 */
export function logError(error, context = '', additionalInfo = {}) {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  
  console.error(`[${context}]`, {
    message: errorMessage,
    code: errorCode,
    ...additionalInfo,
    timestamp: new Date().toISOString()
  });
  
  // In production, you might want to send to error tracking service
  // e.g., Sentry, LogRocket, etc.
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    // Example: window.errorTracker?.captureException(error, { context, ...additionalInfo });
  }
}

/**
 * Handle API error response
 * @param {Object} response - API response with error
 * @param {string} context - Context where error occurred
 * @returns {Object} Standardized error object
 */
export function handleApiError(response, context = '') {
  if (!response || !response.error) {
    return createError('An unknown error occurred', ERROR_CODES.UNKNOWN_ERROR);
  }
  
  const error = response.error;
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  logError(error, context);
  
  return createError(message, code, error);
}

