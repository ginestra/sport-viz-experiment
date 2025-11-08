<script>
  import { onMount } from 'svelte';
  import { user } from '../../stores/auth.js';
  import { getActiveWarnings, resolveWarning } from '../../lib/moderation/warnings.js';

  let warnings = [];
  let loading = true;

  onMount(async () => {
    if ($user) {
      warnings = await getActiveWarnings($user.id);
      loading = false;
    }
  });

  async function handleResolve(warningId) {
    const { error } = await resolveWarning(warningId);
    if (!error) {
      warnings = warnings.filter(w => w.id !== warningId);
    }
  }
</script>

{#if $user && !loading && warnings.length > 0}
  <div class="warning-banner">
    <div class="warning-icon">⚠️</div>
    <div class="warning-content">
      <h4>You have received a warning</h4>
      {#each warnings as warning}
        <div class="warning-item">
          <p><strong>Reason:</strong> {warning.reason}</p>
          <p class="warning-date">Warned on: {new Date(warning.created_at).toLocaleString()}</p>
          <p class="warning-note">
            Please rectify your actions (apologize, delete posts, etc.) to resolve this warning.
          </p>
          <button
            on:click={() => handleResolve(warning.id)}
            class="resolve-button"
          >
            Mark as Resolved
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .warning-banner {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    margin: 1rem 0;
    background: rgba(251, 191, 36, 0.1);
    border: 2px solid #f59e0b;
    border-radius: 8px;
    color: var(--text-color);
  }

  .warning-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
  }

  .warning-content h4 {
    margin: 0 0 1rem 0;
    color: #f59e0b;
    font-size: 1.1rem;
  }

  .warning-item {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(251, 191, 36, 0.3);
  }

  .warning-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .warning-item p {
    margin: 0.5rem 0;
    color: var(--text-color);
  }

  .warning-date {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .warning-note {
    font-size: 0.9rem;
    font-style: italic;
    color: var(--text-secondary);
    margin-top: 0.75rem !important;
  }

  .resolve-button {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .resolve-button:hover {
    background: #d97706;
  }
</style>

