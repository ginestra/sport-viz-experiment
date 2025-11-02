<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { createTooltip } from '../utils/d3-helpers.js';
  import {
    loadFamilyData,
    buildAllTreeHierarchies,
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
  let roots = []; // Changed from single root to array
  let allLinks = []; // All links from all trees
  let spouseLinks = [];
  let allNodes = []; // All nodes from all trees
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
      console.error('Error loading family forest:', err);
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

    // Build multiple tree structures (family forest)
    try {
      const treeHierarchies = buildAllTreeHierarchies(data);
      roots = treeHierarchies.map(th => th.hierarchy);
      
      // Calculate spacing for side-by-side trees - more generous spacing
      const numTrees = roots.length;
      // Use minimum 300px per tree, or distribute evenly if more space available
      const minTreeWidth = 300;
      const availableWidth = innerWidth - (60 * (numTrees - 1)); // 60px gap between trees
      const calculatedTreeWidth = Math.max(minTreeWidth, availableWidth / numTrees);
      const treeWidth = Math.min(calculatedTreeWidth, innerWidth / numTrees * 0.9); // Max 90% per tree
      const gapBetweenTrees = 100; // Fixed gap between trees
      const totalTreeWidth = treeWidth * numTrees + gapBetweenTrees * (numTrees - 1);
      const startX = (innerWidth - totalTreeWidth) / 2; // Center trees if there's extra space
      
      // Layout each tree with proper positioning - increased separation
      const treeLayout = d3.tree()
        .size([treeWidth, innerHeight - 120])
        .separation((a, b) => {
          if (a.parent === b.parent) {
            // Siblings: increased minimum separation to prevent overlap
            const variation = ((a.data.data.id.charCodeAt(0) + b.data.data.id.charCodeAt(0)) % 30) / 100;
            return 1.2 + variation; // Increased from 0.8 to 1.2 minimum
          }
          return 1.5; // Increased from 1.2
        });

      // First, layout all trees - we'll apply generation alignment after
      roots.forEach((root) => {
        treeLayout(root);
        // Don't apply organic positioning to y coordinates since we'll align by generation
        // Only apply horizontal variation for organic feel
        root.each(node => {
          if (node.parent) {
            const member = node.data.data;
            const idHash = member.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const variationFactor = 1 + node.depth * 0.1;
            const variation = ((idHash % 100) - 50) * 0.4 * variationFactor;
            node.x += variation;
          }
        });
        
        // Apply horizontal spacing enforcement
        const nodesByDepth = new Map();
        root.each(node => {
          if (!nodesByDepth.has(node.depth)) {
            nodesByDepth.set(node.depth, []);
          }
          nodesByDepth.get(node.depth).push(node);
        });
        
        nodesByDepth.forEach((nodes, depth) => {
          if (nodes.length > 1) {
            nodes.sort((a, b) => a.x - b.x);
            const minHorizontalSpacing = 80;
            for (let i = 1; i < nodes.length; i++) {
              const prevNode = nodes[i - 1];
              const currentNode = nodes[i];
              const currentSpacing = currentNode.x - prevNode.x;
              if (currentSpacing < minHorizontalSpacing) {
                const adjustment = minHorizontalSpacing - currentSpacing;
                currentNode.x += adjustment;
                for (let j = i + 1; j < nodes.length; j++) {
                  nodes[j].x += adjustment;
                }
              }
            }
          }
        });
      });

      // Calculate generation-aligned y positions across all trees
      const generationYPositions = alignNodesByGeneration(roots, innerHeight - 120);

      // Debug: log generation positions
      console.log('Generation Y Positions:', Array.from(generationYPositions.entries()));

      // Apply generation-aligned positions and horizontal offsets
      roots.forEach((root, treeIndex) => {
        // Calculate offset: start position + tree index * (tree width + gap)
        const xOffset = startX + treeIndex * (treeWidth + gapBetweenTrees);
        
        root.each(node => {
          // Apply generation-aligned y position (roots at bottom)
          const nodeId = node.data.data.id;
          const oldY = node.y;
          if (generationYPositions.has(nodeId)) {
            node.y = generationYPositions.get(nodeId);
            console.log(`Node ${nodeId}: ${oldY} -> ${node.y}`);
          } else {
            console.warn(`No generation position found for ${nodeId}`);
          }
          // Apply horizontal offset
          node.x += xOffset;
        });
      });

      // Collect all links and nodes from all trees - deduplicate by person ID
      // First pass: collect all unique nodes (one per person)
      allNodes = [];
      const allNodeMap = new Map();
      const processedNodeIds = new Set();
      
      roots.forEach(root => {
        root.each(node => {
          const nodeId = node.data.data.id;
          // Only add node if we haven't seen this person ID before
          if (!processedNodeIds.has(nodeId)) {
            processedNodeIds.add(nodeId);
            allNodes.push(node);
            allNodeMap.set(nodeId, node);
          }
          // If duplicate, we ignore it and keep the first instance
        });
      });
      
      // Second pass: collect links using only the deduplicated nodes
      allLinks = [];
      const processedLinks = new Set();
      
      roots.forEach(root => {
        const treeLinks = getLinks(root);
        
        treeLinks.forEach(link => {
          const sourceId = link.source.data.data.id;
          const targetId = link.target.data.data.id;
          const linkKey = `${sourceId}-${targetId}`;
          
          // Only add link if we haven't seen it before and both nodes exist in our deduplicated set
          if (!processedLinks.has(linkKey)) {
            const dedupSource = allNodeMap.get(sourceId);
            const dedupTarget = allNodeMap.get(targetId);
            if (dedupSource && dedupTarget) {
              processedLinks.add(linkKey);
              allLinks.push({
                source: dedupSource,
                target: dedupTarget,
                relationship: link.relationship
              });
            }
          }
        });
      });

      // Get spouse links (these connect different trees)
      spouseLinks = getSpouseLinksFromData(data, allNodeMap);

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
        .data(allLinks)
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

      // Render spouse links - make them prominent and visible for tree-to-tree connections
      linkGroup.selectAll('.spouse-link')
        .data(spouseLinks)
        .enter()
        .append('path')
        .attr('class', 'spouse-link')
        .attr('d', d => {
          const path = d3.path();
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Create a curved path for longer distances (connecting different trees)
          // Since tree is flipped (roots at bottom), curves should go upward
          if (distance > 100) {
            // Horizontal curve for tree-to-tree connections
            const midX = (d.source.x + d.target.x) / 2;
            const curveHeight = Math.min(distance * 0.3, 80); // Positive for upward curve
            path.moveTo(d.source.x, d.source.y);
            path.bezierCurveTo(
              midX, d.source.y - curveHeight,
              midX, d.target.y - curveHeight,
              d.target.x, d.target.y
            );
          } else {
            // Simple curve for same-tree spouse connections
            const midX = (d.source.x + d.target.x) / 2;
            const curveHeight = 25; // Positive for upward curve
            path.moveTo(d.source.x, d.source.y);
            path.quadraticCurveTo(midX, d.source.y - curveHeight, d.target.x, d.target.y);
          }
          return path.toString();
        })
        .attr('fill', 'none')
        .attr('stroke', 'var(--primary-color)')
        .attr('stroke-width', 3) // Thicker for visibility
        .attr('stroke-dasharray', '6,3') // Dashed pattern
        .attr('opacity', 0.7) // More visible
        .style('transition', 'all 0.3s ease')
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'); // Shadow for prominence

      // Render nodes from all trees
      const nodeGroup = g.append('g').attr('class', 'nodes');

      const nodeElements = nodeGroup.selectAll('.node')
        .data(allNodes)
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
        const bounds = getTreeBounds();
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
    } catch (err) {
      console.error('Error building tree:', err);
      error = err.message;
      return;
    }
  }

  function alignNodesByGeneration(roots, treeHeight) {
    // Simplified generation calculation: all trees now have same depth
    const personGenerations = new Map();
    const memberMap = new Map();
    
    // Validate data is available
    if (!data || data.length === 0) {
      console.error('No data available for generation calculation');
      return new Map();
    }
    
    // Build member map
    data.forEach(member => {
      if (member && member.id) {
        memberMap.set(member.id, member);
      }
    });
    
    // Step 1: Set all roots (people without parents) to generation 0
    data.forEach(member => {
      const parents = member.relationships?.parent || [];
      if (parents.length === 0) {
        personGenerations.set(member.id, 0);
      }
    });
    
    // Step 2: Calculate generations from parents (top-down)
    // Iterate until all are calculated
    let changed = true;
    let iterations = 0;
    const maxIterations = 20;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      data.forEach(member => {
        const parents = member.relationships?.parent || [];
        if (parents.length > 0) {
          const parentGens = parents.map(pId => personGenerations.get(pId)).filter(g => g !== undefined);
          if (parentGens.length > 0) {
            const correctGen = Math.max(...parentGens) + 1;
            const currentGen = personGenerations.get(member.id);
            if (currentGen !== correctGen) {
              personGenerations.set(member.id, correctGen);
              changed = true;
            }
          }
        }
      });
    }
    
    // Step 3: Align spouses to same generation
    changed = true;
    iterations = 0;
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      data.forEach(member => {
        if (member.relationships?.spouse && member.relationships.spouse.length > 0) {
          const memberGen = personGenerations.get(member.id);
          if (memberGen !== undefined) {
            member.relationships.spouse.forEach(spouseId => {
              const spouseGen = personGenerations.get(spouseId);
              if (spouseGen === undefined || spouseGen !== memberGen) {
                personGenerations.set(spouseId, memberGen);
                changed = true;
              }
            });
          }
        }
      });
    }
    
    // Group nodes by generation
    const nodesByGeneration = new Map();
    personGenerations.forEach((generation, nodeId) => {
      if (!nodesByGeneration.has(generation)) {
        nodesByGeneration.set(generation, []);
      }
      nodesByGeneration.get(generation).push(nodeId);
    });
    
    // Calculate y positions for each generation
    // Roots (generation 0) at bottom, newer generations higher up
    const maxGeneration = Math.max(...Array.from(nodesByGeneration.keys()), 0);
    const generationYPositions = new Map();
    
    // Calculate spacing - more space near roots (older generations)
    const minSpacing = 100; // Minimum spacing
    const maxSpacing = 150; // Maximum spacing for oldest generations
    
    // Work from oldest (generation 0) to newest (maxGeneration)
    // Start from bottom (high y value) and work upward (decreasing y)
    // In SVG: y=0 is top, y=treeHeight is bottom
    // We want: generation 0 (Adele) at bottom, generation 1 (grandparents) above, generation 2 (parents) at top
    
    let currentY = treeHeight; // Start at bottom
    
    for (let gen = 0; gen <= maxGeneration; gen++) {
      if (nodesByGeneration.has(gen)) {
        // Set y position for all nodes in this generation
        // Generation 0 at bottom, higher generations moving up (decreasing y)
        nodesByGeneration.get(gen).forEach(nodeId => {
          generationYPositions.set(nodeId, currentY);
        });
        
        // Calculate spacing for next generation (more space for older generations)
        if (gen < maxGeneration) {
          const spacingRatio = 1 - (gen / maxGeneration) * 0.3; // Decrease spacing by up to 30% as we go up
          const spacing = minSpacing + (maxSpacing - minSpacing) * spacingRatio;
          currentY -= spacing; // Move up (decrease y) for next generation
        }
      }
    }
    
    return generationYPositions;
  }

  function applyOrganicPositioning(root, width) {
    // Apply organic variations to node positions for natural branching
    // Reduced variation to prevent overlaps
    root.each(node => {
      if (node.parent) {
        const depth = node.depth;
        const member = node.data.data;
        // Deterministic variation based on member ID for consistent positioning
        const idHash = member.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const variationFactor = 1 + depth * 0.1; // Reduced from 0.15
        const variation = ((idHash % 100) - 50) * 0.4 * variationFactor; // Reduced from 0.8
        node.x += variation;
        
        // Reduced vertical offset to prevent overlaps
        const yVariation = ((idHash % 20) - 10) * 0.3; // Reduced from 0.5
        node.y += yVariation;
      }
    });
    
    // Ensure minimum spacing between nodes at same depth
    const nodesByDepth = new Map();
    root.each(node => {
      if (!nodesByDepth.has(node.depth)) {
        nodesByDepth.set(node.depth, []);
      }
      nodesByDepth.get(node.depth).push(node);
    });
    
    // Sort nodes at each depth by x and ensure minimum horizontal spacing
    nodesByDepth.forEach((nodes, depth) => {
      if (nodes.length > 1) {
        nodes.sort((a, b) => a.x - b.x);
        const minHorizontalSpacing = 80; // Minimum horizontal spacing between nodes
        for (let i = 1; i < nodes.length; i++) {
          const prevNode = nodes[i - 1];
          const currentNode = nodes[i];
          const currentSpacing = currentNode.x - prevNode.x;
          if (currentSpacing < minHorizontalSpacing) {
            const adjustment = minHorizontalSpacing - currentSpacing;
            currentNode.x += adjustment;
            // Adjust all subsequent nodes
            for (let j = i + 1; j < nodes.length; j++) {
              nodes[j].x += adjustment;
            }
          }
        }
      }
    });
  }

  function getTreeBounds() {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;

    // Account for all nodes from all trees
    allNodes.forEach(d => {
      // Account for node radius (32px) + label space (about 60px total for safety)
      const nodeRadius = 70; // Increased to account for node + label + padding
      if (d.x - nodeRadius < x0) x0 = d.x - nodeRadius;
      if (d.x + nodeRadius > x1) x1 = d.x + nodeRadius;
      if (d.y - nodeRadius < y0) y0 = d.y - nodeRadius;
      if (d.y + nodeRadius > y1) y1 = d.y + nodeRadius;
    });

    // Also account for spouse links that may extend beyond nodes
    spouseLinks.forEach(link => {
      const nodeRadius = 40;
      const sourceX = link.source.x;
      const targetX = link.target.x;
      const minX = Math.min(sourceX, targetX);
      const maxX = Math.max(sourceX, targetX);
      
      if (minX - nodeRadius < x0) x0 = minX - nodeRadius;
      if (maxX + nodeRadius > x1) x1 = maxX + nodeRadius;
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
        return (d.source === node || d.target === node) ? 1.0 : 0.3;
      })
      .attr('stroke-width', d => {
        return (d.source === node || d.target === node) ? 4 : 3;
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
        .style('opacity', 0.7)
        .attr('stroke-width', 3);
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
    <div class="loading">Loading family forest...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="visualization-header">
      <h2>Family Forest</h2>
      <p>Interactive family forest visualization. Roots at the bottom, branches grow toward the sky. Hover over nodes for details, click to select, zoom and pan to explore.</p>
      <button class="reset-btn" on:click={() => {
        if (svg && zoom && allNodes.length > 0 && container) {
          const bounds = getTreeBounds();
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

