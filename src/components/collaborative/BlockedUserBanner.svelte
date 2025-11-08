<script>
  import { onMount } from 'svelte';
  import { user } from '../../stores/auth.js';
  import { getUserBlock } from '../../lib/moderation/blocks.js';

  let blockInfo = null;
  let loading = true;

  onMount(async () => {
    if ($user) {
      blockInfo = await getUserBlock($user.id);
      loading = false;
    }
  });
</script>

{#if $user && !loading && blockInfo}
  <div class="blocked-banner">
    <div class="block-icon">🚫</div>
    <div class="block-content">
      <h4>Your account has been blocked</h4>
      <p><strong>Reason:</strong> {blockInfo.reason}</p>
      <p class="block-date">Blocked on: {new Date(blockInfo.blocked_at).toLocaleString()}</p>
      <p class="block-note">
        You cannot create new threads or posts while your account is blocked. 
        Please contact support if you believe this is an error.
      </p>
    </div>
  </div>
{/if}

<style>
  .blocked-banner {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    margin: 1rem 0;
    background: rgba(220, 38, 38, 0.1);
    border: 2px solid #dc2626;
    border-radius: 8px;
    color: var(--text-color);
  }

  .block-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .block-content {
    flex: 1;
  }

  .block-content h4 {
    margin: 0 0 1rem 0;
    color: #dc2626;
    font-size: 1.1rem;
  }

  .block-content p {
    margin: 0.5rem 0;
    color: var(--text-color);
  }

  .block-date {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .block-note {
    font-size: 0.9rem;
    font-style: italic;
    color: var(--text-secondary);
    margin-top: 0.75rem !important;
  }
</style>

