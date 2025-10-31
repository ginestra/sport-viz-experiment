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
    console.log('createVisualization called', { 
      hasContainer: !!container, 
      hasData: !!data, 
      isArray: Array.isArray(data),
      dataLength: data ? data.length : 0,
      dataSample: data && data.length > 0 ? data[0] : null
    });
    
    if (!container || !data || !Array.isArray(data) || data.length === 0) {
      console.error('Cannot create visualization: container or data is missing', { container, data });
      return;
    }

    d3.select(container).selectAll('*').remove();

    const containerWidth = container.clientWidth || 900;
    const size = Math.min(containerWidth - 40, 900);
    // Add padding for outer labels
    const padding = 80;
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

    // Define radii for different rings
    const innerRadius = size * 0.08;  // Connection points (centers for connections)
    const goalsRadius = size * 0.18;  // Goals count
    const clubsRadius = size * 0.28;  // Club dots
    const nationalTeamRadius = size * 0.32; // National team names (closer to club dots, uniform distance)
    const playerNameRadius = size * 0.42; // Player names (moved closer to center)

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
      console.error('Error extracting countries:', e, data);
      countryValues = [];
    }
    
    // Use Array.from instead of spread to avoid transpilation issues
    let countries = [];
    try {
      if (Array.isArray(countryValues) && countryValues.length > 0) {
        const countrySet = new Set(countryValues);
        countries = Array.from(countrySet);
      } else {
        console.warn('countryValues is not a valid array:', countryValues);
        countries = [];
      }
    } catch (e) {
      console.error('Error creating country set:', e, countryValues);
      countries = [];
    }
    
    // Ensure countries is always an array
    if (!Array.isArray(countries)) {
      console.error('countries is not an array:', countries);
      countries = [];
    }
    
    if (countries.length === 0) {
      console.error('No countries found in data', { data, countryValues, countries });
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
      console.error('Invalid color scheme:', colorScheme);
      colorScheme = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
    }
    
    // Ensure countries array is valid before passing to scaleOrdinal
    const validCountries = Array.isArray(countries) ? countries : [];
    if (validCountries.length === 0) {
      console.error('Cannot create color scale: no valid countries');
      return;
    }
    
    // Create color scale - handle D3 v7 API changes
    let colorScale;
    try {
      if (typeof d3.scaleOrdinal === 'function') {
        // Verify validCountries is iterable before passing to domain
        console.log('Creating scaleOrdinal with', { validCountries, colorSchemeLength: colorScheme.length });
        colorScale = d3.scaleOrdinal()
          .range(colorScheme)
          .domain(validCountries);
      } else {
        // Fallback: create a simple function that cycles through colors
        console.warn('d3.scaleOrdinal not available, using fallback');
        const colorMap = new Map();
        validCountries.forEach((country, i) => {
          colorMap.set(country, colorScheme[i % colorScheme.length]);
        });
        colorScale = (country) => colorMap.get(country) || colorScheme[0];
      }
    } catch (e) {
      console.error('Error creating color scale:', e, { validCountries, colorScheme });
      // Fallback: create a simple function
      const colorMap = new Map();
      validCountries.forEach((country, i) => {
        colorMap.set(country, colorScheme[i % colorScheme.length]);
      });
      colorScale = (country) => colorMap.get(country) || colorScheme[0];
    }
    
    console.log('Color scale created', { validCountries, colorScale: typeof colorScale });

    // Create angles for each player - evenly distribute around circle
    const numPlayers = data.length;
    const angleStep = (2 * Math.PI) / numPlayers;

    // Draw connections (hidden by default, shown on hover)
    const connectionsLayer = g.append('g').attr('class', 'connections-layer');
    
    // Draw player names (outermost)
    const namesLayer = g.append('g').attr('class', 'names-layer');
    
    // Draw national team names
    const nationalTeamLayer = g.append('g').attr('class', 'national-team-layer');
    
    // Draw club dots
    const clubsLayer = g.append('g').attr('class', 'clubs-layer');
    
    // Draw goals count
    const goalsLayer = g.append('g').attr('class', 'goals-layer');
    
    // Add soccer ball icon at the center
    // Using Font Awesome SVG path directly for better SVG compatibility
    const iconSize = size * 0.12;
    const iconGroup = g.append('g')
      .attr('class', 'center-icon');
    
    // Font Awesome soccer-ball SVG path (actual soccer/football ball with pentagon/hexagon pattern)
    // Path from @fortawesome/fontawesome-free/svgs/solid/soccer-ball.svg
    const soccerBallPath = iconGroup.append('path')
      .attr('d', 'M417.3 360.1l-71.6-4.8c-5.2-.3-10.3 1.1-14.5 4.2s-7.2 7.4-8.4 12.5l-17.6 69.6C289.5 445.8 273 448 256 448s-33.5-2.2-49.2-6.4L189.2 372c-1.3-5-4.3-9.4-8.4-12.5s-9.3-4.5-14.5-4.2l-71.6 4.8c-17.6-27.2-28.5-59.2-30.4-93.6L125 228.3c4.4-2.8 7.6-7 9.2-11.9s1.4-10.2-.5-15l-26.7-66.6C128 109.2 155.3 89 186.7 76.9l55.2 46c4 3.3 9 5.1 14.1 5.1s10.2-1.8 14.1-5.1l55.2-46c31.3 12.1 58.7 32.3 79.6 57.9l-26.7 66.6c-1.9 4.8-2.1 10.1-.5 15s4.9 9.1 9.2 11.9l60.7 38.2c-1.9 34.4-12.8 66.4-30.4 93.6zM256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm14.1-325.7c-8.4-6.1-19.8-6.1-28.2 0L194 221c-8.4 6.1-11.9 16.9-8.7 26.8l18.3 56.3c3.2 9.9 12.4 16.6 22.8 16.6l59.2 0c10.4 0 19.6-6.7 22.8-16.6l18.3-56.3c3.2-9.9-.3-20.7-8.7-26.8l-47.9-34.8z')
      .attr('transform', `scale(${iconSize / 512}) translate(-256, -256)`)
      .style('fill', 'currentColor')
      .style('opacity', 0.2);
    
    // Set color using CSS variable - get computed value that updates with theme
    if (typeof window !== 'undefined' && document.documentElement) {
      const computedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
      soccerBallPath.style('fill', computedColor || '#333');
    }

    data.forEach((player, i) => {
      const angle = i * angleStep;
      
      // Connection point (inner radius) - where connections will originate
      const connectionX = Math.cos(angle - Math.PI / 2) * innerRadius;
      const connectionY = Math.sin(angle - Math.PI / 2) * innerRadius;
      
      // Player name position (outermost)
      const playerNameX = Math.cos(angle - Math.PI / 2) * playerNameRadius;
      const playerNameY = Math.sin(angle - Math.PI / 2) * playerNameRadius;
      
      // Calculate radial rotation - text should be perpendicular to radius (tangent to circle)
      // Convert angle to degrees and adjust for SVG rotation (0° = horizontal right, clockwise)
      const radialRotation = (angle * 180 / Math.PI) + 90;
      // Adjust text anchor based on position for better readability
      const textAnchor = angle > Math.PI / 2 && angle < 3 * Math.PI / 2 ? 'end' : 'start';

      // Get color for this player's country - fallback to default if missing
      const playerCountry = player.country_provenance || player.national_team || 'Unknown';
      const playerColor = colorScale(playerCountry);

      // Draw connection point (small circle at inner radius)
      g.append('circle')
        .attr('cx', connectionX)
        .attr('cy', connectionY)
        .attr('r', 3)
        .style('fill', playerColor)
        .style('opacity', 0.6);

      // Player name (outermost circle) - rotated radially
      // Use a group to add background and ensure consistent positioning
      const nameGroup = namesLayer.append('g')
        .attr('class', 'player-name-group')
        .attr('data-player-name', player.name)
        .attr('transform', `translate(${playerNameX}, ${playerNameY}) rotate(${radialRotation})`)
        .style('cursor', 'pointer');
      
      // Add text first to measure it (temporarily hidden)
      const tempText = nameGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '500')
        .style('visibility', 'hidden')
        .text(player.name);
      
      // Measure text and create background
      let textWidth = 0;
      let textHeight = 0;
      tempText.each(function() {
        const bbox = this.getBBox();
        textWidth = bbox.width;
        textHeight = bbox.height;
      });
      
      // Remove temp text
      tempText.remove();
      
      // Add underline line element (hidden by default)
      // Position underline below the text baseline
      const underline = nameGroup.append('line')
        .attr('x1', -textWidth / 2)
        .attr('x2', textWidth / 2)
        .attr('y1', textHeight / 2 + 3)
        .attr('y2', textHeight / 2 + 3)
        .style('stroke', playerColor)
        .style('stroke-width', 2)
        .style('opacity', 0)
        .style('transition', 'opacity 0.2s ease');
      
      // Add text with consistent middle anchor for uniform distance
      const nameText = nameGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'player-name')
        .style('font-size', '14px')
        .style('fill', playerColor)
        .style('font-weight', '500')
        .text(player.name);
      
      // Add hover handlers to the group
      nameGroup
        .on('mouseenter', function(event) {
          hoveredPlayer = player;
          showConnections(player, i);
          nameText
            .style('font-weight', 'bold')
            .style('font-size', '16px')
            .style('fill', d3.rgb(playerColor).darker(0.3).toString()); // Darken text slightly for contrast
          underline.style('opacity', 1);
          
          tooltip.transition()
            .duration(200)
            .style('opacity', 1);
          tooltip.html(`
            <strong>${player.name}</strong><br/>
            National Team: ${player.national_team}<br/>
            Career Goals: ${player.career_goals}<br/>
            Clubs: ${player.clubs.map(c => c.name).join(', ')}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseleave', function() {
          hoveredPlayer = null;
          hideConnections();
          nameText
            .style('font-weight', '500')
            .style('font-size', '14px')
            .style('fill', playerColor); // Restore original color
          underline.style('opacity', 0);
          tooltip.transition()
            .duration(200)
            .style('opacity', 0);
        });

      // Goals count (first outer ring)
      const goalsX = Math.cos(angle - Math.PI / 2) * goalsRadius;
      const goalsY = Math.sin(angle - Math.PI / 2) * goalsRadius;
      
      goalsLayer.append('circle')
        .attr('cx', goalsX)
        .attr('cy', goalsY)
        .attr('r', Math.max(8, Math.min(20, player.career_goals / 10)))
        .style('fill', playerColor)
        .style('opacity', 0.6);
        
      goalsLayer.append('text')
        .attr('x', goalsX)
        .attr('y', goalsY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--text-color)')
        .text(player.career_goals);

      // Club dots (second outer ring) - group them directly aligned with the player's radial position
      const numClubs = player.clubs.length;
      if (numClubs > 0) {
        // Position clubs in a tight cluster along the player's radial line
        // For multiple clubs, offset them perpendicular to the radial line (tangent direction)
        const perpendicularAngle = angle + Math.PI / 2; // 90 degrees from radial
        const offsetPerClub = 8; // pixels of offset per club
        
        player.clubs.forEach((club, clubIndex) => {
          // Center position on the radial line, then offset perpendicular for multiple clubs
          let clubX = Math.cos(angle - Math.PI / 2) * clubsRadius;
          let clubY = Math.sin(angle - Math.PI / 2) * clubsRadius;
          
          // If multiple clubs, offset them perpendicular to the radial line
          if (numClubs > 1) {
            const perpendicularOffset = (clubIndex - (numClubs - 1) / 2) * offsetPerClub;
            clubX += Math.cos(perpendicularAngle) * perpendicularOffset;
            clubY += Math.sin(perpendicularAngle) * perpendicularOffset;
          }
          
          const clubDot = clubsLayer.append('circle')
            .attr('cx', clubX)
            .attr('cy', clubY)
            .attr('r', 5)
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

      // National team code - rotated radially with consistent middle anchor
      const natTeamX = Math.cos(angle - Math.PI / 2) * nationalTeamRadius;
      const natTeamY = Math.sin(angle - Math.PI / 2) * nationalTeamRadius;
      const countryCode = getCountryCode(player.national_team).toUpperCase();
      
      nationalTeamLayer.append('text')
        .attr('x', natTeamX)
        .attr('y', natTeamY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('transform', `rotate(${radialRotation}, ${natTeamX}, ${natTeamY})`)
        .style('font-size', '12px')
        .style('fill', playerColor)
        .style('opacity', 0.8)
        .style('font-weight', '600')
        .text(countryCode);
    });

    function showConnections(player, playerIndex) {
      const connections = findConnections(player, data);
      
      console.log('Showing connections for', player.name, 'found', connections.length, 'connections', connections);
      
      // Highlight connected player names
      connections.forEach(conn => {
        const connectedNameGroup = namesLayer.select(`[data-player-name="${conn.player.name}"]`);
        if (!connectedNameGroup.empty()) {
          const connectedNameText = connectedNameGroup.select('.player-name');
          if (!connectedNameText.empty()) {
            const connPlayerColor = colorScale(conn.player.country_provenance || conn.player.national_team || 'Unknown');
            connectedNameText
              .style('font-weight', 'bold')
              .style('font-size', '16px')
              .style('opacity', 1)
              .style('fill', d3.rgb(connPlayerColor).darker(0.2).toString()); // Slightly darken for contrast
          }
          // Show underline for connected players
          const connectedUnderline = connectedNameGroup.select('line');
          if (!connectedUnderline.empty()) {
            connectedUnderline.style('opacity', 0.7);
          }
        }
      });
      
      connections.forEach(conn => {
        const currentPlayerIndex = playerIndex !== undefined ? playerIndex : data.findIndex(p => p.name === player.name);
        const otherIndex = data.findIndex(p => p.name === conn.player.name);
        
        console.log('Drawing connection:', player.name, 'to', conn.player.name, 'indices:', currentPlayerIndex, otherIndex);
        
        if (currentPlayerIndex !== -1 && otherIndex !== -1) {
          const angle1 = currentPlayerIndex * angleStep;
          const angle2 = otherIndex * angleStep;
          
          // Connection lines start from innerRadius (connection points)
          const x1 = Math.cos(angle1 - Math.PI / 2) * innerRadius;
          const y1 = Math.sin(angle1 - Math.PI / 2) * innerRadius;
          const x2 = Math.cos(angle2 - Math.PI / 2) * innerRadius;
          const y2 = Math.sin(angle2 - Math.PI / 2) * innerRadius;
          
          // Use arc path for curved connections
          const midAngle = (angle1 + angle2) / 2;
          const midRadius = innerRadius * 0.5; // Curve depth
          const midX = Math.cos(midAngle - Math.PI / 2) * midRadius;
          const midY = Math.sin(midAngle - Math.PI / 2) * midRadius;
          
          const path = d3.path();
          path.moveTo(x1, y1);
          path.quadraticCurveTo(midX, midY, x2, y2);
          
          // Get color from one of the connected players
          const connectionCountry = player.country_provenance || player.national_team || 'Unknown';
          const connectionColor = colorScale(connectionCountry);
          
          const connectionPath = connectionsLayer.append('path')
            .attr('d', path.toString())
            .style('stroke', connectionColor)
            .style('stroke-width', 3)
            .style('opacity', 0.7)
            .style('fill', 'none')
            .attr('class', 'connection-line')
            .style('pointer-events', 'none');
          
          console.log('Connection path created:', {
            path: path.toString(),
            color: connectionColor,
            x1, y1, x2, y2
          });
        } else {
          console.warn('Invalid indices for connection:', currentPlayerIndex, otherIndex);
        }
      });
    }

    function hideConnections() {
      connectionsLayer.selectAll('.connection-line').remove();
      
      // Remove highlighting from all player names
      namesLayer.selectAll('.player-name-group').each(function() {
        const group = d3.select(this);
        const playerName = group.attr('data-player-name');
        const playerData = data.find(p => p.name === playerName);
        
        if (playerData) {
          const playerCountry = playerData.country_provenance || playerData.national_team || 'Unknown';
          const playerColor = colorScale(playerCountry);
          
          group.select('.player-name')
            .style('font-weight', '500')
            .style('font-size', '14px')
            .style('opacity', 1)
            .style('fill', playerColor); // Restore original color
        }
        
        // Hide underline if not the currently hovered player
        if (hoveredPlayer === null || playerName !== hoveredPlayer.name) {
          group.select('line').style('opacity', 0);
        }
      });
    }

    // Add country color legend - position to the right of the visualization
    // Calculate right edge of visualization circle: centerX + playerNameRadius + padding
    const visualizationRightEdge = centerX + playerNameRadius + 20;
    const legendX = Math.max(visualizationRightEdge + 20, width - 200); // At least 20px from edge, or right side
    
    const legend = svg.append('g')
      .attr('class', 'country-legend')
      .attr('transform', `translate(${legendX}, 20)`);

    const legendTitle = legend.append('text')
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-color)')
      .text('Countries');

    const legendItems = legend.selectAll('.legend-item')
      .data(countries.slice(0, 10)) // Show first 10 countries
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
      .style('fill', 'var(--text-color)')
      .text(d => d);
  }
</script>

<div class="visualization-container">
  <div class="visualization-header">
    <h2>Player Network</h2>
    <p>Hover over a player's name to see connections with teammates. Hover over club dots to see club names. Colors represent countries. Outer rings show goals, clubs, and national team.</p>
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

  :global(.player-name:hover) {
    font-size: 14px !important;
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

    :global(.player-name) {
      font-size: 10px !important;
    }
  }
</style>

