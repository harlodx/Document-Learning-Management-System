/**
 * Pending Manager Module
 * Handles rendering and management of pending (soft-deleted) items
 * @module pending-manager
 */

console.log('===== PENDING MANAGER MODULE LOADING =====');

import { stateManager } from './state-manager.js';
import DocumentNode from './documentnode.js';
import { renderDocumentStructure } from './tree-renderer.js';
import { scheduleAutoSave } from './storage-manager.js';
import { showConfirm } from './message-center.js';
import { showError, showSuccess } from './message-center.js';
import { saveWorkingCopy } from './version-control.js';

/**
 * Renders the pending items in the pending section
 */
export function renderPendingItems() {
    console.log('renderPendingItems called');
    const container = document.getElementById('pending-items-container');
    if (!container) {
        console.error('Pending items container not found');
        return;
    }
    console.log('Pending container found, setting up...');

    const pendingItems = stateManager.getPendingItems() || [];

    if (pendingItems.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic; padding: 10px;">No pending items</p>';
        // Still need to setup drop zone even when empty
        console.log('About to call setupPendingDropZone() (empty state)');
        setupPendingDropZone();
        console.log('setupPendingDropZone() completed (empty state)');
        return;
    }

    // Build HTML for pending items
    let html = '';
    pendingItems.forEach((item, index) => {
        const pendingDate = new Date(item._pendingAt).toLocaleString();
        const title = item.title || item.name || 'Untitled';
        const itemId = item.id;
        
        // Get content preview (first 100 chars)
        let contentPreview = '';
        if (item.content && Array.isArray(item.content) && item.content.length > 0) {
            const firstContent = item.content[0]?.text || '';
            contentPreview = firstContent.substring(0, 100);
            if (firstContent.length > 100) contentPreview += '...';
        } else if (typeof item.content === 'string') {
            contentPreview = item.content.substring(0, 100);
            if (item.content.length > 100) contentPreview += '...';
        }
        
        // Count children
        const childCount = countAllChildren(item);
        const hasChildren = childCount > 0;
        
        html += `
            <div class="pending-item" draggable="true" data-pending-id="${itemId}" data-pending-index="${index}">
                <div class="pending-item-main">
                    <div class="pending-item-buttons">
                        <button class="restore-btn" data-pending-id="${itemId}" title="Restore this item and all sub-items" data-tooltip="Restore">
                            ↺
                        </button>
                        <button class="delete-pending-btn" data-pending-id="${itemId}" title="Permanently delete this item and all sub-items" data-tooltip="Delete">
                            ✕
                        </button>
                    </div>
                    <div class="pending-item-content">
                        <div class="pending-item-info" data-pending-node-id="${itemId}" style="flex: 1; cursor: pointer;">
                            <div class="pending-item-title-row">
                                <span class="pending-item-title">${escapeHtml(title)}</span>
                                ${hasChildren ? `<span class="pending-child-count">(${childCount} sub-item${childCount > 1 ? 's' : ''})</span>` : ''}
                            </div>
                            ${contentPreview ? `<div class="pending-item-preview">${escapeHtml(contentPreview)}</div>` : ''}
                            <span class="pending-item-date">Deleted: ${pendingDate}</span>
                        </div>
                        ${hasChildren ? `<button class="pending-expand-btn" data-pending-id="${itemId}" title="Show/hide sub-items">▶</button>` : '<span class="pending-no-children"></span>'}
                    </div>
                </div>
                ${hasChildren ? `<div class="pending-children-container" data-pending-id="${itemId}" style="display: none;">${renderPendingChildren(item)}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // Attach event listeners
    attachPendingEventListeners();
    
    console.log('About to call setupPendingDropZone()');
    // Setup drop zone for pending panel
    setupPendingDropZone();
    console.log('setupPendingDropZone() completed');
}

/**
 * Renders children of a Pending item as a hierarchical list
 * @private
 * @param {Object} item - The Pending item
 * @returns {string} HTML string of children
 */
function renderPendingChildren(item) {
    if (!item.children || item.children.length === 0) {
        return '';
    }
    
    let html = '<ul class="pending-child-list">';
    
    item.children.forEach(child => {
        const childTitle = child.title || child.name || 'Untitled';
        const childHasChildren = child.children && child.children.length > 0;
        const childId = child.id || `pending-child-${Date.now()}-${Math.random()}`;
        
        // Get content preview for child
        let childPreview = '';
        if (child.content && Array.isArray(child.content) && child.content.length > 0) {
            const firstContent = child.content[0]?.text || child.content[0] || '';
            childPreview = typeof firstContent === 'string' ? firstContent.substring(0, 50) : '';
            if (childPreview && childPreview.length >= 50) childPreview += '...';
        }
        
        html += `<li class="pending-child-item" data-Pending-node-id="${childId}" title="${childPreview || 'Click to view'}">
            <span class="pending-child-title">${escapeHtml(childTitle)}</span>
            ${childHasChildren ? ` <span class="pending-child-count">(${child.children.length})</span>` : ''}
            ${childHasChildren ? renderPendingChildren(child) : ''}
        </li>`;
    });
    
    html += '</ul>';
    return html;
}

/**
 * Counts all descendant children recursively
 * @private
 * @param {Object} item - The item to count children for
 * @returns {number} Total count of all descendants
 */
function countAllChildren(item) {
    if (!item.children || item.children.length === 0) {
        return 0;
    }
    
    let count = item.children.length;
    item.children.forEach(child => {
        count += countAllChildren(child);
    });
    
    return count;
}

/**
 * Attaches event listeners to Pending item buttons
 * @private
 */
function attachPendingEventListeners() {
    // Expand/collapse buttons
    document.querySelectorAll('.pending-expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering item click
            const PendingId = e.target.getAttribute('data-pending-id');
            const childrenContainer = document.querySelector(`.pending-children-container[data-pending-id="${PendingId}"]`);
            const button = e.target;
            
            if (childrenContainer) {
                const isExpanded = childrenContainer.style.display !== 'none';
                childrenContainer.style.display = isExpanded ? 'none' : 'block';
                button.textContent = isExpanded ? '▶' : '▼';
            }
        });
    });
    
    // Click handlers for viewing Pending items (including children)
    document.querySelectorAll('[data-pending-node-id]').forEach(element => {
        element.addEventListener('click', async (e) => {
            // Don't trigger if clicking on a button
            if (e.target.tagName === 'BUTTON') return;
            
            const PendingNodeId = e.currentTarget.getAttribute('data-pending-node-id');
            console.log('Pending item clicked:', PendingNodeId);
            
            // Find the Pending item in the Pending array
            const pendingItems = stateManager.getPendingItems() || [];
            const PendingItem = findPendingNodeById(pendingItems, PendingNodeId);
            
            if (PendingItem) {
                console.log('Viewing Pending item:', PendingItem.name || PendingItem.title);
                const { loadContentForEditing } = await import('./content-editor.js');
                loadContentForEditing(PendingItem);
            }
        });
    });
    
    // Restore buttons
    document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const PendingId = e.target.getAttribute('data-pending-id');
            restoreFromPending(PendingId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-pending-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const PendingId = e.target.getAttribute('data-pending-id');
            permanentlyDeleteFromPending(PendingId);
        });
    });

    // Setup drag handlers for pending items
    setupPendingDragHandlers();
}

