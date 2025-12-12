/**
 * Content Editor Module
 * Handles content editing functionality with proper event management
 */

import { stateManager } from './state-manager.js';
import { showError } from './message-center.js';

// Store active event listeners for cleanup
const activeListeners = new Map();

/**
 * Loads existing content from a node into the content editor
 * @param {Object} node - The document node containing content
 * @throws {Error} If required elements are not found
 */
export function loadContentForEditing(node) {
    if (!node) {
        throw new Error('Node is required for loading content');
    }

    try {
        // Update section title and ID displays
        const sectionId = document.getElementById('contentID');
        const sectionTitle = document.getElementById('contentTitle');
        
        if (!sectionId || !sectionTitle) {
            throw new Error('Content editor elements not found in DOM');
        }

        sectionId.textContent = node.id || '';
        sectionTitle.value = node.name || '';

        // Load the content list
        populateContentList(node);

        // Update state
        stateManager.setCurrentEditingItem(node);

    } catch (error) {
        console.error('Error loading content for editing:', error);
        throw error;
    }
}

/**
 * Populates the content list with existing content items
 * @param {Object} contentNode - The node containing content array
 */
export function populateContentList(contentNode) {
    const myList = document.getElementById('myList');
    
    if (!myList) {
        throw new Error('Content list element (myList) not found');
    }

    try {
        // Clear existing content
        clearContentList();

        const content = contentNode.content || [];

        if (!Array.isArray(content)) {
            console.warn('Content is not an array:', content);
            return;
        }

        // Create list items for each content piece
        content.forEach((contentText, index) => {
            const listItem = createContentListItem(contentText, contentNode.id, index);
            myList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error populating content list:', error);
        throw error;
    }
}

/**
 * Creates a single content list item
 * @private
 * @param {string} contentText - The text content
 * @param {string} nodeId - The parent node ID
 * @param {number} index - The index of this content item
 * @returns {HTMLElement} The created list item
 */
function createContentListItem(contentText, nodeId, index) {
    const listItem = document.createElement('li');
    listItem.className = 'dynamic-item content-list-item';
    listItem.setAttribute('id', `c${nodeId}_${index}`);
    listItem.setAttribute('draggable', 'true');
    
    // Create drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '&#8597;'; // Up-down arrow
    dragHandle.title = 'Drag to reorder';
    
    // Create content text span (editable)
    const contentSpan = document.createElement('span');
    contentSpan.className = 'content-text';
    contentSpan.textContent = contentText || '';
    contentSpan.contentEditable = false; // Will be set to true on click
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn content-delete-btn';
    deleteBtn.setAttribute('id', `delete-content-${nodeId}_${index}`);
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete this content item';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteContentItem(nodeId, index);
    };
    
    listItem.appendChild(dragHandle);
    listItem.appendChild(contentSpan);
    listItem.appendChild(deleteBtn);

    // Add click listener for editing on the content span
    const editHandler = (event) => {
        if (event.target === contentSpan) {
            editContentInPlace(contentSpan, nodeId, index);
        }
    };
    contentSpan.addEventListener('click', editHandler);
    
    // Add drag and drop event handlers
    listItem.addEventListener('dragstart', handleContentDragStart);
    listItem.addEventListener('dragover', handleContentDragOver);
    listItem.addEventListener('drop', handleContentDrop);
    listItem.addEventListener('dragend', handleContentDragEnd);
    listItem.addEventListener('dragenter', handleContentDragEnter);
    listItem.addEventListener('dragleave', handleContentDragLeave);
    
    // Store listener for cleanup
    activeListeners.set(contentSpan, editHandler);

    return listItem;
}

/**
 * Adds a new item to the content list
 * @param {string} text - Optional text to add (if not provided, reads from textarea)
 */
export function addListItem(text = null) {
    const myList = document.getElementById('myList');
    const myTextarea = document.getElementById('myTextarea');

    if (!myList || !myTextarea) {
        throw new Error('Required content editor elements not found');
    }

    try {
        const newText = text || myTextarea.value.trim();

        if (newText === '') {
            return;
        }

        const currentItem = stateManager.getCurrentEditingItem();
        const nodeId = currentItem?.id || 'unknown';
        const index = myList.children.length;

        const newListItem = createContentListItem(newText, nodeId, index);
        myList.appendChild(newListItem);

        // Clear textarea
        myTextarea.value = '';

        // TODO: Update source data
        updateSourceContent();

    } catch (error) {
        console.error('Error adding list item:', error);
        throw error;
    }
}

/**
 * Handles editing of a content list item
 * @param {Event} event - The click event
 * @deprecated Use editContentInPlace instead
 */
function editListItem(event) {
    // Legacy function - kept for compatibility
    console.warn('editListItem is deprecated');
}

/**
 * Enables in-place editing of content text
 * @param {HTMLElement} contentSpan - The span element containing the text
 * @param {string} nodeId - The parent node ID
 * @param {number} index - The index of this content item
 */
function editContentInPlace(contentSpan, nodeId, index) {
    if (!contentSpan || contentSpan.contentEditable === 'true') {
        return; // Already editing
    }

    try {
        const originalText = contentSpan.textContent;
        
        // Enable editing
        contentSpan.contentEditable = true;
        contentSpan.classList.add('editing');
        contentSpan.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(contentSpan);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Save on blur
        const blurHandler = () => {
            contentSpan.contentEditable = false;
            contentSpan.classList.remove('editing');
            
            // Get only the text content from the span, stripping any accidental special characters
            let newText = contentSpan.textContent || '';
            
            // Remove drag handle and delete button characters that might have been copied
            newText = newText
                .replace(/↕/g, '')  // Remove up-down arrow
                .replace(/⇕/g, '')  // Remove alternative up-down arrow
                .replace(/×/g, '')  // Remove multiplication sign (delete button)
                .trim();
            
            if (newText !== originalText) {
                // Update the source data
                updateContentInNode(nodeId, index, newText);
            } else {
                // Restore original text if it was modified but equals after cleaning
                contentSpan.textContent = originalText;
            }
            
            contentSpan.removeEventListener('blur', blurHandler);
            contentSpan.removeEventListener('keydown', keyHandler);
        };

        // Save on Enter, cancel on Escape
        const keyHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                contentSpan.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                contentSpan.textContent = originalText;
                contentSpan.blur();
            }
        };

        contentSpan.addEventListener('blur', blurHandler);
        contentSpan.addEventListener('keydown', keyHandler);

    } catch (error) {
        console.error('Error editing content in place:', error);
    }
}

