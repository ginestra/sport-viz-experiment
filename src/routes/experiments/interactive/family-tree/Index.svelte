<script>
  import FamilyTree from '../../../../visualizations/FamilyTree.svelte';
</script>

<div class="family-tree-page">
  <section class="intro-section">
        <h2 class="section-title">Family Forest</h2>
        <p class="section-description">
          An interactive visualization exploring family relationships and genealogical connections.
          Navigate through your family forest with roots at the bottom and branches growing upward, like a natural tree.
          Hover over nodes for quick information, click to view detailed profiles, and zoom/pan to explore.
        </p>
  </section>

  <section class="content-section">
    <FamilyTree />
  </section>
</div>

<style>
  .family-tree-page {
    padding: 2rem 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .intro-section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: var(--text-color);
  }

  .section-description {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .content-section {
    margin-top: 3rem;
  }

  .placeholder-content {
    padding: 3rem;
    text-align: center;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    color: var(--text-secondary);
  }

  @media (min-width: 768px) {
    .family-tree-page {
      padding: 3rem 2rem;
    }

    .section-title {
      font-size: 2.5rem;
    }
  }
</style>