/**
 * Restores a Pendinged item back to the document tree
 * @param {string} PendingId - ID of the Pendinged item to restore
 */
export function restoreFromPending(PendingId) {
    try {
        const pendingItems = stateManager.getPendingItems() || [];
        const itemIndex = pendingItems.findIndex(item => item.id === PendingId);

        if (itemIndex === -1) {
            showError('Pendinged item not found');
            return;
        }

        const item = pendingItems[itemIndex];
        const documentStructure = stateManager.getDocumentStructure();

        // Clone the item and remove Pending metadata
        const restoredNode = JSON.parse(JSON.stringify(item));
        delete restoredNode._PendingedAt;
        delete restoredNode._originalParentId;
        delete restoredNode._originalIndex;

        // Try to restore to original location
        const originalParentId = item._originalParentId;
        const originalIndex = item._originalIndex;

        let restored = false;

        if (originalParentId === 'root') {
            // Restore to root level
            if (originalIndex >= 0 && originalIndex < documentStructure.length) {
                documentStructure.splice(originalIndex, 0, restoredNode);
            } else {
                documentStructure.push(restoredNode);
            }
            restored = true;
        } else {
            // Try to find original parent
            const parent = findNodeById(documentStructure, originalParentId);
            if (parent) {
                if (!parent.children) {
                    parent.children = [];
                }
                if (originalIndex >= 0 && originalIndex < parent.children.length) {
                    parent.children.splice(originalIndex, 0, restoredNode);
                } else {
                    parent.children.push(restoredNode);
                }
                restored = true;
            } else {
                // Original parent not found, restore to root
                documentStructure.push(restoredNode);
                restored = true;
            }
        }

        if (restored) {
            // Remove from Pending
            pendingItems.splice(itemIndex, 1);
            stateManager.setPendingItems(pendingItems);

            // Update document structure
            stateManager.setDocumentStructure(documentStructure);

            // Save to version control working copy (with updated Pending items)
            saveWorkingCopy(documentStructure, pendingItems);

            // Re-render
            renderDocumentStructure(documentStructure);
            renderpendingItems();

            // Auto-save
            scheduleAutoSave();

            console.log(`Restored item ${PendingId} from Pending`);
        }

    } catch (error) {
        console.error('Error restoring from Pending:', error);
        showError(`Failed to restore item: ${error.message}`);
    }
}

