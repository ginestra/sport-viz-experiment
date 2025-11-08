<script>
  import { generateContributorColor } from '../../lib/utils/colors.js';

  /**
   * ReadView - Displays posts as a continuous story
   * @prop {Array} posts - Array of post objects
   * @prop {Object} postAuthorProfiles - Map of user_id -> display_name
   * @prop {string} currentUserId - Current user ID (for "You" display)
   */
  export let posts = [];
  export let postAuthorProfiles = {};
  export let currentUserId = null;

  // Generate color for each contributor based on their user_id
  let contributorColors = {};
  
  function getContributorColor(userId) {
    if (!contributorColors[userId]) {
      contributorColors[userId] = generateContributorColor(userId);
    }
    return contributorColors[userId];
  }
  
  function getContributorName(userId) {
    if (userId === currentUserId) return 'You';
    return postAuthorProfiles[userId] || `User ${userId.substring(0, 8)}...`;
  }
  
  // Split post content into paragraphs
  function splitIntoParagraphs(text) {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }

  // Get unique contributor IDs
  $: uniqueContributors = [...new Set(posts.map(p => p.user_id))];
</script>

<div class="posts-list read-view">
  <div class="read-view-content">
    {#each posts as post}
      {#each splitIntoParagraphs(post.content) as paragraph}
        <p 
          class="read-paragraph"
          style="border-left: 4px solid {getContributorColor(post.user_id)}"
          title="{getContributorName(post.user_id)}"
        >
          {paragraph.trim()}
        </p>
      {/each}
    {/each}
  </div>
  <div class="read-view-metadata">
    <h3>Contributors</h3>
    <div class="contributors-list">
      {#each uniqueContributors as userId}
        <div class="contributor-item">
          <span 
            class="contributor-color"
            style="background-color: {getContributorColor(userId)}"
          ></span>
          <span class="contributor-name">{getContributorName(userId)}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .read-view {
    display: grid;
    grid-template-columns: 1fr 250px;
    gap: 2rem;
    margin-top: 1rem;
  }

  .read-view-content {
    min-width: 0;
  }

  .read-paragraph {
    margin: 1rem 0;
    padding-left: 1rem;
    line-height: 1.8;
    color: var(--text-color);
  }

  .read-view-metadata {
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    height: fit-content;
    position: sticky;
    top: 2rem;
  }

  .read-view-metadata h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--text-color);
  }

  .contributors-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .contributor-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .contributor-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .contributor-name {
    font-size: 0.9rem;
    color: var(--text-color);
  }

  @media (max-width: 768px) {
    .read-view {
      grid-template-columns: 1fr;
    }

    .read-view-metadata {
      position: static;
    }
  }
</style>

