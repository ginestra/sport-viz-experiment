<script>
  import { auth, user } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase/client.js';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let displayName = '';
  let consentGiven = false;
  let error = '';
  let success = false;
  let loading = false;

  async function handleSubmit() {
    error = '';
    loading = true;

    if (!email || !password || !confirmPassword || !displayName.trim()) {
      error = 'Please fill in all fields';
      loading = false;
      return;
    }

    if (displayName.trim().length < 2) {
      error = 'Display name must be at least 2 characters';
      loading = false;
      return;
    }

    if (displayName.trim().length > 50) {
      error = 'Display name must be 50 characters or less';
      loading = false;
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      loading = false;
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      loading = false;
      return;
    }

    if (!consentGiven) {
      error = 'You must consent to the Privacy Policy and Terms of Service to create an account';
      loading = false;
      return;
    }

    const { data: authData, error: authError } = await auth.signUp(email, password);
    
    if (authError) {
      error = authError.message || 'Failed to create account';
      loading = false;
    } else if (authData?.user) {
      // Create user profile with display name
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          display_name: displayName.trim()
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        error = 'Account created but failed to save display name. You can update it in settings.';
      } else {
        success = true;
      }
      loading = false;
    } else {
      success = true;
      loading = false;
    }
  }
</script>

<div class="auth-form">
  <h2>Create Account</h2>
  
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if success}
    <div class="success-message">
      Account created! 
      {#if $user}
        You can now <a href="#/collaborative/login" use:link>sign in</a>.
      {:else}
        Please check your email to verify your account before signing in (if email confirmation is enabled).
      {/if}
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="displayName">Display Name</label>
        <input
          id="displayName"
          type="text"
          bind:value={displayName}
          placeholder="Your name"
          required
          disabled={loading}
          minlength="2"
          maxlength="50"
        />
        <small class="help-text">This name will be visible to other users (2-50 characters)</small>
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="your@email.com"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          required
          minlength="6"
          disabled={loading}
        />
        <small class="help-text">Minimum 6 characters</small>
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          bind:value={confirmPassword}
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={consentGiven}
            disabled={loading}
            required
          />
          <span>
            I consent to the <a href="#/privacy" use:link target="_blank">Privacy Policy</a> and 
            agree to the <a href="#/terms" use:link target="_blank">Terms of Service</a>. 
            I understand that I can withdraw my consent and delete my account at any time.
          </span>
        </label>
      </div>

      <button type="submit" class="submit-button" disabled={loading || !consentGiven}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  {/if}

  <div class="auth-links">
    <p>
      Already have an account? 
      <a href="#/collaborative/login" use:link>Sign in</a>
    </p>
  </div>
</div>

<style>
  .auth-form {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  h2 {
    margin: 0 0 1.5rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
  }

  .error-message {
    padding: 0.75rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    color: #dc2626;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .success-message {
    padding: 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 4px;
    color: #22c55e;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
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

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-weight: normal;
    margin: 0;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 0.2rem;
  }

  .checkbox-label span {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .checkbox-label a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .checkbox-label a:hover {
    text-decoration: underline;
  }

  .submit-button {
    width: 100%;
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

  .auth-links {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
  }

  .auth-links p {
    margin: 0.5rem 0;
    color: var(--text-secondary);
  }

  .auth-links a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .auth-links a:hover {
    text-decoration: underline;
  }
</style>