/**
 * Permanently deletes a Pendinged item
 * @param {string} PendingId - ID of the Pendinged item to delete
 */
export async function permanentlyDeleteFromPending(PendingId) {
    try {
        const pendingItems = stateManager.getPendingItems() || [];
        const item = pendingItems.find(item => item.id === PendingId);

        if (!item) {
            showError('Pendinged item not found');
            return;
        }

        const title = item.title || 'Untitled';
        const confirmed = await showConfirm(`Permanently delete "${title}"?\n\nThis cannot be undone!`, 'Delete', 'Cancel');
        if (!confirmed) {
            return;
        }

        // Delete all IDs recursively to prevent conflicts
        DocumentNode.deleteIdsRecursively(item);

        // Remove from Pending array
        const newPendingItems = pendingItems.filter(item => item.id !== PendingId);
        stateManager.setPendingItems(newPendingItems);

        // Save to version control working copy (with updated Pending items)
        const documentStructure = stateManager.getDocumentStructure();
        saveWorkingCopy(documentStructure, newPendingItems);

        // Re-render
        renderPendingItems();

        // Auto-save
        scheduleAutoSave();

        console.log(`Permanently deleted Pendinged item ${PendingId}`);

    } catch (error) {
        console.error('Error permanently deleting from Pending:', error);
        showError(`Failed to delete item: ${error.message}`);
    }
}

/**
 * Clears all Pendinged items after confirmation
 */
export async function clearAllPending() {
    const pendingItems = stateManager.getPendingItems() || [];

    if (pendingItems.length === 0) {
        showError('Pending is already empty');
        return;
    }

    const confirmed = await showConfirm(`Permanently delete all ${pendingItems.length} Pendinged item(s)?\n\nThis cannot be undone!`, 'Delete All', 'Cancel');
    if (!confirmed) {
        return;
    }

    try {
        // Delete all IDs to prevent conflicts
        pendingItems.forEach(item => {
            DocumentNode.deleteIdsRecursively(item);
        });

        // Clear Pending
        stateManager.setPendingItems([]);

        // Re-render
        renderPendingItems();

        // Auto-save
        scheduleAutoSave();

        console.log('Cleared all Pending items');

    } catch (error) {
        console.error('Error clearing Pending:', error);
        showError(`Failed to clear Pending: ${error.message}`);
    }
}

/**
 * Finds a Pending node by ID (searches recursively through children)
 * @private
 * @param {Object[]} pendingItems - Array of Pending items to search
 * @param {string} nodeId - ID to find
 * @returns {Object|null} The found node or null
 */
