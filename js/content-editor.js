/**
 * Content Editor Module
 * Handles content editing functionality with proper event management
 */

console.log('===== CONTENT EDITOR MODULE LOADING =====');

import { stateManager } from './state-manager.js';
import { showError, showConfirm } from './message-center.js';

// Store active event listeners for cleanup
const activeListeners = new Map();

/**
 * Loads existing content from a node into the content editor
 * @param {Object} node - The document node containing content
 * @throws {Error} If required elements are not found
 */
/**
 * Loads content for editing from a given node
 * @param {Object} node - The node to load (can be a tree node with children or leaf node)
 */
export function loadContentForEditing(node, paneRoot = getPrimaryPaneRoot()) {
    console.log('=== loadContentForEditing CALLED ===');
    console.log('Node object:', JSON.stringify(node, null, 2));
    console.log('Pane root:', paneRoot?.dataset?.paneId || 'primary');
    
    if (!node) {
        console.error('Node is null or undefined');
        throw new Error('Node is required for loading content');
    }

    const { sectionId, sectionTitle, contentList } = getEditorElements(paneRoot);

    try {
        console.log('Found DOM elements:', { sectionId: !!sectionId, sectionTitle: !!sectionTitle, contentList: !!contentList });
        
        if (!sectionId || !sectionTitle || !contentList) {
            throw new Error('Content editor elements not found in DOM');
        }

        console.log('Setting node ID:', node.id);
        sectionId.textContent = node.id || '';
        
        console.log('Setting node name:', node.name);
        sectionTitle.value = node.name || '';

        // Load the content list
        console.log('Calling populateContentList...');
        populateContentList(node, contentList, paneRoot);
        console.log('populateContentList completed');

        // Update state
        console.log('Updating state with current editing item');
        stateManager.setCurrentEditingItem(node);
        console.log('State updated');

    } catch (error) {
        console.error('Error loading content for editing:', error);
        throw error;
    }
}

/**
 * Populates the content list with existing content items
 * @param {Object} contentNode - The node containing content array
 */
