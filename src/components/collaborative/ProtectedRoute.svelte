<script>
  import { user, loading } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';

  export let component;
  export let props = {};
</script>

{#if $loading}
  <div class="loading-container">
    <p>Loading...</p>
  </div>
{:else if $user}
  <svelte:component this={component} {...props} />
{:else}
  <div class="auth-required">
    <h2>Authentication Required</h2>
    <p>You need to sign in to access this section.</p>
    <div class="auth-links">
      <a href="#/collaborative/login" use:link class="auth-button">Sign In</a>
      <a href="#/collaborative/register" use:link class="auth-button secondary">Sign Up</a>
    </div>
  </div>
{/if}

<style>
  .loading-container,
  .auth-required {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    padding: 2rem;
    text-align: center;
  }

  .auth-required h2 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
  }

  .auth-required p {
    margin: 0 0 2rem 0;
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .auth-links {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .auth-button {
    padding: 0.75rem 1.5rem;
    background: var(--primary-color);
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 500;
    transition: opacity 0.2s ease;
    border: none;
    cursor: pointer;
    font-size: 1rem;
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
</style>

