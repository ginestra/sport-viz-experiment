<script>
  import { flagPost } from '../../lib/moderation/flags.js';
  import { user } from '../../stores/auth.js';

  export let postId = '';

  let showModal = false;
  let reason = '';
  let loading = false;
  let error = '';
  let success = false;

  const flagReasons = [
    'Spam or advertising',
    'Inappropriate content',
    'Harassment or bullying',
    'Plagiarism',
    'Off-topic',
    'Other'
  ];

  async function handleFlag() {
    if (!reason.trim()) {
      error = 'Please select a reason';
      return;
    }

    loading = true;
    error = '';
    success = false;

    const { data, error: flagError } = await flagPost(postId, reason);

    if (flagError) {
      error = flagError.message || 'Failed to flag post';
      loading = false;
    } else {
      success = true;
      loading = false;
      setTimeout(() => {
        showModal = false;
        reason = '';
        success = false;
      }, 1500);
    }
  }

  function closeModal() {
    if (!loading) {
      showModal = false;
      reason = '';
      error = '';
      success = false;
    }
  }
</script>

{#if $user}
  <button
    on:click={() => showModal = true}
    class="flag-button"
    title="Flag this post"
    type="button"
  >
    🚩 Flag
  </button>
{/if}

{#if showModal}
  <div class="modal-overlay" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Flag Post</h3>
        <button class="close-button" on:click={closeModal} disabled={loading}>×</button>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      {#if success}
        <div class="success-message">Post flagged successfully. Thank you for your report.</div>
      {:else}
        <div class="modal-body">
          <p>Please select a reason for flagging this post:</p>

          <div class="reason-options">
            {#each flagReasons as flagReason}
              <label class="reason-option">
                <input
                  type="radio"
                  name="flag-reason"
                  value={flagReason}
                  bind:group={reason}
                  disabled={loading}
                />
                <span>{flagReason}</span>
              </label>
            {/each}
          </div>

          <div class="modal-actions">
            <button
              on:click={handleFlag}
              disabled={loading || !reason}
              class="submit-button"
            >
              {loading ? 'Flagging...' : 'Flag Post'}
            </button>
            <button
              on:click={closeModal}
              disabled={loading}
              class="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .flag-button {
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .flag-button:hover {
    background: var(--hover-bg);
    color: var(--text-color);
    border-color: var(--primary-color);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: var(--bg-primary);
    border-radius: 8px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h3 {
    margin: 0;
    color: var(--text-color);
    font-size: 1.25rem;
  }

  .close-button {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-button:hover:not(:disabled) {
    background: var(--hover-bg);
    color: var(--text-color);
  }

  .close-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-body p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
  }

  .reason-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .reason-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reason-option:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
  }

  .reason-option input[type="radio"] {
    margin: 0;
    cursor: pointer;
  }

  .reason-option span {
    color: var(--text-color);
    flex: 1;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .submit-button,
  .cancel-button {
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .submit-button {
    background: #dc2626;
    color: white;
  }

  .submit-button:hover:not(:disabled) {
    background: #b91c1c;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .cancel-button:hover:not(:disabled) {
    background: var(--hover-bg);
  }

  .error-message {
    padding: 1rem;
    margin: 1.5rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    color: #dc2626;
    font-size: 0.9rem;
  }

  .success-message {
    padding: 1rem;
    margin: 1.5rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 4px;
    color: #22c55e;
    font-size: 0.9rem;
  }
</style>