function findPendingNodeById(pendingItems, nodeId) {
    for (const item of pendingItems) {
        if (item.id === nodeId) {
            return item;
        }
        // Search in children recursively
        if (item.children && item.children.length > 0) {
            const found = findPendingNodeById(item.children, nodeId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Finds a node by ID in the document structure
 * @private
 * @param {Object[]} nodes - Array of nodes to search
 * @param {string} nodeId - ID to find
 * @returns {Object|null} The found node or null
 */
function findNodeById(nodes, nodeId) {
    for (const node of nodes) {
        if (node.id === nodeId) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeById(node.children, nodeId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * Escapes HTML to prevent XSS
 * @private
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sets up drag and drop handlers for pending items
 */
function setupPendingDragHandlers() {
    const pendingItems = document.querySelectorAll('.pending-item');
    
    pendingItems.forEach(item => {
        // Prevent dragging when clicking buttons
        const buttons = item.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        });

        item.addEventListener('dragstart', handlePendingDragStart);
        item.addEventListener('dragend', handlePendingDragEnd);
    });
}

/**
 * Handles drag start for pending items
 */
function handlePendingDragStart(e) {
    // Prevent dragging from buttons
    if (e.target.closest('button')) {
        e.preventDefault();
        return;
    }

    const pendingItem = e.currentTarget;
    const pendingId = pendingItem.getAttribute('data-pending-id');
    
    if (!pendingId) return;

    pendingItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pendingId);
    e.dataTransfer.setData('source', 'pending');
    
    console.log('Pending item drag started:', pendingId);
}

/**
 * Handles drag end for pending items
 */
function handlePendingDragEnd(e) {
    const pendingItem = e.currentTarget;
    pendingItem.classList.remove('dragging');
}

/**
 * Sets up the pending panel as a drop zone for tree nodes
 */
function setupPendingDropZone() {
    const pendingContainer = document.getElementById('pending-items-container');
    const pendingToggle = document.getElementById('pending-toggle');
    
    if (!pendingContainer) {
        console.warn('Pending container not found for drop zone setup');
        return;
    }

    console.log('Setting up pending drop zone handlers');

    // Handle dragover only on the items container
    pendingContainer.addEventListener('dragover', handlePendingDragOver);
    pendingContainer.addEventListener('dragenter', handlePendingDragEnter);
    pendingContainer.addEventListener('dragleave', handlePendingDragLeave);
    pendingContainer.addEventListener('drop', handlePendingDrop);
    
    // Auto-open pending panel when dragging over the toggle button
    if (pendingToggle) {
        console.log('Setting up pending toggle auto-open handlers');
        pendingToggle.addEventListener('dragenter', handleToggleDragEnter);
        pendingToggle.addEventListener('dragover', handleToggleDragOver);
    } else {
        console.warn('Pending toggle button not found');
    }
}

/**
 * Handles dragover on pending toggle to allow drop
 */
function handleToggleDragOver(e) {
    console.log('Toggle dragover triggered');
    // Allow all dragover events (can't read dataTransfer during dragover)
    e.preventDefault();
}

/**
 * Handles dragenter on pending toggle to auto-open panel
 */
function handleToggleDragEnter(e) {
    console.log('Toggle dragenter triggered');
    // Auto-open panel for all drag operations (can't read dataTransfer during dragenter)
    const pendingPanel = document.getElementById('pending-panel');
    if (pendingPanel && !pendingPanel.classList.contains('open')) {
        pendingPanel.classList.add('open');
        console.log('Auto-opened pending panel during drag');
    }
}

/**
 * Handles dragover event for pending drop zone
 */
function handlePendingDragOver(e) {
    console.log('Pending container dragover triggered');
    // Allow all dragover (can't read dataTransfer during dragover)
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handles dragenter event for pending drop zone
 */
function handlePendingDragEnter(e) {
    console.log('Pending container dragenter triggered');
    // Highlight for all drag operations (can't read dataTransfer during dragenter)
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.add('drag-over-pending');
}

/**
 * Handles dragleave event for pending drop zone
 */
function handlePendingDragLeave(e) {
    // Only remove highlight if we're leaving the element entirely
    if (e.currentTarget.contains(e.relatedTarget)) return;
    
    const target = e.currentTarget;
    target.classList.remove('drag-over-pending');
}

/**
 * Handles drop event for pending drop zone
 */
async function handlePendingDrop(e) {
    console.log('Pending drop triggered');
    e.preventDefault();
    e.stopPropagation();
    
    // Remove drag-over class from container only
    const pendingContainer = document.getElementById('pending-items-container');
    if (pendingContainer) pendingContainer.classList.remove('drag-over-pending');
    
    const nodeId = e.dataTransfer.getData('text/plain');
    const source = e.dataTransfer.getData('source');
    console.log('Drop data:', { nodeId, source });
    
    // Only handle drops from the tree
    if (source === 'pending' || !nodeId) return;
    
    console.log('Tree node dropped on pending:', nodeId);
    
    // Import deleteNode dynamically to avoid circular dependencies
    try {
        const { deleteNode } = await import('./data-operations.js');
        await deleteNode(nodeId);
    } catch (error) {
        console.error('Error moving node to pending:', error);
        showError('Failed to move item to pending');
    }
}

// Export the setup function for external use
export { setupPendingDragHandlers };
