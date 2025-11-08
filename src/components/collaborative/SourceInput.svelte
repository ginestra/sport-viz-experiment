<script>
  import { createEventDispatcher } from 'svelte';

  export let source = { title: '', url: '', citation: '' };
  export let disabled = false;

  const dispatch = createEventDispatcher();

  function handleUpdate(field, value) {
    dispatch('update', { field, value });
  }

  function handleRemove() {
    dispatch('remove');
  }
</script>

<div class="source-input">
  <div class="source-header">
    <label>Source {source.index !== undefined ? source.index + 1 : ''}</label>
    <button
      type="button"
      on:click={handleRemove}
      disabled={disabled}
      class="remove-button"
      title="Remove source"
    >
      ×
    </button>
  </div>

  <div class="source-fields">
    <div class="field-group">
      <label for="source-title">Title</label>
      <input
        id="source-title"
        type="text"
        value={source.title}
        on:input={(e) => handleUpdate('title', e.target.value)}
        placeholder="Source title or name"
        disabled={disabled}
      />
    </div>

    <div class="field-group">
      <label for="source-url">URL (Optional)</label>
      <input
        id="source-url"
        type="url"
        value={source.url}
        on:input={(e) => handleUpdate('url', e.target.value)}
        placeholder="https://example.com"
        disabled={disabled}
      />
    </div>

    <div class="field-group">
      <label for="source-citation">Citation (Optional)</label>
      <input
        id="source-citation"
        type="text"
        value={source.citation}
        on:input={(e) => handleUpdate('citation', e.target.value)}
        placeholder="Full citation or reference"
        disabled={disabled}
      />
    </div>
  </div>
</div>

<style>
  .source-input {
    padding: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .source-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .source-header label {
    margin: 0;
    color: var(--text-color);
    font-weight: 500;
    font-size: 0.9rem;
  }

  .remove-button {
    background: transparent;
    border: none;
    color: #dc2626;
    font-size: 1.5rem;
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s ease;
    padding: 0;
    line-height: 1;
  }

  .remove-button:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.1);
  }

  .remove-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .source-fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
  }

  .field-group label {
    margin-bottom: 0.25rem;
    color: var(--text-color);
    font-size: 0.85rem;
    font-weight: 500;
  }

  .field-group input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-color);
    font-size: 0.9rem;
    font-family: monospace;
    transition: border-color 0.2s ease;
  }

  .field-group input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .field-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

