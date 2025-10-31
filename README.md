# Women's Football Data Visualizations

A minimalistic website for interactive data visualizations of women's football players using D3.js and Svelte.

## Features

- **Player Network Visualization**: Interactive radial visualization showing connections between players who played on the same teams
- **Player Success & Popularity**: Visual representation of trophies, country distribution, and social media popularity
- **Dark/Light Theme**: System theme detection with manual toggle
- **Responsive Design**: Mobile-first approach with expandable sidebar menu
- **Data-driven**: CSV-based data input with support for multiple data sources

## Tech Stack

- **D3.js**: Data manipulation and SVG-based rendering
- **Svelte**: Reactive UI components
- **Vite**: Build tool and development server
- **Font Awesome**: Free icon set (CC BY 4.0)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to view the app.

### Build

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Data Files

- `public/data/players.csv`: Player network data (clubs, goals, national teams)
- `public/data/player-success.csv`: Player success data (trophies, followers, mentions)

## Deployment

This project can be deployed to several platforms:

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository at [vercel.com](https://vercel.com)
3. Vercel will automatically detect the Vite configuration
4. Deploy with one click

The `vercel.json` file is already configured.

### Netlify

1. Push your code to GitHub
2. Import your repository at [netlify.com](https://netlify.com)
3. Netlify will use the `netlify.toml` configuration
4. Deploy with one click

### GitHub Pages

1. Go to your repository Settings → Pages
2. Select "GitHub Actions" as the source
3. The workflow (`.github/workflows/deploy.yml`) will automatically build and deploy on pushes to `main`

Note: Update the `base` path in `vite.config.js` if your repository name is different from `sport-viz-experiment`.

## Project Structure

```
├── public/
│   └── data/          # CSV data files
├── src/
│   ├── components/    # Reusable Svelte components
│   ├── stores/         # Svelte stores (theme, etc.)
│   ├── utils/          # Helper functions
│   └── visualizations/ # D3.js visualization components
└── dist/              # Production build output
```

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Need an official Svelte framework?

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

## Technical considerations

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `checkJs` in the JS template?**

It is likely that most cases of changing variable types in runtime are likely to be accidental, rather than deliberate. This provides advanced typechecking out of the box. Should you like to take advantage of the dynamically-typed nature of JavaScript, it is trivial to change the configuration.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/sveltejs/svelte-hmr/tree/master/packages/svelte-hmr#preservation-of-local-state).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

```js
// store.js
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
```
