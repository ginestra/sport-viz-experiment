<script>
  import { auth } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    error = '';
    loading = true;

    if (!email || !password) {
      error = 'Please fill in all fields';
      loading = false;
      return;
    }

    const { error: authError } = await auth.signIn(email, password);
    
    if (authError) {
      error = authError.message || 'Failed to sign in';
    } else {
      // Redirect will happen automatically via auth state change
      window.location.hash = '/collaborative';
    }
    
    loading = false;
  }
</script>

<div class="auth-form">
  <h2>Sign In</h2>
  
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
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
        disabled={loading}
      />
    </div>

    <button type="submit" class="submit-button" disabled={loading}>
      {loading ? 'Signing in...' : 'Sign In'}
    </button>
  </form>

  <div class="auth-links">
    <p>
      Don't have an account? 
      <a href="#/collaborative/register" use:link>Sign up</a>
    </p>
    <p>
      <a href="#/collaborative/forgot-password" use:link>Forgot password?</a>
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

