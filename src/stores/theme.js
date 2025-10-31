import { writable } from 'svelte/store';

// Initialize theme based on system preference or localStorage
function createThemeStore() {
  const getSystemTheme = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const getStoredTheme = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    }
    return null;
  };

  const initialTheme = getStoredTheme() || getSystemTheme();
  let userOverride = getStoredTheme() !== null;

  const { subscribe, set, update } = writable(initialTheme);

  // Apply theme to document
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialTheme);
    
    // Listen for system theme changes (only if user hasn't manually set a preference)
    if (!userOverride && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (!userOverride) {
          const newTheme = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', newTheme);
          set(newTheme);
        }
      });
    }
  }

  return {
    subscribe,
    set: (theme) => {
      userOverride = true;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
      }
      set(theme);
    },
    toggle: () => {
      userOverride = true;
      update((current) => {
        const newTheme = current === 'dark' ? 'light' : 'dark';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', newTheme);
          localStorage.setItem('theme', newTheme);
        }
        return newTheme;
      });
    }
  };
}

export const theme = createThemeStore();

