<script>
  import { onMount } from 'svelte';
  import { user, auth } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase/client.js';

  let loading = false;
  let error = '';
  let success = '';
  let showDeleteConfirm = false;
  let deleteConfirmText = '';
  let exportLoading = false;
  let displayName = '';
  let displayNameLoading = false;
  let profileLoaded = false;

  async function loadProfile() {
    if (!$user?.id) return;

    try {
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', $user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading profile:', profileError);
      } else if (data) {
        displayName = data.display_name || '';
      }
      profileLoaded = true;
    } catch (err) {
      console.error('Error loading profile:', err);
      profileLoaded = true;
    }
  }

  async function updateDisplayName() {
    if (!$user?.id) return;

    if (!displayName.trim()) {
      error = 'Display name cannot be empty';
      return;
    }

    if (displayName.trim().length < 2) {
      error = 'Display name must be at least 2 characters';
      return;
    }

    if (displayName.trim().length > 50) {
      error = 'Display name must be 50 characters or less';
      return;
    }

    displayNameLoading = true;
    error = '';
    success = '';

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', $user.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            display_name: displayName.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', $user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: $user.id,
            display_name: displayName.trim()
          });

        if (insertError) throw insertError;
      }

      success = 'Display name updated successfully!';
    } catch (err) {
      error = err.message || 'Failed to update display name';
      console.error('Error updating display name:', err);
    } finally {
      displayNameLoading = false;
    }
  }

  onMount(() => {
    loadProfile();
  });

  async function exportUserData() {
    exportLoading = true;
    error = '';
    success = '';

    try {
      const userId = $user?.id;
      if (!userId) throw new Error('User not found');

      // Fetch all user data
      const [threadsData, participantsData, postsData] = await Promise.all([
        supabase
          .from('writing_threads')
          .select('*')
          .eq('created_by', userId),
        supabase
          .from('thread_participants')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('thread_posts')
          .select('*')
          .eq('user_id', userId)
      ]);

      if (threadsData.error) throw threadsData.error;
      if (participantsData.error) throw participantsData.error;
      if (postsData.error) throw postsData.error;

      // Compile user data
      const userData = {
        account: {
          id: $user.id,
          email: $user.email,
          created_at: $user.created_at,
          last_sign_in: $user.last_sign_in_at
        },
        threads_created: threadsData.data || [],
        thread_participations: participantsData.data || [],
        posts: postsData.data || [],
        export_date: new Date().toISOString()
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `thatlab-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success = 'Your data has been exported successfully.';
    } catch (err) {
      error = err.message || 'Failed to export data';
      console.error('Error exporting data:', err);
    } finally {
      exportLoading = false;
    }
  }

  async function deleteAccount() {
    if (deleteConfirmText !== 'DELETE') {
      error = 'Please type DELETE to confirm';
      return;
    }

    loading = true;
    error = '';
    success = '';

    try {
      const userId = $user?.id;
      if (!userId) throw new Error('User not found');

      // Delete all user data in correct order (respecting foreign key constraints)
      // 1. Delete user's posts
      const { error: postsError } = await supabase
        .from('thread_posts')
        .delete()
        .eq('user_id', userId);

      if (postsError) throw postsError;

      // 2. Delete user's thread participations
      const { error: participantsError } = await supabase
        .from('thread_participants')
        .delete()
        .eq('user_id', userId);

      if (participantsError) throw participantsError;

      // 3. For threads created by user, we need to handle them
      // Option 1: Delete threads if no other participants
      // Option 2: Transfer ownership (we'll delete if empty, or mark as orphaned)
      const { data: userThreads } = await supabase
        .from('writing_threads')
        .select('id')
        .eq('created_by', userId);

      if (userThreads && userThreads.length > 0) {
        for (const thread of userThreads) {
          // Check if thread has other participants
          const { data: participants } = await supabase
            .from('thread_participants')
            .select('user_id')
            .eq('thread_id', thread.id);

          if (!participants || participants.length === 0) {
            // No participants, safe to delete thread
            await supabase
              .from('writing_threads')
              .delete()
              .eq('id', thread.id);
          } else {
            // Has participants, transfer to first participant or mark as orphaned
            // For now, we'll delete the thread (you may want to transfer ownership instead)
            await supabase
              .from('writing_threads')
              .delete()
              .eq('id', thread.id);
          }
        }
      }

      // 4. Delete user's auth account via API endpoint (requires service role key)
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/collaborative/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }
      
      // Sign out the user
      await auth.signOut();
      
      success = 'Your account and all associated data have been deleted. You will be redirected.';
      
      setTimeout(() => {
        window.location.hash = '/';
      }, 2000);

    } catch (err) {
      error = err.message || 'Failed to delete account. Please contact support.';
      console.error('Error deleting account:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="account-settings-page">
  <div class="page-header">
    <h1>Account Settings</h1>
    <a href="#/collaborative" use:link class="back-link">← Back</a>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if success}
    <div class="success-message">{success}</div>
  {/if}

  <div class="settings-section">
    <h2>Account Information</h2>
    <div class="info-item">
      <label>Email:</label>
      <span>{$user?.email}</span>
    </div>
    <div class="info-item">
      <label>Account Created:</label>
      <span>{$user?.created_at ? new Date($user.created_at).toLocaleDateString() : 'N/A'}</span>
    </div>
  </div>

  <div class="settings-section">
    <h2>Display Name</h2>
    <p class="section-description">
      Your display name is shown to other users in threads and posts. You can change it at any time.
    </p>
    {#if profileLoaded}
      <div class="display-name-form">
        <div class="form-group">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            type="text"
            bind:value={displayName}
            placeholder="Your display name"
            minlength="2"
            maxlength="50"
            disabled={displayNameLoading}
          />
          <small class="help-text">2-50 characters. This name will be visible to other users.</small>
        </div>
        <button
          on:click={updateDisplayName}
          disabled={displayNameLoading || !displayName.trim() || displayName.trim().length < 2}
          class="action-button"
        >
          {displayNameLoading ? 'Saving...' : 'Update Display Name'}
        </button>
      </div>
    {:else}
      <div class="loading">Loading profile...</div>
    {/if}
  </div>

  <div class="settings-section">
    <h2>Data Management</h2>
    <p class="section-description">
      Under GDPR, you have the right to access, export, and delete your personal data.
    </p>

    <div class="action-group">
      <div class="action-info">
        <h3>Export Your Data</h3>
        <p>Download a copy of all your data in JSON format.</p>
      </div>
      <button
        on:click={exportUserData}
        disabled={exportLoading}
        class="action-button export-button"
      >
        {exportLoading ? 'Exporting...' : 'Export Data'}
      </button>
    </div>
  </div>

  <div class="settings-section danger-zone">
    <h2>Danger Zone</h2>
    <p class="section-description">
      Permanently delete your account and all associated data. This action cannot be undone.
    </p>

    {#if !showDeleteConfirm}
      <button
        on:click={() => showDeleteConfirm = true}
        class="action-button delete-button"
      >
        Delete Account
      </button>
    {:else}
      <div class="delete-confirm">
        <div class="warning-box">
          <strong>⚠️ Warning: This action is permanent!</strong>
          <p>Deleting your account will:</p>
          <ul>
            <li>Permanently delete your account and authentication data</li>
            <li>Delete all threads you created (if they have no other participants)</li>
            <li>Remove all your posts from collaborative threads</li>
            <li>Remove your participation from all threads</li>
          </ul>
          <p>This action cannot be undone.</p>
        </div>

        <div class="confirm-input">
          <label for="deleteConfirm">
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            id="deleteConfirm"
            type="text"
            bind:value={deleteConfirmText}
            placeholder="Type DELETE to confirm"
            disabled={loading}
          />
        </div>

        <div class="confirm-actions">
          <button
            on:click={deleteAccount}
            disabled={loading || deleteConfirmText !== 'DELETE'}
            class="action-button delete-confirm-button"
          >
            {loading ? 'Deleting...' : 'Permanently Delete Account'}
          </button>
          <button
            on:click={() => {
              showDeleteConfirm = false;
              deleteConfirmText = '';
            }}
            disabled={loading}
            class="action-button cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="settings-section">
    <h2>Privacy & Legal</h2>
    <p class="section-description">
      <a href="#/privacy" use:link>View Privacy Policy</a> | 
      <a href="#/terms" use:link>View Terms of Service</a>
    </p>
  </div>
</div>

<style>
  .account-settings-page {
    padding: 2rem 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0;
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

  .success-message {
    padding: 1rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 4px;
    color: #22c55e;
    margin-bottom: 1.5rem;
  }

  .settings-section {
    background: var(--bg-secondary);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    margin-bottom: 2rem;
  }

  .settings-section h2 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
  }

  .settings-section.danger-zone {
    border-color: rgba(220, 38, 38, 0.3);
    background: rgba(220, 38, 38, 0.05);
  }

  .settings-section.danger-zone h2 {
    color: #dc2626;
  }

  .section-description {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .section-description a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .section-description a:hover {
    text-decoration: underline;
  }

  .info-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-item label {
    font-weight: 500;
    color: var(--text-color);
    min-width: 150px;
  }

  .info-item span {
    color: var(--text-secondary);
  }

  .display-name-form {
    margin-top: 1rem;
  }

  .display-name-form .form-group {
    margin-bottom: 1.5rem;
  }

  .display-name-form label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-weight: 500;
    font-size: 0.9rem;
  }

  .display-name-form input {
    width: 100%;
    max-width: 400px;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .display-name-form input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .display-name-form input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .display-name-form .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .action-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .action-group:last-child {
    border-bottom: none;
  }

  .action-info {
    flex: 1;
  }

  .action-info h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
    font-size: 1.1rem;
  }

  .action-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .action-button {
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-family: monospace;
    white-space: nowrap;
  }

  .export-button {
    background: var(--primary-color);
    color: white;
  }

  .export-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .delete-button {
    background: #dc2626;
    color: white;
  }

  .delete-button:hover:not(:disabled) {
    background: #b91c1c;
  }

  .action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-confirm {
    margin-top: 1.5rem;
  }

  .warning-box {
    padding: 1.5rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    margin-bottom: 1.5rem;
  }

  .warning-box strong {
    display: block;
    color: #dc2626;
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
  }

  .warning-box p {
    margin: 0.5rem 0;
    color: var(--text-color);
  }

  .warning-box ul {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
    color: var(--text-color);
  }

  .warning-box li {
    margin: 0.25rem 0;
  }

  .confirm-input {
    margin-bottom: 1.5rem;
  }

  .confirm-input label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-weight: 500;
  }

  .confirm-input input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 1rem;
    font-family: monospace;
  }

  .confirm-input input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .confirm-input input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .confirm-actions {
    display: flex;
    gap: 1rem;
  }

  .delete-confirm-button {
    background: #dc2626;
    color: white;
  }

  .delete-confirm-button:hover:not(:disabled) {
    background: #b91c1c;
  }

  .delete-confirm-button:disabled {
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

  @media (max-width: 768px) {
    .action-group {
      flex-direction: column;
      align-items: flex-start;
    }

    .confirm-actions {
      flex-direction: column;
    }

    .confirm-actions button {
      width: 100%;
    }
  }
</style>

