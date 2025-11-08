<script>
  import { onMount } from 'svelte';
  import Router, { link, location } from 'svelte-spa-router';
  import SideMenu from './components/SideMenu.svelte';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import { theme } from './stores/theme.js';
  import { getExperimentByRoute } from './data/experiments.js';
  
  import Home from './routes/Home.svelte';
  import About from './routes/About.svelte';
  import ExperimentsIndex from './routes/experiments/Index.svelte';
  import SportVizIndex from './routes/experiments/sport-viz/Index.svelte';
  import WomensFootball from './routes/experiments/sport-viz/womens-football/Index.svelte';
  import InteractiveIndex from './routes/experiments/interactive/Index.svelte';
  import FamilyTree from './routes/experiments/interactive/family-tree/Index.svelte';
  import CollaborativeIndex from './routes/collaborative/Index.svelte';
  import CollaborativeLogin from './routes/collaborative/Login.svelte';
  import CollaborativeRegister from './routes/collaborative/Register.svelte';
  import CollaborativeCreateThread from './routes/collaborative/CreateThread.svelte';
  import CollaborativeAccountSettings from './routes/collaborative/AccountSettings.svelte';
  import CollaborativeModeration from './routes/collaborative/Moderation.svelte';
  import CollaborativeThread from './routes/collaborative/Thread.svelte';
  import Privacy from './routes/Privacy.svelte';
  import Terms from './routes/Terms.svelte';

  let menuOpen = false;

  // Define routes
  const routes = {
    '/': Home,
    '/about': About,
    '/experiments': ExperimentsIndex,
    '/experiments/sport-viz': SportVizIndex,
    '/experiments/sport-viz/womens-football': WomensFootball,
    '/experiments/interactive': InteractiveIndex,
    '/experiments/interactive/family-tree': FamilyTree,
    '/collaborative': CollaborativeIndex,
    '/collaborative/login': CollaborativeLogin,
    '/collaborative/register': CollaborativeRegister,
    '/collaborative/create': CollaborativeCreateThread,
    '/collaborative/settings': CollaborativeAccountSettings,
    '/collaborative/moderation': CollaborativeModeration,
    '/collaborative/thread/:id': CollaborativeThread,
    '/privacy': Privacy,
    '/terms': Terms,
  };

  // Track current location
  $: currentRoute = $location;

  // Generate menu items based on current route
  $: menuItems = getMenuItems(currentRoute);

  function getMenuItems(route) {
    const items = [
      { label: 'Home', href: '#/' },
      { label: 'About', href: '#/about' },
      { label: 'Experiments', href: '#/experiments' },
      { label: 'Sport Visualizations', href: '#/experiments/sport-viz' },
      { label: 'Collaborative Writing', href: '#/collaborative' },
    ];

    // If on womens-football route, add visualization links
    if (route === '/experiments/sport-viz/womens-football') {
      items.push(
        { label: 'Player Network', href: '#/experiments/sport-viz/womens-football#player-network' },
        { label: 'Player Success', href: '#/experiments/sport-viz/womens-football#player-success' }
      );
    }

    return items;
  }

  // Get page title based on route
  $: pageTitle = getPageTitle(currentRoute);

  function getPageTitle(route) {
    if (route === '/') return 'That Lab';
    if (route === '/about') return 'About';
    if (route === '/experiments') return 'Experiments';
    if (route === '/experiments/sport-viz') return 'Sport Visualizations';
    if (route === '/experiments/sport-viz/womens-football') {
      const exp = getExperimentByRoute(route);
      return exp?.title || "Women's Football Visualizations";
    }
    if (route === '/experiments/interactive') return 'Interactive Visualizations';
    if (route === '/experiments/interactive/family-tree') {
      const exp = getExperimentByRoute(route);
          return exp?.title || 'Family Forest';
    }
    if (route.startsWith('/collaborative')) {
      if (route === '/collaborative/login') return 'Sign In - Collaborative Writing';
      if (route === '/collaborative/register') return 'Sign Up - Collaborative Writing';
      if (route === '/collaborative/create') return 'Create Thread - Collaborative Writing';
      if (route === '/collaborative/settings') return 'Account Settings - Collaborative Writing';
      if (route === '/collaborative/moderation') return 'Moderation Panel - Collaborative Writing';
      if (route.startsWith('/collaborative/thread/')) return 'Thread - Collaborative Writing';
      return 'Collaborative Writing';
    }
    if (route === '/privacy') return 'Privacy Policy';
    if (route === '/terms') return 'Terms of Service';
    return 'That Lab';
  }

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
      <h1 class="app-title">{pageTitle}</h1>
      <ThemeToggle />
    </header>

    <div class="router-container">
      <Router routes={routes} />
    </div>
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
    position: relative;
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

  .router-container {
    flex: 1;
    overflow-y: auto;
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
  }
</style>
