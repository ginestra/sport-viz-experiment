<script>
</script>

<div class="about-page">
  <section class="about-section">
    <h1 class="about-title">About</h1>
    <div class="about-content">
      <p class="about-description">
        That Lab is a collection of experiments exploring data visualization, interactive design, 
        and creative coding. Each experiment serves as a playground for ideas, techniques, and discoveries.
      </p>
      
      <h2 class="section-title">Mission</h2>
      <p class="about-text">
        We explore the intersection of data, design, and technology to create meaningful 
        visualizations and interactive experiences that tell compelling stories.
      </p>

      <h2 class="section-title">Technologies</h2>
      <p class="about-text">
        This site is built with modern web technologies including Svelte, D3.js, and Vite, 
        emphasizing clean code, performance, and user experience.
      </p>
    </div>
  </section>
</div>

<style>
  .about-page {
    padding: 2rem 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .about-section {
    margin-bottom: 3rem;
  }

  .about-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin: 0 0 2rem 0;
    color: var(--text-color);
  }

  .about-content {
    line-height: 1.7;
  }

  .about-description {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 2rem 0 1rem 0;
    color: var(--text-color);
  }

  .about-text {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--text-color);
    margin-bottom: 1.5rem;
  }

  @media (min-width: 768px) {
    .about-page {
      padding: 3rem 2rem;
    }

    .about-title {
      font-size: 3.5rem;
    }
  }
</style>

