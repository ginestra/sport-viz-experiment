<script>
  import { link } from 'svelte-spa-router';
  import { experiments, categories, searchExperiments } from '../data/experiments.js';
  
  let searchQuery = '';
  let selectedCategory = 'all';
  let filteredExperiments = experiments;

  function handleSearch() {
    if (!searchQuery.trim() && selectedCategory === 'all') {
      filteredExperiments = experiments;
      return;
    }

    let results = experiments;

    // Filter by category
    if (selectedCategory !== 'all') {
      results = results.filter(exp => exp.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      results = searchExperiments(searchQuery).filter(exp => 
        results.includes(exp)
      );
    }

    filteredExperiments = results;
  }

  $: handleSearch();
</script>

<div class="home-page">
  <section class="intro-section">
    <h1 class="intro-title">That Lab</h1>
    <p class="intro-description">
      A collection of experiments exploring data visualization, interactive design, and creative coding. 
      Each experiment is a playground for ideas, techniques, and discoveries.
    </p>
  </section>

  <section class="experiments-section">
    <div class="filters-container">
      <div class="search-container">
        <input
          type="text"
          class="search-input"
          placeholder="Search experiments..."
          bind:value={searchQuery}
        />
      </div>
      
      <div class="category-filters">
        <button
          class="filter-btn"
          class:active={selectedCategory === 'all'}
          on:click={() => selectedCategory = 'all'}
        >
          All
        </button>
        {#each categories as category}
          <button
            class="filter-btn"
            class:active={selectedCategory === category.id}
            on:click={() => selectedCategory = category.id}
          >
            {category.name}
          </button>
        {/each}
      </div>
    </div>

    <div class="experiments-grid">
      {#each filteredExperiments as experiment}
        <a href={experiment.route} use:link class="experiment-card">
          <h3 class="card-title">{experiment.title}</h3>
          <p class="card-description">{experiment.description}</p>
          <div class="card-tags">
            {#each experiment.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
          <div class="card-category">{categories.find(c => c.id === experiment.category)?.name || experiment.category}</div>
        </a>
      {:else}
        <div class="no-results">
          <p>No experiments found matching your criteria.</p>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .home-page {
    padding: 2rem 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .intro-section {
    margin-bottom: 3rem;
    text-align: center;
  }

  .intro-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: var(--text-color);
  }

  .intro-description {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }

  .experiments-section {
    margin-top: 3rem;
  }

  .filters-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .search-container {
    width: 100%;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-family: monospace;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    font-family: monospace;
    font-size: 0.9rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    background: var(--hover-bg);
  }

  .filter-btn.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .experiments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .experiment-card {
    display: block;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.2s ease;
  }

  .experiment-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
  }

  .card-description {
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .card-category {
    font-size: 0.85rem;
    color: var(--primary-color);
    font-weight: 500;
  }

  .no-results {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  @media (min-width: 768px) {
    .home-page {
      padding: 3rem 2rem;
    }

    .intro-title {
      font-size: 3.5rem;
    }

    .filters-container {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .search-container {
      flex: 1;
      max-width: 400px;
    }

    .experiments-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }
  }
</style>

