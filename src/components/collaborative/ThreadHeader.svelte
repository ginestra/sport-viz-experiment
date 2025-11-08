<script>
  import { link } from 'svelte-spa-router';
  import { THREAD_STATUS } from '../../lib/constants/collaborative.js';

  /**
   * ThreadHeader - Displays thread header and metadata
   * 
   * @component
   * @prop {Object} thread - Thread object (required)
   * @prop {Array<Object>} [participants=[]] - Array of participant objects
   * @prop {Object<string, string>} [participantProfiles={}] - Map of user_id -> display_name
   * @prop {string|null} [currentUserId=null] - Current user ID (for "You" display)
   */
  export let thread;
  export let participants = [];
  export let participantProfiles = {};
  export let currentUserId = null;

  // Prop validation
  $: if (!thread || typeof thread !== 'object') {
    console.error('ThreadHeader: thread prop is required and must be an object');
  }

  $: if (!Array.isArray(participants)) {
    console.warn('ThreadHeader: participants must be an array, got:', typeof participants);
    participants = [];
  }

  $: if (participantProfiles && typeof participantProfiles !== 'object') {
    console.warn('ThreadHeader: participantProfiles must be an object, got:', typeof participantProfiles);
    participantProfiles = {};
  }
</script>

<div class="thread-header-section">
  <a href="#/collaborative" use:link class="back-link">← Back to Threads</a>
  <h1>{thread.theme}</h1>
  <div class="thread-meta">
    <span class="status-badge status-{thread.status}">{thread.status}</span>
    <span>{participants.length} / {thread.max_participants} participants</span>
    {#if thread.status === THREAD_STATUS.WAITING}
      <span>Waiting for {thread.min_participants - participants.length} more participant(s)</span>
    {/if}
  </div>
</div>

{#if thread.status === THREAD_STATUS.ACTIVE}
  <div class="participants-section">
    <h3>Participants (Turn Order)</h3>
    <div class="participants-list">
      {#each participants.sort((a, b) => (a.turn_order ?? 999) - (b.turn_order ?? 999)) as participant}
        <div class="participant-item">
          <span class="turn-order">{participant.turn_order !== null ? participant.turn_order + 1 : '—'}</span>
          <span class="participant-id">
            {participant.user_id === currentUserId 
              ? 'You' 
              : (participantProfiles[participant.user_id] || `User ${participant.user_id.substring(0, 8)}...`)}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .thread-header-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-color);
  }

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link:hover {
    color: var(--primary-color);
  }

  .thread-header-section h1 {
    margin: 0.5rem 0;
    color: var(--text-color);
    font-size: 2rem;
  }

  .thread-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-badge.status-waiting {
    background: var(--warning-color, #f59e0b);
    color: white;
  }

  .status-badge.status-active {
    background: var(--success-color, #10b981);
    color: white;
  }

  .status-badge.status-completed {
    background: var(--text-secondary);
    color: white;
  }

  .participants-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .participants-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    color: var(--text-color);
  }

  .participants-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .participant-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: var(--bg-color);
    border-radius: 4px;
  }

  .turn-order {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--primary-color);
    color: white;
    border-radius: 50%;
    font-weight: 600;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .participant-id {
    color: var(--text-color);
    font-weight: 500;
  }
</style>

