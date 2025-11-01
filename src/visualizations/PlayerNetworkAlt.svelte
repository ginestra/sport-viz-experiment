<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { formatNumber, createTooltip } from '../utils/d3-helpers.js';

  let container;
  let data = [];
  let loading = true;
  let error = null;
  let visualizationCreated = false;
  let resizeObserver;
  let hoveredPlayer = null;
  let svg, g;
  let isMobile = false;

  // Helper function to get last name from full name
  function getLastName(fullName) {
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : fullName;
  }

  // Check if screen is small (mobile)
  function checkIsMobile() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768; // Tablet breakpoint
  }

  // Map country names to ISO country codes
  function getCountryCode(countryName) {
    const countryMap = {
      'Spain': 'ES',
      'Australia': 'AU',
      'Norway': 'NO',
      'France': 'FR',
      'Canada': 'CA',
      'USA': 'US',
      'United States': 'US',
      'Netherlands': 'NL',
      'Germany': 'DE',
      'England': 'GB',
      'Denmark': 'DK'
    };
    return countryMap[countryName] || countryName.substring(0, 2).toUpperCase();
  }

  function parsePlayersData(csvData) {
    return csvData.map(d => {
      const clubs = d.clubs_with_years 
        ? d.clubs_with_years.split(', ').map(club => {
            const match = club.match(/^(.+?)\s*\((\d{4})-(\d{4}|present)\)$/);
            if (match) {
              return {
                name: match[1],
                startYear: parseInt(match[2]),
                endYear: match[3] === 'present' ? new Date().getFullYear() : parseInt(match[3])
              };
            }
            return { name: club, startYear: null, endYear: null };
          })
        : [];
      
      return {
        ...d,
        career_goals: +d.career_goals || 0,
        career_assists: +d.career_assists || 0,
        clubs: clubs,
        national_team: d.national_team || d.country_provenance
      };
    });
  }

  function findConnections(player, allPlayers) {
    const connections = [];
    const playerClubs = player.clubs || [];
    
    allPlayers.forEach(otherPlayer => {
      if (otherPlayer.name === player.name) return;
      
      const otherClubs = otherPlayer.clubs || [];
      const commonTeams = [];
      
      playerClubs.forEach(pClub => {
        otherClubs.forEach(oClub => {
          if (pClub.name === oClub.name && pClub.startYear && oClub.startYear && pClub.endYear && oClub.endYear) {
            // Check if they overlapped in time
            const overlap = !(pClub.endYear < oClub.startYear || oClub.endYear < pClub.startYear);
            if (overlap) {
              commonTeams.push(pClub.name);
            }
          }
        });
      });
      
      // Also check national team connection
      if (player.national_team === otherPlayer.national_team) {
        commonTeams.push(player.national_team);
      }
      
      if (commonTeams.length > 0) {
        connections.push({
          player: otherPlayer,
          teams: [...new Set(commonTeams)]
        });
      }
    });
    
    return connections;
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
      const csvData = await d3.csv('/data/players.csv');
      
      if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        error = 'No data loaded from CSV file';
        loading = false;
        return;
      }

      const parsedData = parsePlayersData(csvData);
      
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        error = 'No valid data after parsing';
        loading = false;
        return;
      }

      data = parsedData;
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

  $: if (container && !loading && Array.isArray(data) && data.length > 0 && !visualizationCreated) {
    visualizationCreated = true;
    createVisualization();
    setupResizeObserver();
  }

  function createVisualization() {
    if (!container || !data || !Array.isArray(data) || data.length === 0) {
      return;
    }

    d3.select(container).selectAll('*').remove();

    // Check if mobile
    isMobile = checkIsMobile();

    const containerWidth = container.clientWidth || 900;
    const size = Math.min(containerWidth - 40, isMobile ? 600 : 900);
    // Add padding for outer labels (less padding on mobile)
    const padding = isMobile ? 40 : 80;
    const width = size + (padding * 2);
    const height = size + (padding * 2);
    const centerX = width / 2;
    const centerY = height / 2;

    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    const tooltip = createTooltip();

    // NEW ORDER: Define radii for different rings (from inner to outer: network, player names, country, clubs, assists, goals)
    const radiusMultiplier = isMobile ? 0.9 : 1.0; // Slightly smaller on mobile
    const innerRadius = size * 0.08 * radiusMultiplier;  // Connection points (network - stays same)
    const playerNameRadius = size * 0.12 * radiusMultiplier;  // Player names (second layer) - closer to network circle
    const nationalTeamRadius = size * 0.32 * radiusMultiplier;  // National team names (third layer) - increased for more distance from player names
    const clubsRadius = size * 0.39 * radiusMultiplier;  // Club dots (fourth layer) - adjusted to maintain spacing
    const assistsRadius = size * 0.46 * radiusMultiplier;  // Assists count (fifth layer) - adjusted to maintain spacing
    const goalsRadius = size * 0.53 * radiusMultiplier;  // Goals count (outermost layer) - adjusted to maintain spacing

    // Create color scale by country - filter out undefined/null values
    let countryValues = [];
    try {
      countryValues = data
        .map(d => {
          if (!d || typeof d !== 'object') return null;
          return d.country_provenance || d.national_team || null;
        })
        .filter(c => c !== null && c !== undefined);
    } catch (e) {
      countryValues = [];
    }
    
    // Get unique countries
    let countries = [];
    try {
      if (Array.isArray(countryValues) && countryValues.length > 0) {
        const countrySet = new Set(countryValues);
        countries = Array.from(countrySet);
      }
    } catch (e) {
      // If error, countries stays empty array
    }
    
    if (countries.length === 0) {
      return;
    }

    // Use a safe color scheme - schemeCategory20 was deprecated, use schemeSet3 or custom palette
    let colorScheme;
    try {
      // Try newer D3 schemes first
      if (d3.schemeSet3 && Array.isArray(d3.schemeSet3)) {
        colorScheme = d3.schemeSet3;
      } else if (d3.schemeCategory20 && Array.isArray(d3.schemeCategory20)) {
        colorScheme = d3.schemeCategory20;
      } else if (d3.schemeCategory10 && Array.isArray(d3.schemeCategory10)) {
        colorScheme = d3.schemeCategory10;
      } else {
        throw new Error('No D3 color scheme available');
      }
    } catch (e) {
      // Fallback color palette
      colorScheme = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
        '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
        '#c49c94', '#f7b6d3', '#c7c7c7', '#dbdb8d', '#9edae5'
      ];
    }
    
    if (!Array.isArray(colorScheme) || colorScheme.length === 0) {
      colorScheme = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
    }

    // Ensure countries array is valid before passing to scaleOrdinal
    const validCountries = Array.isArray(countries) ? countries : [];
    if (validCountries.length === 0) {
      return;
    }

    // Create color scale
    let colorScale;
    try {
      if (typeof d3.scaleOrdinal === 'function') {
        colorScale = d3.scaleOrdinal()
          .range(colorScheme)
          .domain(validCountries);
      } else {
        // Fallback: create a simple function that cycles through colors
        const colorMap = new Map();
        validCountries.forEach((country, i) => {
          colorMap.set(country, colorScheme[i % colorScheme.length]);
        });
        colorScale = (country) => colorMap.get(country) || colorScheme[0];
      }
    } catch (e) {
      // Fallback: create a simple function
      const colorMap = new Map();
      validCountries.forEach((country, i) => {
        colorMap.set(country, colorScheme[i % colorScheme.length]);
      });
      colorScale = (country) => colorMap.get(country) || colorScheme[0];
    }

    // Sort players: first by country (alphabetically), then alphabetically by name within each country
    data.sort((a, b) => {
      const countryA = (a.country_provenance || a.national_team || '').toLowerCase();
      const countryB = (b.country_provenance || b.national_team || '').toLowerCase();
      
      // First sort by country alphabetically (case-insensitive)
      if (countryA !== countryB) {
        return countryA.localeCompare(countryB);
      }
      
      // Then sort alphabetically by name within the same country (case-insensitive)
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });

    // Create angles for each player - evenly distribute around circle
    const numPlayers = data.length;
    const totalSlots = numPlayers + 1; // +1 for legend slot
    const angleStep = (2 * Math.PI) / totalSlots;

    // Draw radial lines to slice the circles (pie-like dividers for each player)
    const radialLinesLayer = g.append('g').attr('class', 'radial-lines-layer');
    
    // Draw a line for each player slice boundary (including legend slot)
    for (let i = 0; i <= numPlayers; i++) {
      const angle = i * angleStep;
      const startRadius = innerRadius * 0.5; // Start slightly inside inner radius
      const endRadius = goalsRadius + 10; // Extend slightly beyond goals (outermost)
      
      const x1 = Math.cos(angle - Math.PI / 2) * startRadius;
      const y1 = Math.sin(angle - Math.PI / 2) * startRadius;
      const x2 = Math.cos(angle - Math.PI / 2) * endRadius;
      const y2 = Math.sin(angle - Math.PI / 2) * endRadius;
      
      radialLinesLayer.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .style('stroke', 'var(--viz-stroke-color)')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '2,4')
        .style('opacity', 0.15);
    }

    // Draw circle outlines for each ring section (NEW ORDER)
    const circlesLayer = g.append('g').attr('class', 'circles-layer');
    
    // Inner circle (connection points / network)
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', innerRadius)
      .style('fill', 'none')
      .style('stroke', 'var(--viz-circle-stroke)')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.2);
    
    // Player names circle
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', playerNameRadius)
      .style('fill', 'none')
      .style('stroke', 'var(--viz-circle-stroke)')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.2);
    
    // National team/countries circle
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', nationalTeamRadius)
      .style('fill', 'none')
      .style('stroke', 'var(--viz-circle-stroke)')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.2);
    
    // Clubs circle
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', clubsRadius)
      .style('fill', 'none')
      .style('stroke', 'var(--viz-circle-stroke)')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.2);
    
    // Assists circle
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', assistsRadius)
      .style('fill', 'none')
      .style('stroke', 'var(--viz-circle-stroke)')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.2);
    
    // Goals circle (outermost)
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', goalsRadius)
      .style('fill', 'none')
      .style('stroke', 'var(--viz-circle-stroke)')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .style('opacity', 0.2);
    
    // Draw connections layer (all connections visible by default, highlighted on hover)
    const connectionsLayer = g.append('g').attr('class', 'connections-layer');
    
    // Store all connection paths for highlighting
    const allConnections = [];
    
    // Draw all connections initially as light lines
    data.forEach((player, i) => {
      const connections = findConnections(player, data);
      connections.forEach(conn => {
          const otherIndex = data.findIndex(p => p.name === conn.player.name);
          if (otherIndex !== -1 && otherIndex > i) { // Only draw each connection once
            const angle1 = (i + 1) * angleStep; // +1 because index 0 is for legends
            const angle2 = (otherIndex + 1) * angleStep;
          
          const x1 = Math.cos(angle1 - Math.PI / 2) * innerRadius;
          const y1 = Math.sin(angle1 - Math.PI / 2) * innerRadius;
          const x2 = Math.cos(angle2 - Math.PI / 2) * innerRadius;
          const y2 = Math.sin(angle2 - Math.PI / 2) * innerRadius;
          
          const midAngle = (angle1 + angle2) / 2;
          const midRadius = innerRadius * 0.5;
          const midX = Math.cos(midAngle - Math.PI / 2) * midRadius;
          const midY = Math.sin(midAngle - Math.PI / 2) * midRadius;
          
          const path = d3.path();
          path.moveTo(x1, y1);
          path.quadraticCurveTo(midX, midY, x2, y2);
          
              const connectionPath = connectionsLayer.append('path')
                .attr('d', path.toString())
                .style('stroke', 'var(--viz-connection-color)')
                .style('stroke-width', 1)
                .style('opacity', 0.15)
                .style('fill', 'none')
                .attr('class', 'connection-line')
                .attr('data-player1', player.name)
                .attr('data-player2', conn.player.name)
                .style('pointer-events', 'none');
          
          allConnections.push({
            path: connectionPath,
            player1: player.name,
            player2: conn.player.name,
            player1Index: i,
            player2Index: otherIndex
          });
        }
      });
    });
    
    // Create layers for each data type
    const namesLayer = g.append('g').attr('class', 'names-layer');
    const nationalTeamLayer = g.append('g').attr('class', 'national-team-layer');
    const clubsLayer = g.append('g').attr('class', 'clubs-layer');
    const assistsLayer = g.append('g').attr('class', 'assists-layer');
    const goalsLayer = g.append('g').attr('class', 'goals-layer');
    
    // Add soccer ball icon at the center
    const iconSize = size * 0.12;
    const iconGroup = g.append('g')
      .attr('class', 'center-icon');
    
    // Font Awesome soccer-ball SVG path
    const soccerBallPath = iconGroup.append('path')
      .attr('d', 'M417.3 360.1l-71.6-4.8c-5.2-.3-10.3 1.1-14.5 4.2s-7.2 7.4-8.4 12.5l-17.6 69.6C289.5 445.8 273 448 256 448s-33.5-2.2-49.2-6.4L189.2 372c-1.3-5-4.3-9.4-8.4-12.5s-9.3-4.5-14.5-4.2l-71.6 4.8c-17.6-27.2-28.5-59.2-30.4-93.6L125 228.3c4.4-2.8 7.6-7 9.2-11.9s1.4-10.2-.5-15l-26.7-66.6C128 109.2 155.3 89 186.7 76.9l55.2 46c4 3.3 9 5.1 14.1 5.1s10.2-1.8 14.1-5.1l55.2-46c31.3 12.1 58.7 32.3 79.6 57.9l-26.7 66.6c-1.9 4.8-2.1 10.1-.5 15s4.9 9.1 9.2 11.9l60.7 38.2c-1.9 34.4-12.8 66.4-30.4 93.6zM256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm14.1-325.7c-8.4-6.1-19.8-6.1-28.2 0L194 221c-8.4 6.1-11.9 16.9-8.7 26.8l18.3 56.3c3.2 9.9 12.4 16.6 22.8 16.6l59.2 0c10.4 0 19.6-6.7 22.8-16.6l18.3-56.3c3.2-9.9-.3-20.7-8.7-26.8l-47.9-34.8z')
      .attr('transform', `scale(${iconSize / 512}) translate(-256, -256)`)
      .style('fill', 'var(--viz-icon-color)')
      .style('opacity', 0.2);

    data.forEach((player, i) => {
      // Start from index 1 because index 0 is reserved for legends
      const angle = (i + 1) * angleStep;
      
      // Connection point (inner radius) - where connections will originate
      const connectionX = Math.cos(angle - Math.PI / 2) * innerRadius;
      const connectionY = Math.sin(angle - Math.PI / 2) * innerRadius;
      
      // Player name position (second layer, after network)
      const playerNameX = Math.cos(angle - Math.PI / 2) * playerNameRadius;
      const playerNameY = Math.sin(angle - Math.PI / 2) * playerNameRadius;
      
      // Calculate radial rotation
      let radialRotation = (angle * 180 / Math.PI) + 90;
      
      // Determine if on right side (12 to 6 o'clock) or left side (6 to 12 o'clock)
      const isRightSide = playerNameX > 0;
      
      // For names on the right side (12 to 6 o'clock), rotate by 180° for clockwise readability
      if (isRightSide) {
        radialRotation += 180;
      }

      // Get color for this player's country
      const playerCountry = player.country_provenance || player.national_team || 'Unknown';
      const playerColor = colorScale(playerCountry);

      // Draw connection point (small circle at inner radius)
      g.append('circle')
        .attr('cx', connectionX)
        .attr('cy', connectionY)
        .attr('r', 3)
        .style('fill', playerColor)
        .style('opacity', 0.6);

      // Player name (second layer) - rotated radially
      // Right side (12-6): 'start' anchor (points toward center after 180° rotation)
      // Left side (6-12): 'end' anchor (points toward center)
      const nameGroup = namesLayer.append('g')
        .attr('class', 'player-name-group')
        .attr('data-player-name', player.name)
        .attr('transform', `translate(${playerNameX}, ${playerNameY}) rotate(${radialRotation})`)
        .style('cursor', 'pointer');
      
      const displayName = isMobile ? getLastName(player.name) : player.name;
      const fontSize = isMobile ? '11px' : '14px';
      
      // Choose anchor based on side: right side uses 'start', left side uses 'end'
      const textAnchor = isRightSide ? 'start' : 'end';
      
      // Measure text for underline
      const tempText = nameGroup.append('text')
        .attr('text-anchor', textAnchor)
        .attr('dominant-baseline', 'middle')
        .style('font-size', fontSize)
        .style('font-weight', '500')
        .style('visibility', 'hidden')
        .text(displayName);
      
      let textWidth = 0;
      let textHeight = 0;
      tempText.each(function() {
        const bbox = this.getBBox();
        textWidth = bbox.width;
        textHeight = bbox.height;
      });
      
      tempText.remove();
      
      // Add an invisible hit area rectangle that covers the text
      // This prevents flickering when font size changes
      // Position based on anchor: right side starts at 0, left side ends at 0
      const hitAreaPadding = 5; // Extra padding around text
      const hitAreaRect = nameGroup.append('rect')
        .attr('x', isRightSide ? -hitAreaPadding : -textWidth - hitAreaPadding)
        .attr('y', -textHeight / 2 - hitAreaPadding)
        .attr('width', textWidth + (hitAreaPadding * 2))
        .attr('height', textHeight + (hitAreaPadding * 2))
        .style('fill', 'transparent')
        .style('pointer-events', 'all') // Make it catch mouse events
        .style('cursor', 'pointer');
      
      // Add text - anchor depends on side
      const nameText = nameGroup.append('text')
        .attr('text-anchor', textAnchor)
        .attr('dominant-baseline', 'middle')
        .attr('x', 0)
        .attr('y', 0)
        .attr('class', 'player-name')
        .attr('data-player-name', player.name) // Add data attribute for easier selection
        .attr('data-player-index', i) // Store index for identification
        .style('font-size', fontSize)
        .attr('font-size', fontSize) // Set as attribute too
        .style('font-family', 'monospace')
        .style('fill', playerColor)
        .style('font-weight', '500')
        .style('pointer-events', 'none'); // Text doesn't need pointer events, hit area handles it
      
      nameText.text(displayName);
      
      // Add underline - positioned based on anchor
      // Right side: starts at 0, extends to textWidth
      // Left side: ends at 0, extends backward to -textWidth
      const underline = nameGroup.append('line')
        .attr('x1', isRightSide ? 0 : -textWidth)
        .attr('x2', isRightSide ? textWidth : 0)
        .attr('y1', textHeight / 2 + 3)
        .attr('y2', textHeight / 2 + 3)
        .style('stroke', playerColor)
        .style('stroke-width', 2)
        .style('opacity', 0)
        .style('transition', 'opacity 0.2s ease')
        .style('pointer-events', 'none'); // Underline should not block mouse events
      
      // Store references to data elements for highlighting
      nameGroup.attr('data-player-index', i);
      
      // Make the entire group interactive
      nameGroup
        .style('pointer-events', 'all')
        .style('cursor', 'pointer');
      
      // Hover handlers - mark as hovered with data attribute and update size
      // Attach to both group and text to ensure we catch all hover events
      nameGroup
        .on('mouseenter', function(event) {
          hoveredPlayer = player;
          
          // Mark this group as the currently hovered player
          nameGroup.attr('data-is-hovered', 'true');
          nameText.attr('data-is-hovered', 'true');
          
          // Set hovered player's font size (slightly bigger for better visibility)
          const hoverFontSize = isMobile ? '14px' : '18px';
          nameText
            .style('font-weight', 'bold')
            .style('font-size', hoverFontSize)
            .attr('font-size', hoverFontSize)
            .style('fill', d3.rgb(playerColor).darker(0.3).toString());
          underline.style('opacity', 1);
          
          // Call showConnections first - it will NOT modify this player because of data-is-hovered attribute
          showConnections(player, i);
          
          // Highlight ONLY this player's data elements (not connected players')
          highlightPlayerData(i, playerColor);
          
          tooltip.transition()
            .duration(200)
            .style('opacity', 1);
          tooltip.html(`
              <strong>${player.name}</strong><br/>
              National Team: ${player.national_team}<br/>
              Career Goals: ${player.career_goals}<br/>
              Career Assists: ${player.career_assists || 0}<br/>
              Clubs: ${player.clubs.map(c => c.name).join(', ')}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseleave', function() {
          hoveredPlayer = null;
          
          // Remove hovered marker
          nameGroup.attr('data-is-hovered', null);
          nameText.attr('data-is-hovered', null);
          
          hideConnections();
          const normalFontSize = isMobile ? '11px' : '14px';
          nameText
            .style('font-weight', '500')
            .style('font-size', normalFontSize)
            .attr('font-size', normalFontSize)
            .style('fill', playerColor);
          underline.style('opacity', 0);
          
          // Unhighlight this player's data elements
          unhighlightPlayerData(i);
          tooltip.transition()
            .duration(200)
            .style('opacity', 0);
        });

      // National team code (third layer)
      const natTeamX = Math.cos(angle - Math.PI / 2) * nationalTeamRadius;
      const natTeamY = Math.sin(angle - Math.PI / 2) * nationalTeamRadius;
      const countryCode = getCountryCode(player.national_team).toUpperCase();
      
      const countryFontSize = isMobile ? '10px' : '12px';
      nationalTeamLayer.append('text')
        .attr('x', natTeamX)
        .attr('y', natTeamY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('transform', `rotate(${radialRotation}, ${natTeamX}, ${natTeamY})`)
        .attr('data-player-index', i)
        .attr('class', 'country-text')
        .style('font-size', countryFontSize)
        .style('font-family', 'monospace')
        .style('fill', playerColor)
        .style('opacity', 0.8)
        .style('font-weight', '600')
        .text(countryCode);

      // Club dots (fourth layer)
      const numClubs = player.clubs.length;
      if (numClubs > 0) {
        const perpendicularAngle = angle + Math.PI / 2;
        const offsetPerClub = 8;
        
        player.clubs.forEach((club, clubIndex) => {
          let clubX = Math.cos(angle - Math.PI / 2) * clubsRadius;
          let clubY = Math.sin(angle - Math.PI / 2) * clubsRadius;
          
          if (numClubs > 1) {
            const perpendicularOffset = (clubIndex - (numClubs - 1) / 2) * offsetPerClub;
            clubX += Math.cos(perpendicularAngle) * perpendicularOffset;
            clubY += Math.sin(perpendicularAngle) * perpendicularOffset;
          }
          
          const clubDot = clubsLayer.append('circle')
            .attr('cx', clubX)
            .attr('cy', clubY)
            .attr('r', 5)
            .attr('data-player-index', i)
            .attr('class', 'club-dot')
            .style('fill', playerColor)
            .style('opacity', 0.8)
            .style('stroke', 'var(--bg-primary)')
            .style('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseenter', function(event) {
              d3.select(this)
                .attr('r', 7)
                .style('opacity', 1);
              
              tooltip.transition()
                .duration(200)
                .style('opacity', 1);
              
              const years = club.startYear && club.endYear 
                ? ` (${club.startYear}-${club.endYear})` 
                : '';
              tooltip.html(`
                <strong>${club.name}</strong>${years}<br/>
                Player: ${player.name}
              `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseleave', function() {
              d3.select(this)
                .attr('r', 5)
                .style('opacity', 0.8);
              
              tooltip.transition()
                .duration(200)
                .style('opacity', 0);
            });
        });
      }

      // Assists count (fifth layer)
      const assistsX = Math.cos(angle - Math.PI / 2) * assistsRadius;
      const assistsY = Math.sin(angle - Math.PI / 2) * assistsRadius;
      
      const assistsCircle = assistsLayer.append('circle')
        .attr('cx', assistsX)
        .attr('cy', assistsY)
        .attr('r', Math.max(6, Math.min(16, player.career_assists / 8)))
        .attr('data-player-index', i)
        .attr('class', 'assists-circle')
        .style('fill', playerColor)
        .style('opacity', 0.5);
        
      const assistsFontSize = isMobile ? '8px' : '10px';
      assistsLayer.append('text')
        .attr('x', assistsX)
        .attr('y', assistsY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('data-player-index', i)
        .attr('class', 'assists-text')
        .style('font-size', assistsFontSize)
        .style('font-family', 'monospace')
        .style('font-weight', 'bold')
        .style('fill', 'var(--text-color)')
        .text(player.career_assists || '0');

      // Goals count (outermost layer)
      const goalsX = Math.cos(angle - Math.PI / 2) * goalsRadius;
      const goalsY = Math.sin(angle - Math.PI / 2) * goalsRadius;
      
      const goalsCircle = goalsLayer.append('circle')
        .attr('cx', goalsX)
        .attr('cy', goalsY)
        .attr('r', Math.max(8, Math.min(20, player.career_goals / 10)))
        .attr('data-player-index', i)
        .attr('class', 'goals-circle')
        .style('fill', playerColor)
        .style('opacity', 0.6);
        
      const goalsFontSize = isMobile ? '9px' : '11px';
      goalsLayer.append('text')
        .attr('x', goalsX)
        .attr('y', goalsY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('data-player-index', i)
        .attr('class', 'goals-text')
        .style('font-size', goalsFontSize)
        .style('font-family', 'monospace')
        .style('font-weight', 'bold')
        .style('fill', 'var(--text-color)')
        .text(player.career_goals);
    });

    function highlightPlayerData(playerIndex, playerColor) {
      // Highlight country
      nationalTeamLayer.selectAll(`text.country-text[data-player-index="${playerIndex}"]`)
        .style('opacity', 1)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '12px' : '14px');
      
      // Highlight clubs
      clubsLayer.selectAll(`circle.club-dot[data-player-index="${playerIndex}"]`)
        .attr('r', 7)
        .style('opacity', 1)
        .style('stroke-width', 2);
      
      // Highlight assists
      assistsLayer.selectAll(`circle.assists-circle[data-player-index="${playerIndex}"]`)
        .style('opacity', 0.8)
        .style('stroke', playerColor)
        .style('stroke-width', 2);
      assistsLayer.selectAll(`text.assists-text[data-player-index="${playerIndex}"]`)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '10px' : '12px');
      
      // Highlight goals
      goalsLayer.selectAll(`circle.goals-circle[data-player-index="${playerIndex}"]`)
        .style('opacity', 0.9)
        .style('stroke', playerColor)
        .style('stroke-width', 2);
      goalsLayer.selectAll(`text.goals-text[data-player-index="${playerIndex}"]`)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '11px' : '13px');
    }

    function unhighlightPlayerData(playerIndex) {
      // Reset country
      nationalTeamLayer.selectAll(`text.country-text[data-player-index="${playerIndex}"]`)
        .style('opacity', 0.8)
        .style('font-weight', '600')
        .style('font-size', isMobile ? '10px' : '12px');
      
      // Reset clubs
      clubsLayer.selectAll(`circle.club-dot[data-player-index="${playerIndex}"]`)
        .attr('r', 5)
        .style('opacity', 0.8)
        .style('stroke-width', 1);
      
      // Reset assists
      assistsLayer.selectAll(`circle.assists-circle[data-player-index="${playerIndex}"]`)
        .style('opacity', 0.5)
        .style('stroke', 'none')
        .style('stroke-width', 0);
      assistsLayer.selectAll(`text.assists-text[data-player-index="${playerIndex}"]`)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '8px' : '10px');
      
      // Reset goals
      goalsLayer.selectAll(`circle.goals-circle[data-player-index="${playerIndex}"]`)
        .style('opacity', 0.6)
        .style('stroke', 'none')
        .style('stroke-width', 0);
      goalsLayer.selectAll(`text.goals-text[data-player-index="${playerIndex}"]`)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '9px' : '11px');
    }

    function showConnections(player, playerIndex) {
      const connections = findConnections(player, data);
      const playerColor = colorScale(player.country_provenance || player.national_team || 'Unknown');
      
      // Highlight connected player names (smaller than hovered player)
      connections.forEach(conn => {
        // Skip if this is the hovered player itself
        if (conn.player.name === player.name) {
          return;
        }
        
        const connectedIndex = data.findIndex(p => p.name === conn.player.name);
        if (connectedIndex === -1) {
          return;
        }
        
        const connPlayerColor = colorScale(conn.player.country_provenance || conn.player.national_team || 'Unknown');
        const connectedNameGroup = namesLayer.select(`[data-player-name="${conn.player.name}"]`);
        
        // Skip if this is the hovered player (check data attribute)
        if (connectedNameGroup.attr('data-is-hovered') === 'true') {
          return;
        }
        
        if (!connectedNameGroup.empty()) {
          const connectedNameText = connectedNameGroup.select('.player-name');
          if (!connectedNameText.empty()) {
            // Slightly bigger font for connected players (but smaller than hovered)
            const connectedFontSize = isMobile ? '12px' : '15px';
            connectedNameText
              .style('font-weight', 'bold')
              .style('font-size', connectedFontSize)
              .attr('font-size', connectedFontSize)
              .style('opacity', 1)
              .style('fill', d3.rgb(connPlayerColor).darker(0.2).toString());
          }
          
          const connectedUnderline = connectedNameGroup.select('line');
          if (!connectedUnderline.empty()) {
            connectedUnderline.style('opacity', 0.7);
          }
        }
        
        // DO NOT highlight connected player's data elements - only highlight the hovered player's stats
      });
      
      // Highlight connections for this player
      allConnections.forEach(conn => {
        if (conn.player1 === player.name || conn.player2 === player.name) {
          conn.path
            .style('stroke', playerColor)
            .style('stroke-width', 3)
            .style('opacity', 0.7);
        }
      });
    }

    function hideConnections() {
      // Reset all connections back to light color
      allConnections.forEach(conn => {
        conn.path
          .style('stroke', 'var(--viz-connection-color)')
          .style('stroke-width', 1)
          .style('opacity', 0.15);
      });
      
      // Remove highlighting from all player names (but NOT the currently hovered player)
      namesLayer.selectAll('.player-name-group').each(function() {
        const group = d3.select(this);
        
        // Skip if this is marked as hovered
        if (group.attr('data-is-hovered') === 'true') {
          return;
        }
        
        const playerName = group.attr('data-player-name');
        const playerData = data.find(p => p.name === playerName);
        
        if (playerData) {
          const playerCountry = playerData.country_provenance || playerData.national_team || 'Unknown';
          const playerColor = colorScale(playerCountry);
          const resetFontSize = isMobile ? '11px' : '14px';
          
          const nameTextEl = group.select('.player-name');
          nameTextEl
            .style('font-weight', '500')
            .style('font-size', resetFontSize)
            .attr('font-size', resetFontSize)
            .style('opacity', 1)
            .style('fill', playerColor);
        }
        
        group.select('line').style('opacity', 0);
      });
      
      // Reset all data highlights (but NOT the currently hovered player)
      data.forEach((player, i) => {
        if (hoveredPlayer && player.name === hoveredPlayer.name) {
          return; // Skip the hovered player
        }
        unhighlightPlayerData(i);
      });
    }

    // Add circle legends with icons (NEW ORDER)
    const legendsLayer = g.append('g').attr('class', 'circle-legends-layer');
    
    // Legend configurations in new order
    const legendConfigs = [
      { radius: innerRadius, path: 'M0 80C0 53.5 21.5 32 48 32l96 0c26.5 0 48 21.5 48 48l0 16 128 0 0-16c0-26.5 21.5-48 48-48l96 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48l0-16-128 0 0 16c0 7.3-1.7 14.3-4.6 20.5l68.6 91.5 80 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48l0-96c0-7.3 1.7-14.3 4.6-20.5L128 224 48 224c-26.5 0-48-21.5-48-48L0 80z', viewBox: '0 0 512 512', label: 'Connections' },
      { radius: playerNameRadius, path: 'M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z', viewBox: '0 0 448 512', label: 'Player' },
      { radius: nationalTeamRadius, path: 'M64 32C64 14.3 49.7 0 32 0S0 14.3 0 32L0 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-121.6 62.7-18.8c41.9-12.6 87.1-8.7 126.2 10.9 42.7 21.4 92.5 24 137.2 7.2l37.1-13.9c12.5-4.7 20.8-16.6 20.8-30l0-247.7c0-23-24.2-38-44.8-27.7l-11.8 5.9c-44.9 22.5-97.8 22.5-142.8 0-36.4-18.2-78.3-21.8-117.2-10.1L64 54.4 64 32z', viewBox: '0 0 448 512', label: 'Country' },
      { radius: clubsRadius, path: 'M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0z', viewBox: '0 0 512 512', label: 'Clubs' },
      { radius: assistsRadius, path: 'M256.5-32a56 56 0 1 1 0 112 56 56 0 1 1 0-112zM123.6 176c-3.3 0-6.2 2-7.4 5L94.2 235.9c-6.6 16.4-25.2 24.4-41.6 17.8s-24.4-25.2-17.8-41.6l21.9-54.9C67.7 129.9 94.1 112 123.6 112l97.3 0c28.5 0 54.8 15.1 69.1 39.7l32.8 56.3 61.6 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-61.6 0c-22.8 0-43.8-12.1-55.3-31.8l-10-17.1-20.7 70.4 75.4 22.6c27.7 8.3 41.8 39 30.1 65.5L285.7 509c-7.2 16.2-26.1 23.4-42.2 16.2s-23.4-26.1-16.2-42.2l49.2-110.8-95.9-28.8c-32.7-9.8-52-43.7-43.7-76.8l22.7-90.6-35.9 0zm-8 181c13.3 14.9 30.7 26.3 51.2 32.4l4.7 1.4-6.9 19.3c-5.8 16.3-16 30.8-29.3 41.8L52.9 519.8c-13.6 11.2-33.8 9.3-45-4.3s-9.3-33.8 4.3-45l82.4-67.9c4.5-3.7 7.8-8.5 9.8-13.9L115.6 357z', viewBox: '0 0 448 512', label: 'Assists' },
      { radius: goalsRadius, path: 'M417.3 360.1l-71.6-4.8c-5.2-.3-10.3 1.1-14.5 4.2s-7.2 7.4-8.4 12.5l-17.6 69.6C289.5 445.8 273 448 256 448s-33.5-2.2-49.2-6.4L189.2 372c-1.3-5-4.3-9.4-8.4-12.5s-9.3-4.5-14.5-4.2l-71.6 4.8c-17.6-27.2-28.5-59.2-30.4-93.6L125 228.3c4.4-2.8 7.6-7 9.2-11.9s1.4-10.2-.5-15l-26.7-66.6C128 109.2 155.3 89 186.7 76.9l55.2 46c4 3.3 9 5.1 14.1 5.1s10.2-1.8 14.1-5.1l55.2-46c31.3 12.1 58.7 32.3 79.6 57.9l-26.7 66.6c-1.9 4.8-2.1 10.1-.5 15s4.9 9.1 9.2 11.9l60.7 38.2c-1.9 34.4-12.8 66.4-30.4 93.6zM256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm14.1-325.7c-8.4-6.1-19.8-6.1-28.2 0L194 221c-8.4 6.1-11.9 16.9-8.7 26.8l18.3 56.3c3.2 9.9 12.4 16.6 22.8 16.6l59.2 0c10.4 0 19.6-6.7 22.8-16.6l18.3-56.3c3.2-9.9-.3-20.7-8.7-26.8l-47.9-34.8z', viewBox: '0 0 512 512', label: 'Goals' }
    ];
    
    // Position legends as a single player slot at index 0
    const legendAngle = 0 * angleStep;
    
    const legendConnectionX = Math.cos(legendAngle - Math.PI / 2) * innerRadius;
    const legendConnectionY = Math.sin(legendAngle - Math.PI / 2) * innerRadius;
    
    g.append('circle')
      .attr('cx', legendConnectionX)
      .attr('cy', legendConnectionY)
      .attr('r', 3)
      .style('fill', 'var(--text-color)')
      .style('opacity', 0.6);
    
    const radialRotation = (legendAngle * 180 / Math.PI) + 90;
    
    legendConfigs.forEach((config) => {
      // For Player icon, add offset along radius to move it more toward outer edge
      const isPlayerIcon = config.label === 'Player';
      const radiusOffset = isPlayerIcon ? size * 0.1 * radiusMultiplier : 0; // Move player icon 10% outward
      const adjustedRadius = config.radius + radiusOffset;
      
      const iconX = Math.cos(legendAngle - Math.PI / 2) * adjustedRadius;
      const iconY = Math.sin(legendAngle - Math.PI / 2) * adjustedRadius;
      
      const iconSize = isMobile ? 10 : 14;
      
      const iconGroup = legendsLayer.append('g')
        .attr('class', `legend-icon-${config.label.toLowerCase()}`)
        .attr('transform', `translate(${iconX}, ${iconY})`);
      
      const viewBoxMatch = config.viewBox.match(/(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      const viewBoxWidth = viewBoxMatch ? parseFloat(viewBoxMatch[3]) : 512;
      const viewBoxHeight = viewBoxMatch ? parseFloat(viewBoxMatch[4]) : 512;
      const viewBoxCenterX = viewBoxWidth / 2;
      const viewBoxCenterY = viewBoxHeight / 2;
      
      const scale = iconSize / Math.max(viewBoxWidth, viewBoxHeight);
      
      // All icons are centered on their radius position
      const iconPath = iconGroup.append('path')
        .attr('d', config.path)
        .attr('transform', `scale(${scale}) translate(${-viewBoxCenterX}, ${-viewBoxCenterY})`)
        .style('fill', 'var(--viz-icon-color)')
        .style('opacity', 0.8)
        .style('cursor', 'pointer');
      
      iconPath
        .on('mouseenter', function(event) {
          tooltip.transition()
            .duration(200)
            .style('opacity', 1);
          tooltip.html(config.label)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseleave', function() {
          tooltip.transition()
            .duration(200)
            .style('opacity', 0);
        });
    });
    
    // Add country color legend
    const visualizationRightEdge = centerX + goalsRadius + 20;
    const legendX = Math.max(visualizationRightEdge + 20, width - 200);
    
    const legend = svg.append('g')
      .attr('class', 'country-legend')
      .attr('transform', `translate(${legendX}, 20)`);

    const legendTitle = legend.append('text')
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-family', 'monospace')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-color)')
      .text('Countries');

    const legendItems = legend.selectAll('.legend-item')
      .data(countries.slice(0, 10))
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${(i + 1) * 20})`);

    legendItems.append('circle')
      .attr('r', 6)
      .style('fill', d => colorScale(d));

    legendItems.append('text')
      .attr('x', 12)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('font-family', 'monospace')
      .style('fill', 'var(--text-color)')
      .text(d => getCountryCode(d));
  }
</script>

<div class="visualization-container">
  <div class="visualization-header">
    <h2>Player Network (Alternative Layout)</h2>
    <p>Alternative circle order: Network → Player Names → Country → Clubs → Assists → Goals (outermost). Hover over a player's name to see connections.</p>
    <p class="attribution">Visualization style inspired by <a href="https://yanouski.com/projects/xfiles-writers/" target="_blank" rel="noopener noreferrer">X-Files Writers Network</a>.</p>
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

  .visualization-header p.attribution {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .visualization-header p.attribution a {
    color: var(--primary-color);
    text-decoration: underline;
  }

  .visualization-header p.attribution a:hover {
    opacity: 0.8;
  }

  .chart-container {
    width: 100%;
    overflow: visible;
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 2rem;
    min-height: 600px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .loading, .error {
    text-align: center;
    padding: 3rem;
    color: var(--text-color);
  }

  .error {
    color: var(--error-color, #e74c3c);
  }

  :global(.player-name) {
    transition: all 0.2s ease;
  }

  @media (max-width: 767px) {
    .visualization-container {
      padding: 1rem;
    }

    .visualization-header h2 {
      font-size: 1.25rem;
    }

    .chart-container {
      padding: 1rem;
      min-height: 400px;
    }
  }
</style>

