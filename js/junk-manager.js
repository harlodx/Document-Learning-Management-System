/**
 * Junk Manager Module
 * Handles rendering and management of junked (soft-deleted) items
 * @module junk-manager
 */

import { stateManager } from './state-manager.js';
import DocumentNode from './documentnode.js';
import { renderDocumentStructure } from './tree-renderer.js';
import { scheduleAutoSave } from './storage-manager.js';
import { showConfirm } from './message-center.js';
import { showError, showSuccess } from './message-center.js';

/**
 * Renders the junk items in the junk section
 */
export function renderJunkItems() {
    const container = document.getElementById('junk-items-container');
    if (!container) {
        console.error('Junk items container not found');
        return;
    }

    const junkItems = stateManager.getJunkItems() || [];

    if (junkItems.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic; padding: 10px;">No junked items</p>';
        return;
    }

    // Build HTML for junk items
    let html = '';
    junkItems.forEach((item, index) => {
        const junkedDate = new Date(item._junkedAt).toLocaleString();
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
            <div class="junk-item" data-junk-id="${itemId}" data-junk-index="${index}">
                <div class="junk-item-header">
                    ${hasChildren ? `<button class="junk-expand-btn" data-junk-id="${itemId}" title="Show/hide sub-items">▶</button>` : '<span class="junk-no-children"></span>'}
                    <div class="junk-item-info" data-junk-node-id="${itemId}" style="flex: 1; cursor: pointer;">
                        <div class="junk-item-title-row">
                            <span class="junk-item-title">${escapeHtml(title)}</span>
                            ${hasChildren ? `<span class="junk-child-count">(${childCount} sub-item${childCount > 1 ? 's' : ''})</span>` : ''}
                        </div>
                        ${contentPreview ? `<div class="junk-item-preview">${escapeHtml(contentPreview)}</div>` : ''}
                        <span class="junk-item-date">Deleted: ${junkedDate}</span>
                    </div>
                    <div class="junk-item-actions">
                        <button class="restore-btn" data-junk-id="${itemId}" title="Restore this item and all sub-items" data-tooltip="Restore">
                            ↺
                        </button>
                        <button class="delete-junk-btn" data-junk-id="${itemId}" title="Permanently delete this item and all sub-items" data-tooltip="Delete">
                            ✕
                        </button>
                    </div>
                </div>
                ${hasChildren ? `<div class="junk-children-container" data-junk-id="${itemId}" style="display: none;">${renderJunkChildren(item)}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // Attach event listeners
    attachJunkEventListeners();
}

/**
 * Renders children of a junk item as a hierarchical list
 * @private
 * @param {Object} item - The junk item
 * @returns {string} HTML string of children
 */
function renderJunkChildren(item) {
    if (!item.children || item.children.length === 0) {
        return '';
    }
    
    let html = '<ul class="junk-child-list">';
    
    item.children.forEach(child => {
        const childTitle = child.title || child.name || 'Untitled';
        const childHasChildren = child.children && child.children.length > 0;
        const childId = child.id || `junk-child-${Date.now()}-${Math.random()}`;
        
        // Get content preview for child
        let childPreview = '';
        if (child.content && Array.isArray(child.content) && child.content.length > 0) {
            const firstContent = child.content[0]?.text || child.content[0] || '';
            childPreview = typeof firstContent === 'string' ? firstContent.substring(0, 50) : '';
            if (childPreview && childPreview.length >= 50) childPreview += '...';
        }
        
        html += `<li class="junk-child-item" data-junk-node-id="${childId}" title="${childPreview || 'Click to view'}">
            <span class="junk-child-title">${escapeHtml(childTitle)}</span>
            ${childHasChildren ? ` <span class="junk-child-count">(${child.children.length})</span>` : ''}
            ${childHasChildren ? renderJunkChildren(child) : ''}
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
 * Attaches event listeners to junk item buttons
 * @private
 */
function attachJunkEventListeners() {
    // Expand/collapse buttons
    document.querySelectorAll('.junk-expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering item click
            const junkId = e.target.getAttribute('data-junk-id');
            const childrenContainer = document.querySelector(`.junk-children-container[data-junk-id="${junkId}"]`);
            const button = e.target;
            
            if (childrenContainer) {
                const isExpanded = childrenContainer.style.display !== 'none';
                childrenContainer.style.display = isExpanded ? 'none' : 'block';
                button.textContent = isExpanded ? '▶' : '▼';
            }
        });
    });
    
    // Click handlers for viewing junk items (including children)
    document.querySelectorAll('[data-junk-node-id]').forEach(element => {
        element.addEventListener('click', async (e) => {
            // Don't trigger if clicking on a button
            if (e.target.tagName === 'BUTTON') return;
            
            const junkNodeId = e.currentTarget.getAttribute('data-junk-node-id');
            console.log('Junk item clicked:', junkNodeId);
            
            // Find the junk item in the junk array
            const junkItems = stateManager.getJunkItems() || [];
            const junkItem = findJunkNodeById(junkItems, junkNodeId);
            
            if (junkItem) {
                console.log('Viewing junk item:', junkItem.name || junkItem.title);
                const { loadContentForEditing } = await import('./content-editor.js');
                loadContentForEditing(junkItem);
            }
        });
    });
    
    // Restore buttons
    document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const junkId = e.target.getAttribute('data-junk-id');
            restoreFromJunk(junkId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-junk-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const junkId = e.target.getAttribute('data-junk-id');
            permanentlyDeleteFromJunk(junkId);
        });
    });
}

