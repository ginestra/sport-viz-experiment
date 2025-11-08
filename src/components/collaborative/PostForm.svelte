<script>
  import { user } from '../../stores/auth.js';
  import { getWordCount } from '../../lib/utils/sanitize.js';
  import { MAX_WORDS, MAX_CONTENT_LENGTH } from '../../lib/constants/collaborative.js';
  import SourceInput from './SourceInput.svelte';

  export let threadId = '';
  export let onSubmit = () => {};
  export let disabled = false;

  let content = '';
  let sources = [];
  let plagiarismConfirmed = false;
  let error = '';
  let wordCount = 0;

  $: wordCount = getWordCount(content);
  $: isOverLimit = wordCount > MAX_WORDS;
  $: canSubmit = !disabled && content.trim().length > 0 && wordCount <= MAX_WORDS && plagiarismConfirmed && !isOverLimit;

  function addSource() {
    sources = [...sources, { title: '', url: '', citation: '' }];
  }

  function removeSource(index) {
    sources = sources.filter((_, i) => i !== index);
  }

  function updateSource(index, field, value) {
    sources = sources.map((source, i) => 
      i === index ? { ...source, [field]: value } : source
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    error = '';

    // Filter out empty sources
    const validSources = sources.filter(s => s.title.trim() || s.url.trim() || s.citation.trim());

    await onSubmit({
      content: content.trim(),
      sources: validSources,
      plagiarism_confirmed: plagiarismConfirmed
    });

    // Reset form
    content = '';
    sources = [];
    plagiarismConfirmed = false;
  }
</script>

<div class="post-form">
  <h3>Write Your Post</h3>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="content">
        Content
        <span class="word-count {isOverLimit ? 'over-limit' : ''}">
          {wordCount} / {MAX_WORDS} words
        </span>
      </label>
      <textarea
        id="content"
        bind:value={content}
        placeholder="Write your post here (maximum {MAX_WORDS} words)..."
        rows="10"
        disabled={disabled}
        maxlength="{MAX_CONTENT_LENGTH}"
      ></textarea>
      {#if isOverLimit}
        <small class="error-text">You have exceeded the {MAX_WORDS} word limit. Please shorten your post.</small>
      {/if}
    </div>

    <div class="form-group">
      <div class="sources-header">
        <label>Sources (Optional)</label>
        <button
          type="button"
          on:click={addSource}
          disabled={disabled}
          class="add-source-button"
        >
          + Add Source
        </button>
      </div>

      {#if sources.length === 0}
        <p class="help-text">You can add sources to cite your work. This is optional but recommended.</p>
      {:else}
        <div class="sources-list">
          {#each sources as source, index}
            <SourceInput
              {source}
              on:update={(e) => updateSource(index, e.detail.field, e.detail.value)}
              on:remove={() => removeSource(index)}
              {disabled}
            />
          {/each}
        </div>
      {/if}
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          bind:checked={plagiarismConfirmed}
          disabled={disabled}
          required
        />
        <span>
          I confirm that this content is original and I take full responsibility for it. 
          I understand that plagiarism is strictly prohibited and may result in warnings or account suspension.
        </span>
      </label>
    </div>

    <div class="form-actions">
      <button
        type="submit"
        class="submit-button"
        disabled={!canSubmit}
      >
        {disabled ? 'Submitting...' : 'Submit Post'}
      </button>
    </div>
  </form>
</div>

<style>
  .post-form {
    background: var(--bg-secondary);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    margin: 2rem 0;
  }

  .post-form h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-weight: 500;
    font-size: 0.9rem;
  }

  .word-count {
    float: right;
    font-weight: normal;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .word-count.over-limit {
    color: #dc2626;
    font-weight: 600;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 1rem;
    font-family: monospace;
    resize: vertical;
    min-height: 150px;
    transition: border-color 0.2s ease;
  }

  textarea:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-text {
    display: block;
    margin-top: 0.25rem;
    color: #dc2626;
    font-size: 0.85rem;
  }

  .sources-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .add-source-button {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .add-source-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .add-source-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }

  .sources-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

  .form-actions {
    margin-top: 2rem;
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

  .error-message {
    padding: 1rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    color: #dc2626;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
</style>

