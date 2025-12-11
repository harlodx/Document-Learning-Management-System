/*
// =========================================================================
// SEARCH MANAGER MODULE
// Handles search/filter functionality for document tree and junk items
// =========================================================================
*/

import { stateManager } from './state-manager.js';
import { renderDocumentStructure } from './tree-renderer.js';
import { renderJunkItems } from './junk-manager.js';

let indexSearchTerm = '';
let junkSearchTerm = '';

/**
 * Initialize search functionality
 */
export function initializeSearch() {
    const indexSearchInput = document.getElementById('index-search');
    const junkSearchInput = document.getElementById('junk-search');
    
    if (indexSearchInput) {
        indexSearchInput.addEventListener('input', (e) => {
            indexSearchTerm = e.target.value.toLowerCase().trim();
            filterAndRenderDocumentTree();
        });
    }
    
    if (junkSearchInput) {
        junkSearchInput.addEventListener('input', (e) => {
            junkSearchTerm = e.target.value.toLowerCase().trim();
            filterAndRenderJunkItems();
        });
    }
    
    // Subscribe to structure changes to re-apply filters
    stateManager.subscribe('documentStructureChanged', () => {
        if (indexSearchTerm) {
            filterAndRenderDocumentTree();
        }
    });
    
    stateManager.subscribe('junkItemsChanged', () => {
        if (junkSearchTerm) {
            filterAndRenderJunkItems();
        }
    });
}

/**
 * Filter and render the document tree based on search term
 */
function filterAndRenderDocumentTree() {
    const documentStructure = stateManager.getDocumentStructure();
    
    if (!indexSearchTerm) {
        // No search term, show all
        renderDocumentStructure(documentStructure);
        return;
    }
    
    // Filter the tree
    const filteredStructure = filterNodes(documentStructure, indexSearchTerm);
    renderDocumentStructure(filteredStructure);
}

/**
 * Filter and render junk items based on search term
 */
function filterAndRenderJunkItems() {
    const junkItems = stateManager.getJunkItems();
    
    if (!junkSearchTerm) {
        // No search term, show all
        renderJunkItems();
        return;
    }
    
    // Filter junk items
    const filteredJunk = junkItems.filter(item => matchesSearchTerm(item, junkSearchTerm));
    
    // Temporarily replace junk items with filtered list for rendering
    const originalJunk = stateManager.getJunkItems();
    stateManager.setJunkItems(filteredJunk);
    renderJunkItems();
    stateManager.setJunkItems(originalJunk);
}

/**
 * Recursively filter nodes based on search term
 * Returns nodes that match or have matching descendants
 */
function filterNodes(nodes, searchTerm) {
    if (!nodes || !Array.isArray(nodes)) return [];
    
    const filtered = [];
    
    for (const node of nodes) {
        // Check if current node matches
        const nodeMatches = matchesSearchTerm(node, searchTerm);
        
        // Recursively filter children
        let filteredChildren = [];
        if (node.children && node.children.length > 0) {
            filteredChildren = filterNodes(node.children, searchTerm);
        }
        
        // Include node if it matches OR has matching descendants
        if (nodeMatches || filteredChildren.length > 0) {
            const nodeCopy = { ...node };
            if (filteredChildren.length > 0) {
                nodeCopy.children = filteredChildren;
            }
            filtered.push(nodeCopy);
        }
    }
    
    return filtered;
}

/**
 * Check if a node matches the search term
 * Searches in title/name and content
 */
function matchesSearchTerm(node, searchTerm) {
    if (!node || !searchTerm) return false;
    
    // Search in title/name
    const title = (node.title || node.name || '').toLowerCase();
    if (title.includes(searchTerm)) {
        return true;
    }
    
    // Search in content
    if (node.content) {
        let contentText = '';
        
        if (Array.isArray(node.content)) {
            contentText = node.content.join(' ').toLowerCase();
        } else if (typeof node.content === 'string') {
            contentText = node.content.toLowerCase();
        }
        
        if (contentText.includes(searchTerm)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Clear search filters
 */
export function clearSearchFilters() {
    const indexSearchInput = document.getElementById('index-search');
    const junkSearchInput = document.getElementById('junk-search');
    
    if (indexSearchInput) {
        indexSearchInput.value = '';
        indexSearchTerm = '';
    }
    
    if (junkSearchInput) {
        junkSearchInput.value = '';
        junkSearchTerm = '';
    }
    
    // Re-render with full data
    const documentStructure = stateManager.getDocumentStructure();
    renderDocumentStructure(documentStructure);
    renderJunkItems();
}

/**
 * Get current search terms
 */
export function getSearchTerms() {
    return {
        index: indexSearchTerm,
        junk: junkSearchTerm
    };
}
