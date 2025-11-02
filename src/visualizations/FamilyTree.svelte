<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { createTooltip } from '../utils/d3-helpers.js';
  import {
    loadFamilyData,
    buildTreeStructure as buildFamilyTree,
    toD3Hierarchy,
    getLinks,
    getSpouseLinks as getSpouseLinksFromData,
    formatDate,
    formatDateRange,
    getInitials
  } from '../utils/family-data-helpers.js';

  let container;
  let data = null;
  let loading = true;
  let error = null;
  let visualizationCreated = false;
  let resizeObserver;
  let selectedNode = null;
  let hoveredNode = null;
  let svg, g, zoom;
  let root = null;
  let links = [];
  let spouseLinks = [];
  let nodes = [];
  let treeData = null;
  let linkGroup; // For highlighting connections

  function handleResize() {
    if (container && data && !loading) {
      visualizationCreated = false;
      createVisualization();
      visualizationCreated = true;
    }
  }

  function setupResizeObserver() {
    if (!container) return;
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }
  }

  onMount(async () => {
    try {
      const familyData = await loadFamilyData('/data/family-tree.json');
      
      if (!familyData || !familyData.familyMembers || familyData.familyMembers.length === 0) {
        error = 'No family data loaded';
        loading = false;
        return;
      }

      data = familyData.familyMembers;
      loading = false;
    } catch (err) {
      console.error('Error loading family tree:', err);
      error = err.message || 'Failed to load family data';
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

  $: if (container && !loading && data && data.length > 0 && !visualizationCreated) {
    visualizationCreated = true;
    createVisualization();
    setupResizeObserver();
  }

  function createVisualization() {
    if (!container || !data || data.length === 0) {
      return;
    }

    d3.select(container).selectAll('*').remove();

    // Responsive dimensions
    const containerWidth = container.clientWidth || 900;
    const containerHeight = container.clientHeight || 800;
    const width = Math.min(containerWidth - 40, 1200);
    const height = Math.max(600, Math.min(containerHeight - 40, 800));
    
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };

    // Create SVG
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    // Create main group for zoom/pan
    g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Build tree structure
    try {
      treeData = buildFamilyTree(data);
      root = toD3Hierarchy(treeData);
    } catch (err) {
      console.error('Error building tree:', err);
      error = err.message;
      return;
    }

    // Setup tree layout with organic positioning
    const treeLayout = d3.tree()
      .size([innerWidth - 100, innerHeight - 100])
      .separation((a, b) => {
        // Organic spacing: siblings closer together, but with variation
        if (a.parent === b.parent) {
          // Deterministic variation based on node data
          const variation = ((a.data.data.id.charCodeAt(0) + b.data.data.id.charCodeAt(0)) % 30) / 100;
          return 0.8 + variation;
        }
        return 1.2;
      });

    treeLayout(root);

    // Apply organic positioning adjustments for natural branching
    applyOrganicPositioning(root, innerWidth);

    // Get links and nodes
    links = getLinks(root);
    
    // Create node map for spouse links
    const nodeMap = new Map();
    root.each(node => {
      nodeMap.set(node.data.data.id, node);
    });

    spouseLinks = getSpouseLinksFromData(data, nodeMap);
    nodes = root.descendants();

    // Create tooltip
    const tooltip = createTooltip();

    // Setup zoom behavior
    zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Render links (parent-child) with organic curves
    linkGroup = g.append('g').attr('class', 'links');

    linkGroup.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        // Custom path for more organic branching using Bézier curves
        const path = d3.path();
        const midY = (d.source.y + d.target.y) / 2;
        // Use a deterministic offset based on node position for consistent organic curves
        const offsetX = (d.target.x % 50) - 25; // Deterministic but varied
        const controlX = d.target.x + offsetX * 0.6;
        path.moveTo(d.source.x, d.source.y);
        path.bezierCurveTo(
          d.source.x, midY,
          controlX, midY,
          d.target.x, d.target.y
        );
        return path.toString();
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        // Color by generation depth for visual hierarchy
        const depth = d.target.depth;
        const colors = [
          'var(--primary-color)',
          '#42b883',
          '#35495e',
          '#ff6b6b',
          '#4ecdc4'
        ];
        return colors[depth % colors.length] || 'var(--viz-connection-color)';
      })
      .attr('stroke-width', d => {
        // Thicker near root, thinner at leaves
        return Math.max(1.5, 3 - d.target.depth * 0.3);
      })
      .attr('opacity', d => {
        // More opacity near root
        return Math.max(0.3, 0.6 - d.target.depth * 0.1);
      })
      .style('transition', 'all 0.3s ease');

    // Render spouse links (horizontal) with organic curves
    linkGroup.selectAll('.spouse-link')
      .data(spouseLinks)
      .enter()
      .append('path')
      .attr('class', 'spouse-link')
      .attr('d', d => {
        const path = d3.path();
        const midX = (d.source.x + d.target.x) / 2;
        // Deterministic curve height based on positions
        const curveHeight = -25 + ((d.source.x + d.target.x) % 20) - 10;
        path.moveTo(d.source.x, d.source.y);
        path.quadraticCurveTo(midX, d.source.y + curveHeight, d.target.x, d.target.y);
        return path.toString();
      })
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary-color)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .attr('opacity', 0.4)
      .style('transition', 'all 0.3s ease');

    // Render nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeElements = nodeGroup.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    // Node circles with photos or initials - enhanced styling
    const nodeCircles = nodeElements.append('circle')
      .attr('r', 32)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', 'var(--border-color)')
      .attr('stroke-width', 2.5)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))')
      .on('mouseenter', function(event, d) {
        hoveredNode = d;
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 38)
          .attr('stroke-width', 3.5)
          .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))');
        
        // Highlight connected links
        highlightConnections(d);
        
        showTooltip(event, d, tooltip);
      })
      .on('mouseleave', function(event, d) {
        hoveredNode = null;
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 32)
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
        
        // Unhighlight connections
        unhighlightConnections();
        
        tooltip.transition().duration(200).style('opacity', 0);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        selectedNode = selectedNode?.data?.data?.id === d.data.data.id ? null : d;
        // Highlight selected node's connections
        if (selectedNode) {
          highlightConnections(selectedNode);
        } else {
          unhighlightConnections();
        }
      });

    // Add photos or initials with better styling
    nodeElements.each(function(d) {
      const member = d.data.data;
      const nodeGroup = d3.select(this);
      
      if (member.photo) {
        // Try to add image with better error handling
        const image = nodeGroup.append('image')
          .attr('x', -28)
          .attr('y', -28)
          .attr('width', 56)
          .attr('height', 56)
          .attr('href', member.photo)
          .attr('clip-path', 'url(#nodeClip)')
          .style('opacity', 0)
          .on('load', function() {
            d3.select(this)
              .transition()
              .duration(300)
              .style('opacity', 1);
          })
          .on('error', function() {
            // Fallback to initials if image fails to load
            d3.select(this).remove();
            addInitials(nodeGroup, member);
          });
      } else {
        addInitials(nodeGroup, member);
      }
    });

    // Add clip path for circular photos
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'nodeClip')
      .append('circle')
      .attr('r', 28);

    // Add name labels
    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 45)
      .attr('font-size', '12px')
      .attr('fill', 'var(--text-color)')
      .text(d => d.data.data.name.split(' ')[0]) // First name only
      .style('pointer-events', 'none');

    // Center the view after all nodes are rendered
    setTimeout(() => {
      const bounds = getTreeBounds(root);
      const treeWidth = bounds.x1 - bounds.x0;
      const treeHeight = bounds.y1 - bounds.y0;
      
      // Avoid division by zero
      if (treeWidth === 0 || treeHeight === 0) {
        return;
      }
      
      // Calculate scale to fit tree with padding
      const padding = 80;
      const scaleX = (innerWidth - padding * 2) / treeWidth;
      const scaleY = (innerHeight - padding * 2) / treeHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 1x
      
      // Calculate center of tree in node coordinate space
      const centerX = (bounds.x0 + bounds.x1) / 2;
      const centerY = (bounds.y0 + bounds.y1) / 2;
      
      // Calculate translation to center tree in viewport
      // The transform applies to g, so coordinates are relative to margin origin
      const translateX = (innerWidth / 2) - (centerX * scale);
      const translateY = (innerHeight / 2) - (centerY * scale);
      
      const initialTransform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);

      svg.call(zoom.transform, initialTransform);
    }, 10);
  }

  function applyOrganicPositioning(root, width) {
    // Apply organic variations to node positions for natural branching
    root.each(node => {
      if (node.parent) {
        const depth = node.depth;
        const member = node.data.data;
        // Deterministic variation based on member ID for consistent positioning
        const idHash = member.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const variationFactor = 1 + depth * 0.15;
        const variation = ((idHash % 100) - 50) * 0.8 * variationFactor;
        node.x += variation;
        
        // Add slight vertical offset for more organic feel
        const yVariation = ((idHash % 20) - 10) * 0.5;
        node.y += yVariation;
      }
    });
  }

  function getTreeBounds(root) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;

    root.each(d => {
      // Account for node radius in bounds
      const nodeRadius = 40; // Node radius + label space
      if (d.x - nodeRadius < x0) x0 = d.x - nodeRadius;
      if (d.x + nodeRadius > x1) x1 = d.x + nodeRadius;
      if (d.y - nodeRadius < y0) y0 = d.y - nodeRadius;
      if (d.y + nodeRadius > y1) y1 = d.y + nodeRadius;
    });

    // If bounds are invalid, return default
    if (!isFinite(x0) || !isFinite(x1) || !isFinite(y0) || !isFinite(y1)) {
      return { x0: 0, x1: 100, y0: 0, y1: 100 };
    }

    return { x0, x1, y0, y1 };
  }

  function getNodeColor(node) {
    const depth = node.depth;
    const colors = [
      'var(--primary-color)',
      '#42b883',
      '#35495e',
      '#ff6b6b',
      '#4ecdc4',
      '#ffe66d'
    ];
    return colors[depth % colors.length] || 'var(--primary-color)';
  }

  function addInitials(nodeGroup, member) {
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', 'var(--bg-primary)')
      .attr('stroke', 'var(--text-color)')
      .attr('stroke-width', 0.5)
      .text(getInitials(member.name))
      .style('pointer-events', 'none');
  }

  function highlightConnections(node) {
    // Highlight links connected to this node
    linkGroup.selectAll('.link')
      .style('opacity', d => {
        return (d.source === node || d.target === node) ? 0.9 : 0.2;
      })
      .attr('stroke-width', d => {
        return (d.source === node || d.target === node) ? 3 : 1.5;
      });
    
    linkGroup.selectAll('.spouse-link')
      .style('opacity', d => {
        return (d.source === node || d.target === node) ? 0.8 : 0.2;
      });
  }

  function unhighlightConnections() {
    if (selectedNode) {
      highlightConnections(selectedNode);
    } else {
      linkGroup.selectAll('.link')
        .style('opacity', d => Math.max(0.3, 0.6 - d.target.depth * 0.1))
        .attr('stroke-width', d => Math.max(1.5, 3 - d.target.depth * 0.3));
      
      linkGroup.selectAll('.spouse-link')
        .style('opacity', 0.4);
    }
  }

  function showTooltip(event, node, tooltip) {
    const member = node.data.data;
    
    let html = `<strong>${member.name}</strong><br/>`;
    
    if (member.birthDate) {
      html += `Born: ${formatDate(member.birthDate)}`;
      if (member.birthPlace) html += `, ${member.birthPlace}`;
      html += '<br/>';
    }
    
    if (member.deathDate) {
      html += `Died: ${formatDate(member.deathDate)}`;
      if (member.deathPlace) html += `, ${member.deathPlace}`;
      html += '<br/>';
    }
    
    if (member.occupation) {
      const occ = Array.isArray(member.occupation) 
        ? member.occupation.join(', ')
        : member.occupation;
      html += `Occupation: ${occ}<br/>`;
    }

    tooltip.transition()
      .duration(200)
      .style('opacity', 1);
    
    tooltip.html(html)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }
