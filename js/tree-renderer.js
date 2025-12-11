/**
 * Tree Renderer Module
 * Renders hierarchical document structure as nested HTML lists
 */

import DocumentNode from './documentnode.js';

/**
 * Renders the complete document structure into the DOM
 * @param {DocumentNode[]} documentStructure - Array of root document nodes
 * @param {string} containerId - ID of the container element (default: 'document-structure-container')
 * @throws {Error} If container element is not found
 */
export function renderDocumentStructure(documentStructure, containerId = 'document-structure-container') {
    const container = document.getElementById(containerId);
    
    if (!container) {
        throw new Error(`Container element '${containerId}' not found in DOM`);
    }

    if (!Array.isArray(documentStructure)) {
        console.error('Invalid document structure:', documentStructure);
        container.innerHTML = '<div class="error-message">Invalid document structure</div>';
        return;
    }

    try {
        // Clear existing content
        container.innerHTML = '';

        if (documentStructure.length === 0) {
            container.innerHTML = '<div class="empty-message">No documents to display</div>';
            return;
        }

        // Build the nested list
        buildNestedList(documentStructure, container);
        
    } catch (error) {
        console.error('Error rendering document structure:', error);
        container.innerHTML = `<div class="error-message">Failed to render document: ${error.message}</div>`;
        throw error;
    }
}

/**
 * Recursively builds nested HTML list structure from document nodes
 * @param {DocumentNode[]} nodes - Array of DocumentNode to render
 * @param {HTMLElement} parentElement - The DOM element to append the list to
 * @throws {Error} If nodes array is invalid
 */
export function buildNestedList(nodes, parentElement) {
    if (!Array.isArray(nodes)) {
        throw new Error('nodes must be an array');
    }

    if (!parentElement || !(parentElement instanceof HTMLElement)) {
        throw new Error('parentElement must be a valid HTML element');
    }

    try {
        // Create list container
        const orderedList = document.createElement('ul');

        // Sort nodes by order property
        const sortedNodes = [...nodes].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : 0;
            const orderB = b.order !== undefined ? b.order : 0;
            return orderA - orderB;
        });

        // Create list items for each node
        sortedNodes.forEach(node => {
            try {
                const listItem = createListItem(node);
                orderedList.appendChild(listItem);
            } catch (error) {
                console.error(`Error creating list item for node ${node.id}:`, error);
                // Continue with other nodes
            }
        });

        parentElement.appendChild(orderedList);

    } catch (error) {
        console.error('Error building nested list:', error);
        throw error;
    }
}

/**
 * Creates a single list item for a document node
 * @private
 * @param {DocumentNode} node - The document node to create an item for
 * @returns {HTMLElement} The created list item element
 */
function createListItem(node) {
    if (!node || !node.id) {
        throw new Error('Invalid node: missing id');
    }

    const listItem = document.createElement('li');
    listItem.classList.add('list-container');
    listItem.setAttribute('draggable', 'true');

    // Create the section link
    const sectionLink = createSectionLink(node);
    listItem.appendChild(sectionLink);

    // Recursively add children if they exist
    if (node.children?.length > 0) {
        buildNestedList(node.children, listItem);
    }

    return listItem;
}

/**
 * Creates the clickable section link element
 * @private
 * @param {DocumentNode} node - The document node
 * @returns {HTMLElement} The section link element
 */
function createSectionLink(node) {
    const sectionLink = document.createElement('a');
    sectionLink.setAttribute('id', `T-${node.id}`);
    sectionLink.classList.add('section-link', 'dynamic-item');
    sectionLink.setAttribute('clickable', 'true');

    // Create left block (ID display)
    const leftText = document.createElement('div');
    const lastHyphenIndex = node.id.lastIndexOf('-');
    leftText.textContent = lastHyphenIndex !== -1 
        ? node.id.substring(lastHyphenIndex + 1) 
        : node.id;
    leftText.classList.add('left-block');

    // Create right block (Name display)
    const rightText = document.createElement('div');
    rightText.textContent = node.name || 'Untitled';
    rightText.classList.add('right-block');

    sectionLink.appendChild(leftText);
    sectionLink.appendChild(rightText);

    return sectionLink;
}

/**
 * Finds a node in the document structure by ID
 * @param {DocumentNode[]} documentStructure - Array of root nodes to search
 * @param {string} targetId - The ID to search for
 * @returns {DocumentNode|null} The found node or null
 */
export function findNodeById(documentStructure, targetId) {
    if (!Array.isArray(documentStructure) || !targetId) {
        return null;
    }

    try {
        return DocumentNode.searchMultipleRootsById(documentStructure, targetId);
    } catch (error) {
        console.error(`Error finding node ${targetId}:`, error);
        return null;
    }
}

/**
 * Updates the display of a single node without re-rendering the entire tree
 * @param {string} nodeId - The ID of the node to update
 * @param {Object} updates - Object containing properties to update (e.g., { name: 'New Name' })
 */
export function updateNodeDisplay(nodeId, updates) {
    if (!nodeId) {
        throw new Error('nodeId is required');
    }

    try {
        const linkElement = document.getElementById(`T-${nodeId}`);
        
        if (!linkElement) {
            console.warn(`Node element T-${nodeId} not found in DOM`);
            return;
        }

        // Update name if provided
        if (updates.name !== undefined) {
            const rightBlock = linkElement.querySelector('.right-block');
            if (rightBlock) {
                rightBlock.textContent = updates.name;
            }
        }

        // Add more update cases as needed

    } catch (error) {
        console.error(`Error updating node display for ${nodeId}:`, error);
        throw error;
    }
}
