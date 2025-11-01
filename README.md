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

This project is configured for deployment on Vercel.

### Vercel

1. Push your code to GitHub
2. Import your repository at [vercel.com](https://vercel.com)
3. Vercel will automatically detect the Vite configuration from `vercel.json`
4. Deploy with one click

Future pushes to the `main` branch will automatically trigger deployments.

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

