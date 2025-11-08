<script>
  import { generateContributorColor } from '../../lib/utils/colors.js';
  import FlagPostButton from './FlagPostButton.svelte';

  /**
   * PostListView - Displays posts in write mode with full metadata
   * @prop {Array} posts - Array of post objects
   * @prop {Object} postAuthorProfiles - Map of user_id -> display_name
   * @prop {string} currentUserId - Current user ID (for "You" display and flag button)
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
</script>

<div class="posts-list write-view">
  {#each posts as post}
    <div 
      class="post-item"
      style="border-left: 4px solid {getContributorColor(post.user_id)}"
    >
      <div class="post-header">
        <span class="post-order">Post #{post.post_order + 1}</span>
        <span class="post-author">
          {getContributorName(post.user_id)}
        </span>
        <span class="post-date">{new Date(post.created_at).toLocaleString()}</span>
        {#if currentUserId && post.user_id !== currentUserId}
          <FlagPostButton postId={post.id} />
        {/if}
      </div>
      <div class="post-content">
        {#each splitIntoParagraphs(post.content) as paragraph}
          <p 
            class="content-paragraph"
            style="border-left: 3px solid {getContributorColor(post.user_id)}"
          >
            {paragraph.trim()}
          </p>
        {/each}
      </div>
      {#if post.sources && post.sources.length > 0}
        <div class="post-sources">
          <strong>Sources:</strong>
          <ul>
            {#each post.sources as source}
              <li>
                {#if source.url}
                  <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.url}</a>
                {:else}
                  {source.title}
                {/if}
                {#if source.citation}
                  <span class="citation"> — {source.citation}</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if post.plagiarism_confirmed}
        <div class="plagiarism-badge">✓ Originality Confirmed</div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .write-view {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 1rem;
  }

  .post-item {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .post-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .post-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .post-order {
    font-weight: 600;
    color: var(--primary-color);
  }

  .post-author {
    font-weight: 500;
    color: var(--text-color);
  }

  .post-date {
    margin-left: auto;
  }

  .post-content {
    margin: 1rem 0;
  }

  .content-paragraph {
    margin: 0.75rem 0;
    padding-left: 1rem;
    line-height: 1.8;
    color: var(--text-color);
  }

  .post-sources {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    font-size: 0.9rem;
  }

  .post-sources strong {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }

  .post-sources ul {
    margin: 0;
    padding-left: 1.5rem;
    list-style-type: disc;
  }

  .post-sources li {
    margin: 0.25rem 0;
    color: var(--text-secondary);
  }

  .post-sources a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .post-sources a:hover {
    text-decoration: underline;
  }

  .citation {
    font-style: italic;
    color: var(--text-secondary);
  }

  .plagiarism-badge {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.25rem 0.75rem;
    background: var(--success-color, #10b981);
    color: white;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }
</style>

