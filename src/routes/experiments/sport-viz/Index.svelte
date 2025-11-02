<script>
  import { link } from 'svelte-spa-router';
  import { getExperimentsByCategory, categories } from '../../../data/experiments.js';
  
  const categoryId = 'sport-viz';
  $: categoryExperiments = getExperimentsByCategory(categoryId);
  $: category = categories.find(c => c.id === categoryId);
</script>

<div class="category-page">
  <h1 class="page-title">{category?.name || 'Sport Visualizations'}</h1>
  <p class="page-description">{category?.description || 'Data visualizations related to sports'}</p>

  <div class="experiments-grid">
    {#each categoryExperiments as experiment}
      <a href={experiment.route} use:link class="experiment-card">
        <h3 class="card-title">{experiment.title}</h3>
        <p class="card-description">{experiment.description}</p>
        <div class="card-tags">
          {#each experiment.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .category-page {
    padding: 2rem 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
  }

  .page-description {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
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
  }

  .tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
  }

  @media (min-width: 768px) {
    .category-page {
      padding: 3rem 2rem;
    }

    .experiments-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }
  }
</style>

