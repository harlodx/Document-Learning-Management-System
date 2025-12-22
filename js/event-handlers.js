/**
 * Event Handlers Module
 * Centralized event delegation and click handling
 */

import { stateManager } from './state-manager.js';
import { loadContentForEditing } from './content-editor.js';
import { findNodeById, markNodeCollapsed, markNodeExpanded } from './tree-renderer.js';
import { 
    viewRevision, 
    revertDocument, 
    toggleDetails, 
    toggleRevisionList 
} from './revision-manager.js';
import {
    saveDocument,
    commitDocument,
    unlockDocument,
    createNewDocument,
    importDocument,
    downloadVersionedDocument,
    deleteNode
} from './data-operations.js';

/**
 * Registers a tree element click and loads its content
 * @param {string} nodeId - The ID of the clicked node
 */
export function handleTreeElementClick(nodeId) {
    if (!nodeId) {
        console.warn('No node ID provided for tree element click');
        return;
    }

    try {
        const documentStructure = stateManager.getDocumentStructure();
        const foundNode = findNodeById(documentStructure, nodeId);

        if (!foundNode) {
            console.error(`Node with ID ${nodeId} not found`);
            return;
        }

        console.log(`Loading content for node: ${nodeId}`);
        loadContentForEditing(foundNode);

    } catch (error) {
        console.error(`Error handling tree element click for ${nodeId}:`, error);
    }
}

/**
 * Toggles collapse/expand state for a node's children
 * @param {string} nodeId - The ID of the node to toggle
 */
export function toggleNodeCollapse(nodeId) {
    if (!nodeId) {
        console.warn('No node ID provided for collapse toggle');
        return;
    }

    try {
        // Find the node's child UL element
        const nodeElement = document.getElementById(`T-${nodeId}`);
        if (!nodeElement) {
            console.error(`Node element not found for ID: ${nodeId}`);
            return;
        }

        // Find the parent LI element
        const liElement = nodeElement.closest('li');
        if (!liElement) {
            console.error(`Parent LI element not found for node: ${nodeId}`);
            return;
        }

        // Find the child UL (nested list)
        const childUl = liElement.querySelector(':scope > ul');
        if (!childUl) {
            console.warn(`No child nodes found for node: ${nodeId}`);
            return;
        }

        // Find the collapse button
        const collapseBtn = document.getElementById(`collapse-node-${nodeId}`);
        if (!collapseBtn) {
            console.error(`Collapse button not found for node: ${nodeId}`);
            return;
        }

        // Toggle collapsed state
        const isCurrentlyCollapsed = collapseBtn.getAttribute('data-collapsed') === 'true';
        
        // Remove any existing collapsed indicator
        const existingIndicator = liElement.querySelector('.collapsed-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        if (isCurrentlyCollapsed) {
            // Expand
            childUl.style.display = '';
            collapseBtn.innerHTML = '&#9660;'; // Down arrow
            collapseBtn.setAttribute('data-collapsed', 'false');
            collapseBtn.title = 'Collapse subnodes';
            liElement.classList.remove('collapsed-with-children');
            markNodeExpanded(nodeId);
        } else {
            // Collapse
            childUl.style.display = 'none';
            collapseBtn.innerHTML = '&#9658;'; // Right arrow
            collapseBtn.setAttribute('data-collapsed', 'true');
            collapseBtn.title = 'Expand subnodes';
            liElement.classList.add('collapsed-with-children');
            markNodeCollapsed(nodeId);
            
            // Count direct children
            const directChildren = childUl.querySelectorAll(':scope > li').length;
            
            // Count total descendants recursively
            const totalDescendants = childUl.querySelectorAll('li').length;
            
            // Create and add collapsed indicator
            const indicator = document.createElement('div');
            indicator.className = 'collapsed-indicator';
            indicator.textContent = `${directChildren} subnode${directChildren !== 1 ? 's' : ''} collapsed (${totalDescendants} total)`;
            
            // Insert after the section link but before the child UL
            const sectionLink = liElement.querySelector('.section-link');
            if (sectionLink) {
                sectionLink.insertAdjacentElement('afterend', indicator);
            }
        }

        console.log(`Toggled collapse for node ${nodeId}: ${!isCurrentlyCollapsed ? 'collapsed' : 'expanded'}`);

    } catch (error) {
        console.error(`Error toggling collapse for node ${nodeId}:`, error);
    }
}

/**
 * Initializes dynamic click handler with event delegation
 * @param {string} parentId - The ID of the static parent container
 * @param {string} targetClass - The class shared by dynamic children
 */
export function initializeDynamicClickHandler(parentId, targetClass) {
    const parentElement = document.getElementById(parentId);

    if (!parentElement) {
        console.error(`Parent element with ID '${parentId}' not found`);
        return;
    }

    // Remove existing listener if any (prevent duplicates)
    const existingListener = parentElement._clickHandler;
    if (existingListener) {
        parentElement.removeEventListener('click', existingListener);
    }

    // Create new listener
    const clickHandler = (event) => {
        handleDynamicClick(event, targetClass);
    };

    // Store reference for cleanup
    parentElement._clickHandler = clickHandler;
    parentElement.addEventListener('click', clickHandler);

    console.log(`Dynamic click handler initialized on #${parentId}`);
}

/**
 * Handles clicks on dynamic elements with routing logic
 * @private
 * @param {Event} event - The click event
 * @param {string} targetClass - The class to match
 */
