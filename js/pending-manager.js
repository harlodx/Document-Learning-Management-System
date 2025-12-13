/**
 * Pending Manager Module
 * Handles rendering and management of pending (soft-deleted) items
 * @module pending-manager
 */

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
    const container = document.getElementById('pending-items-container');
    if (!container) {
        console.error('Pending items container not found');
        return;
    }

    const pendingItems = stateManager.getPendingItems() || [];

    if (pendingItems.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic; padding: 10px;">No pending items</p>';
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
            <div class="pending-item" data-Pending-id="${itemId}" data-Pending-index="${index}">
                <div class="pending-item-main">
                    <div class="pending-item-buttons">
                        <button class="restore-btn" data-Pending-id="${itemId}" title="Restore this item and all sub-items" data-tooltip="Restore">
                            ↺
                        </button>
                        <button class="delete-pending-btn" data-Pending-id="${itemId}" title="Permanently delete this item and all sub-items" data-tooltip="Delete">
                            ✕
                        </button>
                    </div>
                    <div class="pending-item-content">
                        <div class="pending-item-info" data-Pending-node-id="${itemId}" style="flex: 1; cursor: pointer;">
                            <div class="pending-item-title-row">
                                <span class="pending-item-title">${escapeHtml(title)}</span>
                                ${hasChildren ? `<span class="pending-child-count">(${childCount} sub-item${childCount > 1 ? 's' : ''})</span>` : ''}
                            </div>
                            ${contentPreview ? `<div class="pending-item-preview">${escapeHtml(contentPreview)}</div>` : ''}
                            <span class="pending-item-date">Deleted: ${pendingDate}</span>
                        </div>
                        ${hasChildren ? `<button class="pending-expand-btn" data-Pending-id="${itemId}" title="Show/hide sub-items">▶</button>` : '<span class="pending-no-children"></span>'}
                    </div>
                </div>
                ${hasChildren ? `<div class="pending-children-container" data-Pending-id="${itemId}" style="display: none;">${renderPendingChildren(item)}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // Attach event listeners
    attachPendingEventListeners();
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
            const PendingId = e.target.getAttribute('data-Pending-id');
            const childrenContainer = document.querySelector(`.pending-children-container[data-Pending-id="${PendingId}"]`);
            const button = e.target;
            
            if (childrenContainer) {
                const isExpanded = childrenContainer.style.display !== 'none';
                childrenContainer.style.display = isExpanded ? 'none' : 'block';
                button.textContent = isExpanded ? '▶' : '▼';
            }
        });
    });
    
    // Click handlers for viewing Pending items (including children)
    document.querySelectorAll('[data-Pending-node-id]').forEach(element => {
        element.addEventListener('click', async (e) => {
            // Don't trigger if clicking on a button
            if (e.target.tagName === 'BUTTON') return;
            
            const PendingNodeId = e.currentTarget.getAttribute('data-Pending-node-id');
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
            const PendingId = e.target.getAttribute('data-Pending-id');
            restoreFromPending(PendingId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-pending-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const PendingId = e.target.getAttribute('data-Pending-id');
            permanentlyDeleteFromPending(PendingId);
        });
    });
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
