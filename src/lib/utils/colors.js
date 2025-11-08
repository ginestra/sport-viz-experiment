/**
 * Color generation utilities for UI components
 */

/**
 * Generate a consistent color for a contributor based on their user_id
 * Uses a hash function to ensure the same user_id always gets the same color
 * 
 * @param {string} userId - The user's unique identifier
 * @returns {string} HSL color string (e.g., "hsl(120, 70%, 50%)")
 */
export function generateContributorColor(userId) {
  if (!userId || typeof userId !== 'string') {
    // Default color for invalid input
    return 'hsl(0, 0%, 50%)';
  }

  // Generate a consistent hash from the user_id
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate a color with good contrast (avoid too light colors)
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

