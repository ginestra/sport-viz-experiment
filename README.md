# That Lab

A collection of interactive experiments exploring data visualization, interactive design, and creative coding. Each experiment is a playground for ideas, techniques, and discoveries.

## Overview

That Lab showcases a variety of data visualizations and interactive experiences built with modern web technologies. The platform features an intuitive navigation system, experiment management with visibility controls, and a beautiful, responsive interface.

## Features

### Experiments & Visualizations

- **Women's Football Visualizations**: Interactive data visualizations exploring connections between players, their career statistics, and team relationships
  - Player Network: Radial visualization showing connections between players
  - Player Success & Popularity: Visual representation of trophies, country distribution, and social media popularity

- **Family Tree**: Interactive family tree visualization with organic, natural branching patterns
  - Explore family relationships and genealogical connections
  - Rich data display including dates, places, occupations, and photos
  - Zoom and pan navigation

### Platform Features

- **Experiment Management**: Tag experiments as public, private, or featured
  - Private experiments are hidden from searches and listings
  - Public experiments appear in searches and can be featured
  - Featured experiments appear prominently on the home page

- **Dark/Light Theme**: System theme detection with manual toggle
- **Responsive Design**: Mobile-first approach with expandable sidebar menu
- **About Page**: Learn more about the project
- **Category Organization**: Browse experiments by category

## Tech Stack

- **Svelte 5**: Modern, reactive UI framework
- **D3.js**: Data manipulation and SVG-based visualization rendering
- **Vite**: Fast build tool and development server
- **Svelte SPA Router**: Client-side routing for navigation
- **Font Awesome**: Icon set (CC BY 4.0)

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

- `public/data/players.csv`: Women's football player network data
- `public/data/player-success.csv`: Player success and popularity metrics
- `public/data/family-tree.json`: Family tree data structure (JSON format)

## Experiment Management

Experiments can be tagged with visibility and featured status:

- **Visibility**:
  - `public`: Visible in searches and category listings
  - `private`: Hidden from searches and listings (accessible via direct URL)

- **Featured**: Public experiments can be marked as featured to appear on the home page

Configure these in `src/data/experiments.js`.

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
│   └── data/          # Data files (CSV and JSON)
├── src/
│   ├── components/    # Reusable Svelte components
│   ├── data/          # Experiment definitions and metadata
│   ├── routes/        # Route components (pages)
│   ├── stores/        # Svelte stores (theme, etc.)
│   ├── utils/         # Helper functions and utilities
│   └── visualizations/ # D3.js visualization components
└── dist/              # Production build output
```

## Version

Current version: **1.0.0**

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).
