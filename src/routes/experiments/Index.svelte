<script>
  import { link } from 'svelte-spa-router';
  import { experiments, categories } from '../../data/experiments.js';
  
  // Group experiments by category
  $: experimentsByCategory = categories.map(category => ({
    ...category,
    experiments: experiments.filter(exp => exp.category === category.id)
  }));
</script>

<div class="experiments-page">
  <h1 class="page-title">Experiments</h1>
  <p class="page-description">Browse all experiments by category</p>

  <div class="categories-container">
    {#each experimentsByCategory as categoryGroup}
      {#if categoryGroup.experiments.length > 0}
        <section class="category-section">
          <h2 class="category-title">
            <a href={categoryGroup.route} use:link class="category-link">{categoryGroup.name}</a>
          </h2>
          <p class="category-description">{categoryGroup.description}</p>
          
          <div class="experiments-list">
            {#each categoryGroup.experiments as experiment}
              <a href={experiment.route} use:link class="experiment-item">
                <h3 class="item-title">{experiment.title}</h3>
                <p class="item-description">{experiment.description}</p>
                <div class="item-tags">
                  {#each experiment.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              </a>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
  </div>
</div>

<style>
  .experiments-page {
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

  .categories-container {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .category-section {
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
  }

  .category-section:last-child {
    border-bottom: none;
  }

  .category-title {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .category-link {
    color: var(--text-color);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .category-link:hover {
    color: var(--primary-color);
  }

  .category-description {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0 0 1.5rem 0;
  }

  .experiments-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .experiment-item {
    display: block;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.2s ease;
  }

  .experiment-item:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .item-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
  }

  .item-description {
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
  }

  .item-tags {
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
    .experiments-page {
      padding: 3rem 2rem;
    }
  }
</style>