export function populateContentList(contentNode, listElement = getPrimaryContentList(), paneRoot = getPrimaryPaneRoot()) {
    const myList = listElement;
    
    if (!myList) {
        throw new Error('Content list element not found');
    }

    try {
        // Clear existing content
        clearContentList(myList);

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
    
    // Create alphabetical designator (a, b, c, etc.)
    const letterDesignator = document.createElement('span');
    letterDesignator.className = 'content-letter-designator';
    letterDesignator.textContent = String.fromCharCode(97 + index) + '.'; // 97 is 'a'
    letterDesignator.title = `Item ${String.fromCharCode(97 + index)}`;
    
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
    
    // Layout order: drag handle, letter designator, content text, delete button
    listItem.appendChild(dragHandle);
    listItem.appendChild(letterDesignator);
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
export function addListItem(text = null, paneRoot = getPrimaryPaneRoot()) {
    const { contentList, contentTextarea } = getPaneControls(paneRoot);

    if (!contentList || !contentTextarea) {
        throw new Error('Required content editor elements not found');
    }

    try {
        const newText = text ?? contentTextarea.value.trim();

        if (newText === '') {
            return;
        }

        const currentItem = stateManager.getCurrentEditingItem();
        const nodeId = currentItem?.id || 'unknown';
        const index = contentList.children.length;

        const newListItem = createContentListItem(newText, nodeId, index);
        contentList.appendChild(newListItem);

        // Clear textarea
        contentTextarea.value = '';

        updateSourceContent(contentList, paneRoot);

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
            
            // Mark node as edited
            if (typeof currentNode.markEdited === 'function') {
                currentNode.markEdited();
            }
            
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
async function deleteContentItem(nodeId, index) {
    try {
        const confirmed = await showConfirm('Delete this content item?', 'Delete', 'Cancel');
        if (!confirmed) {
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
let contentDraggedList = null;

/**
 * Handles drag start for content items
 * @param {DragEvent} e - The drag event
 */
function handleContentDragStart(e) {
    contentDraggedElement = e.currentTarget;
    contentDraggedElement.classList.add('dragging');
    contentDraggedList = contentDraggedElement.closest('ol');
    
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
    e.stopPropagation();
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
    const listElement = e.currentTarget.closest('ol');
    if (contentDraggedList && listElement !== contentDraggedList) {
        return false; // ignore cross-list drops
    }
    
    if (contentDraggedElement !== e.currentTarget) {
        // Extract target index
        const targetId = e.currentTarget.id;
        const match = targetId.match(/_([0-9]+)$/);
        const targetIndex = match ? parseInt(match[1]) : null;
        
        if (contentDraggedIndex !== null && targetIndex !== null) {
            reorderContentItems(contentDraggedIndex, targetIndex, listElement || getPrimaryContentList());
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
    contentDraggedList = null;
}

/**
 * Reorders content items in the node
 * @param {number} fromIndex - Original index
 * @param {number} toIndex - Target index
 */
function reorderContentItems(fromIndex, toIndex, listElement = getPrimaryContentList()) {
    try {
        const currentNode = stateManager.getCurrentEditingItem();
        if (!currentNode || !Array.isArray(currentNode.content)) {
            throw new Error('Cannot reorder: no active node');
        }
        
        // Perform the reorder
        const [movedItem] = currentNode.content.splice(fromIndex, 1);
        currentNode.content.splice(toIndex, 0, movedItem);
        
        // Refresh the display in the affected list
        populateContentList(currentNode, listElement);
        
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
export function clearContentList(listElement = getPrimaryContentList()) {
    const myList = listElement;
    
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
function updateSourceContent(listElement = getPrimaryContentList(), paneRoot = getPrimaryPaneRoot()) {
    const currentItem = stateManager.getCurrentEditingItem();
    const myList = listElement;

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
            
            // Mark node as edited
            if (typeof currentItem.markEdited === 'function') {
                currentItem.markEdited();
            }
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
        const primaryPane = getPrimaryPaneRoot();
        if (primaryPane) {
            bindPaneInputs(primaryPane);
        }

        // Bind any already-present secondary panes
        document.querySelectorAll('.editor-pane').forEach((pane) => {
            if (pane !== primaryPane) {
                bindPaneInputs(pane);
            }
        });

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

/**
 * Initialize drag and drop for the content editor
 */
export function initializeContentEditorDragDrop() {
    console.log('Setting up content editor drag/drop handlers');
    const primaryPane = getPrimaryPaneRoot();
    
    if (!primaryPane) {
        console.warn('Primary editor pane not found for drag/drop setup');
        return;
    }

    attachPaneDragDropHandlers(primaryPane);
    primaryPane.addEventListener('contextmenu', handlePaneContextMenu);
}

/**
 * Handles drag over for content editor
 */
function handleEditorDragOver(e) {
    // Skip pane-level handling when reordering content items within a list
    if (e.dataTransfer.types && e.dataTransfer.types.includes('text/html') && !e.dataTransfer.types.includes('text/plain')) {
        return; // let list-level handlers manage reorder
    }
    console.log('Editor dragover triggered - setting dropEffect to copy');
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.dropEffect = 'copy';
    console.log('After dragover - dropEffect set to:', e.dataTransfer.dropEffect);
    return false;
}

/**
 * Handles drag enter for content editor
 */
function handleEditorDragEnter(e) {
    if (e.dataTransfer.types && e.dataTransfer.types.includes('text/html') && !e.dataTransfer.types.includes('text/plain')) {
        return;
    }
    console.log('Editor dragenter triggered');
    e.preventDefault();
    const pane = e.currentTarget.closest('.editor-pane') || e.currentTarget;
    if (pane.classList) {
        pane.classList.add('drag-over-editor');
    }
}

/**
 * Handles drag leave for content editor
 */
function handleEditorDragLeave(e) {
    if (e.dataTransfer.types && e.dataTransfer.types.includes('text/html') && !e.dataTransfer.types.includes('text/plain')) {
        return;
    }
    const pane = e.currentTarget.closest('.editor-pane') || e.currentTarget;
    if (pane.contains(e.relatedTarget)) return;
    pane.classList.remove('drag-over-editor');
}

/**
 * Handles drop for content editor
 */
async function handleEditorDrop(e) {
    if (e.dataTransfer.types && e.dataTransfer.types.includes('text/html') && !e.dataTransfer.types.includes('text/plain')) {
        return;
    }
    console.log('Editor drop triggered');
    e.preventDefault();
    e.stopPropagation();
    
    const pane = e.currentTarget.closest('.editor-pane') || e.currentTarget;
    pane.classList.remove('drag-over-editor');
    
    const draggedId = e.dataTransfer.getData('text/plain');
    console.log('Dragged ID:', draggedId);
    if (!draggedId) {
        console.warn('No dragged ID found');
        return;
    }
    
    console.log('Node dropped on editor:', draggedId);
    
    // Find the node in the document structure
    const documentStructure = stateManager.getDocumentStructure();
    console.log('Document structure:', documentStructure);
    const node = findNodeById(documentStructure, draggedId);
    console.log('Found node:', node);
    
    if (!node) {
        console.warn('Dropped node not found:', draggedId);
        return;
    }
    
    console.log('About to call loadContentForEditing with node:', node);
    // Load the node into the specific pane
    loadContentForEditing(node, pane);
    console.log('loadContentForEditing completed');
    
    const { showSuccess } = await import('./message-center.js');
    const nodeName = node.title || node.name || 'Item';
    showSuccess(`${nodeName} loaded for editing`);
}

/**
 * Helper: get primary pane root
 */
function getPrimaryPaneRoot() {
    return document.querySelector('.editor-pane.primary');
}

/**
 * Helper: get primary content list
 */
function getPrimaryContentList() {
    return document.getElementById('myList');
}

/**
 * Helper: get editor elements for a pane (primary or secondary)
 */
function getEditorElements(paneRoot) {
    const isPrimary = paneRoot?.classList?.contains('primary');
    if (isPrimary) {
        return {
            sectionId: document.getElementById('contentID'),
            sectionTitle: document.getElementById('contentTitle'),
            contentList: document.getElementById('myList'),
            contentTextarea: document.getElementById('myTextarea'),
        };
    }

    return {
        sectionId: paneRoot?.querySelector('.content-id'),
        sectionTitle: paneRoot?.querySelector('.content-title'),
        contentList: paneRoot?.querySelector('.content-list'),
        contentTextarea: paneRoot?.querySelector('.content-textarea'),
    };
}

/**
 * Helper: get pane controls (list + textarea)
 */
function getPaneControls(paneRoot) {
    const { contentList, contentTextarea } = getEditorElements(paneRoot);
    return { contentList, contentTextarea };
}

/**
 * Bind textarea/title handlers for a pane
 */
function bindPaneInputs(paneRoot) {
    const { contentTextarea, sectionTitle, contentList } = getEditorElements(paneRoot);

    if (contentTextarea) {
        contentTextarea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addListItem(null, paneRoot);
            }
        });
    }

    if (sectionTitle) {
        sectionTitle.addEventListener('input', (event) => {
            const currentItem = stateManager.getCurrentEditingItem();
            if (currentItem) {
                const newValue = event.target.value;
                currentItem.name = newValue;
                console.log(`Updating title for ${currentItem.id}: ${newValue}`);
                // TODO: Update source data with debouncing
            }
        });
    }

    // If we ever need to sync content updates per pane, the list reference is available here
    if (contentList) {
        // placeholder for future per-pane behaviors
    }
}

/**
 * Create a new editor pane (secondary)
 */
function createEditorPane() {
    const pane = document.createElement('div');
    pane.className = 'editor-pane';
    pane.dataset.paneId = `pane-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    pane.innerHTML = `
        <div class="editor-pane-header">
            <span class="pane-title">Editor</span>
            <button class="pane-close-btn" title="Close">×</button>
        </div>
        <h4 class="content-id">Item Label</h4>
        <textarea class="content-title" placeholder="Section Title"></textarea>
        <ol class="dynamic-container content-list"></ol>
        <textarea class="content-textarea" placeholder="Type something here, press the Enter button to add it to the document"></textarea>
    `;

    const closeBtn = pane.querySelector('.pane-close-btn');
    closeBtn.addEventListener('click', () => removeEditorPane(pane));
    pane.addEventListener('contextmenu', handlePaneContextMenu);
    attachPaneDragDropHandlers(pane);
    bindPaneInputs(pane);
    return pane;
}

/**
 * Add a new editor pane to the UI
 */
function addEditorPane() {
    const container = document.getElementById('editor-panels');
    if (!container) return;
    const pane = createEditorPane();
    container.appendChild(pane);
    console.log('Added new editor pane', pane.dataset.paneId);
}

/**
 * Remove an editor pane
 */
function removeEditorPane(pane) {
    const container = document.getElementById('editor-panels');
    if (!container || !pane) return;
    if (pane.classList.contains('primary')) return; // never remove primary
    container.removeChild(pane);
    console.log('Removed editor pane', pane.dataset.paneId);
}

/**
 * Attach drag/drop handlers to a pane
 */
function attachPaneDragDropHandlers(pane) {
    if (!pane) return;
    pane.addEventListener('dragover', handleEditorDragOver, false);
    pane.addEventListener('dragenter', handleEditorDragEnter, false);
    pane.addEventListener('dragleave', handleEditorDragLeave, false);
    pane.addEventListener('drop', handleEditorDrop, false);
}

/**
 * Context menu handler for panes
 */
function handlePaneContextMenu(e) {
    e.preventDefault();
    const menu = buildPaneContextMenu(e.currentTarget, e.clientX, e.clientY);
    document.body.appendChild(menu);
}

function buildPaneContextMenu(pane, x, y) {
    // remove existing
    document.querySelectorAll('.pane-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu pane-context-menu open';
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;

    const addItem = document.createElement('div');
    addItem.className = 'context-menu-item';
    addItem.textContent = 'New editor';
    addItem.addEventListener('click', () => {
        addEditorPane();
        menu.remove();
    });

    const removeItem = document.createElement('div');
    removeItem.className = 'context-menu-item';
    removeItem.textContent = 'Close editor';
    if (pane.classList.contains('primary')) {
        removeItem.classList.add('disabled');
    } else {
        removeItem.addEventListener('click', () => {
            removeEditorPane(pane);
            menu.remove();
        });
    }

    menu.appendChild(addItem);
    menu.appendChild(removeItem);

    const closeOnClick = (ev) => {
        if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('click', closeOnClick);
        }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 0);

    return menu;
}

/**
 * Find a node by ID in the document structure
 * @param {Array} nodes - Array of nodes to search
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
            if (found) return found;
        }
    }
    return null;
}