function handleDynamicClick(event, targetClass) {
    // Find the clicked element or its parent with the target class
    const clickedElement = event.target.closest(`.${targetClass}`);

    if (!clickedElement) {
        return;
    }

    const elementId = clickedElement.id;

    if (!elementId) {
        return;
    }

    try {
        // Route to appropriate handler based on ID pattern
        routeClickEvent(elementId);

    } catch (error) {
        console.error(`Error handling click on ${elementId}:`, error);
    }
}

/**
 * Routes click events to appropriate handlers based on element ID
 * @private
 * @param {string} elementId - The ID of the clicked element
 */
function routeClickEvent(elementId) {
    console.log('routeClickEvent called with:', elementId);
    
    // Collapse/expand node buttons
    if (elementId.startsWith('collapse-node-')) {
        const nodeId = elementId.substring(14); // Remove 'collapse-node-' prefix
        console.log('Calling toggleNodeCollapse for:', nodeId);
        toggleNodeCollapse(nodeId);
        return;
    }
    
    // Delete node buttons (check first before tree elements)
    if (elementId.startsWith('delete-node-')) {
        const nodeId = elementId.substring(12); // Remove 'delete-node-' prefix
        console.log('Calling deleteNode for:', nodeId);
        deleteNode(nodeId);
        return;
    }

    // Delete content buttons (handled inline in content-editor.js)
    if (elementId.startsWith('delete-content-')) {
        // Content deletion is handled by inline onclick in content-editor.js
        return;
    }

    // Document tree elements
    if (elementId.startsWith('T-')) {
        const nodeId = elementId.substring(2); // Remove 'T-' prefix
        console.log('Calling handleTreeElementClick for:', nodeId);
        handleTreeElementClick(nodeId);
        return;
    }

    // Revision view buttons
    if (elementId.startsWith('view-revision-')) {
        const revisionId = extractIdSuffix(elementId, 'view-revision-');
        viewRevision(revisionId);
        return;
    }

    // Revision revert buttons
    if (elementId.startsWith('revert-to-document-')) {
        const revisionId = extractIdSuffix(elementId, 'revert-to-document-');
        revertDocument(revisionId);
        return;
    }

    // Handle specific button IDs
    handleSpecificButtons(elementId);
}

/**
 * Handles clicks on specific named buttons
 * @private
 * @param {string} elementId - The button element ID
 */
function handleSpecificButtons(elementId) {
    const handlers = {
        'toggleDetails': toggleDetails,
        'toggleRevisionList': toggleRevisionList,
        'unlockDocument': () => unlockDocument(),
        'saveDocument': () => {
            const result = saveDocument();
            if (result && result.success) {
                console.log('Document saved manually. Uncommitted:', result.uncommittedChanges);
            }
        },
        'commitDocument': () => commitDocument(),
        'new-document-btn': () => createNewDocument(),
        'importDocument': importDocument,
        'downloadDocument': () => downloadVersionedDocument(),
        'exportDocument': () => downloadVersionedDocument()
    };

    const handler = handlers[elementId];
    
    if (handler) {
        try {
            handler();
        } catch (error) {
            console.error(`Error executing handler for ${elementId}:`, error);
        }
    }
}

/**
 * Extracts the ID suffix after a prefix
 * @private
 * @param {string} fullId - The full element ID
 * @param {string} prefix - The prefix to remove
 * @returns {string} The extracted suffix
 */
function extractIdSuffix(fullId, prefix) {
    const lastHyphenIndex = fullId.lastIndexOf('-');
    if (lastHyphenIndex !== -1) {
        return fullId.substring(lastHyphenIndex + 1);
    }
    return fullId.substring(prefix.length);
}

/**
 * Initializes all event handlers for the application
 */
export function initializeAllEventHandlers() {
    try {
        // Initialize dynamic click handler
        initializeDynamicClickHandler('dynamic-container', 'dynamic-item');
        
        // Add additional handler for index panel to ensure click-to-load works
        // when panel is fixed position
        initializeIndexPanelClickHandler();

        console.log('All event handlers initialized successfully');

    } catch (error) {
        console.error('Error initializing event handlers:', error);
    }
}

/**
 * Initialize click handler specifically for index panel
 * Ensures click-to-load functionality works with fixed positioning
 */
function initializeIndexPanelClickHandler() {
    const indexPanel = document.getElementById('index-panel');
    
    if (!indexPanel) {
        console.warn('Index panel not found for click handler initialization');
        return;
    }
    
    // Remove existing listener if any
    if (indexPanel._indexClickHandler) {
        indexPanel.removeEventListener('click', indexPanel._indexClickHandler);
    }
    
    // Create click handler for index panel
    const clickHandler = (event) => {
        // Find if clicked element or parent is a dynamic-item
        const dynamicItem = event.target.closest('.dynamic-item');
        
        if (!dynamicItem || !dynamicItem.id) {
            return;
        }
        
        try {
            routeClickEvent(dynamicItem.id);
        } catch (error) {
            console.error(`Error handling index panel click on ${dynamicItem.id}:`, error);
        }
    };
    
    indexPanel._indexClickHandler = clickHandler;
    indexPanel.addEventListener('click', clickHandler);
    
    console.log('Index panel click handler initialized');
}

/**
 * Cleanup function to remove all event listeners
 * @param {string} parentId - The ID of the parent container
 */
export function cleanupEventHandlers(parentId) {
    try {
        const parentElement = document.getElementById(parentId);
        
        if (parentElement && parentElement._clickHandler) {
            parentElement.removeEventListener('click', parentElement._clickHandler);
            delete parentElement._clickHandler;
        }

    } catch (error) {
        console.error('Error cleaning up event handlers:', error);
    }
}
