/**
 * Tree Renderer Module
 * Renders hierarchical document structure as nested HTML lists
 */

import DocumentNode from './documentnode.js';
import { stateManager } from './state-manager.js';
import { scheduleAutoSave } from './storage-manager.js';
import { showError } from './message-center.js';

// Store collapse states: Set of node IDs that are currently collapsed
const collapsedNodes = new Set();

/**
 * Add a node ID to the collapsed set
 * @param {string} nodeId - The node ID to mark as collapsed
 */
export function markNodeCollapsed(nodeId) {
    collapsedNodes.add(nodeId);
}

/**
 * Remove a node ID from the collapsed set
 * @param {string} nodeId - The node ID to mark as expanded
 */
export function markNodeExpanded(nodeId) {
    collapsedNodes.delete(nodeId);
}

/**
 * Renders the complete document structure into the DOM
 * @param {DocumentNode[]} documentStructure - Array of root document nodes
 * @param {string} containerId - ID of the container element (default: 'document-structure-container')
 * @throws {Error} If container element is not found
 */
export function renderDocumentStructure(documentStructure, containerId = 'document-structure-container') {
    console.log('renderDocumentStructure called with:', {
        containerId,
        nodeCount: documentStructure?.length,
        isArray: Array.isArray(documentStructure)
    });
    
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container element '${containerId}' not found in DOM`);
        console.error('Available elements with id:', document.querySelectorAll('[id]').length);
        throw new Error(`Container element '${containerId}' not found in DOM`);
    }
    
    console.log('Container found:', container.className, container.id);

    if (!Array.isArray(documentStructure)) {
        console.error('Invalid document structure:', documentStructure);
        container.innerHTML = '<div class="error-message">Invalid document structure</div>';
        return;
    }

    try {
        // Capture current collapse states before clearing
        captureCollapseStates(container);
        
        // Clear existing content
        container.innerHTML = '';

        if (documentStructure.length === 0) {
            console.log('No documents to display - showing empty message');
            container.innerHTML = '<div class="empty-message">No documents to display</div>';
            return;
        }

        console.log('Building nested list for', documentStructure.length, 'root nodes');
        // Build the nested list
        buildNestedList(documentStructure, container);
        
        // Restore collapse states after rendering
        restoreCollapseStates(container);
        
        console.log('Document structure rendered successfully');
        console.log('Container HTML after render:', container.innerHTML.substring(0, 200));
        console.log('Container has', container.children.length, 'direct children');
        
    } catch (error) {
        console.error('Error rendering document structure:', error);
        container.innerHTML = `<div class="error-message">Failed to render document: ${error.message}</div>`;
        throw error;
    }
}

/**
 * Collect all node IDs from the document tree recursively
 * @param {DocumentNode[]} nodes - Array of nodes to collect from
 * @param {Set} collected - Set to collect node IDs into
 */
function collectAllNodeIds(nodes, collected = new Set()) {
    for (const node of nodes) {
        collected.add(node.id);
        if (node.children && node.children.length > 0) {
            collectAllNodeIds(node.children, collected);
        }
    }
    return collected;
}

/**
 * Collapse all nodes except those in the specified path
 * @param {string[]} nodeIdsToKeepExpanded - Array of node IDs to keep expanded
 * @param {DocumentNode[]} documentStructure - The document structure to work with
 */
export function collapseAllExcept(nodeIdsToKeepExpanded = [], documentStructure = []) {
    collapsedNodes.clear();
    
    // Collect all node IDs from the document
    const allNodeIds = collectAllNodeIds(documentStructure);
    
    // Mark all nodes as collapsed except those in the path
    allNodeIds.forEach(nodeId => {
        if (!nodeIdsToKeepExpanded.includes(nodeId)) {
            collapsedNodes.add(nodeId);
        }
    });
}

/**
 * Find the node that was last edited within the specified time window
 * @param {DocumentNode[]} documentStructure - The document structure
 * @param {number} hoursAgo - Time window in hours (default 24)
 * @returns {Object|null} Object with {node, path} or null if no recent edits
 */
export function findLastEditedNode(documentStructure, hoursAgo = 24) {
    const cutoffTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
    let lastEditedNode = null;
    let lastEditTime = null;
    let nodePath = [];
    
    function searchTree(nodes, currentPath) {
        for (const node of nodes) {
            const path = [...currentPath, node.id];
            
            if (node.lastEditTime) {
                const editTime = new Date(node.lastEditTime);
                if (editTime > cutoffTime && (!lastEditTime || editTime > lastEditTime)) {
                    lastEditedNode = node;
                    lastEditTime = editTime;
                    nodePath = path;
                }
            }
            
            if (node.children && node.children.length > 0) {
                searchTree(node.children, path);
            }
        }
    }
    
    searchTree(documentStructure, []);
    
    return lastEditedNode ? { node: lastEditedNode, path: nodePath } : null;
}

/**
 * Capture the current collapse states of all nodes
 * @param {HTMLElement} container - The container element
 */
function captureCollapseStates(container) {
    // Find all collapse buttons with collapsed state
    const collapseButtons = container.querySelectorAll('.node-collapse-btn[data-collapsed="true"]');
    
    collapseButtons.forEach(btn => {
        const nodeId = btn.getAttribute('data-node-id');
        if (nodeId) {
            collapsedNodes.add(nodeId);
        }
    });
}

/**
 * Restore collapse states after rendering
 * @param {HTMLElement} container - The container element
 */
function restoreCollapseStates(container) {
    collapsedNodes.forEach(nodeId => {
        const collapseBtn = container.querySelector(`.node-collapse-btn[data-node-id="${nodeId}"]`);
        
        if (collapseBtn) {
            // Find the parent list item
            const liElement = collapseBtn.closest('li.list-container');
            
            if (liElement) {
                // Find the nested ul (children)
                const nestedUl = liElement.querySelector(':scope > ul');
                
                if (nestedUl) {
                    // Apply collapsed state
                    nestedUl.style.display = 'none';
                    collapseBtn.textContent = '▶';
                    collapseBtn.setAttribute('data-collapsed', 'true');
                    liElement.classList.add('collapsed-with-children');
                    
                    // Add collapsed indicator
                    const existingIndicator = liElement.querySelector('.collapsed-indicator');
                    if (!existingIndicator) {
                        const directChildren = nestedUl.querySelectorAll(':scope > li').length;
                        const totalDescendants = nestedUl.querySelectorAll('li').length;
                        
                        const indicator = document.createElement('div');
                        indicator.className = 'collapsed-indicator';
                        indicator.textContent = `${directChildren} subnode${directChildren !== 1 ? 's' : ''} collapsed (${totalDescendants} total)`;
                        
                        const sectionLink = liElement.querySelector('.section-link');
                        if (sectionLink) {
                            sectionLink.insertAdjacentElement('afterend', indicator);
                        }
                    }
                }
            }
        } else {
            // Node no longer exists, remove from set
            collapsedNodes.delete(nodeId);
        }
    });
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
    listItem.setAttribute('data-node-id', node.id);

    // Create the section link
    const sectionLink = createSectionLink(node);
    listItem.appendChild(sectionLink);
    
    // Add references if they exist
    if (node.references && node.references.length > 0) {
        const referencesDiv = createReferencesDisplay(node.references);
        listItem.appendChild(referencesDiv);
    }
    
    // Add drag and drop event handlers
    listItem.addEventListener('dragstart', handleTreeDragStart);
    listItem.addEventListener('dragover', handleTreeDragOver);
    listItem.addEventListener('drop', handleTreeDrop);
    listItem.addEventListener('dragend', handleTreeDragEnd);
    listItem.addEventListener('dragenter', handleTreeDragEnter);
    listItem.addEventListener('dragleave', handleTreeDragLeave);

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

    // Create action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.classList.add('node-actions');

    // Add collapse/expand button (only if node has children)
    if (node.children && node.children.length > 0) {
        const collapseBtn = document.createElement('button');
        collapseBtn.setAttribute('id', `collapse-node-${node.id}`);
        collapseBtn.classList.add('collapse-btn', 'node-collapse-btn', 'dynamic-item');
        collapseBtn.innerHTML = '&#9660;'; // Down arrow (expanded state)
        collapseBtn.title = 'Collapse/Expand subnodes';
        collapseBtn.setAttribute('clickable', 'true');
        collapseBtn.setAttribute('data-node-id', node.id);
        collapseBtn.setAttribute('data-collapsed', 'false');
        
        // Attach click handler directly for collapse functionality
        collapseBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('Collapse button clicked for node:', node.id);
            const { toggleNodeCollapse } = await import('./event-handlers.js');
            toggleNodeCollapse(node.id);
        });
        
        actionButtons.appendChild(collapseBtn);
    }

    sectionLink.appendChild(leftText);
    sectionLink.appendChild(rightText);
    sectionLink.appendChild(actionButtons);

    return sectionLink;
}

/**
 * Creates a display element for node references
 * @param {Array} references - Array of reference objects {id, name}
 * @returns {HTMLElement} The references container element
 */
function createReferencesDisplay(references) {
    const container = document.createElement('div');
    container.classList.add('node-references');
    
    const label = document.createElement('span');
    label.classList.add('references-label');
    label.textContent = 'References: ';
    container.appendChild(label);
    
    references.forEach((ref, index) => {
        const refLink = document.createElement('a');
        refLink.classList.add('reference-link');
        refLink.href = '#';
        refLink.textContent = ref.name || ref.id;
        refLink.setAttribute('data-ref-id', ref.id);
        refLink.title = `Jump to ${ref.name || ref.id}`;
        
        refLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Import navigateToReference dynamically to avoid circular dependency
            import('./context-menu.js').then(module => {
                module.navigateToReference(ref.id);
            });
        });
        
        container.appendChild(refLink);
        
        if (index < references.length - 1) {
            const separator = document.createElement('span');
            separator.textContent = ', ';
            separator.classList.add('reference-separator');
            container.appendChild(separator);
        }
    });
    
    return container;
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

// Drag and drop state for tree nodes - DATA ONLY, NO ELEMENT REFERENCES
let treeDraggedNodeId = null;
let treeDragState = {
    isDragging: false,
    sourceId: null,
    targetId: null
};

/**
 * Handles drag start for tree nodes
 * @param {DragEvent} e - The drag event
 */
function handleTreeDragStart(e) {
    // Stop propagation to prevent parent list items from also firing dragstart
    e.stopPropagation();
    
    console.log('TREE DRAG START EVENT FIRED');
    
    // Prevent dragging from buttons or action elements
    if (e.target.closest('.delete-btn, .node-actions, button')) {
        console.log('Drag prevented - clicked on button/action element');
        e.preventDefault();
        return;
    }
    
    const listItem = e.currentTarget;
    if (!listItem) {
        console.warn('handleTreeDragStart: No currentTarget');
        return;
    }
    
    treeDraggedNodeId = listItem.getAttribute('data-node-id');
    console.log('Tree node ID for drag:', treeDraggedNodeId);
    if (!treeDraggedNodeId) {
        console.warn('handleTreeDragStart: No data-node-id found');
        return;
    }
    
    // Only set state if not already dragging (prevents overwrites from bubbling)
    if (!treeDragState.isDragging) {
        treeDragState.isDragging = true;
        treeDragState.sourceId = treeDraggedNodeId;
        
        console.log('Drag started:', { nodeId: treeDraggedNodeId, state: treeDragState });
        
        // Add dragging class using data attribute selector
        listItem.classList.add('dragging');
        
        // Allow both move (within tree) and copy (into editor/pending)
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('text/plain', treeDraggedNodeId);
        e.dataTransfer.setData('source', 'tree');
    }
}

/**
 * Handles drag over for tree nodes
 * @param {DragEvent} e - The drag event
 */
function handleTreeDragOver(e) {
    // Only handle if we're actually over a tree node
    const targetElement = e.target.closest('[data-node-id]');
    if (!targetElement) return; // Not over a tree node, let other handlers take it
    
    // Allow drops from both tree and pending
    const sourceType = e.dataTransfer.types.includes('source') ? 'pending' : 'tree';
    if (!treeDragState.isDragging && sourceType !== 'pending') return;
    
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handles drag enter for tree nodes
 * @param {DragEvent} e - The drag event
 */
function handleTreeDragEnter(e) {
    // Check if dragging from pending
    const sourceType = e.dataTransfer.types.includes('source') ? 'pending' : 'tree';
    
    if (!treeDragState.isDragging && sourceType !== 'pending') return;
    
    // Use closest to find the actual list item, not nested elements
    const targetElement = e.target.closest('[data-node-id]');
    if (!targetElement) return;
    
    const targetNodeId = targetElement.getAttribute('data-node-id');
    if (!targetNodeId) return;
    
    // Don't allow dropping on itself or its children (only for tree moves)
    if (sourceType === 'tree' && (targetNodeId === treeDraggedNodeId || isDescendant(treeDraggedNodeId, targetNodeId))) {
        return;
    }
    
    // Calculate drop zone based on mouse position
    const rect = targetElement.getBoundingClientRect();
    const mouseY = e.clientY;
    const relativeY = mouseY - rect.top;
    const height = rect.height;
    
    // Divide into three zones: top 40%, middle 20%, bottom 40%
    let dropZone;
    if (relativeY < height * 0.4) {
        dropZone = 'before';
    } else if (relativeY > height * 0.6) {
        dropZone = 'after';
    } else {
        dropZone = 'child';
    }
    
    console.log('Drag enter:', { targetNodeId, dropZone, relativeY, height });
    
    // Remove all drag classes from all elements first
    document.querySelectorAll('.drag-over-before, .drag-over-after, .drag-over-child').forEach(el => {
        el.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-child');
    });
    
    // Apply appropriate class
    targetElement.classList.add(`drag-over-${dropZone}`);
    
    treeDragState.targetId = targetNodeId;
    treeDragState.dropZone = dropZone;
}

/**
 * Handles drag leave for tree nodes
 * @param {DragEvent} e - The drag event
 */
function handleTreeDragLeave(e) {
    const targetElement = e.currentTarget;
    if (targetElement) {
        targetElement.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-child');
    }
}

/**
 * Handles drop for tree nodes
 * @param {DragEvent} e - The drag event
 */
function handleTreeDrop(e) {
    // Check if this is from pending
    const sourceType = e.dataTransfer.getData('source');
    const draggedId = e.dataTransfer.getData('text/plain');
    
    console.log('Drop event fired', { 
        isDragging: treeDragState.isDragging, 
        sourceType,
        draggedId,
        state: treeDragState 
    });
    
    // Use closest to find the actual list item
    const targetElement = e.target.closest('[data-node-id]');
    if (!targetElement) {
        console.warn('Drop ignored: no target element with data-node-id');
        return false;
    }
    
    // Only prevent default and stop propagation if we're actually handling the drop
    e.stopPropagation();
    e.preventDefault();
    
    const targetNodeId = targetElement.getAttribute('data-node-id');
    
    if (!targetNodeId) {
        console.warn('Drop ignored: no target node ID');
        return false;
    }
    
    // Handle drop from pending section
    if (sourceType === 'pending') {
        targetElement.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-child');
        const dropZone = treeDragState.dropZone || 'before';
        console.log('Drop from pending:', { draggedId, targetNodeId, dropZone });
        
        cleanupDragVisuals();
        
        // Defer the restore operation
        setTimeout(() => {
            restoreFromPendingToTree(draggedId, targetNodeId, dropZone);
        }, 0);
        
        return false;
    }
    
    // Handle normal tree reordering
    if (!treeDragState.isDragging) {
        console.warn('Drop ignored: not in dragging state');
        return false;
    }
    
    targetElement.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-child');
    
    const sourceNodeId = treeDragState.sourceId;
    const dropZone = treeDragState.dropZone || 'before';
    
    console.log('Drop details:', { sourceNodeId, targetNodeId, dropZone });
    
    if (sourceNodeId && targetNodeId && sourceNodeId !== targetNodeId) {
        // Don't allow dropping on descendants
        if (!isDescendant(sourceNodeId, targetNodeId)) {
            console.log('Valid drop - executing reorder');
            // Store the operation, clean up visuals, then execute
            const operation = { source: sourceNodeId, target: targetNodeId, zone: dropZone };
            cleanupDragVisuals();
            
            // Defer the reorder operation to allow all events to complete
            setTimeout(() => {
                performTreeReorder(operation.source, operation.target, operation.zone);
            }, 0);
        } else {
            console.log('Drop ignored: target is descendant of source');
            cleanupDragVisuals();
        }
    } else {
        console.log('Drop ignored: same source and target or missing IDs');
    }
    
    return false;
}

/**
 * Handles drag end for tree nodes
 * @param {DragEvent} e - The drag event
 */
function handleTreeDragEnd(e) {
    console.log('TREE DRAG END - dropEffect:', e.dataTransfer.dropEffect);
    // Use setTimeout to ensure this runs after drop event
    setTimeout(() => {
        cleanupDragVisuals();
    }, 10);
}

/**
 * Cleans up all drag-related visual classes
 */
function cleanupDragVisuals() {
    // Remove dragging class from all items
    const items = document.querySelectorAll('.list-container');
    items.forEach(item => {
        if (item.classList) {
            item.classList.remove('dragging');
            item.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-child');
        }
    });
    
    // Reset state
    treeDraggedNodeId = null;
    treeDragState = {
        isDragging: false,
        sourceId: null,
        targetId: null,
        dropZone: null
    };
}

/**
 * Check if targetId is a descendant of sourceId
 * @param {string} sourceId - The source node ID
 * @param {string} targetId - The target node ID
 * @returns {boolean} True if target is a descendant of source
 */
function isDescendant(sourceId, targetId) {
    // If target starts with source followed by a hyphen, it's a descendant
    return targetId.startsWith(sourceId + '-');
}

/**
 * Recursively updates children IDs without sorting
 * @param {DocumentNode} node - The node whose children need ID updates
 */
function updateChildrenIdsRecursive(node) {
    if (!node.children || node.children.length === 0) return;
    
    node.children.forEach((child, index) => {
        if (child && typeof child === 'object' && child.id !== undefined) {
            DocumentNode._existingIds.delete(child.id);
            child.parentId = node.id;
            child.order = index + 1;
            child.id = `${node.id}-${index + 1}`;
            DocumentNode._existingIds.add(child.id);
            // Recursively update this child's children
            updateChildrenIdsRecursive(child);
        }
    });
}

/**
 * Performs the actual tree reorder operation (called after drag completes)
 * @param {string} sourceNodeId - The node to move
 * @param {string} targetNodeId - The position to move to
 */
function performTreeReorder(sourceNodeId, targetNodeId, dropZone = 'before') {
    console.log('performTreeReorder called:', { sourceNodeId, targetNodeId, dropZone });
    
    try {
        const documentStructure = stateManager.getDocumentStructure();
        
        console.log('Document structure:', documentStructure);
        
        if (!documentStructure || documentStructure.length === 0) {
            console.error('No document structure loaded');
            throw new Error('No document structure loaded');
        }
        
        // Find both nodes and their parents
        const sourceInfo = findNodeAndParent(documentStructure, sourceNodeId);
        const targetInfo = findNodeAndParent(documentStructure, targetNodeId);
        
        console.log('Source info:', sourceInfo);
        console.log('Target info:', targetInfo);
        
        if (!sourceInfo) {
            console.error('Could not find source node:', sourceNodeId);
            showError(`Could not find source node: ${sourceNodeId}`);
            return;
        }
        
        if (!targetInfo) {
            console.error('Could not find target node:', targetNodeId);
            showError(`Could not find target node: ${targetNodeId}`);
            return;
        }
        
        const { node: sourceNode, parent: sourceParent, array: sourceArray, index: sourceIndex } = sourceInfo;
        const { node: targetNode, parent: targetParent, array: targetArray, index: targetIndex } = targetInfo;
        
        // Prevent moving to invalid locations
        if (!sourceNode || !sourceArray) {
            console.error('Invalid source node structure');
            return;
        }
        
        console.log('Before splice - array:', sourceArray.map(n => n.id));
        
        // Remove from source location
        sourceArray.splice(sourceIndex, 1);
        console.log('After source removal - array:', sourceArray.map(n => n.id));
        
        // Handle different drop zones
        if (dropZone === 'child') {
            // Make source a child of target
            console.log('Drop mode: child - adding to target\'s children');
            
            // Remove from source array (already done above)
            // Add as last child of target
            targetNode.children.push(sourceNode);
            sourceNode.parentId = targetNode.id;
            
            console.log('After adding as child - target children:', targetNode.children.map(n => n.id));
            
            // Re-index source parent's remaining children WITHOUT SORTING
            if (sourceParent) {
                console.log('Re-indexing source parent\'s children:', sourceParent.id);
                sourceParent.children.forEach((child, index) => {
                    if (child) {
                        DocumentNode._existingIds.delete(child.id);
                        child.parentId = sourceParent.id;
                        child.order = index + 1;
                        child.id = `${sourceParent.id}-${index + 1}`;
                        DocumentNode._existingIds.add(child.id);
                        updateChildrenIdsRecursive(child);
                    }
                });
            } else {
                // Re-index root level
                sourceArray.forEach((node, idx) => {
                    if (node) {
                        DocumentNode._existingIds.delete(node.id);
                        node.parentId = null;
                        node.order = idx + 1;
                        node.id = (idx + 1).toString();
                        DocumentNode._existingIds.add(node.id);
                        updateChildrenIdsRecursive(node);
                    }
                });
            }
            
            // Re-index target's children (including new one) WITHOUT SORTING
            console.log('Re-indexing target\'s children:', targetNode.id);
            targetNode.children.forEach((child, index) => {
                if (child) {
                    DocumentNode._existingIds.delete(child.id);
                    child.parentId = targetNode.id;
                    child.order = index + 1;
                    child.id = `${targetNode.id}-${index + 1}`;
                    DocumentNode._existingIds.add(child.id);
                    updateChildrenIdsRecursive(child);
                }
            });
            
        } else {
            // Drop before or after target (sibling mode)
            console.log('Drop mode:', dropZone);
            
            // Determine new index in target location
            let newIndex = targetIndex;
            
            // If moving within the same parent and removing from before target
            if (sourceParent === targetParent && sourceIndex < targetIndex) {
                newIndex--;
                console.log('Same parent, adjusted newIndex:', newIndex);
            }
            
            // Insert at appropriate position
            if (dropZone === 'after') {
                newIndex++; // Insert after instead of before
            }
            
            console.log('Inserting at index:', newIndex);
            targetArray.splice(newIndex, 0, sourceNode);
            console.log('After insertion - array:', targetArray.map(n => n.id));
            
            // Update parent reference
            sourceNode.parentId = targetParent ? targetParent.id : null;
            
            // Re-index the affected array WITHOUT SORTING (preserve new order)
            // We need to manually update IDs without calling _recalculateId which triggers reIndexChildren and sorts
            if (targetParent) {
                console.log('Re-indexing children of parent:', targetParent.id);
                console.log('Children before reIndex:', targetParent.children.map(n => n.id));
                targetParent.children.forEach((child, index) => {
                    if (child) {
                        // Manually update ID and order without sorting
                        DocumentNode._existingIds.delete(child.id);
                        child.parentId = targetParent.id;
                        child.order = index + 1;
                        child.id = `${targetParent.id}-${index + 1}`;
                        DocumentNode._existingIds.add(child.id);
                        // Recursively fix children without sorting
                        updateChildrenIdsRecursive(child);
                    }
                });
                console.log('Children after reIndex:', targetParent.children.map(n => n.id));
            } else {
                // Re-index root level
                console.log('Re-indexing root level nodes');
                console.log('Root before reIndex:', targetArray.map(n => n.id));
                targetArray.forEach((node, idx) => {
                    if (node) {
                        // Manually update ID and order without sorting
                        DocumentNode._existingIds.delete(node.id);
                        node.parentId = null;
                        node.order = idx + 1;
                        node.id = (idx + 1).toString();
                        DocumentNode._existingIds.add(node.id);
                        // Recursively fix children without sorting
                        updateChildrenIdsRecursive(node);
                    }
                });
                console.log('Root after reIndex:', targetArray.map(n => n.id));
            }
        }
        
        // Re-index source parent's remaining children if different from target
        if (sourceParent && sourceParent !== targetParent) {
            console.log('Re-indexing source parent children:', sourceParent.id);
            console.log('Children before reIndex:', sourceParent.children.map(n => n.id));
            sourceParent.children.forEach((child, index) => {
                if (child) {
                    // Manually update ID and order without sorting
                    DocumentNode._existingIds.delete(child.id);
                    child.parentId = sourceParent.id;
                    child.order = index + 1;
                    child.id = `${sourceParent.id}-${index + 1}`;
                    DocumentNode._existingIds.add(child.id);
                    // Recursively fix children without sorting
                    updateChildrenIdsRecursive(child);
                }
            });
            console.log('Children after reIndex:', sourceParent.children.map(n => n.id));
        } else if (!sourceParent && sourceArray !== targetArray) {
            // Re-index root level if source was also root level but different array
            console.log('Re-indexing root level nodes (source)');
            console.log('Root before reIndex:', sourceArray.map(n => n.id));
            sourceArray.forEach((node, idx) => {
                if (node) {
                    // Manually update ID and order without sorting
                    DocumentNode._existingIds.delete(node.id);
                    node.parentId = null;
                    node.order = idx + 1;
                    node.id = (idx + 1).toString();
                    DocumentNode._existingIds.add(node.id);
                    // Recursively fix children without sorting
                    updateChildrenIdsRecursive(node);
                }
            });
            console.log('Root after reIndex:', sourceArray.map(n => n.id));
        }
        
        // Log final structure before updating
        console.log('Final array after reorder:', sourceArray.map(n => n.id));
        console.log('Final document structure:', documentStructure.map(n => ({ id: n.id, children: n.children?.map(c => c.id) })));
        
        // VALIDATION: Check if all nodes and their children are actual objects
        const validateStructure = (nodes, path = 'root') => {
            nodes.forEach((node, idx) => {
                if (typeof node !== 'object' || !node.id) {
                    console.error(`INVALID NODE at ${path}[${idx}]:`, node, typeof node);
                    return false;
                }
                if (node.children && node.children.length > 0) {
                    node.children.forEach((child, childIdx) => {
                        if (typeof child !== 'object' || !child.id) {
                            console.error(`INVALID CHILD at ${path}[${idx}].children[${childIdx}]:`, child, typeof child);
                        }
                    });
                    validateStructure(node.children, `${path}[${idx}].children`);
                }
            });
            return true;
        };
        console.log('Validating structure before setState...');
        validateStructure(documentStructure);
        
        // Update state
        console.log('Updating state with modified structure');
        stateManager.setDocumentStructure(documentStructure);
        
        // Get fresh reference from state to ensure we're rendering updated data
        const freshStructure = stateManager.getDocumentStructure();
        console.log('Fresh structure from state:', freshStructure.map(n => ({ id: n.id, children: n.children?.map(c => c.id) })));
        
        // Re-render the tree (safe now that all drag events are complete)
        console.log('Re-rendering tree');
        renderDocumentStructure(freshStructure);
        
        // Trigger auto-save
        console.log('Triggering auto-save');
        scheduleAutoSave();
        
        console.log(`✓ Successfully moved node ${sourceNodeId} to position after ${targetNodeId}`);
        
    } catch (error) {
        console.error('Error reordering tree nodes:', error);
        console.error('Stack trace:', error.stack);
        showError(`Failed to reorder: ${error.message}`);
    }
}

/**
 * Finds a node and its parent in the tree
 * @param {DocumentNode[]} nodes - Array of nodes to search
 * @param {string} targetId - The node ID to find
 * @param {DocumentNode|null} parent - The parent node
 * @param {DocumentNode[]} array - The array containing the node
 * @returns {Object|null} Object with node, parent, array, and index
 */
function findNodeAndParent(nodes, targetId, parent = null, array = null) {
    if (!array) array = nodes;
    
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.id === targetId) {
            return { node, parent, array, index: i };
        }
        
        if (node.children && node.children.length > 0) {
            const result = findNodeAndParent(node.children, targetId, node, node.children);
            if (result) return result;
        }
    }
    
    return null;
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

/**
 * Restores an item from pending to a specific location in the tree
 * @param {string} pendingId - ID of the pending item to restore
 * @param {string} targetNodeId - ID of the target node
 * @param {string} dropZone - Where to place it: 'before', 'after', or 'child'
 */
async function restoreFromPendingToTree(pendingId, targetNodeId, dropZone) {
    console.log('Restoring from pending to tree:', { pendingId, targetNodeId, dropZone });
    
    try {
        const pendingItems = stateManager.getPendingItems() || [];
        const itemIndex = pendingItems.findIndex(item => item.id === pendingId);

        if (itemIndex === -1) {
            showError('Pending item not found');
            return;
        }

        const item = pendingItems[itemIndex];
        const documentStructure = stateManager.getDocumentStructure();

        // Clone the item and remove pending metadata
        const itemCopy = JSON.parse(JSON.stringify(item));
        delete itemCopy._pendingAt;
        delete itemCopy._originalParentId;
        delete itemCopy._originalIndex;

        // Convert to DocumentNode instance (this ensures proper object structure)
        const restoredNode = DocumentNode.fromJSON(itemCopy);

        // Find the target node
        const targetInfo = findNodeAndParent(documentStructure, targetNodeId);
        
        if (!targetInfo) {
            showError('Target location not found');
            return;
        }

        const { node: targetNode, parent: targetParent, array: targetArray, index: targetIndex } = targetInfo;

        // Insert at the appropriate location based on drop zone
        if (dropZone === 'child') {
            // Add as child of target
            if (!targetNode.children) {
                targetNode.children = [];
            }
            targetNode.children.push(restoredNode);
            restoredNode.parentId = targetNode.id;
            
            // Re-index target's children
            targetNode.children.forEach((child, index) => {
                if (child) {
                    DocumentNode._existingIds.delete(child.id);
                    child.parentId = targetNode.id;
                    child.order = index + 1;
                    child.id = `${targetNode.id}-${index + 1}`;
                    DocumentNode._existingIds.add(child.id);
                    updateChildrenIdsRecursive(child);
                }
            });
        } else if (dropZone === 'before') {
            // Insert before target
            targetArray.splice(targetIndex, 0, restoredNode);
            restoredNode.parentId = targetParent?.id || null;
            
            // Re-index siblings
            reindexSiblings(targetArray, targetParent);
        } else { // 'after'
            // Insert after target
            targetArray.splice(targetIndex + 1, 0, restoredNode);
            restoredNode.parentId = targetParent?.id || null;
            
            // Re-index siblings
            reindexSiblings(targetArray, targetParent);
        }

        // Remove from pending
        pendingItems.splice(itemIndex, 1);
        stateManager.setPendingItems(pendingItems);

        // Update document structure
        stateManager.setDocumentStructure(documentStructure);

        // Save to version control
        const { saveWorkingCopy } = await import('./version-control.js');
        saveWorkingCopy(documentStructure, pendingItems);

        // Re-render
        renderDocumentStructure(documentStructure);
        
        // Re-render pending items
        const { renderPendingItems } = await import('./pending-manager.js');
        renderPendingItems();

        // Auto-save
        const { scheduleAutoSave } = await import('./storage-manager.js');
        scheduleAutoSave();

        const { showSuccess } = await import('./message-center.js');
        const nodeName = restoredNode.title || restoredNode.name || 'Item';
        showSuccess(`${nodeName} restored from Pending`);

        console.log(`Restored item ${pendingId} from pending`);

    } catch (error) {
        console.error('Error restoring from pending to tree:', error);
        const { showError } = await import('./message-center.js');
        showError(`Failed to restore item: ${error.message}`);
    }
}

/**
 * Re-indexes siblings after insertion
 * @param {Array} siblings - Array of sibling nodes
 * @param {Object} parent - Parent node or null for root
 */
function reindexSiblings(siblings, parent) {
    siblings.forEach((node, idx) => {
        if (node) {
            DocumentNode._existingIds.delete(node.id);
            if (parent) {
                node.parentId = parent.id;
                node.order = idx + 1;
                node.id = `${parent.id}-${idx + 1}`;
            } else {
                node.parentId = null;
                node.order = idx + 1;
                node.id = (idx + 1).toString();
            }
            DocumentNode._existingIds.add(node.id);
            updateChildrenIdsRecursive(node);
        }
    });
}