/**
 * Updates content in the node's content array
 * @param {string} nodeId - The node ID
 * @param {number} index - The index of content to update
 * @param {string} newText - The new text content
 */
function updateContentInNode(nodeId, index, newText) {
    try {
        const currentNode = stateManager.getCurrentEditingItem();
        if (!currentNode || currentNode.id !== nodeId) {
            console.warn('Cannot update: node mismatch');
            return;
        }

        if (currentNode.content && Array.isArray(currentNode.content)) {
            currentNode.content[index] = newText;
            
            // Dispatch save event
            document.dispatchEvent(new CustomEvent('dlms:contentChanged'));
            
            console.log(`Updated content item ${index} in node ${nodeId}`);
        }
    } catch (error) {
        console.error('Error updating content in node:', error);
    }
}

/**
 * Saves changes made to a content item
 * @param {Event} event - The blur event from the edit textarea
 */
function saveContentChanges(event) {
    try {
        const editArea = event.target;
        const contentSpan = editArea.previousElementSibling; // Get the content span that was replaced

        if (!contentSpan || !contentSpan.classList.contains('content-text')) {
            console.error('Could not find content span to restore');
            return;
        }

        const newValue = editArea.value.trim();
        contentSpan.textContent = newValue;

        // TODO: Update source data
        updateSourceContent();

    } catch (error) {
        console.error('Error saving content changes:', error);
    }
}

/**
 * Deletes a content item from the current node
 * @param {string} nodeId - The node ID
 * @param {number} index - The index of content to delete
 */
function deleteContentItem(nodeId, index) {
    try {
        if (!confirm('Delete this content item?')) {
            return;
        }

        // Get current node from state
        const currentNode = stateManager.getCurrentEditingItem();
        if (!currentNode || currentNode.id !== nodeId) {
            throw new Error('Cannot delete: node mismatch');
        }

        // Remove content at index
        if (currentNode.content && Array.isArray(currentNode.content)) {
            currentNode.content.splice(index, 1);
        }

        // Refresh the content list display
        populateContentList(currentNode);

        // Dispatch save event
        document.dispatchEvent(new CustomEvent('dlms:contentChanged'));

        console.log(`Deleted content item ${index} from node ${nodeId}`);

    } catch (error) {
        console.error('Error deleting content item:', error);
        showError(`Failed to delete content: ${error.message}`);
    }
}

// Drag and drop state for content items
let contentDraggedElement = null;
let contentDraggedIndex = null;

