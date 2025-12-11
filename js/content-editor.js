/**
 * Content Editor Module
 * Handles content editing functionality with proper event management
 */

import { stateManager } from './state-manager.js';

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
    listItem.textContent = contentText || '';

    // Add click listener for editing
    const editHandler = (event) => editListItem(event);
    listItem.addEventListener('click', editHandler);
    
    // Store listener for cleanup
    activeListeners.set(listItem, editHandler);

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
 */
function editListItem(event) {
    const listItem = event.target;
    
    if (!listItem || listItem.tagName !== 'LI') {
        return;
    }

    try {
        const currentText = listItem.textContent;

        // Create edit textarea
        const editArea = document.createElement('textarea');
        editArea.className = 'editTextArea';
        editArea.value = currentText;

        // Replace content with textarea
        listItem.textContent = '';
        listItem.appendChild(editArea);
        editArea.focus();

        // Save on blur
        const blurHandler = (e) => saveContentChanges(e);
        editArea.addEventListener('blur', blurHandler);

        // Save on Enter key
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                editArea.blur();
            }
        };
        editArea.addEventListener('keydown', keyHandler);

    } catch (error) {
        console.error('Error editing list item:', error);
    }
}

/**
 * Saves changes made to a content item
 * @param {Event} event - The blur event from the edit textarea
 */
function saveContentChanges(event) {
    try {
        const editArea = event.target;
        const listItem = editArea.parentElement;

        if (!listItem) {
            return;
        }

        const newValue = editArea.value.trim();
        listItem.textContent = newValue;

        // TODO: Update source data
        updateSourceContent();

    } catch (error) {
        console.error('Error saving content changes:', error);
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
        // Collect all content items
        const contentArray = Array.from(myList.children).map(li => li.textContent.trim());

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
