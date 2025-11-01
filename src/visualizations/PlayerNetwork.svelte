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
  let selectedPlayer = null; // Selected player for filtering/highlighting
  let svg, g;
  let isMobile = false;
  let applySelectionStateFn = null; // Reference to selection function
  let careerTypeFilter = 'cumulative'; // 'cumulative', 'club', 'international'
  let selectedYear = null; // null = show all aggregated
  let dataLastUpdated = null; // Last update date for data
  let dataSources = [
    { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Women\'s_association_football' },
    { name: 'Transfermarkt', url: 'https://www.transfermarkt.com/wettbewerbe/frauen' },
    { name: 'FIFA', url: 'https://www.fifa.com/fifaplus/en/tournaments/womens/womensworldcup' }
  ]; // Data sources with links
  let playerInfoCard = null; // Selected player for info card

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
        career_appearances: +d.career_appearances || 0,
        club_goals: +d.club_goals || 0,
        club_assists: +d.club_assists || 0,
        club_appearances: +d.club_appearances || 0,
        international_goals: +d.international_goals || 0,
        international_assists: +d.international_assists || 0,
        international_appearances: +d.international_appearances || 0,
        clubs: clubs,
        national_team: d.national_team || d.country_provenance
      };
    });
  }
  
  // Helper function to get goals/assists based on career type filter
  function getFilteredGoals(player) {
    switch (careerTypeFilter) {
      case 'club':
        return player.club_goals || 0;
      case 'international':
        return player.international_goals || 0;
      default:
        return player.career_goals || 0;
    }
  }
  
  function getFilteredAssists(player) {
    switch (careerTypeFilter) {
      case 'club':
        return player.club_assists || 0;
      case 'international':
        return player.international_assists || 0;
      default:
        return player.career_assists || 0;
    }
  }
  
  function getFilteredAppearances(player) {
    switch (careerTypeFilter) {
      case 'club':
        return parseInt(player.club_appearances || player.career_appearances || 0);
      case 'international':
        return parseInt(player.international_appearances || 0);
      default:
        return parseInt(player.career_appearances || 0);
    }
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
            let overlap = !(pClub.endYear < oClub.startYear || oClub.endYear < pClub.startYear);
            
            // If year filter is active, also check if overlap includes that year
            if (selectedYear !== null && overlap) {
              overlap = selectedYear >= Math.max(pClub.startYear, oClub.startYear) && 
                        selectedYear <= Math.min(pClub.endYear, oClub.endYear);
            }
            
            if (overlap) {
              commonTeams.push(pClub.name);
            }
          }
        });
      });
      
      // Also check national team connection (always show, regardless of year filter for simplicity)
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
      
      // Try to get last updated date from CSV metadata or set to today
      // Check if there's a metadata row or use file modification time
      dataLastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
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
    // Apply selection state if a player is selected
    if (selectedPlayer && applySelectionStateFn) {
      setTimeout(() => applySelectionStateFn(), 0);
    }
  }
  
  // React to selection changes
  $: if (applySelectionStateFn && visualizationCreated) {
    applySelectionStateFn();
  }
  
  // Track previous filter values to detect changes
  let prevCareerTypeFilter = 'cumulative';
  let prevSelectedYear = null;
  
  // Track previous selection state to detect changes
  let prevSelectedPlayer = null;
  
  // React to selection changes - recreate visualization to resize (desktop only)
  // On mobile, we don't resize, just show/hide the canvas
  $: if (visualizationCreated && container && data.length > 0 && 
         selectedPlayer !== prevSelectedPlayer && !checkIsMobile()) {
    prevSelectedPlayer = selectedPlayer;
    visualizationCreated = false;
    setTimeout(() => {
      visualizationCreated = true;
      createVisualization();
      setupResizeObserver();
      if (selectedPlayer && applySelectionStateFn) {
        setTimeout(() => applySelectionStateFn(), 0);
      }
    }, 0);
  }
  
  // On mobile, just update selection state without recreating
  $: if (visualizationCreated && container && data.length > 0 && 
         selectedPlayer !== prevSelectedPlayer && checkIsMobile()) {
    prevSelectedPlayer = selectedPlayer;
    if (selectedPlayer && applySelectionStateFn) {
      setTimeout(() => applySelectionStateFn(), 0);
    }
  }
  
  // React to filter changes - recreate visualization
  $: if (visualizationCreated && container && data.length > 0 && 
         (careerTypeFilter !== prevCareerTypeFilter || selectedYear !== prevSelectedYear)) {
    prevCareerTypeFilter = careerTypeFilter;
    prevSelectedYear = selectedYear;
    visualizationCreated = false;
    setTimeout(() => {
      visualizationCreated = true;
      createVisualization();
      setupResizeObserver();
      if (selectedPlayer && applySelectionStateFn) {
        setTimeout(() => applySelectionStateFn(), 0);
      }
    }, 0);
  }

  function createVisualization() {
    if (!container || !data || !Array.isArray(data) || data.length === 0) {
      return;
    }

    d3.select(container).selectAll('*').remove();

    // Check if mobile
    isMobile = checkIsMobile();

    // Account for reduced container width when player is selected (60% of full width) - desktop only
    const containerWidth = container.clientWidth || 900;
    const effectiveWidth = (selectedPlayer && !isMobile) ? containerWidth * (1 / 0.6) : containerWidth;
    const size = Math.min(effectiveWidth - 40, isMobile ? 600 : 900);
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
      .style('height', 'auto')
      .on('click', function(event) {
        // Deselect if clicking on empty space (not on a player name)
        if (event.target === this || event.target.tagName === 'svg') {
          selectedPlayer = null;
          playerInfoCard = null;
          // Selection state will be applied via reactive statement
        }
      });

    g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    const tooltip = createTooltip();

    // NEW ORDER: Define radii for different rings (from inner to outer: network, player names, country, clubs, appearances, assists, goals)
    const radiusMultiplier = isMobile ? 0.9 : 1.0; // Slightly smaller on mobile
    const innerRadius = size * 0.08 * radiusMultiplier;  // Connection points (network - stays same)
    const connectionPointRadius = 3; // Radius of connection point circles
    const nameMarginFromCircle = 4; // Distance from circle edge to where text starts (in pixels)
    // Position text 4px away from the outer edge of connection circles
    const playerNameRadius = innerRadius + connectionPointRadius + nameMarginFromCircle;  // Player names (second layer)
    const nationalTeamRadius = size * 0.26 * radiusMultiplier;  // National team names (third layer) - reduced to give more space for hovered player names
    const clubsRadius = size * 0.35 * radiusMultiplier;  // Club dots (fourth layer) - reduced to prevent overlap with appearances
    const appearancesRadius = size * 0.425 * radiusMultiplier;  // Appearances count (fifth layer) - between clubs and assists
    const goalsRadius = size * 0.53 * radiusMultiplier;  // Goals count (outermost layer) - adjusted to maintain spacing
    const assistsRadius = (appearancesRadius + goalsRadius) / 2;  // Assists count (sixth layer) - exactly between appearances and goals

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
    
    // Appearances circle
    circlesLayer.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', appearancesRadius)
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
    const appearancesLayer = g.append('g').attr('class', 'appearances-layer');
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

    // Calculate min/max values for proper scaling of circles
    const appearancesValues = data.map(p => getFilteredAppearances(p)).filter(v => v > 0);
    const assistsValues = data.map(p => getFilteredAssists(p)).filter(v => v > 0);
    const goalsValues = data.map(p => getFilteredGoals(p)).filter(v => v > 0);
    
    const minAppearances = appearancesValues.length > 0 ? Math.min(...appearancesValues) : 0;
    const maxAppearances = appearancesValues.length > 0 ? Math.max(...appearancesValues) : 1;
    const minAssists = assistsValues.length > 0 ? Math.min(...assistsValues) : 0;
    const maxAssists = assistsValues.length > 0 ? Math.max(...assistsValues) : 1;
    const minGoals = goalsValues.length > 0 ? Math.min(...goalsValues) : 0;
    const maxGoals = goalsValues.length > 0 ? Math.max(...goalsValues) : 1;
    
    // Create scale functions (using square root for area proportionality)
    // Radius range: min 6px to max 20px for appearances, min 6px to max 18px for assists, min 8px to max 22px for goals
    const appearancesScale = d3.scaleSqrt()
      .domain([minAppearances, maxAppearances])
      .range([6, 20]);
    
    const assistsScale = d3.scaleSqrt()
      .domain([minAssists, maxAssists])
      .range([6, 18]);
    
    const goalsScale = d3.scaleSqrt()
      .domain([minGoals, maxGoals])
      .range([8, 22]);

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
        .attr('data-player-index', i)
        .attr('class', 'connection-point')
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
      const fontSize = '10px'; // Initial state: same size for mobile and desktop
      
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
          const hoverFontSize = '12px'; // Hover/selected: same size for mobile and desktop
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
        })
        .on('mouseleave', function() {
          hoveredPlayer = null;
          
          // Remove hovered marker
          nameGroup.attr('data-is-hovered', null);
          nameText.attr('data-is-hovered', null);
          
          hideConnections();
          
          // If player is selected, keep hover size; otherwise restore to initial size
          const shouldKeepHoverSize = selectedPlayer && selectedPlayer.name === player.name;
          const normalFontSize = shouldKeepHoverSize 
            ? '12px'  // Keep hover size if selected
            : '10px';   // Restore initial size if not selected
          
          nameText
            .style('font-weight', shouldKeepHoverSize ? 'bold' : '500')
            .style('font-size', normalFontSize)
            .attr('font-size', normalFontSize)
            .style('fill', playerColor);
          underline.style('opacity', shouldKeepHoverSize ? 1 : 0);
          
          // Unhighlight this player's data elements (but keep selection if selected)
          if (!selectedPlayer || selectedPlayer.name !== player.name) {
            unhighlightPlayerData(i);
          }
        })
        .on('click', function(event) {
          event.stopPropagation();
          
          // Toggle selection: if clicking the same player, deselect; otherwise select new player
          if (selectedPlayer && selectedPlayer.name === player.name) {
            selectedPlayer = null;
            playerInfoCard = null;
          } else {
            selectedPlayer = player;
            playerInfoCard = player; // Set player info for card display
          }
          // Selection state will be applied via reactive statement
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

      // Club dots (fourth layer) - filter by year if selected
      const filteredClubs = selectedYear !== null 
        ? player.clubs.filter(club => club.startYear && club.endYear && 
            selectedYear >= club.startYear && selectedYear <= club.endYear)
        : player.clubs;
      const numClubs = filteredClubs.length;
      if (numClubs > 0) {
        const perpendicularAngle = angle + Math.PI / 2;
        const offsetPerClub = 8;
        
        filteredClubs.forEach((club, clubIndex) => {
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

      // Appearances count (fifth layer) - between clubs and assists - use filtered value
      const appearancesX = Math.cos(angle - Math.PI / 2) * appearancesRadius;
      const appearancesY = Math.sin(angle - Math.PI / 2) * appearancesRadius;
      const filteredAppearances = getFilteredAppearances(player);
      
      const appearancesCircle = appearancesLayer.append('circle')
        .attr('cx', appearancesX)
        .attr('cy', appearancesY)
        .attr('r', filteredAppearances > 0 ? appearancesScale(filteredAppearances) : 6)
        .attr('data-player-index', i)
        .attr('class', 'appearances-circle')
        .style('fill', playerColor)
        .style('opacity', 0.5);
        
      const appearancesFontSize = isMobile ? '8px' : '10px';
      appearancesLayer.append('text')
        .attr('x', appearancesX)
        .attr('y', appearancesY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('data-player-index', i)
        .attr('class', 'appearances-text')
        .style('font-size', appearancesFontSize)
        .style('font-family', 'monospace')
        .style('font-weight', 'bold')
        .style('fill', 'var(--text-color)')
        .text(filteredAppearances || '0');

      // Assists count (sixth layer) - use filtered value
      const assistsX = Math.cos(angle - Math.PI / 2) * assistsRadius;
      const assistsY = Math.sin(angle - Math.PI / 2) * assistsRadius;
      const filteredAssists = getFilteredAssists(player);
      
      const assistsCircle = assistsLayer.append('circle')
        .attr('cx', assistsX)
        .attr('cy', assistsY)
        .attr('r', filteredAssists > 0 ? assistsScale(filteredAssists) : 6)
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
        .text(filteredAssists || '0');

      // Goals count (outermost layer) - use filtered value
      const goalsX = Math.cos(angle - Math.PI / 2) * goalsRadius;
      const goalsY = Math.sin(angle - Math.PI / 2) * goalsRadius;
      const filteredGoals = getFilteredGoals(player);
      
      const goalsCircle = goalsLayer.append('circle')
        .attr('cx', goalsX)
        .attr('cy', goalsY)
        .attr('r', filteredGoals > 0 ? goalsScale(filteredGoals) : 8)
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
        .text(filteredGoals);
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
      
      // Highlight appearances
      appearancesLayer.selectAll(`circle.appearances-circle[data-player-index="${playerIndex}"]`)
        .style('opacity', 0.8)
        .style('stroke', playerColor)
        .style('stroke-width', 2);
      appearancesLayer.selectAll(`text.appearances-text[data-player-index="${playerIndex}"]`)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '10px' : '12px');
      
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
      const player = data[playerIndex];
      const playerCountry = player?.country_provenance || player?.national_team || 'Unknown';
      const playerColor = colorScale(playerCountry);
      
      // Reset country
      nationalTeamLayer.selectAll(`text.country-text[data-player-index="${playerIndex}"]`)
        .style('fill', playerColor)
        .style('opacity', 0.8)
        .style('font-weight', '600')
        .style('font-size', isMobile ? '10px' : '12px');
      
      // Reset clubs
      clubsLayer.selectAll(`circle.club-dot[data-player-index="${playerIndex}"]`)
        .attr('r', 5)
        .style('fill', playerColor)
        .style('opacity', 0.8)
        .style('stroke-width', 1);
      
      // Reset appearances
      appearancesLayer.selectAll(`circle.appearances-circle[data-player-index="${playerIndex}"]`)
        .style('fill', playerColor)
        .style('opacity', 0.5)
        .style('stroke', 'none')
        .style('stroke-width', 0);
      appearancesLayer.selectAll(`text.appearances-text[data-player-index="${playerIndex}"]`)
        .style('fill', 'var(--text-color)')
        .style('opacity', 1)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '8px' : '10px');
      
      // Reset assists
      assistsLayer.selectAll(`circle.assists-circle[data-player-index="${playerIndex}"]`)
        .style('fill', playerColor)
        .style('opacity', 0.5)
        .style('stroke', 'none')
        .style('stroke-width', 0);
      assistsLayer.selectAll(`text.assists-text[data-player-index="${playerIndex}"]`)
        .style('fill', 'var(--text-color)')
        .style('opacity', 1)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '8px' : '10px');
      
      // Reset goals
      goalsLayer.selectAll(`circle.goals-circle[data-player-index="${playerIndex}"]`)
        .style('fill', playerColor)
        .style('opacity', 0.6)
        .style('stroke', 'none')
        .style('stroke-width', 0);
      goalsLayer.selectAll(`text.goals-text[data-player-index="${playerIndex}"]`)
        .style('fill', 'var(--text-color)')
        .style('opacity', 1)
        .style('font-weight', 'bold')
        .style('font-size', isMobile ? '9px' : '11px');
      
      // Reset connection point
      g.selectAll(`circle.connection-point[data-player-index="${playerIndex}"]`)
        .style('fill', playerColor)
        .style('opacity', 0.6);
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
            // Connected players font size (slightly bigger than initial, but smaller than hovered)
            const connectedFontSize = '11px'; // Connected: same size for mobile and desktop
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

    // Helper function to convert color to greyscale
    function toGrayscale(color) {
      if (typeof color === 'string' && color.startsWith('var(')) {
        return '#808080'; // Default grey for CSS variables
      }
      const rgb = d3.rgb(color);
      // Convert to greyscale using luminance formula
      const gray = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      return d3.rgb(gray, gray, gray).toString();
    }

    function applySelectionState() {
      if (!selectedPlayer) {
        // No selection: show everything normally
        data.forEach((player, i) => {
          const playerCountry = player.country_provenance || player.national_team || 'Unknown';
          const playerColor = colorScale(playerCountry);
          
          // Reset player name
          const nameGroup = namesLayer.select(`[data-player-name="${player.name}"]`);
          if (!nameGroup.empty()) {
            const nameText = nameGroup.select('.player-name');
            if (!nameText.empty()) {
              const normalFontSize = '10px'; // Initial state
              nameText
                .style('font-weight', '500')
                .style('font-size', normalFontSize)
                .attr('font-size', normalFontSize)
                .style('fill', playerColor)
                .style('opacity', 1);
            }
          }
          
          // Reset connections (will be done outside loop to avoid duplicates)
          
          // Reset data elements
          unhighlightPlayerData(i);
        });
        
        // Reset all connections to normal state
        allConnections.forEach(conn => {
          conn.path
            .style('stroke', 'var(--viz-connection-color)')
            .style('stroke-width', 1)
            .style('opacity', 0.15);
        });
        
        return;
      }

      // Get selected player's connections
      const selectedConnections = findConnections(selectedPlayer, data);
      const connectedPlayerNames = new Set([selectedPlayer.name]);
      selectedConnections.forEach(conn => {
        connectedPlayerNames.add(conn.player.name);
      });

      // Apply greyscale and reduced opacity to non-connected players
      data.forEach((player, i) => {
        const playerCountry = player.country_provenance || player.national_team || 'Unknown';
        const playerColor = colorScale(playerCountry);
        const isConnected = connectedPlayerNames.has(player.name);
        
        if (isConnected) {
          // Keep full color and opacity for selected player and connections
          const nameGroup = namesLayer.select(`[data-player-name="${player.name}"]`);
          if (!nameGroup.empty()) {
            const nameText = nameGroup.select('.player-name');
            if (!nameText.empty()) {
              // Selected player gets hover size, connected players get medium size
              const isSelected = player.name === selectedPlayer.name;
              const fontSize = isSelected 
                ? '12px'  // Selected player: hover size
                : '11px';  // Connected players: medium size
              nameText
                .style('font-size', fontSize)
                .attr('font-size', fontSize)
                .style('font-weight', isSelected ? 'bold' : 'bold')
                .style('fill', playerColor)
                .style('opacity', 1);
            }
          }
          
          // Highlight connections
          allConnections.forEach(conn => {
            if ((conn.player1 === player.name && connectedPlayerNames.has(conn.player2)) ||
                (conn.player2 === player.name && connectedPlayerNames.has(conn.player1))) {
              const connColor = conn.player1 === selectedPlayer.name || conn.player2 === selectedPlayer.name 
                ? playerColor 
                : colorScale(data.find(p => p.name === (conn.player1 === player.name ? conn.player2 : conn.player1))?.country_provenance || 'Unknown');
              conn.path
                .style('stroke', connColor)
                .style('stroke-width', 2)
                .style('opacity', 0.6);
            }
          });
          
          // Highlight data elements for selected player
          if (player.name === selectedPlayer.name) {
            highlightPlayerData(i, playerColor);
          }
        } else {
          // Grey out non-connected players
          const grayColor = toGrayscale(playerColor);
          const reducedOpacity = 0.25;
          
          const nameGroup = namesLayer.select(`[data-player-name="${player.name}"]`);
          if (!nameGroup.empty()) {
            const nameText = nameGroup.select('.player-name');
            if (!nameText.empty()) {
              nameText
                .style('fill', grayColor)
                .style('opacity', reducedOpacity);
            }
            const underline = nameGroup.select('line');
            if (!underline.empty()) {
              underline.style('opacity', 0);
            }
          }
          
          // Grey out connections
          allConnections.forEach(conn => {
            if (conn.player1 === player.name || conn.player2 === player.name) {
              conn.path
                .style('stroke', grayColor)
                .style('stroke-width', 1)
                .style('opacity', reducedOpacity * 0.6);
            }
          });
          
          // Grey out data elements
          nationalTeamLayer.selectAll(`text.country-text[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          
          clubsLayer.selectAll(`circle.club-dot[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          
          appearancesLayer.selectAll(`circle.appearances-circle[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          appearancesLayer.selectAll(`text.appearances-text[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          
          assistsLayer.selectAll(`circle.assists-circle[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          assistsLayer.selectAll(`text.assists-text[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          
          goalsLayer.selectAll(`circle.goals-circle[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          goalsLayer.selectAll(`text.goals-text[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
          
          // Grey out connection point
          g.selectAll(`circle.connection-point[data-player-index="${i}"]`)
            .style('fill', grayColor)
            .style('opacity', reducedOpacity);
        }
      });
    }
    
    // Store reference to function for external access
    applySelectionStateFn = applySelectionState;

    function hideConnections() {
      // Reset all connections back to light color (but respect selection)
      if (selectedPlayer) {
        applySelectionState(); // Reapply selection state
        return;
      }
      
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
          const resetFontSize = '10px'; // Initial state
          
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
      { radius: appearancesRadius, path: 'M48 195.8l209.2 86.1c9.8 4 20.2 6.1 30.8 6.1s21-2.1 30.8-6.1l242.4-99.8c9-3.7 14.8-12.4 14.8-22.1s-5.8-18.4-14.8-22.1L318.8 38.1C309 34.1 298.6 32 288 32s-21 2.1-30.8 6.1L14.8 137.9C5.8 141.6 0 150.3 0 160L0 456c0 13.3 10.7 24 24 24s24-10.7 24-24l0-260.2zm48 71.7L96 384c0 53 86 96 192 96s192-43 192-96l0-116.6-142.9 58.9c-15.6 6.4-32.2 9.7-49.1 9.7s-33.5-3.3-49.1-9.7L96 267.4z', viewBox: '0 0 576 512', label: 'Appearances' },
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
      
      const iconSize = isMobile ? 14 : 18;
      
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
  }
</script>

<div class="visualization-container">
  <div class="visualization-header">
    <h2>Player Network</h2>
    <p>Hover over a player's name to see connections with teammates. Click to highlight a player's network. Hover over club dots to see club names. Colors represent countries. Outer rings show goals, assists, clubs, and nationality.</p>
    
    <p class="attribution">Visualization style inspired by <a href="https://yanouski.com/projects/xfiles-writers/" target="_blank" rel="noopener noreferrer">X-Files Writers Network</a>.</p>
    
    <div class="filters-container">
      <div class="filter-group">
        <label for="career-type-filter">Career Type:</label>
        <select id="career-type-filter" bind:value={careerTypeFilter}>
          <option value="cumulative">Cumulative</option>
          <option value="club">Club Career</option>
          <option value="international">International Career</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="year-filter">Year:</label>
        <select id="year-filter" bind:value={selectedYear}>
          <option value={null}>All Years</option>
          {#each Array.from({length: new Date().getFullYear() - 2000 + 1}, (_, i) => 2000 + i).reverse() as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="loading">Loading data...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="visualization-wrapper" class:has-selection={selectedPlayer}>
      <div class="chart-container" bind:this={container}>
      </div>
      
      <div class="player-canvas" class:visible={playerInfoCard}>
        <div class="player-canvas-content">
          <button class="close-btn" on:click={() => { selectedPlayer = null; playerInfoCard = null; }} aria-label="Close">×</button>
          {#if playerInfoCard}
            <h3>{playerInfoCard.name}</h3>
            <div class="player-info-details">
              <p><strong>National Team:</strong> {playerInfoCard.national_team}</p>
              <p><strong>Career Goals:</strong> {playerInfoCard.career_goals}</p>
              <p><strong>Career Assists:</strong> {playerInfoCard.career_assists || 0}</p>
              <p><strong>Career Appearances:</strong> {playerInfoCard.career_appearances || 0}</p>
              <p><strong>Club Goals:</strong> {playerInfoCard.club_goals || 0}</p>
              <p><strong>Club Assists:</strong> {playerInfoCard.club_assists || 0}</p>
              <p><strong>Club Appearances:</strong> {playerInfoCard.club_appearances || 0}</p>
              <p><strong>International Goals:</strong> {playerInfoCard.international_goals || 0}</p>
              <p><strong>International Assists:</strong> {playerInfoCard.international_assists || 0}</p>
              <p><strong>International Appearances:</strong> {playerInfoCard.international_appearances || 0}</p>
              <p><strong>Clubs:</strong> {playerInfoCard.clubs.map(c => c.name + (c.startYear && c.endYear ? ` (${c.startYear}-${c.endYear})` : '')).join(', ')}</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="data-attribution">
      {#if dataLastUpdated}
        <p class="data-date">Data current as of: <strong>{dataLastUpdated}</strong></p>
      {/if}
      {#if dataSources && dataSources.length > 0}
        <p class="data-source">
          Data sources: 
          {#each dataSources as source, index}
            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>{index < dataSources.length - 1 ? ', ' : ''}
          {/each}
        </p>
      {/if}
    </div>
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

  .filters-container {
    display: flex;
    gap: 1.5rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.9rem;
    color: var(--text-color);
    font-weight: 500;
  }

  .filter-group select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--viz-stroke-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-color);
    font-size: 0.9rem;
    cursor: pointer;
    font-family: monospace;
  }

  .filter-group select:hover {
    border-color: var(--primary-color);
  }

  .filter-group select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 0, 123, 255), 0.2);
  }

  .data-attribution p {
    margin: 0.25rem 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: inline;
    margin-right: 1rem;
  }

  .data-attribution p:last-child {
    margin-right: 0;
  }

  .data-attribution a {
    color: var(--primary-color);
    text-decoration: underline;
  }

  .data-attribution a:hover {
    opacity: 0.8;
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

  .visualization-wrapper {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visualization-wrapper.has-selection {
    flex-direction: row;
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
    position: relative;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 1;
  }

  .visualization-wrapper.has-selection .chart-container {
    width: 60%;
    flex-shrink: 0;
    min-height: 500px;
  }

  .player-canvas {
    flex-shrink: 0;
    width: 0;
    opacity: 0;
    overflow: hidden;
    background: var(--bg-primary);
    border: 1px solid var(--viz-stroke-color);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(100%);
    max-height: none;
  }

  .player-canvas.visible {
    width: 38%;
    opacity: 1;
    transform: translateX(0);
    max-height: none;
    flex-shrink: 0;
  }

  .player-canvas-content {
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
  }

  .player-canvas-content h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
    border-bottom: 2px solid var(--viz-stroke-color);
    padding-bottom: 0.75rem;
  }

  .player-info-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .player-info-details p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-color);
    line-height: 1.5;
  }

  .player-info-details strong {
    color: var(--text-secondary);
    margin-right: 0.5rem;
    font-weight: 600;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    font-size: 1.75rem;
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
    background: var(--bg-secondary);
    color: var(--text-color);
  }

  .data-attribution {
    margin-top: 1rem;
    padding-top: 1rem;
    text-align: center;
    opacity: 0.7;
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

    .visualization-wrapper {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
      width: 100%;
    }

    .visualization-wrapper.has-selection {
      flex-direction: column; /* Keep column on mobile even with selection */
    }

    .visualization-wrapper.has-selection .chart-container {
      width: 100%;
      flex-shrink: 0;
      min-height: 400px;
      height: auto;
    }

    .chart-container {
      padding: 1rem;
      min-height: 400px;
      transition: none; /* Disable transitions on mobile to prevent collapse */
      width: 100%;
      flex-shrink: 0;
      height: auto;
    }

    .player-canvas {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      order: -1; /* Place canvas before chart on mobile */
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transform: none !important; /* Override desktop translateX */
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative !important; /* Ensure it's in normal flow */
      flex-shrink: 0 !important; /* Prevent collapsing */
      flex-grow: 0; /* Don't grow */
      box-sizing: border-box;
    }

    .player-canvas.visible {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      max-height: 600px;
      opacity: 1;
      transform: none !important; /* Override desktop translateX */
      margin-bottom: 0;
      position: relative !important; /* Ensure it's in normal flow */
      flex-shrink: 0 !important; /* Prevent collapsing */
      flex-grow: 0; /* Don't grow */
      box-sizing: border-box;
    }
    
    .player-canvas-content {
      min-width: 0; /* Prevent content from forcing width */
      white-space: normal; /* Allow text to wrap */
      width: 100%;
      box-sizing: border-box;
    }
  }
</style>

