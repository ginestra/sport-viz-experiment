<script>
  import { theme } from '../stores/theme.js';
</script>

<button 
  class="theme-toggle" 
  on:click={() => theme.toggle()}
  aria-label="Toggle theme"
  title="Toggle dark/light theme"
>
  <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    {#if $theme === 'dark'}
      <!-- Sun icon for light mode -->
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    {:else}
      <!-- Moon icon for dark mode -->
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    {/if}
  </svg>
</button>

<style>
  .theme-toggle {
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .theme-toggle:hover {
    background-color: var(--hover-bg);
    transform: scale(1.1);
  }

  .theme-icon {
    width: 1.25rem;
    height: 1.25rem;
    stroke: var(--text-color);
    transition: transform 0.2s ease;
  }
</style>

