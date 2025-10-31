import * as d3 from 'd3';

/**
 * Parse CSV data and convert types
 */
export function parsePlayersData(data) {
  return data.map(d => ({
    ...d,
    individual_trophies: +d.individual_trophies || 0,
    team_trophies: +d.team_trophies || 0,
    social_followers: +d.social_followers || 0,
    mentions_count: +d.mentions_count || 0,
    teams: d.team ? d.team.split(', ').map(t => t.trim()) : []
  }));
}

/**
 * Create responsive SVG container
 */
export function createSVG(container, width, height, margin = { top: 20, right: 20, bottom: 20, left: 20 }) {
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('max-width', '100%')
    .style('height', 'auto');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  return {
    svg,
    g,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
}

/**
 * Format large numbers (e.g., 1000000 -> 1M)
 */
export function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Create tooltip element
 */
export function createTooltip() {
  // Get computed CSS variable values
  const getCSSVar = (prop) => {
    if (typeof window !== 'undefined') {
      return window.getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    }
    return '';
  };

  const tooltipBg = getCSSVar('--tooltip-bg') || 'rgba(0, 0, 0, 0.9)';
  const tooltipText = getCSSVar('--tooltip-text') || '#ffffff';

  return d3.select('body')
    .append('div')
    .attr('class', 'd3-tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', tooltipBg)
    .style('color', tooltipText)
    .style('padding', '0.5rem')
    .style('border-radius', '4px')
    .style('font-size', '0.875rem')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.2)')
    .style('z-index', '10000');
}

