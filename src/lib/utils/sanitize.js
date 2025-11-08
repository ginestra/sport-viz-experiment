/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize text input by removing potentially dangerous characters
 * and trimming whitespace
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize URL to prevent XSS
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Basic URL validation - must start with http:// or https://
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }
  
  return trimmed;
}

/**
 * Validate and sanitize source object
 */
export function sanitizeSource(source) {
  if (!source || typeof source !== 'object') {
    return { title: '', url: '', citation: '' };
  }
  
  return {
    title: sanitizeText(source.title || ''),
    url: sanitizeUrl(source.url || ''),
    citation: sanitizeText(source.citation || '')
  };
}

/**
 * Validate word count
 */
export function getWordCount(text) {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate content length (max 500 words)
 */
export function validateContentLength(text, maxWords = 500) {
  const wordCount = getWordCount(text);
  return {
    valid: wordCount <= maxWords,
    wordCount,
    maxWords
  };
}

