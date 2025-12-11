/**
 * Event Handlers Module
 * Centralized event delegation and click handling
 */

import { stateManager } from './state-manager.js';
import { loadContentForEditing } from './content-editor.js';
import { findNodeById } from './tree-renderer.js';
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
    importDocument,
    downloadVersionedDocument
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
    // Document tree elements
    if (elementId.startsWith('T-')) {
        const nodeId = elementId.substring(2); // Remove 'T-' prefix
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

        console.log('All event handlers initialized successfully');

    } catch (error) {
        console.error('Error initializing event handlers:', error);
    }
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
