<script>
  /**
   * ViewModeToggle - Toggle between Write Mode and Read Mode
   * @prop {string} viewMode - Current view mode ('write' | 'read')
   * @prop {function} onModeChange - Callback when mode changes
   * @prop {number} postsCount - Number of posts (only show if > 0)
   */
  export let viewMode = 'write';
  export let onModeChange;
  export let postsCount = 0;
</script>

{#if postsCount > 0}
  <div class="view-toggle">
    <button 
      class="toggle-button {viewMode === 'write' ? 'active' : ''}"
      on:click={() => onModeChange('write')}
    >
      Write Mode
    </button>
    <button 
      class="toggle-button {viewMode === 'read' ? 'active' : ''}"
      on:click={() => onModeChange('read')}
    >
      Read Mode
    </button>
  </div>
{/if}

<style>
  .view-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .toggle-button {
    padding: 0.5rem 1rem;
    border: 2px solid var(--border-color);
    background: var(--bg-color);
    color: var(--text-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .toggle-button:hover {
    border-color: var(--primary-color);
    background: var(--bg-secondary);
  }

  .toggle-button.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
</style>