</script>

<div class="family-tree-container">
  {#if loading}
    <div class="loading">Loading family tree...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="visualization-header">
      <h2>Family Tree</h2>
      <p>Interactive family tree visualization. Hover over nodes for details, click to select, zoom and pan to explore.</p>
      <button class="reset-btn" on:click={() => {
        if (svg && zoom && root && container) {
          const bounds = getTreeBounds(root);
          const containerWidth = container?.clientWidth || 900;
          const containerHeight = container?.clientHeight || 800;
          const margin = { top: 60, right: 60, bottom: 60, left: 60 };
          const innerWidth = containerWidth - margin.left - margin.right;
          const innerHeight = containerHeight - margin.top - margin.bottom;
          
          const treeWidth = bounds.x1 - bounds.x0;
          const treeHeight = bounds.y1 - bounds.y0;
          
          const padding = 60;
          const scaleX = (innerWidth - padding * 2) / treeWidth;
          const scaleY = (innerHeight - padding * 2) / treeHeight;
          const scale = Math.min(scaleX, scaleY, 1);
          
          const centerX = (bounds.x0 + bounds.x1) / 2;
          const centerY = (bounds.y0 + bounds.y1) / 2;
          const translateX = innerWidth / 2 - centerX * scale;
          const translateY = innerHeight / 2 - centerY * scale;
          
          const transform = d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scale);
          svg.call(zoom.transform, transform);
        }
      }}>Reset View</button>
    </div>
    
    <div class="chart-container" bind:this={container}></div>
    
    {#if selectedNode}
      <div class="info-panel">
        <button class="close-btn" on:click={() => selectedNode = null}>×</button>
        <h3>{selectedNode.data.data.name}</h3>
        <div class="info-content">
          {#if selectedNode.data.data.birthDate}
            <p><strong>Born:</strong> {formatDate(selectedNode.data.data.birthDate)} {selectedNode.data.data.birthPlace ? `, ${selectedNode.data.data.birthPlace}` : ''}</p>
          {/if}
          {#if selectedNode.data.data.deathDate}
            <p><strong>Died:</strong> {formatDate(selectedNode.data.data.deathDate)} {selectedNode.data.data.deathPlace ? `, ${selectedNode.data.data.deathPlace}` : ''}</p>
          {/if}
          {#if selectedNode.data.data.occupation}
            <p><strong>Occupation:</strong> {Array.isArray(selectedNode.data.data.occupation) ? selectedNode.data.data.occupation.join(', ') : selectedNode.data.data.occupation}</p>
          {/if}
          {#if selectedNode.data.data.placesLived && selectedNode.data.data.placesLived.length > 0}
            <p><strong>Places Lived:</strong></p>
            <ul>
              {#each selectedNode.data.data.placesLived as place}
                <li>{place.place} ({formatDateRange(place.startDate, place.endDate)})</li>
              {/each}
            </ul>
          {/if}
          {#if selectedNode.data.data.facts && selectedNode.data.data.facts.length > 0}
            <p><strong>Interesting Facts:</strong></p>
            <ul>
              {#each selectedNode.data.data.facts as fact}
                <li>{fact}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .family-tree-container {
    padding: 2rem;
    max-width: 100%;
    position: relative;
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
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .reset-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    cursor: pointer;
    font-family: monospace;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
  }

  .chart-container {
    width: 100%;
    height: 600px;
    background: var(--bg-secondary);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
  }

  .info-panel {
    position: fixed;
    top: 50%;
    right: 2rem;
    transform: translateY(-50%);
    width: 300px;
    max-height: 80vh;
    overflow-y: auto;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .info-panel h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.25rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .info-content {
    color: var(--text-color);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .info-content p {
    margin: 0.75rem 0;
  }

  .info-content ul {
    margin: 0.5rem 0 0.5rem 1.5rem;
    padding: 0;
  }

  .info-content li {
    margin: 0.25rem 0;
  }

  .info-content strong {
    color: var(--text-secondary);
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: var(--hover-bg);
    color: var(--text-color);
  }

  .loading, .error {
    text-align: center;
    padding: 3rem;
    color: var(--text-color);
  }

  .error {
    color: var(--error-color, #e74c3c);
  }

  @media (max-width: 767px) {
    .family-tree-container {
      padding: 1rem;
    }

    .chart-container {
      height: 400px;
    }

    .info-panel {
      position: relative;
      right: auto;
      top: auto;
      transform: none;
      width: 100%;
      max-height: none;
      margin-top: 1rem;
    }
  }
</style>

