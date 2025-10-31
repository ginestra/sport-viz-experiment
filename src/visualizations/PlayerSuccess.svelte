<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { parsePlayersData, createSVG, formatNumber, createTooltip } from '../utils/d3-helpers.js';
  
  let container;
  let data = [];
  let loading = true;
  let error = null;
  let visualizationCreated = false;
  let resizeObserver;

  $: if (container && !loading && data.length > 0 && !visualizationCreated) {
    visualizationCreated = true;
    createVisualization();
    setupResizeObserver();
  }

  function handleResize() {
    if (container && data.length > 0) {
      visualizationCreated = false;
      createVisualization();
      visualizationCreated = true;
    }
  }

  function setupResizeObserver() {
    if (!container) return;
    
    // Set up resize observer for responsive behavior
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', handleResize);
    }
  }

  onMount(async () => {
    try {
      // Load CSV data for player success visualization
      const csvData = await d3.csv('/data/player-success.csv');
      
      if (!csvData || csvData.length === 0) {
        error = 'No data loaded from CSV file';
        loading = false;
        return;
      }

      data = parsePlayersData(csvData);
      
      if (data.length === 0) {
        error = 'No valid data after parsing';
      }
      loading = false;
    } catch (err) {
      console.error('Error loading visualization:', err);
      error = err.message || 'Failed to load data';
      loading = false;
    }
  });

  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  });

  function createVisualization() {
    // Clear existing content
    d3.select(container).selectAll('*').remove();

    // Responsive dimensions
    const containerWidth = container.clientWidth || 900;
    const width = Math.min(containerWidth - 40, 900);
    const height = Math.max(400, width * 0.6);
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };

    const { svg, g, width: innerWidth, height: innerHeight } = createSVG(
      container,
      width,
      height,
      margin
    );

    // Create tooltip
    const tooltip = createTooltip();

    // Group data by country of provenance
    const countryData = d3.group(data, d => d.country_provenance);
    const countries = Array.from(countryData.keys());

    // Create scales
    const xScale = d3.scaleBand()
      .domain(countries)
      .range([0, innerWidth])
      .padding(0.2);

    const maxTrophies = d3.max(data, d => d.individual_trophies + d.team_trophies);
    const yScale = d3.scaleLinear()
      .domain([0, maxTrophies * 1.1])
      .range([innerHeight, 0]);

    const maxPopularity = d3.max(data, d => d.social_followers);
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxPopularity])
      .range([3, 20]);

    // Color scale by total trophies
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, maxTrophies]);

    // Group players by country
    const countryGroups = g.selectAll('.country-group')
      .data(countries)
      .enter()
      .append('g')
      .attr('class', 'country-group')
      .attr('transform', d => `translate(${xScale(d)}, 0)`);

    // Create bars for each country showing average trophies
    countryGroups.each(function(country) {
      const players = countryData.get(country);
      const avgTrophies = d3.mean(players, d => d.individual_trophies + d.team_trophies);
      
      const group = d3.select(this);
      
      // Bar for average
      group.append('rect')
        .attr('x', 0)
        .attr('y', yScale(avgTrophies))
        .attr('width', xScale.bandwidth())
        .attr('height', innerHeight - yScale(avgTrophies))
        .attr('fill', colorScale(avgTrophies))
        .attr('opacity', 0.6);

      // Individual player bubbles
      players.forEach((player, i) => {
        const xPos = (i / players.length) * xScale.bandwidth();
        const totalTrophies = player.individual_trophies + player.team_trophies;
        const yPos = yScale(totalTrophies);
        const radius = radiusScale(player.social_followers);

        group.append('circle')
          .attr('cx', xPos)
          .attr('cy', yPos)
          .attr('r', radius)
          .attr('fill', colorScale(totalTrophies))
          .attr('stroke', 'var(--bg-primary)')
          .attr('stroke-width', 2)
          .attr('opacity', 0.8)
          .on('mouseover', function(event) {
            tooltip.transition()
              .duration(200)
              .style('opacity', 1);
            tooltip.html(`
              <strong>${player.name}</strong><br/>
              Country: ${player.country_provenance}<br/>
              Individual Trophies: ${player.individual_trophies}<br/>
              Team Trophies: ${player.team_trophies}<br/>
              Followers: ${formatNumber(player.social_followers)}<br/>
              Teams: ${player.teams.join(', ')}
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mouseout', function() {
            tooltip.transition()
              .duration(200)
              .style('opacity', 0);
          });
      });
    });

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('fill', 'var(--text-color)');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(8))
      .style('color', 'var(--text-color)');

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '1.2rem')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-color)')
      .text('Women\'s Football: Player Success by Country');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .text('Total Trophies (Individual + Team)');

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--text-color)')
      .text('Country of Provenance');

    // Legend for bubble size
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, ${height - 150})`);

    const legendData = [
      maxPopularity,
      maxPopularity / 2,
      maxPopularity / 4
    ];

    legend.selectAll('.legend-circle')
      .data(legendData)
      .enter()
      .append('circle')
      .attr('cx', 0)
      .attr('cy', (d, i) => i * 30)
      .attr('r', d => radiusScale(d))
      .attr('fill', 'none')
      .attr('stroke', 'var(--text-color)')
      .attr('stroke-width', 1);

    legend.selectAll('.legend-text')
      .data(legendData)
      .enter()
      .append('text')
      .attr('x', 30)
      .attr('y', (d, i) => i * 30)
      .attr('dy', '0.35em')
      .style('fill', 'var(--text-color)')
      .style('font-size', '0.75rem')
      .text(d => formatNumber(d) + ' followers');
  }
</script>

<div class="visualization-container">
  <div class="visualization-header">
    <h2>Player Success & Popularity</h2>
    <p>Interactive visualization showing player trophies, country distribution, and social media popularity</p>
  </div>

  {#if loading}
    <div class="loading">Loading data...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="chart-container" bind:this={container}></div>
  {/if}
</div>

<style>
  .visualization-container {
    padding: 2rem;
    max-width: 100%;
  }

  .visualization-header {
    margin-bottom: 2rem;
  }

  .visualization-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
  }

  .visualization-header p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .chart-container {
    width: 100%;
    overflow-x: auto;
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1rem;
    min-height: 400px;
  }

  @media (max-width: 767px) {
    .visualization-container {
      padding: 1rem;
    }

    .visualization-header h2 {
      font-size: 1.25rem;
    }

    .visualization-header p {
      font-size: 0.875rem;
    }

    .chart-container {
      padding: 0.5rem;
      overflow-x: scroll;
      -webkit-overflow-scrolling: touch;
    }
  }

  .loading, .error {
    text-align: center;
    padding: 3rem;
    color: var(--text-color);
  }

  .error {
    color: var(--error-color, #e74c3c);
  }

  :global(.d3-tooltip) {
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>

