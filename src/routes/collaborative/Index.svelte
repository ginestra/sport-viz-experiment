<script>
  import { onMount, onDestroy } from 'svelte';
  import { user, auth, loading as authLoading } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase/client.js';
  import { isModeratorOrAdmin } from '../../lib/moderation/roles.js';
  import { ensureProfile } from '../../lib/api/profiles.js';
  import { getThreads, subscribeToThreads } from '../../lib/api/threads.js';
  import UserWarningBanner from '../../components/collaborative/UserWarningBanner.svelte';
  import BlockedUserBanner from '../../components/collaborative/BlockedUserBanner.svelte';
  import { isUserBlocked } from '../../lib/moderation/blocks.js';

  let isModerator = false;
  let isBlocked = false;

  let threads = [];
  let loading = true;
  let error = '';
  let unsubscribeThreads = null;

  async function loadThreads() {
    loading = true;
    error = '';

    const { data, error: fetchError } = await getThreads();

    if (fetchError) {
      error = fetchError.message || 'Failed to load threads';
      threads = [];
    } else {
      threads = data || [];
    }

    loading = false;
  }

  async function handleSignOut() {
    await auth.signOut();
    window.location.hash = '/';
  }

  onMount(async () => {
    // Handle OAuth callback - ensure session is processed from URL
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Session exists, ensure it's set in store
      user.set(session.user);
    }

    // Wait for auth to be ready (especially after OAuth redirect)
    const waitForAuth = () => {
      return new Promise((resolve) => {
        // If auth is already loaded, resolve immediately
        if (!$authLoading) {
          resolve();
          return;
        }
        // Otherwise, wait for auth loading to complete
        const unsubscribe = authLoading.subscribe((isLoading) => {
          if (!isLoading) {
            unsubscribe();
            resolve();
          }
        });
      });
    };

    await waitForAuth();

    // Now check user and load data
    if ($user && $user.id) {
      isModerator = await isModeratorOrAdmin();
      isBlocked = await isUserBlocked($user.id);
      
      // Ensure user has a profile (for OAuth users who might not have one)
      await ensureProfile($user.id, $user.email);
    }
    
    loadThreads();

    // Subscribe to real-time updates
    unsubscribeThreads = subscribeToThreads(() => {
      loadThreads();
    });
  });

  onDestroy(() => {
    if (unsubscribeThreads) {
      unsubscribeThreads();
    }
  });
</script>

<div class="collaborative-page">
  {#if $authLoading}
    <div class="loading">Loading...</div>
  {:else}
    <UserWarningBanner />
    <BlockedUserBanner />
    
    <div class="page-header">
    <h1>Join a thread or create a new one</h1>
    <div class="header-actions">
      {#if $user}
        <span class="user-email">{$user.email}</span>
        {#if !isBlocked}
          <a href="#/collaborative/create" use:link class="create-button">Create Thread</a>
        {/if}
        {#if isModerator}
          <a href="#/collaborative/moderation" use:link class="moderation-button">Moderation</a>
        {/if}
        <a href="#/collaborative/settings" use:link class="settings-button">Settings</a>
        <button on:click={handleSignOut} class="sign-out-button">Sign Out</button>
      {:else}
        <a href="#/collaborative/login" use:link class="auth-button">Sign In</a>
        <a href="#/collaborative/register" use:link class="auth-button secondary">Sign Up</a>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error-message">
      {error}
      {#if error.includes('Database not set up')}
        <div class="setup-instructions">
          <p><strong>Setup Instructions:</strong></p>
          <ol>
            <li>Go to your Supabase project dashboard</li>
            <li>Navigate to SQL Editor</li>
            <li>Copy the SQL from <code>SUPABASE_SCHEMA.md</code></li>
            <li>Run the SQL to create all tables and policies</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      {/if}
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading threads...</div>
  {:else if !error && threads.length === 0}
    <div class="empty-state">
      <p>No threads yet. Create one to get started!</p>
      <a href="#/collaborative/create" use:link class="create-button">Create Thread</a>
    </div>
  {:else if !error}
    <div class="threads-list">
      {#each threads as thread}
        <a href="#/collaborative/thread/{thread.id}" use:link class="thread-card">
          <div class="thread-header">
            <h3>{thread.theme}</h3>
            <span class="thread-status status-{thread.status}">{thread.status}</span>
          </div>
          <div class="thread-info">
            <span>
              {thread.thread_participants[0]?.count || 0} / {thread.max_participants} participants
            </span>
            <span class="thread-date">
              Created {new Date(thread.created_at).toLocaleDateString()}
            </span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
  {/if}
</div>

<style>
  .collaborative-page {
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .user-email {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .create-button,
  .moderation-button,
  .settings-button,
  .sign-out-button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
    font-family: monospace;
  }

  .create-button {
    background: var(--primary-color);
    color: white;
  }

  .create-button:hover {
    opacity: 0.9;
  }

  .moderation-button {
    background: #f59e0b;
    color: white;
  }

  .moderation-button:hover {
    opacity: 0.9;
  }

  .settings-button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .settings-button:hover {
    background: var(--hover-bg);
  }

  .sign-out-button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .sign-out-button:hover {
    background: var(--hover-bg);
  }

  .auth-button {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: opacity 0.2s ease;
    border: none;
    cursor: pointer;
  }

  .auth-button:hover {
    opacity: 0.9;
  }

  .auth-button.secondary {
    background: transparent;
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
  }

  .auth-button.secondary:hover {
    background: var(--hover-bg);
  }

  .error-message {
    padding: 1rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .setup-instructions {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(220, 38, 38, 0.3);
  }

  .setup-instructions p {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  .setup-instructions ol {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }

  .setup-instructions li {
    margin: 0.5rem 0;
  }

  .setup-instructions code {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  .loading,
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .empty-state p {
    margin-bottom: 1.5rem;
  }

  .threads-list {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .thread-card {
    display: block;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.2s ease;
  }

  .thread-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .thread-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .thread-header h3 {
    margin: 0;
    font-size: 1.25rem;
    flex: 1;
  }

  .thread-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .status-waiting {
    background: rgba(251, 191, 36, 0.2);
    color: #f59e0b;
  }

  .status-active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .status-completed {
    background: rgba(107, 114, 128, 0.2);
    color: #6b7280;
  }

  .thread-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--text-secondary);
    gap: 1rem;
  }

  .thread-date {
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .threads-list {
      grid-template-columns: 1fr;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>

