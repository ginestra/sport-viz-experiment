<script>
  import { onMount } from 'svelte';
  import { user } from '../../stores/auth.js';
  import { isModeratorOrAdmin, isSuperAdmin } from '../../lib/moderation/roles.js';
  import { getAllBlockedUsers, blockUser, unblockUser } from '../../lib/moderation/blocks.js';
  import { getPendingFlags, updateFlagStatus } from '../../lib/moderation/flags.js';
  import { warnUser } from '../../lib/moderation/warnings.js';
  import { supabase } from '../../lib/supabase/client.js';
  import { link } from 'svelte-spa-router';

  let hasAccess = false;
  let isAdmin = false;
  let loading = true;
  let activeTab = 'flags'; // 'flags', 'warnings', 'blocks', 'users'
  
  // Flags
  let flags = [];
  let flagsLoading = false;
  
  // Warnings
  let warningUserId = '';
  let warningReason = '';
  let warningPostId = '';
  let warningThreadId = '';
  let showWarnModal = false;
  let warningLoading = false;
  
  // Blocks
  let blockedUsers = [];
  let blockUserId = '';
  let blockReason = '';
  let showBlockModal = false;
  let blockLoading = false;
  
  // Post removal
  let removePostId = '';
  let removeReason = '';
  let showRemoveModal = false;
  let removeLoading = false;

  onMount(async () => {
    if ($user) {
      hasAccess = await isModeratorOrAdmin();
      isAdmin = await isSuperAdmin();
      loading = false;

      if (hasAccess) {
        await loadData();
      }
    }
  });

  async function loadData() {
    if (activeTab === 'flags') {
      await loadFlags();
    } else if (activeTab === 'blocks') {
      await loadBlockedUsers();
    }
  }

  async function loadFlags() {
    flagsLoading = true;
    flags = await getPendingFlags();
    flagsLoading = false;
  }

  async function loadBlockedUsers() {
    blockedUsers = await getAllBlockedUsers();
  }

  async function handleWarnUser() {
    if (!warningUserId || !warningReason.trim()) {
      return;
    }

    warningLoading = true;
    const { error } = await warnUser(warningUserId, warningReason, warningPostId || null, warningThreadId || null);
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('User warned successfully');
      showWarnModal = false;
      warningUserId = '';
      warningReason = '';
      warningPostId = '';
      warningThreadId = '';
    }
    
    warningLoading = false;
  }

  async function handleBlockUser() {
    if (!blockUserId || !blockReason.trim()) {
      return;
    }

    blockLoading = true;
    const { error } = await blockUser(blockUserId, blockReason);
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('User blocked successfully');
      showBlockModal = false;
      blockUserId = '';
      blockReason = '';
      await loadBlockedUsers();
    }
    
    blockLoading = false;
  }

  async function handleUnblockUser(userId) {
    if (!confirm('Are you sure you want to unblock this user?')) {
      return;
    }

    const { error } = await unblockUser(userId);
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      await loadBlockedUsers();
    }
  }

  async function handleRemovePost(postId) {
    if (!removeReason.trim()) {
      alert('Please provide a reason for removal');
      return;
    }

    removeLoading = true;
    
    try {
      const { error } = await supabase
        .from('thread_posts')
        .update({
          is_removed: true,
          removed_by: $user.id,
          removed_at: new Date().toISOString(),
          removal_reason: removeReason
        })
        .eq('id', postId);

      if (error) throw error;

      // Update flag status
      await updateFlagStatus(flags.find(f => f.post_id === postId)?.id, 'resolved');

      alert('Post removed successfully');
      showRemoveModal = false;
      removePostId = '';
      removeReason = '';
      await loadFlags();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      removeLoading = false;
    }
  }

  async function handleDismissFlag(flagId) {
    const { error } = await updateFlagStatus(flagId, 'dismissed');
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      await loadFlags();
    }
  }

  $: if (hasAccess && activeTab) {
    loadData();
  }
</script>

