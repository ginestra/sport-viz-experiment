<script>
  import { link } from 'svelte-spa-router';
  import { THREAD_STATUS } from '../../lib/constants/collaborative.js';
  import PostForm from './PostForm.svelte';

  /**
   * ThreadControls - Handles thread interaction controls (join, post, etc.)
   * @prop {Object} thread - Thread object
   * @prop {boolean} isParticipant - Whether current user is a participant
   * @prop {boolean} canPost - Whether current user can post
   * @prop {boolean} isBlocked - Whether current user is blocked
   * @prop {Array} participants - Array of participant objects
   * @prop {string} threadId - Thread ID
   * @prop {function} onJoin - Callback when user joins thread
   * @prop {function} onPostSubmit - Callback when post is submitted
   * @prop {boolean} isAuthenticated - Whether user is authenticated
   */
  export let thread;
  export let isParticipant = false;
  export let canPost = false;
  export let isBlocked = false;
  export let participants = [];
  export let threadId = '';
  export let onJoin;
  export let onPostSubmit;
  export let isAuthenticated = false;
</script>

{#if thread.status === THREAD_STATUS.WAITING}
  <div class="waiting-notice">
    <p>This thread is waiting for more participants. Once {thread.min_participants} participants join, the thread will open and collaborative writing can begin.</p>
    {#if isAuthenticated && !isParticipant && !isBlocked && participants.length < thread.max_participants}
      <button on:click={onJoin} class="join-button">Join Thread</button>
    {:else if !isAuthenticated}
      <p><a href="#/collaborative/login" use:link>Sign in</a> to join this thread.</p>
    {:else if isBlocked}
      <p>You cannot join threads while your account is blocked.</p>
    {:else if participants.length >= thread.max_participants}
      <p>This thread has reached its maximum number of participants.</p>
    {/if}
  </div>
{/if}

{#if thread.status === THREAD_STATUS.ACTIVE}
  {#if isParticipant}
    {#if canPost}
      <PostForm {threadId} onSubmit={onPostSubmit} />
    {:else}
      <div class="wait-turn-notice">
        <p>It's not your turn yet. Please wait for other participants to post.</p>
      </div>
    {/if}
  {:else if isAuthenticated && !isBlocked && participants.length < thread.max_participants}
    <div class="join-prompt">
      <p>You're not a participant in this thread. <button on:click={onJoin} class="join-button">Join Thread</button></p>
    </div>
  {:else if isAuthenticated && !isBlocked && participants.length >= thread.max_participants}
    <div class="join-prompt">
      <p>This thread has reached its maximum number of participants.</p>
    </div>
  {/if}
{/if}

<style>
  .waiting-notice {
    padding: 2rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin-bottom: 2rem;
    text-align: center;
  }

  .waiting-notice p {
    margin: 0 0 1rem 0;
    color: var(--text-color);
  }

  .join-button {
    padding: 0.75rem 2rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .join-button:hover {
    background: var(--primary-color-dark, #0056b3);
  }

  .wait-turn-notice {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin-bottom: 2rem;
    text-align: center;
  }

  .wait-turn-notice p {
    margin: 0;
    color: var(--text-secondary);
    font-style: italic;
  }

  .join-prompt {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin-bottom: 2rem;
    text-align: center;
  }

  .join-prompt p {
    margin: 0;
    color: var(--text-color);
  }

  .join-prompt .join-button {
    margin-left: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
</style>

