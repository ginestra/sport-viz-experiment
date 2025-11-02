export const experiments = [
  {
    id: 'womens-football',
    title: "Women's Football Visualizations",
    category: 'sport-viz',
    description: 'Interactive data visualizations of women\'s football players, their connections, goals, assists, clubs, and national teams.',
    tags: ['football', 'women', 'sports', 'data-viz'],
    visibility: 'public',
    featured: true,
    route: '/experiments/sport-viz/womens-football',
    visualizations: [
      { id: 'player-network', label: 'Player Network', href: '/experiments/sport-viz/womens-football#player-network' },
      { id: 'player-success', label: 'Player Success', href: '/experiments/sport-viz/womens-football#player-success' }
    ]
  },
  {
    id: 'family-tree',
    title: 'Family Forest',
    category: 'interactive',
    description: 'An interactive visualization exploring family relationships and genealogical connections.',
    tags: ['family', 'genealogy', 'tree', 'interactive'],
    visibility: 'private',
    featured: false,
    route: '/experiments/interactive/family-tree'
  }
];

export const categories = [
  {
    id: 'sport-viz',
    name: 'Sport Visualizations',
    description: 'Data visualizations related to sports',
    route: '/experiments/sport-viz'
  },
  {
    id: 'interactive',
    name: 'Interactive Visualizations',
    description: 'Interactive data visualizations and exploratory tools',
    route: '/experiments/interactive'
  }
];

/**
 * Get public experiments only (excludes private)
 */
export function getPublicExperiments() {
  return experiments.filter(exp => exp.visibility !== 'private');
}

/**
 * Get featured experiments (must be public)
 */
export function getFeaturedExperiments() {
  return experiments.filter(exp => 
    exp.featured === true && exp.visibility !== 'private'
  );
}

export function getExperimentsByCategory(categoryId) {
  return experiments.filter(exp => 
    exp.category === categoryId && exp.visibility !== 'private'
  );
}

export function searchExperiments(query) {
  const lowerQuery = query.toLowerCase();
  return experiments.filter(exp => 
    // Only search public experiments
    exp.visibility !== 'private' &&
    (exp.title.toLowerCase().includes(lowerQuery) ||
     exp.description.toLowerCase().includes(lowerQuery) ||
     exp.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
}

export function getExperimentByRoute(route) {
  return experiments.find(exp => exp.route === route);
}

