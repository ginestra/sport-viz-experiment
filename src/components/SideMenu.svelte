<script>
  export let isOpen = false;
  export let menuItems = [];

  $: activeClass = isOpen ? 'open' : '';

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }
</script>

<aside class="side-menu {activeClass}">
  <button 
    class="menu-toggle" 
    on:click={toggleMenu}
    aria-label="Toggle menu"
    aria-expanded={isOpen}
    type="button"
  >
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
  </button>

  <nav class="menu-nav">
    <h2 class="menu-title">Visualizations</h2>
    <ul class="menu-list">
      {#each menuItems as item}
        <li class="menu-item">
          <a href={item.href} class="menu-link" on:click={closeMenu}>{item.label}</a>
        </li>
      {/each}
    </ul>
  </nav>
</aside>

<style>
  /* Mobile-first: Menu is off-screen by default */
  .side-menu {
    position: fixed;
    top: 0;
    left: 0;
    min-height: 100vh;
    height: 100%;
    width: 280px;
    max-width: 85vw;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 1000;
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .side-menu.open {
    transform: translateX(0);
  }

  .menu-toggle {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 1001;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0.5rem;
  }

  .side-menu.open .menu-toggle {
    left: 1rem;
  }

  .menu-toggle:hover {
    background-color: var(--hover-bg);
  }

  .hamburger-line {
    width: 1.25rem;
    height: 2px;
    background-color: var(--text-color);
    transition: all 0.3s ease;
    border-radius: 2px;
  }

  .side-menu.open .hamburger-line:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }

  .side-menu.open .hamburger-line:nth-child(2) {
    opacity: 0;
  }

  .side-menu.open .hamburger-line:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
  }

  .menu-nav {
    padding: 4rem 1.5rem 1.5rem;
    flex: 1;
  }

  .menu-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1.5rem 0;
    color: var(--text-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.75rem;
  }

  .menu-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .menu-item {
    margin-bottom: 0.5rem;
  }

  .menu-link {
    display: block;
    padding: 0.75rem 1rem;
    color: var(--text-color);
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .menu-link:hover,
  .menu-link:focus {
    background-color: var(--hover-bg);
    color: var(--primary-color);
  }

  /* Tablet and up: Sidebar becomes narrow collapsed sidebar */
  @media (min-width: 768px) {
    .side-menu {
      position: relative;
      transform: translateX(0);
      width: 60px;
      min-height: 100%;
      height: auto;
      align-self: stretch;
      flex-shrink: 0;
      transition: width 0.3s ease;
      box-shadow: none;
      max-width: none;
    }

    .side-menu.open {
      width: 280px;
    }

    .menu-toggle {
      position: relative;
      top: auto;
      left: auto;
      margin: 1rem auto;
      width: 2rem;
      height: 2rem;
    }

    .side-menu:not(.open) .menu-nav {
      padding: 4rem 0.5rem 1rem;
    }

    .side-menu:not(.open) .menu-title {
      font-size: 0;
      height: 0;
      margin: 0;
      padding: 0;
      border: none;
      overflow: hidden;
    }

    .side-menu:not(.open) .menu-list {
      display: none;
    }
  }
</style>