/**
 * Restores a junked item back to the document tree
 * @param {string} junkId - ID of the junked item to restore
 */
export function restoreFromJunk(junkId) {
    try {
        const junkItems = stateManager.getJunkItems() || [];
        const itemIndex = junkItems.findIndex(item => item.id === junkId);

        if (itemIndex === -1) {
            showError('Junked item not found');
            return;
        }

        const item = junkItems[itemIndex];
        const documentStructure = stateManager.getDocumentStructure();

        // Clone the item and remove junk metadata
        const restoredNode = JSON.parse(JSON.stringify(item));
        delete restoredNode._junkedAt;
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
            // Remove from junk
            junkItems.splice(itemIndex, 1);
            stateManager.setJunkItems(junkItems);

            // Update document structure
            stateManager.setDocumentStructure(documentStructure);

            // Re-render
            renderDocumentStructure(documentStructure);
            renderJunkItems();

            // Auto-save
            scheduleAutoSave();

            console.log(`Restored item ${junkId} from junk`);
        }

    } catch (error) {
        console.error('Error restoring from junk:', error);
        showError(`Failed to restore item: ${error.message}`);
    }
}

/**
 * Permanently deletes a junked item
 * @param {string} junkId - ID of the junked item to delete
 */
export async function permanentlyDeleteFromJunk(junkId) {
    try {
        const junkItems = stateManager.getJunkItems() || [];
        const item = junkItems.find(item => item.id === junkId);

        if (!item) {
            showError('Junked item not found');
            return;
        }

        const title = item.title || 'Untitled';
        const confirmed = await showConfirm(`Permanently delete "${title}"?\n\nThis cannot be undone!`, 'Delete', 'Cancel');
        if (!confirmed) {
            return;
        }

        // Delete all IDs recursively to prevent conflicts
        DocumentNode.deleteIdsRecursively(item);

        // Remove from junk array
        const newJunkItems = junkItems.filter(item => item.id !== junkId);
        stateManager.setJunkItems(newJunkItems);

        // Re-render
        renderJunkItems();

        // Auto-save
        scheduleAutoSave();

        console.log(`Permanently deleted junked item ${junkId}`);

    } catch (error) {
        console.error('Error permanently deleting from junk:', error);
        showError(`Failed to delete item: ${error.message}`);
    }
}

/**
 * Clears all junked items after confirmation
 */
export async function clearAllJunk() {
    const junkItems = stateManager.getJunkItems() || [];

    if (junkItems.length === 0) {
        showError('Junk is already empty');
        return;
    }

    const confirmed = await showConfirm(`Permanently delete all ${junkItems.length} junked item(s)?\n\nThis cannot be undone!`, 'Delete All', 'Cancel');
    if (!confirmed) {
        return;
    }

    try {
        // Delete all IDs to prevent conflicts
        junkItems.forEach(item => {
            DocumentNode.deleteIdsRecursively(item);
        });

        // Clear junk
        stateManager.setJunkItems([]);

        // Re-render
        renderJunkItems();

        // Auto-save
        scheduleAutoSave();

        console.log('Cleared all junk items');

    } catch (error) {
        console.error('Error clearing junk:', error);
        showError(`Failed to clear junk: ${error.message}`);
    }
}

/**
 * Finds a junk node by ID (searches recursively through children)
 * @private
 * @param {Object[]} junkItems - Array of junk items to search
 * @param {string} nodeId - ID to find
 * @returns {Object|null} The found node or null
 */
function findJunkNodeById(junkItems, nodeId) {
    for (const item of junkItems) {
        if (item.id === nodeId) {
            return item;
        }
        // Search in children recursively
        if (item.children && item.children.length > 0) {
            const found = findJunkNodeById(item.children, nodeId);
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
