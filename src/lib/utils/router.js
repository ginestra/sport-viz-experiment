/**
 * Router utility functions
 */

/**
 * Extract thread ID from URL location
 * @param {string} location - Current location hash/path
 * @returns {string} Thread ID or empty string if not found
 */
export function extractThreadId(location) {
  if (!location) return '';
  
  const pathParts = location.split('/');
  const threadIndex = pathParts.indexOf('thread');
  
  if (threadIndex !== -1 && pathParts[threadIndex + 1]) {
    return pathParts[threadIndex + 1];
  }
  
  return '';
}

