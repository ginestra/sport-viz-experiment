<script>
  import { onMount } from 'svelte';
  import { user } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase/client.js';
  import { isUserBlocked } from '../../lib/moderation/blocks.js';
  import BlockedUserBanner from '../../components/collaborative/BlockedUserBanner.svelte';

  let isBlocked = false;

  let theme = '';
  let minParticipants = 2;
  let maxParticipants = 5;
  let loading = false;
  let error = '';

  onMount(async () => {
    if ($user) {
      isBlocked = await isUserBlocked($user.id);
    }
  });

  async function handleSubmit() {
    // Check if user is authenticated
    if (!$user || !$user.id) {
      error = 'You must be logged in to create a thread';
      window.location.hash = '/collaborative/login';
      return;
    }

    if (isBlocked) {
      error = 'You cannot create threads while your account is blocked';
      return;
    }

    // Validate and sanitize theme
    const sanitizedTheme = theme.trim();
    if (!sanitizedTheme) {
      error = 'Please enter a theme';
      return;
    }

    if (sanitizedTheme.length > 200) {
      error = 'Theme must be 200 characters or less';
      return;
    }

    // Validate participant counts
    if (minParticipants < 2) {
      error = 'Minimum participants must be at least 2';
      return;
    }

    if (minParticipants > 50) {
      error = 'Minimum participants cannot exceed 50';
      return;
    }

    if (maxParticipants < minParticipants) {
      error = 'Maximum participants must be greater than or equal to minimum';
      return;
    }

    if (maxParticipants > 50) {
      error = 'Maximum participants cannot exceed 50';
      return;
    }

    loading = true;
    error = '';

    try {
      // Double-check user is still authenticated
      if (!$user || !$user.id) {
        throw new Error('User session expired. Please log in again.');
      }

      const { data, error: createError } = await supabase
        .from('writing_threads')
        .insert({
          theme: sanitizedTheme,
          min_participants: minParticipants,
          max_participants: maxParticipants,
          created_by: $user.id,
          status: 'waiting'
        })
        .select()
        .single();

      if (createError) throw createError;

      if (!data || !data.id) {
        throw new Error('Failed to create thread - no data returned');
      }

      // Join the thread as the creator
      const { error: joinError } = await supabase
        .from('thread_participants')
        .insert({
          thread_id: data.id,
          user_id: $user.id
        });

      if (joinError) throw joinError;

      // Redirect to the thread
      window.location.hash = `/collaborative/thread/${data.id}`;
    } catch (err) {
      error = err.message || 'Failed to create thread';
      console.error('Error creating thread:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="create-thread-page">
  <BlockedUserBanner />
  
  {#if !$user}
    <div class="error-message">
      <p>You must be logged in to create a thread.</p>
      <a href="#/collaborative/login" use:link class="login-link">Sign In</a>
    </div>
  {:else}
    <div class="page-header">
      <h1>Create Writing Thread</h1>
      <a href="#/collaborative" use:link class="back-link">← Back to Threads</a>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="create-form">
    <div class="form-group">
      <label for="theme">Theme</label>
      <input
        id="theme"
        type="text"
        bind:value={theme}
        placeholder="e.g., Climate Change Solutions"
        required
        disabled={loading}
        maxlength="200"
      />
      <small class="help-text">The topic or theme for this collaborative writing thread</small>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="minParticipants">Minimum Participants</label>
        <input
          id="minParticipants"
          type="number"
          bind:value={minParticipants}
          min="2"
          max="20"
          required
          disabled={loading}
        />
        <small class="help-text">Thread opens when this many people join</small>
      </div>

      <div class="form-group">
        <label for="maxParticipants">Maximum Participants</label>
        <input
          id="maxParticipants"
          type="number"
          bind:value={maxParticipants}
          min={minParticipants}
          max="20"
          required
          disabled={loading}
        />
        <small class="help-text">Maximum number of participants allowed</small>
      </div>
    </div>

    <div class="form-actions">
      <button type="submit" class="submit-button" disabled={loading}>
        {loading ? 'Creating...' : 'Create Thread'}
      </button>
      <a href="#/collaborative" use:link class="cancel-button">Cancel</a>
    </div>
  </form>
  {/if}
</div>

<style>
  .create-thread-page {
    padding: 2rem 1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
    font-size: 2rem;
  }

  .back-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link:hover {
    color: var(--primary-color);
  }

  .error-message {
    padding: 1rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    color: #dc2626;
    margin-bottom: 1.5rem;
  }

  .create-form {
    background: var(--bg-secondary);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-weight: 500;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 1rem;
    font-family: monospace;
    transition: border-color 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .submit-button {
    flex: 1;
    padding: 0.75rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .submit-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-button {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-decoration: none;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cancel-button:hover {
    background: var(--hover-bg);
  }

  .login-link {
    display: inline-block;
    margin-top: 0.5rem;
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
  }

  .login-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>

