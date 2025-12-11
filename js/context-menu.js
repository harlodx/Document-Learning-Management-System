/*
// =========================================================================
// CONTEXT MENU MODULE
// Handles custom right-click context menu for nodes and text elements
// =========================================================================
*/

import { stateManager } from './state-manager.js';
import { findNodeById, renderDocumentStructure } from './tree-renderer.js';
import { deleteNode } from './data-operations.js';
import { undo, canUndo, getUndoCount, saveStateBeforeChange } from './undo-manager.js';
import DocumentNode from './documentnode.js';

let contextMenu = null;
let currentNodeId = null;
let currentNodeElement = null;

/**
 * Initialize context menu functionality
 */
export function initializeContextMenu() {
    // Create context menu element if it doesn't exist
    if (!contextMenu) {
        createContextMenuElement();
    }
    
    // Add right-click listeners to dynamic container
    const dynamicContainer = document.getElementById('dynamic-container');
    if (dynamicContainer) {
        dynamicContainer.addEventListener('contextmenu', handleContextMenu);
    }
    
    // Close menu when clicking elsewhere
    document.addEventListener('click', hideContextMenu);
    
    console.log('Context menu initialized');
}

/**
 * Create the context menu HTML element
 */
function createContextMenuElement() {
    contextMenu = document.createElement('div');
    contextMenu.id = 'custom-context-menu';
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" data-action="undo" id="context-menu-undo">
            <span class="context-menu-icon">↶</span>
            <span>Undo</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item has-submenu">
            <span class="context-menu-icon">➕</span>
            <span>Add</span>
            <span class="submenu-arrow">▶</span>
            <div class="context-submenu">
                <div class="context-menu-item" data-action="add-subnode">
                    <span class="context-menu-icon">📄</span>
                    <span>Add Subnode</span>
                </div>
                <div class="context-menu-item" data-action="add-rootnode">
                    <span class="context-menu-icon">📁</span>
                    <span>Add Root Node</span>
                </div>
            </div>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="junk">
            <span class="context-menu-icon">🗑️</span>
            <span>Move to Junk</span>
        </div>
        <div class="context-menu-item" data-action="delete">
            <span class="context-menu-icon">❌</span>
            <span>Delete Permanently</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="move">
            <span class="context-menu-icon">↔️</span>
            <span>Move To...</span>
        </div>
        <div class="context-menu-item" data-action="add-reference">
            <span class="context-menu-icon">🔗</span>
            <span>Add Reference...</span>
        </div>
    `;
    
    // Add click handlers for menu items
    contextMenu.addEventListener('click', handleMenuItemClick);
    
    document.body.appendChild(contextMenu);
}

/**
 * Handle right-click context menu
 */
function handleContextMenu(event) {
    // Find if we clicked on a node or text element
    const sectionLink = event.target.closest('.section-link');
    const contentItem = event.target.closest('.content-list-item');
    
    if (!sectionLink && !contentItem) {
        return; // Not on a valid element
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Store reference to the element
    currentNodeElement = sectionLink || contentItem;
    
    // Extract node ID
    if (sectionLink) {
        const elementId = sectionLink.id;
        if (elementId && elementId.startsWith('T-')) {
            currentNodeId = elementId.substring(2);
        }
    } else if (contentItem) {
        // For content items, get the parent node
        const editingItem = stateManager.getCurrentEditingItem();
        if (editingItem) {
            currentNodeId = editingItem.id;
        }
    }
    
    if (!currentNodeId) {
        console.warn('Could not determine node ID for context menu');
        return;
    }
    
    // Position and show the menu
    showContextMenu(event.pageX, event.pageY);
}

/**
 * Show the context menu at specified position
 */
function showContextMenu(x, y) {
    if (!contextMenu) return;
    
    // Update undo menu item state
    const undoItem = contextMenu.querySelector('[data-action="undo"]');
    if (undoItem) {
        const undoAvailable = canUndo();
        const undoCount = getUndoCount();
        
        if (undoAvailable) {
            undoItem.classList.remove('disabled');
            const undoText = undoItem.querySelector('span:last-child');
            if (undoText) {
                undoText.textContent = `Undo (${undoCount} available)`;
            }
        } else {
            undoItem.classList.add('disabled');
            const undoText = undoItem.querySelector('span:last-child');
            if (undoText) {
                undoText.textContent = 'Undo (none available)';
            }
        }
    }
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    
    // Adjust if menu goes off screen
    const menuRect = contextMenu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    if (menuRect.right > windowWidth) {
        contextMenu.style.left = (windowWidth - menuRect.width - 10) + 'px';
    }
    
    if (menuRect.bottom > windowHeight) {
        contextMenu.style.top = (windowHeight - menuRect.height - 10) + 'px';
    }
}

/**
 * Hide the context menu
 */
function hideContextMenu() {
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
    currentNodeId = null;
    currentNodeElement = null;
}

/**
 * Handle menu item clicks
 */
function handleMenuItemClick(event) {
    const menuItem = event.target.closest('.context-menu-item');
    if (!menuItem) return;
    
    const action = menuItem.getAttribute('data-action');
    
    // Save node ID before hiding menu (hideContextMenu resets currentNodeId)
    const nodeIdToProcess = currentNodeId;
    const nodeElementToProcess = currentNodeElement;
    
    hideContextMenu();
    
    // Handle undo action separately (doesn't require a node ID)
    if (action === 'undo') {
        handleUndo();
        return;
    }
    
    if (!nodeIdToProcess) {
        console.warn('No node ID available for action:', action);
        return;
    }
    
    // Temporarily restore for action handlers
    currentNodeId = nodeIdToProcess;
    currentNodeElement = nodeElementToProcess;
    
    // Execute the action
    switch (action) {
        case 'add-subnode':
            handleAddSubnode();
            break;
        case 'add-rootnode':
            handleAddRootNode();
            break;
        case 'junk':
            handleJunkNode();
            break;
        case 'delete':
            handleDeleteNode();
            break;
        case 'move':
            handleMoveNode();
            break;
        case 'add-reference':
            handleAddReference();
            break;
    }
    
    // Clear after action completes
    currentNodeId = null;
    currentNodeElement = null;
}

/**
 * Handle undo action
 */
function handleUndo() {
    if (!canUndo()) {
        alert('Nothing to undo.');
        return;
    }
    
    const success = undo();
    if (success) {
        console.log('Undo completed successfully');
    } else {
        console.error('Undo failed');
    }
}

/**
 * Add a subnode (child) to the current node
 */
function handleAddSubnode() {
    if (!currentNodeId) return;
    
    const nodeName = prompt('Enter name for new subnode:', 'New Subnode');
    if (!nodeName) return; // User cancelled
    
    // Save state before change
    saveStateBeforeChange();
    
    const documentStructure = stateManager.getDocumentStructure();
    const parentNode = findNodeById(documentStructure, currentNodeId);
    
    if (!parentNode) {
        console.error('Parent node not found:', currentNodeId);
        alert('Error: Could not find node');
        return;
    }
    
    console.log('Add Subnode - Adding child to node:', parentNode.id);
    
    // Initialize children array if it doesn't exist
    if (!parentNode.children) {
        parentNode.children = [];
    }
    
    // Calculate new child ID
    const nextOrder = parentNode.children.length + 1;
    const newChildId = `${parentNode.id}-${nextOrder}`;
    
    // Create new child node as DocumentNode instance
    const newChild = new DocumentNode(
        newChildId,
        nodeName,
        ['Enter content here...'],
        [],
        parentNode.id
    );
    
    // Add to parent's children
    parentNode.children.push(newChild);
    
    console.log('Added child node:', newChild.id, 'to parent:', parentNode.id);
    
    // Update state and re-render
    stateManager.setDocumentStructure(documentStructure);
    renderDocumentStructure(documentStructure);
}

/**
 * Add a new root node near the current node's position
 */
function handleAddRootNode() {
    const nodeName = prompt('Enter name for new root node:', 'New Section');
    if (!nodeName) return; // User cancelled
    
    // Save state before change
    saveStateBeforeChange();
    
    const documentStructure = stateManager.getDocumentStructure();
    
    // Find the root ancestor of the current node
    let insertIndex = documentStructure.length; // Default to end
    
    if (currentNodeId) {
        const rootAncestor = findRootAncestor(documentStructure, currentNodeId);
        if (rootAncestor) {
            // Find index of root ancestor
            insertIndex = documentStructure.findIndex(node => node.id === rootAncestor.id);
            if (insertIndex !== -1) {
                insertIndex++; // Insert after the root ancestor
            }
        }
    }
    
    // Calculate temporary ID (will be recalculated by reIndex)
    const tempOrder = insertIndex + 1;
    
    // Create new root node as DocumentNode instance
    const newNode = new DocumentNode(
        tempOrder.toString(),
        nodeName,
        ['Enter content here...'],
        [],
        null
    );
    
    // Insert at calculated position
    documentStructure.splice(insertIndex, 0, newNode);
    
    // Re-index all root nodes to ensure sequential IDs
    reIndexRootNodes(documentStructure);
    
    // Update state and re-render
    stateManager.setDocumentStructure(documentStructure);
    renderDocumentStructure(documentStructure);
    
    console.log('Added root node at position:', insertIndex);
}

/**
 * Find a node and return it with parent and array information
 */
function findNodeWithParent(nodes, targetId, parent = null, parentArray = null) {
    const searchArray = parentArray || nodes;
    
    for (let i = 0; i < searchArray.length; i++) {
        const node = searchArray[i];
        
        if (node.id === targetId) {
            return {
                node: node,
                parent: parent,
                parentArray: searchArray,
                index: i
            };
        }
        
        if (node.children && node.children.length > 0) {
            const found = findNodeWithParent(nodes, targetId, node, node.children);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * Find the root ancestor of a node
 */
function findRootAncestor(documentStructure, nodeId) {
    for (const rootNode of documentStructure) {
        if (rootNode.id === nodeId) {
            return rootNode;
        }
        
        if (isDescendantOf(rootNode, nodeId)) {
            return rootNode;
        }
    }
    
    return null;
}

/**
 * Check if a node is a descendant of another node
 */
function isDescendantOf(node, ancestorId) {
    if (node.id === ancestorId) return true;
    
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            if (isDescendantOf(child, ancestorId)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Re-index all root level nodes to ensure sequential IDs
 */
function reIndexRootNodes(documentStructure) {
    documentStructure.forEach((node, index) => {
        const newIndex = index + 1;
        if (node.id !== newIndex.toString()) {
            // Check if node has _recalculateId method (DocumentNode instance)
            if (typeof node._recalculateId === 'function') {
                node._recalculateId(null, newIndex);
            } else {
                // Plain object - update manually
                node.id = newIndex.toString();
                node.order = newIndex;
                node.parentId = null;
                reIndexChildrenPlain(node, node.id);
            }
        }
    });
}

/**
 * Recursively re-index children nodes (for plain objects)
 */
function reIndexChildrenPlain(parentNode, parentId) {
    if (!parentNode.children || parentNode.children.length === 0) {
        return;
    }
    
    parentNode.children.forEach((child, index) => {
        const newOrder = index + 1;
        const newId = `${parentId}-${newOrder}`;
        
        child.id = newId;
        child.order = newOrder;
        child.parentId = parentId;
        
        // Recursively update this child's children
        if (child.children && child.children.length > 0) {
            reIndexChildrenPlain(child, newId);
        }
    });
}

/**
 * Move node to junk
 */
function handleJunkNode() {
    if (!currentNodeId) return;
    
    // Save state before change
    saveStateBeforeChange();
    
    console.log('Moving node to junk:', currentNodeId);
    deleteNode(currentNodeId); // This already moves to junk
}

/**
 * Delete node permanently
 */
function handleDeleteNode() {
    if (!currentNodeId) return;
    
    const documentStructure = stateManager.getDocumentStructure();
    const node = findNodeById(documentStructure, currentNodeId);
    
    if (!node) {
        console.error('Node not found:', currentNodeId);
        return;
    }
    
    const nodeName = node.name || node.title || 'this node';
    const confirmation = confirm(`Are you sure you want to PERMANENTLY delete "${nodeName}" and all its subnodes? This cannot be undone.`);
    
    if (!confirmation) return;
    
    // Save state before change
    saveStateBeforeChange();
    
    // Find and remove the node directly
    removeNodePermanently(documentStructure, currentNodeId);
    
    // Update state and re-render
    stateManager.setDocumentStructure(documentStructure);
    renderDocumentStructure(documentStructure);
    
    console.log('Permanently deleted node:', currentNodeId);
}

/**
 * Recursively remove a node from the tree
 */
function removeNodePermanently(nodes, targetId) {
    if (!Array.isArray(nodes)) return false;
    
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === targetId) {
            nodes.splice(i, 1);
            return true;
        }
        
        if (nodes[i].children && nodes[i].children.length > 0) {
            if (removeNodePermanently(nodes[i].children, targetId)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Move node to a different position
 */
function handleMoveNode() {
    if (!currentNodeId) return;
    
    const documentStructure = stateManager.getDocumentStructure();
    const sourceNode = findNodeById(documentStructure, currentNodeId);
    
    if (!sourceNode) {
        console.error('Source node not found:', currentNodeId);
        return;
    }
    
    // Build list of possible target locations
    const targetList = buildTargetList(documentStructure, currentNodeId);
    
    if (targetList.length === 0) {
        alert('No valid target locations available.');
        return;
    }
    
    // Create selection dialog
    showMoveDialog(targetList, sourceNode);
}

/**
 * Build list of possible move targets (excluding self and descendants)
 */
function buildTargetList(nodes, excludeId, parentPath = '', level = 0) {
    let targets = [];
    
    // Add option to move to root level
    if (level === 0) {
        targets.push({ id: '__ROOT__', display: '[Root Level]', path: '' });
    }
    
    for (const node of nodes) {
        // Skip the node being moved and its descendants
        if (node.id === excludeId || isDescendantOf(node, excludeId)) {
            continue;
        }
        
        const nodeName = node.name || node.title || 'Untitled';
        const indent = '  '.repeat(level);
        const display = `${indent}${nodeName} (${node.id})`;
        const currentPath = parentPath ? `${parentPath} > ${nodeName}` : nodeName;
        
        targets.push({ 
            id: node.id, 
            display: display,
            path: currentPath,
            node: node
        });
        
        // Add children
        if (node.children && node.children.length > 0) {
            const childTargets = buildTargetList(node.children, excludeId, currentPath, level + 1);
            targets = targets.concat(childTargets);
        }
    }
    
    return targets;
}

/**

 * Show dialog for selecting move target
 */
function showMoveDialog(targetList, sourceNode) {
    const sourceName = sourceNode.name || sourceNode.title || 'Untitled';
    
    let message = `Move "${sourceName}" to:\n\n`;
    targetList.forEach((target, index) => {
        message += `${index + 1}. ${target.display}\n`;
    });
    message += `\nEnter number (1-${targetList.length}) or 0 to cancel:`;
    
    const selection = prompt(message);
    
    if (!selection || selection === '0') {
        return; // Cancelled
    }
    
    const selectedIndex = parseInt(selection, 10) - 1;
    
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= targetList.length) {
        alert('Invalid selection.');
        return;
    }
    
    const target = targetList[selectedIndex];
    executeMoveNode(sourceNode, target);
}

/**
 * Execute the move operation
 */
function executeMoveNode(sourceNode, target) {
    const documentStructure = stateManager.getDocumentStructure();
    
    // Save state before change
    saveStateBeforeChange();
    
    // Remove node from current location
    const removedNode = removeAndReturnNode(documentStructure, sourceNode.id);
    
    if (!removedNode) {
        console.error('Failed to remove source node');
        return;
    }
    
    // Insert at new location
    if (target.id === '__ROOT__') {
        // Move to root level
        documentStructure.push(removedNode);
    } else {
        // Move as child of target
        const targetNode = findNodeById(documentStructure, target.id);
        if (!targetNode) {
            console.error('Target node not found');
            return;
        }
        
        if (!targetNode.children) {
            targetNode.children = [];
        }
        
        targetNode.children.push(removedNode);
    }
    
    // Update state and re-render
    stateManager.setDocumentStructure(documentStructure);
    renderDocumentStructure(documentStructure);
    
    console.log('Moved node:', sourceNode.id, 'to', target.id);
}

/**
 * Remove and return a node from the tree
 */
function removeAndReturnNode(nodes, targetId) {
    if (!Array.isArray(nodes)) return null;
    
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === targetId) {
            const removed = nodes.splice(i, 1)[0];
            return removed;
        }
        
        if (nodes[i].children && nodes[i].children.length > 0) {
            const found = removeAndReturnNode(nodes[i].children, targetId);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * Add reference to another section
 */
function handleAddReference() {
    if (!currentNodeId) return;
    
    const documentStructure = stateManager.getDocumentStructure();
    const sourceNode = findNodeById(documentStructure, currentNodeId);
    
    if (!sourceNode) {
        console.error('Source node not found:', currentNodeId);
        return;
    }
    
    // Build list of all nodes (excluding current)
    const nodeList = buildNodeList(documentStructure, currentNodeId);
    
    if (nodeList.length === 0) {
        alert('No other sections available to reference.');
        return;
    }
    
    // Show reference selection dialog
    showAddReferenceDialog(nodeList, sourceNode);
}

/**
 * Build list of all nodes for reference selection
 */
function buildNodeList(nodes, excludeId, level = 0) {
    let list = [];
    
    for (const node of nodes) {
        if (node.id === excludeId) continue;
        
        const nodeName = node.name || node.title || 'Untitled';
        const indent = '  '.repeat(level);
        const display = `${indent}${nodeName} (${node.id})`;
        
        list.push({
            id: node.id,
            display: display,
            name: nodeName
        });
        
        if (node.children && node.children.length > 0) {
            const childList = buildNodeList(node.children, excludeId, level + 1);
            list = list.concat(childList);
        }
    }
    
    return list;
}

/**
 * Show dialog for adding reference
 */
function showAddReferenceDialog(nodeList, sourceNode) {
    let message = `Add reference to:\n\n`;
    nodeList.forEach((node, index) => {
        message += `${index + 1}. ${node.display}\n`;
    });
    message += `\nEnter number(s) separated by commas (e.g., "1,3,5") or 0 to cancel:`;
    
    const selection = prompt(message);
    
    if (!selection || selection === '0') {
        return; // Cancelled
    }
    
    // Parse selections
    const selections = selection.split(',').map(s => parseInt(s.trim(), 10) - 1);
    const validSelections = selections.filter(i => !isNaN(i) && i >= 0 && i < nodeList.length);
    
    if (validSelections.length === 0) {
        alert('Invalid selection.');
        return;
    }
    
    // Add references
    const selectedNodes = validSelections.map(i => nodeList[i]);
    addReferencesToNode(sourceNode, selectedNodes);
}

/**
 * Add references to a node
 */
function addReferencesToNode(node, referencedNodes) {
    // Save state before change
    saveStateBeforeChange();
    
    if (!node.references) {
        node.references = [];
    }
    
    // Add new references (avoid duplicates)
    for (const refNode of referencedNodes) {
        const exists = node.references.some(ref => ref.id === refNode.id);
        if (!exists) {
            node.references.push({
                id: refNode.id,
                name: refNode.name
            });
        }
    }
    
    // Update state
    const documentStructure = stateManager.getDocumentStructure();
    stateManager.setDocumentStructure(documentStructure);
    renderDocumentStructure(documentStructure);
    
    console.log('Added references to node:', node.id, referencedNodes);
    alert(`Added ${referencedNodes.length} reference(s) successfully.`);
}

/**
 * Navigate to a referenced section
 */
export function navigateToReference(nodeId) {
    const documentStructure = stateManager.getDocumentStructure();
    const targetNode = findNodeById(documentStructure, nodeId);
    
    if (!targetNode) {
        console.error('Referenced node not found:', nodeId);
        alert('Referenced section not found.');
        return;
    }
    
    // Find and click the element to load its content
    const targetElement = document.getElementById(`T-${nodeId}`);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight briefly
        targetElement.style.transition = 'background-color 0.3s';
        targetElement.style.backgroundColor = '#ffeb3b';
        
        setTimeout(() => {
            targetElement.style.backgroundColor = '';
        }, 1000);
        
        // Trigger click to load content
        targetElement.click();
    }
}