{#if loading}
  <div class="loading">Checking permissions...</div>
{:else if !hasAccess}
  <div class="access-denied">
    <h2>Access Denied</h2>
    <p>You do not have permission to access the moderation panel.</p>
    <a href="#/collaborative" use:link>← Back to Collaborative Writing</a>
  </div>
{:else}
  <div class="moderation-page">
    <div class="page-header">
      <h1>Moderation Panel</h1>
      <div class="header-info">
        <span class="role-badge">{isAdmin ? 'Super Admin' : 'Moderator'}</span>
        <a href="#/collaborative" use:link class="back-link">← Back</a>
      </div>
    </div>

    <div class="tabs">
      <button
        class="tab {activeTab === 'flags' ? 'active' : ''}"
        on:click={() => activeTab = 'flags'}
      >
        Flagged Posts ({flags.length})
      </button>
      <button
        class="tab {activeTab === 'warnings' ? 'active' : ''}"
        on:click={() => activeTab = 'warnings'}
      >
        Warn User
      </button>
      <button
        class="tab {activeTab === 'blocks' ? 'active' : ''}"
        on:click={() => activeTab = 'blocks'}
      >
        Blocked Users ({blockedUsers.length})
      </button>
    </div>

    {#if activeTab === 'flags'}
      <div class="tab-content">
        <h2>Flagged Posts</h2>
        
        {#if flagsLoading}
          <div class="loading">Loading flags...</div>
        {:else if flags.length === 0}
          <div class="empty-state">No pending flags</div>
        {:else}
          <div class="flags-list">
            {#each flags as flag}
              <div class="flag-item">
                <div class="flag-header">
                  <div>
                    <strong>Post ID:</strong> {flag.post_id}
                    {#if flag.post}
                      <br />
                      <strong>Thread ID:</strong> {flag.post.thread_id}
                      <br />
                      <strong>Author ID:</strong> {flag.post.user_id}
                    {/if}
                  </div>
                  <div class="flag-meta">
                    <span>Flagged by: {flag.flagged_by_user?.email || 'Unknown'}</span>
                    <span>{new Date(flag.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div class="flag-reason">
                  <strong>Reason:</strong> {flag.reason}
                </div>

                {#if flag.post}
                  <div class="post-preview">
                    <strong>Post Content:</strong>
                    <div class="post-content">{flag.post.content.substring(0, 200)}...</div>
                  </div>
                {/if}

                <div class="flag-actions">
                  {#if isAdmin}
                    <button
                      on:click={() => {
                        removePostId = flag.post_id;
                        showRemoveModal = true;
                      }}
                      class="action-button remove-button"
                    >
                      Remove Post
                    </button>
                  {/if}
                  <button
                    on:click={() => {
                      warningPostId = flag.post_id;
                      warningThreadId = flag.post?.thread_id || '';
                      warningUserId = flag.post?.user_id || '';
                      showWarnModal = true;
                    }}
                    class="action-button warn-button"
                  >
                    Warn User
                  </button>
                  <button
                    on:click={() => {
                      blockUserId = flag.post?.user_id || '';
                      showBlockModal = true;
                    }}
                    class="action-button block-button"
                  >
                    Block User
                  </button>
                  <button
                    on:click={() => handleDismissFlag(flag.id)}
                    class="action-button dismiss-button"
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if activeTab === 'warnings'}
      <div class="tab-content">
        <h2>Warn User</h2>
        <form on:submit|preventDefault={() => showWarnModal = true} class="warn-form">
          <div class="form-group">
            <label for="warningUserId">User ID or Email</label>
            <input
              id="warningUserId"
              type="text"
              bind:value={warningUserId}
              placeholder="Enter user ID or email"
              required
            />
          </div>
          <div class="form-group">
            <label for="warningReason">Reason for Warning</label>
            <textarea
              id="warningReason"
              bind:value={warningReason}
              placeholder="Explain why this user is being warned..."
              required
              rows="4"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="warningPostId">Related Post ID (optional)</label>
            <input
              id="warningPostId"
              type="text"
              bind:value={warningPostId}
              placeholder="Post ID if warning is related to a specific post"
            />
          </div>
          <div class="form-group">
            <label for="warningThreadId">Related Thread ID (optional)</label>
            <input
              id="warningThreadId"
              type="text"
              bind:value={warningThreadId}
              placeholder="Thread ID if warning is related to a specific thread"
            />
          </div>
          <button type="submit" class="submit-button">Warn User</button>
        </form>
      </div>
    {/if}

    {#if activeTab === 'blocks'}
      <div class="tab-content">
        <h2>Blocked Users</h2>
        <button
          on:click={() => {
            blockUserId = '';
            blockReason = '';
            showBlockModal = true;
          }}
          class="add-button"
        >
          Block New User
        </button>

        {#if blockedUsers.length === 0}
          <div class="empty-state">No blocked users</div>
        {:else}
          <div class="blocked-list">
            {#each blockedUsers as blocked}
              <div class="blocked-item">
                <div class="blocked-info">
                  <strong>User:</strong> {blocked.user?.email || blocked.user_id}
                  <br />
                  <strong>Reason:</strong> {blocked.reason}
                  <br />
                  <strong>Blocked by:</strong> {blocked.blocked_by_user?.email || 'Unknown'}
                  <br />
                  <strong>Blocked on:</strong> {new Date(blocked.blocked_at).toLocaleString()}
                </div>
                <button
                  on:click={() => handleUnblockUser(blocked.user_id)}
                  class="action-button unblock-button"
                >
                  Unblock
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<!-- Warn User Modal -->
{#if showWarnModal}
  <div class="modal-overlay" on:click={() => !warningLoading && (showWarnModal = false)}>
    <div class="modal-content" on:click|stopPropagation>
      <h3>Confirm Warning</h3>
      <p>Are you sure you want to warn this user?</p>
      <div class="modal-actions">
        <button
          on:click={handleWarnUser}
          disabled={warningLoading || !warningUserId || !warningReason}
          class="submit-button"
        >
          {warningLoading ? 'Warning...' : 'Confirm'}
        </button>
        <button
          on:click={() => showWarnModal = false}
          disabled={warningLoading}
          class="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Block User Modal -->
{#if showBlockModal}
  <div class="modal-overlay" on:click={() => !blockLoading && (showBlockModal = false)}>
    <div class="modal-content" on:click|stopPropagation>
      <h3>Block User</h3>
      <div class="form-group">
        <label>User ID or Email</label>
        <input
          type="text"
          bind:value={blockUserId}
          placeholder="Enter user ID or email"
          disabled={blockLoading}
        />
      </div>
      <div class="form-group">
        <label>Reason</label>
        <textarea
          bind:value={blockReason}
          placeholder="Reason for blocking..."
          rows="4"
          disabled={blockLoading}
        ></textarea>
      </div>
      <div class="modal-actions">
        <button
          on:click={handleBlockUser}
          disabled={blockLoading || !blockUserId || !blockReason}
          class="submit-button block-button"
        >
          {blockLoading ? 'Blocking...' : 'Block User'}
        </button>
        <button
          on:click={() => showBlockModal = false}
          disabled={blockLoading}
          class="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Remove Post Modal -->
{#if showRemoveModal && isAdmin}
  <div class="modal-overlay" on:click={() => !removeLoading && (showRemoveModal = false)}>
    <div class="modal-content" on:click|stopPropagation>
      <h3>Remove Post</h3>
      <p>Post ID: {removePostId}</p>
      <div class="form-group">
        <label>Removal Reason</label>
        <textarea
          bind:value={removeReason}
          placeholder="Reason for removing this post..."
          rows="4"
          disabled={removeLoading}
          required
        ></textarea>
      </div>
      <div class="modal-actions">
        <button
          on:click={() => handleRemovePost(removePostId)}
          disabled={removeLoading || !removeReason}
          class="submit-button remove-button"
        >
          {removeLoading ? 'Removing...' : 'Remove Post'}
        </button>
        <button
          on:click={() => showRemoveModal = false}
          disabled={removeLoading}
          class="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .moderation-page {
    padding: 2rem 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .page-header h1 {
    margin: 0;
    color: var(--text-color);
    font-size: 2rem;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .role-badge {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .back-link {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--primary-color);
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--border-color);
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    margin-bottom: -2px;
  }

  .tab:hover {
    color: var(--text-color);
  }

  .tab.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }

  .tab-content {
    background: var(--bg-secondary);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .tab-content h2 {
    margin: 0 0 1.5rem 0;
    color: var(--text-color);
  }

  .loading,
  .empty-state,
  .access-denied {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .access-denied h2 {
    color: var(--text-color);
    margin-bottom: 1rem;
  }

  .flags-list,
  .blocked-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .flag-item,
  .blocked-item {
    padding: 1.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .flag-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .flag-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-align: right;
  }

  .flag-reason {
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(220, 38, 38, 0.1);
    border-left: 3px solid #dc2626;
    border-radius: 4px;
  }

  .post-preview {
    margin: 1rem 0;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  .post-content {
    margin-top: 0.5rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  .flag-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .warn-button {
    background: #f59e0b;
    color: white;
  }

  .warn-button:hover {
    background: #d97706;
  }

  .block-button {
    background: #dc2626;
    color: white;
  }

  .block-button:hover {
    background: #b91c1c;
  }

  .remove-button {
    background: #991b1b;
    color: white;
  }

  .remove-button:hover {
    background: #7f1d1d;
  }

  .dismiss-button {
    background: var(--bg-secondary);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .dismiss-button:hover {
    background: var(--hover-bg);
  }

  .unblock-button {
    background: #22c55e;
    color: white;
  }

  .unblock-button:hover {
    background: #16a34a;
  }

  .blocked-item {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .blocked-info {
    flex: 1;
    color: var(--text-color);
    line-height: 1.6;
  }

  .warn-form {
    max-width: 600px;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-weight: 500;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 1rem;
    font-family: monospace;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .submit-button,
  .add-button {
    padding: 0.75rem 1.5rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  .submit-button:hover,
  .add-button:hover {
    opacity: 0.9;
  }

  .add-button {
    margin-bottom: 1.5rem;
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
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-content h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .cancel-button {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
  }

  .cancel-button:hover:not(:disabled) {
    background: var(--hover-bg);
  }

  .cancel-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

