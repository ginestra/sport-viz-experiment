<script>
  import { auth } from '../../stores/auth.js';

  let loading = false;
  let error = '';

  async function handleOAuth(provider) {
    error = '';
    loading = true;

    const { error: authError } = await auth.signInWithOAuth(provider);
    
    if (authError) {
      // Provide more helpful error messages
      if (authError.message && authError.message.includes('not enabled')) {
        error = `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not enabled. Please enable it in your Supabase dashboard under Authentication > Providers.`;
      } else {
        error = authError.message || `Failed to sign in with ${provider}`;
      }
      loading = false;
    }
    // If successful, user will be redirected by OAuth flow
  }
</script>

<div class="oauth-section">
  <div class="divider">
    <span>or</span>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="oauth-buttons">
    <button
      class="oauth-button google"
      on:click={() => handleOAuth('google')}
      disabled={loading}
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.036-3.711H.957v2.331C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
        <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.957H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.043l3.007-2.331z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.957L3.964 7.288C4.67 5.163 6.653 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </button>

    <button
      class="oauth-button github"
      on:click={() => handleOAuth('github')}
      disabled={loading}
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      Sign in with GitHub
    </button>
  </div>
</div>

<style>
  .oauth-section {
    margin: 1.5rem 0;
  }

  .divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 1.5rem 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--border-color);
  }

  .divider span {
    padding: 0 1rem;
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

  .oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .oauth-button {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .oauth-button:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--primary-color);
  }

  .oauth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .oauth-button svg {
    flex-shrink: 0;
  }

  .oauth-button.google svg {
    width: 18px;
    height: 18px;
  }

  .oauth-button.github svg {
    width: 18px;
    height: 18px;
  }
</style>

