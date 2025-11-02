export const experiments = [
  {
    id: 'womens-football',
    title: "Women's Football Visualizations",
    category: 'sport-viz',
    description: 'Interactive data visualizations of women\'s football players, their connections, goals, assists, clubs, and national teams.',
    tags: ['football', 'women', 'sports', 'data-viz'],
    route: '/experiments/sport-viz/womens-football',
    visualizations: [
      { id: 'player-network', label: 'Player Network', href: '/experiments/sport-viz/womens-football#player-network' },
      { id: 'player-success', label: 'Player Success', href: '/experiments/sport-viz/womens-football#player-success' }
    ]
  }
];

export const categories = [
  {
    id: 'sport-viz',
    name: 'Sport Visualizations',
    description: 'Data visualizations related to sports',
    route: '/experiments/sport-viz'
  }
];

export function getExperimentsByCategory(categoryId) {
  return experiments.filter(exp => exp.category === categoryId);
}

export function searchExperiments(query) {
  const lowerQuery = query.toLowerCase();
  return experiments.filter(exp => 
    exp.title.toLowerCase().includes(lowerQuery) ||
    exp.description.toLowerCase().includes(lowerQuery) ||
    exp.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getExperimentByRoute(route) {
  return experiments.find(exp => exp.route === route);
}

