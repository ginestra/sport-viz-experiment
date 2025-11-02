import * as d3 from 'd3';

/**
 * Load and parse family forest JSON data
 * @param {string} url - URL to JSON file
 * @returns {Promise<Object>} Parsed JSON data
 */
export async function loadFamilyData(url = '/data/family-tree.json') {
  try {
    const data = await d3.json(url);
    return data;
  } catch (error) {
    console.error('Error loading family data:', error);
    throw new Error('Failed to load family data');
  }
}

/**
 * Find root nodes (nodes without parents)
 * @param {Array} members - Array of family member objects
 * @returns {Array} Array of root member IDs
 */
export function findRoots(members) {
  const rootIds = [];
  members.forEach(member => {
    if (!member.relationships?.parent || member.relationships.parent.length === 0) {
      rootIds.push(member.id);
    }
  });
  return rootIds;
}

/**
 * Create a map of member ID to member object for quick lookup
 * @param {Array} members - Array of family member objects
 * @returns {Map} Map of ID to member object
 */
export function createMemberMap(members) {
  const memberMap = new Map();
  members.forEach(member => {
    memberMap.set(member.id, member);
  });
  return memberMap;
}

/**
 * Build D3 hierarchical tree structure from flat family data
 * @param {Array} members - Array of family member objects
 * @param {string} rootId - ID of root node (optional, will find if not provided)
 * @returns {Object} D3 tree data structure with nodes
 */
export function buildTreeStructure(members, rootId = null) {
  const memberMap = createMemberMap(members);
  
  // Find root if not provided
  if (!rootId) {
    const roots = findRoots(members);
    if (roots.length === 0) {
      throw new Error('No root node found in family forest');
    }
    // Use first root, or handle multiple roots
    rootId = roots[0];
  }

  // Helper function to build node recursively
  function buildNode(memberId, visited = new Set()) {
    if (visited.has(memberId)) {
      return null; // Prevent cycles
    }
    visited.add(memberId);

    const member = memberMap.get(memberId);
    if (!member) {
      return null;
    }

    const node = {
      data: member,
      id: member.id,
      children: []
    };

    // Add children from relationships
    if (member.relationships?.children && member.relationships.children.length > 0) {
      member.relationships.children.forEach(childId => {
        const childNode = buildNode(childId, new Set(visited));
        if (childNode) {
          node.children.push(childNode);
        }
      });
    }

    return node;
  }

  const rootNode = buildNode(rootId);
  if (!rootNode) {
    throw new Error('Failed to build tree structure');
  }

  return rootNode;
}

/**
 * Convert tree structure to D3 hierarchy format
 * @param {Object} treeNode - Tree node structure
 * @returns {d3.HierarchyNode} D3 hierarchy node
 */
export function toD3Hierarchy(treeNode) {
  return d3.hierarchy(treeNode, d => d.children);
}

/**
 * Get all links (edges) from tree structure
 * @param {d3.HierarchyNode} root - D3 hierarchy root node
 * @returns {Array} Array of link objects {source, target}
 */
export function getLinks(root) {
  const links = [];
  
  function traverse(node) {
    if (node.children) {
      node.children.forEach(child => {
        links.push({
          source: node,
          target: child,
          relationship: 'parent-child'
        });
        traverse(child);
      });
    }
  }

  traverse(root);
  return links;
}

/**
 * Get spouse links (horizontal connections) from family data
 * @param {Array} members - Array of family member objects
 * @param {Map} nodeMap - Map of member ID to D3 node
 * @returns {Array} Array of spouse link objects
 */
export function getSpouseLinks(members, nodeMap) {
  const spouseLinks = [];
  const processedPairs = new Set();

  members.forEach(member => {
    if (member.relationships?.spouse && member.relationships.spouse.length > 0) {
      member.relationships.spouse.forEach(spouseId => {
        // Create unique pair identifier
        const pairId = [member.id, spouseId].sort().join('-');
        
        if (!processedPairs.has(pairId)) {
          processedPairs.add(pairId);
          
          const sourceNode = nodeMap.get(member.id);
          const targetNode = nodeMap.get(spouseId);
          
          if (sourceNode && targetNode) {
            spouseLinks.push({
              source: sourceNode,
              target: targetNode,
              relationship: 'spouse'
            });
          }
        }
      });
    }
  });

  return spouseLinks;
}

/**
 * Format date string for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    return dateStr;
  }
}

/**
 * Format date range for places lived
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(startDate, endDate) {
  const start = startDate || '?';
  const end = endDate === 'present' ? 'present' : (endDate || '?');
  return `${start} - ${end}`;
}

/**
 * Build multiple tree structures for each root branch
 * @param {Array} members - Array of family member objects
 * @returns {Array} Array of tree structures, one for each root
 */
export function buildMultipleTrees(members) {
  const memberMap = createMemberMap(members);
  const roots = findRoots(members);
  
  if (roots.length === 0) {
    throw new Error('No root nodes found in family forest');
  }

  // Helper function to build node recursively
  function buildNode(memberId, visited = new Set()) {
    if (visited.has(memberId)) {
      return null; // Prevent cycles
    }
    visited.add(memberId);

    const member = memberMap.get(memberId);
    if (!member) {
      return null;
    }

    const node = {
      data: member,
      id: member.id,
      children: []
    };

    // Add children from relationships
    if (member.relationships?.children && member.relationships.children.length > 0) {
      member.relationships.children.forEach(childId => {
        const childNode = buildNode(childId, new Set(visited));
        if (childNode) {
          node.children.push(childNode);
        }
      });
    }

    return node;
  }

  // Build a tree for each root
  const trees = [];
  roots.forEach(rootId => {
    const tree = buildNode(rootId);
    if (tree) {
      trees.push({ rootId, tree });
    }
  });

  return trees;
}

/**
 * Build D3 hierarchical tree structures from all roots
 * @param {Array} members - Array of family member objects
 * @returns {Array} Array of D3 hierarchy roots
 */
export function buildAllTreeHierarchies(members) {
  const trees = buildMultipleTrees(members);
  return trees.map(({ rootId, tree }) => ({
    rootId,
    hierarchy: toD3Hierarchy(tree)
  }));
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return parts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

