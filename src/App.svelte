<script>
  import { onMount } from 'svelte';
  import SideMenu from './components/SideMenu.svelte';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import PlayerSuccess from './visualizations/PlayerSuccess.svelte';
  import PlayerNetwork from './visualizations/PlayerNetwork.svelte';
  import PlayerNetworkAlt from './visualizations/PlayerNetworkAlt.svelte';
  import { theme } from './stores/theme.js';

  let menuOpen = false;

  const menuItems = [
    { label: 'Player Network (Alt)', href: '#player-network-alt' },
    { label: 'Player Network', href: '#player-network' },
    { label: 'Player Success', href: '#player-success' },
  ];

  onMount(() => {
    // Ensure theme is applied on mount
    document.documentElement.setAttribute('data-theme', $theme);
  });
</script>

<div class="app">
  <SideMenu bind:isOpen={menuOpen} {menuItems} />
  
  <main class="main-content">
    <header class="header">
      <button 
        class="mobile-menu-toggle"
        on:click={() => menuOpen = !menuOpen}
        aria-label="Toggle menu"
        type="button"
      >
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
      <h1 class="app-title">Women's Football Visualizations</h1>
      <ThemeToggle />
    </header>

    <section id="player-network-alt" class="visualization-section">
      <PlayerNetworkAlt />
    </section>

    <section id="player-network" class="visualization-section">
      <PlayerNetwork />
    </section>

    <section id="player-success" class="visualization-section">
      <PlayerSuccess />
    </section>
  </main>
</div>

<style>
  /* Mobile-first styles */
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    color: var(--text-color);
  }

  .main-content {
    flex: 1;
    width: 100%;
    min-width: 0; /* Prevents flex overflow */
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .mobile-menu-toggle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    width: 2.5rem;
    height: 2.5rem;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0.5rem;
  }

  .mobile-menu-toggle:hover {
    background-color: var(--hover-bg);
  }

  .hamburger-line {
    width: 1.25rem;
    height: 2px;
    background-color: var(--text-color);
    transition: all 0.3s ease;
    border-radius: 2px;
  }

  .app-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    flex: 1;
    text-align: center;
  }

  .visualization-section {
    padding: 0;
  }

  /* Tablet and up: Side-by-side layout */
  @media (min-width: 768px) {
    .app {
      flex-direction: row;
    }

    .main-content {
      flex: 1;
      min-width: 0;
      transition: margin-left 0.3s ease;
    }

    .header {
      padding: 1.5rem 2rem;
      position: relative;
    }

    .mobile-menu-toggle {
      display: none;
    }

    .app-title {
      font-size: 1.75rem;
      text-align: left;
    }

    .visualization-section {
      padding: 0;
    }
  }
</style>