/**
 * Handles drag start for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDragStart(e) {
    contentDraggedElement = e.currentTarget;
    contentDraggedElement.classList.add('dragging');
    
    // Extract index from ID (format: c{nodeId}_{index})
    const id = contentDraggedElement.id;
    const match = id.match(/_([0-9]+)$/);
    contentDraggedIndex = match ? parseInt(match[1]) : null;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', contentDraggedElement.innerHTML);
}

/**
 * Handles drag over for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handles drag enter for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDragEnter(e) {
    if (e.currentTarget !== contentDraggedElement) {
        e.currentTarget.classList.add('drag-over');
    }
}

/**
 * Handles drag leave for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

/**
 * Handles drop for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.currentTarget.classList.remove('drag-over');
    
    if (contentDraggedElement !== e.currentTarget) {
        // Extract target index
        const targetId = e.currentTarget.id;
        const match = targetId.match(/_([0-9]+)$/);
        const targetIndex = match ? parseInt(match[1]) : null;
        
        if (contentDraggedIndex !== null && targetIndex !== null) {
            reorderContentItems(contentDraggedIndex, targetIndex);
        }
    }
    
    return false;
}

/**
 * Handles drag end for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDragEnd(e) {
    contentDraggedElement.classList.remove('dragging');
    
    // Remove drag-over class from all items
    const items = document.querySelectorAll('.content-list-item');
    items.forEach(item => item.classList.remove('drag-over'));
    
    contentDraggedElement = null;
    contentDraggedIndex = null;
}

/**
 * Reorders content items in the node
 * @param {number} fromIndex - Original index
 * @param {number} toIndex - Target index
 */
function reorderContentItems(fromIndex, toIndex) {
    try {
        const currentNode = stateManager.getCurrentEditingItem();
        if (!currentNode || !Array.isArray(currentNode.content)) {
            throw new Error('Cannot reorder: no active node');
        }
        
        // Perform the reorder
        const [movedItem] = currentNode.content.splice(fromIndex, 1);
        currentNode.content.splice(toIndex, 0, movedItem);
        
        // Refresh the display
        populateContentList(currentNode);
        
        // Trigger auto-save
        document.dispatchEvent(new CustomEvent('dlms:contentChanged'));
        
        console.log(`Reordered content: moved item from index ${fromIndex} to ${toIndex}`);
        
    } catch (error) {
        console.error('Error reordering content items:', error);
        showError(`Failed to reorder: ${error.message}`);
    }
}

/**
 * Clears the content list and removes event listeners
 */
export function clearContentList() {
    const myList = document.getElementById('myList');
    
    if (!myList) {
        return;
    }

    try {
        // Remove all event listeners
        myList.querySelectorAll('li').forEach(item => {
            const listener = activeListeners.get(item);
            if (listener) {
                item.removeEventListener('click', listener);
                activeListeners.delete(item);
            }
        });

        // Clear content
        myList.textContent = '';

    } catch (error) {
        console.error('Error clearing content list:', error);
    }
}

/**
 * Updates the source data with current content
 * TODO: Implement actual data persistence
 */
function updateSourceContent() {
    const currentItem = stateManager.getCurrentEditingItem();
    const myList = document.getElementById('myList');

    if (!currentItem || !myList) {
        return;
    }

    try {
        // Collect all content items - only get text from .content-text span
        const contentArray = Array.from(myList.children).map(li => {
            const contentSpan = li.querySelector('.content-text');
            return contentSpan ? contentSpan.textContent.trim() : '';
        }).filter(text => text.length > 0); // Remove empty entries

        // Update the node's content
        if (currentItem.content !== undefined) {
            currentItem.content = contentArray;
        }

        console.log(`Updated content for node ${currentItem.id}:`, contentArray);
        // TODO: Trigger save operation, create version patch

    } catch (error) {
        console.error('Error updating source content:', error);
    }
}

/**
 * Initializes content editor event listeners
 */
export function initializeContentEditor() {
    try {
        const myTextarea = document.getElementById('myTextarea');
        const titleTextarea = document.getElementById('contentTitle');

        if (myTextarea) {
            // Add item on Enter key
            myTextarea.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addListItem();
                }
            });
        }

        if (titleTextarea) {
            // Update title on input
            titleTextarea.addEventListener('input', (event) => {
                const currentItem = stateManager.getCurrentEditingItem();
                if (currentItem) {
                    const newValue = event.target.value;
                    console.log(`Updating title for ${currentItem.id}: ${newValue}`);
                    // TODO: Update source data with debouncing
                }
            });
        }

    } catch (error) {
        console.error('Error initializing content editor:', error);
    }
}

/**
 * Cleanup function to remove all event listeners
 */
export function cleanup() {
    clearContentList();
    activeListeners.clear();
}
