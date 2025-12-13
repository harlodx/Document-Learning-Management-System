/**
 * Data Operations Module
 * Handles import, export, save, and document operations with comprehensive error handling
 */

import DocumentNode from './documentnode.js';
import { stateManager } from './state-manager.js';
import { reconstructTreeFromFlatList, validateFlatList } from './tree-reconstruction.js';
import { renderDocumentStructure } from './tree-renderer.js';
import { 
    saveDocumentToStorage, 
    loadDocumentFromStorage,
    saveRevisionsToStorage,
    loadRevisionsFromStorage,
    scheduleAutoSave
} from './storage-manager.js';
import {
    saveWorkingCopy,
    commitChanges,
    exportVersionedDocument,
    importVersionedDocument,
    getDefaultFilename,
    hasUncommittedChanges,
    getDocumentStats,
    getCurrentDocument
} from './version-control.js';
import { renderPendingItems } from './pending-manager.js';
import { showError, showSuccess, showNotification, showConfirm, showPrompt } from './message-center.js';

/**
 * Imports a JSON document and updates the document structure
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object[]} The parsed document structure
 * @throws {Error} If JSON is invalid or parsing fails
 */
export function importJsonDocument(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
        throw new Error('Invalid JSON string provided');
    }

    try {
        const parsedDocument = JSON.parse(jsonString);
        
        if (!Array.isArray(parsedDocument)) {
            throw new Error('Parsed JSON must be an array of document nodes');
        }

        console.log(`Parsed document with ${parsedDocument.length} nodes`);
        return parsedDocument;

    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON format: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Handles file import from file input
 * @param {File} file - The file to import
 * @returns {Promise<Object[]>} Promise resolving to the imported document structure
 */
export function handleFileImport(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        if (!file.name.endsWith('.json')) {
            reject(new Error('Only JSON files are supported'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonContent = e.target.result;
                const importedDocument = importJsonDocument(jsonContent);
                
                // Validate the structure
                const validation = validateFlatList(importedDocument);
                if (!validation.isValid) {
                    console.warn('Validation warnings:', validation.errors);
                }

                // Clear existing IDs and hydrate to DocumentNode instances
                DocumentNode._existingIds.clear();
                const rootNodes = importedDocument.map(jsonNode => 
                    DocumentNode.fromJSON(jsonNode, null)
                );

                resolve(rootNodes);

            } catch (error) {
                reject(new Error(`Failed to process file: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

/**
 * Initializes file input handler
 * @param {string} inputId - The ID of the file input element
 */
export function initializeFileInput(inputId = 'fileInput') {
    const fileInput = document.getElementById(inputId);

    if (!fileInput) {
        console.warn(`File input element '${inputId}' not found`);
        return;
    }

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];

        if (!file) {
            console.log('No file selected');
            return;
        }

        try {
            const rootNodes = await handleFileImport(file);
            
            // Update state
            stateManager.setDocumentStructure(rootNodes);

            // Smart tree initialization (sets collapse states, loads appropriate node)
            initializeTreeState(rootNodes);

            console.log(`Successfully imported document with ${rootNodes.length} root nodes`);

        } catch (error) {
            console.error('Import failed:', error);
            showError(`Import failed: ${error.message}`);
        }
    });
}

/**
 * Exports the current versioned document (with full history) as JSON
 * @returns {string} JSON string representation with version history
 */
export function exportVersionedDocumentAsJson() {
    try {
        const jsonString = exportVersionedDocument();
        return jsonString;

    } catch (error) {
        throw new Error(`Export failed: ${error.message}`);
    }
}

/**
 * Downloads the versioned document as a JSON file with user-specified name
 * @param {string} customFilename - Optional custom filename
 */
export async function downloadVersionedDocument(customFilename = null) {
    try {
        // Get default filename
        const defaultFilename = getDefaultFilename();
        
        // Prompt user for filename if not provided
        let filename = customFilename;
        if (!filename) {
            filename = await showPrompt(
                'Enter filename for download:\n(Include full version history)',
                defaultFilename,
                'Filename'
            );
            
            if (!filename) {
                console.log('Download cancelled by user');
                return;
            }
            
            // Ensure .json extension
            if (!filename.endsWith('.json')) {
                filename += '.json';
            }
        }

        // Get the versioned document JSON
        const jsonString = exportVersionedDocumentAsJson();
        
        // Get stats for user feedback
        const stats = getDocumentStats();
        
        // Create blob and download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`Downloaded versioned document as ${filename}`);
        console.log('Document stats:', stats);
        
        showSuccess(
            `Successfully downloaded: ${filename} | ` +
            `Version: ${stats.currentVersion} | ` +
            `Total versions: ${stats.totalVersions} | ` +
            `Nodes: ${stats.nodeCount} | ` +
            `Size: ${stats.totalSizeKB} KB`
        );

    } catch (error) {
        console.error('Download failed:', error);
        showError(`Download failed: ${error.message}`);
        throw error;
    }
}

/**
 * Exports the current document structure as JSON (without version history)
 * @param {Object[]} documentStructure - The document structure to export
 * @returns {string} JSON string representation
 */
export function exportDocumentAsJson(documentStructure) {
    if (!Array.isArray(documentStructure)) {
        throw new Error('Invalid document structure for export');
    }

    try {
        const jsonString = JSON.stringify(documentStructure, null, 2);
        return jsonString;

    } catch (error) {
        throw new Error(`Export failed: ${error.message}`);
    }
}

/**
 * Downloads the document structure as a JSON file (without version history)
 * @param {Object[]} documentStructure - The document structure to download
 * @param {string} filename - The filename for the download
 */
export function downloadDocumentAsFile(documentStructure, filename = 'document.json') {
    try {
        const jsonString = exportDocumentAsJson(documentStructure);
        
        // Create blob and download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`Downloaded document as ${filename}`);

    } catch (error) {
        console.error('Download failed:', error);
        throw error;
    }
}

/**
 * Saves the current document state (working copy - not committed to history)
 * @param {string} docId - The document ID to save (optional)
 * @returns {Object} Save result with uncommitted changes flag
 */
export function saveDocument(docId) {
    try {
        const documentStructure = stateManager.getDocumentStructure();
        const pendingItems = stateManager.getPendingItems() || [];
        
        if (!documentStructure || documentStructure.length === 0) {
            throw new Error('No document to save');
        }

        console.log(`Saving document ${docId || 'default'}...`);
        
        // Save to version control (working copy) including pending items
        const result = saveWorkingCopy(documentStructure, pendingItems);
        
        // Also save to localStorage for persistence
        const storageSuccess = saveDocumentToStorage(documentStructure);
        
        // Mark as having unsaved export changes (dynamic import to avoid circular dependency)
        import('./version-control.js').then(({ markUnsavedExport }) => {
            markUnsavedExport();
        });
        
        if (result.success && storageSuccess) {
            console.log('Document saved successfully. Uncommitted changes:', result.uncommittedChanges);
            
            // Dispatch save event for UI feedback
            window.dispatchEvent(new CustomEvent('dlms:saved', {
                detail: { 
                    timestamp: new Date().toISOString(),
                    uncommittedChanges: result.uncommittedChanges
                }
            }));
            
            // Update UI to show uncommitted changes indicator
            updateSaveCommitUI(result.uncommittedChanges);
        }

        return result;

    } catch (error) {
        console.error(`Error saving document ${docId}:`, error);
        showError(`Failed to save document: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Commits the current document with a commit message
 * @param {string} docId - The document ID
 * @param {string} commitMessage - The commit message
 * @param {string} author - The author name
 * @returns {Object} Commit result
 */
export async function commitDocument(docId, commitMessage = '', author = 'User') {
    try {
        // Check if there are uncommitted changes
        if (!hasUncommittedChanges()) {
            showError('No changes to commit. Make changes and save first.');
            return { success: false, message: 'No changes to commit' };
        }

        // Prompt for commit message if not provided
        let message = commitMessage;
        if (!message) {
            message = await showPrompt('Enter commit message:', 'Updated document', 'Commit message');
            if (!message) {
                return { success: false, message: 'Commit cancelled' };
            }
        }

        // Get current user info from user manager
        const { getCurrentUserInfo } = await import('./user-manager.js');
        const userInfo = getCurrentUserInfo();
        
        // Use author name from current user or prompt
        let authorName = author;
        if (userInfo && userInfo.name) {
            authorName = userInfo.name;
        } else if (author === 'User') {
            const storedAuthor = localStorage.getItem('dlms_author_name');
            if (storedAuthor) {
                authorName = storedAuthor;
            } else {
                const promptedName = await showPrompt('Enter your name:', 'User', 'Your name');
                if (promptedName) {
                    authorName = promptedName;
                    localStorage.setItem('dlms_author_name', promptedName);
                }
            }
        }

        console.log(`Committing document ${docId || 'default'}: ${message}`);
        console.log('User info:', userInfo);
        
        // Commit to version history with user info
        const result = commitChanges(message, authorName, userInfo);
        
        if (result.success) {
            console.log(`Committed as version ${result.version}`);
            
            // Save committed state to localStorage
            const currentDoc = getCurrentDocument();
            if (currentDoc) {
                saveDocumentToStorage(currentDoc.document);
            }
            
            // Mark as having unsaved export changes
            import('./version-control.js').then(({ markUnsavedExport }) => {
                markUnsavedExport();
            });
            
            // Dispatch commit event
            window.dispatchEvent(new CustomEvent('dlms:committed', {
                detail: { 
                    version: result.version,
                    message: result.message,
                    timestamp: new Date().toISOString()
                }
            }));
            
            // Update UI
            updateSaveCommitUI(false);
            
            // Refresh revision list
            window.dispatchEvent(new CustomEvent('dlms:refreshRevisions'));
            
            showSuccess(`Successfully committed version ${result.version}: ${message}`);
        }

        return result;

    } catch (error) {
        console.error(`Error committing document ${docId}:`, error);
        showError(`Failed to commit: ${error.message}`);
        throw error;
    }
}

/**
 * Finds a node and returns it with parent information
 * @param {Object[]} nodes - Array of nodes to search
 * @param {string} nodeId - ID of node to find
 * @param {Object} parent - Parent node (for recursion)
 * @returns {Object|null} Object with node, parent, and index, or null if not found
 */
function findNodeAndParent(nodes, nodeId, parent = null) {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === nodeId) {
            return {
                node: nodes[i],
                parent: parent,
                array: nodes,
                index: i
            };
        }
        
        // Check children
        if (nodes[i].children && nodes[i].children.length > 0) {
            const found = findNodeAndParent(nodes[i].children, nodeId, nodes[i]);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * Updates the save/commit UI indicators
 * @private
 */
function updateSaveCommitUI(hasUncommitted) {
    const commitBtn = document.getElementById('commitDocument');
    if (commitBtn) {
        if (hasUncommitted) {
            commitBtn.classList.add('has-changes');
            commitBtn.title = 'You have uncommitted changes';
        } else {
            commitBtn.classList.remove('has-changes');
            commitBtn.title = 'Commit changes to version history';
        }
    }
}

/**
 * Moves a node to pending (soft delete)
 * @param {string} nodeId - The ID of the node to pending
 */
export async function deleteNode(nodeId) {
    try {
        if (!nodeId) {
            throw new Error('Node ID is required');
        }

        // Get current document structure
        const documentStructure = stateManager.getDocumentStructure();
        
        if (!documentStructure || documentStructure.length === 0) {
            throw new Error('No document structure loaded');
        }

        // Find the node to pending
        const nodeInfo = findNodeAndParent(documentStructure, nodeId);
        
        if (!nodeInfo || !nodeInfo.node) {
            throw new Error(`Node ${nodeId} not found`);
            return;
        }

        // Clone the node before removing it
        const nodeToPending = JSON.parse(JSON.stringify(nodeInfo.node));
        nodeToPending._pendingAt = new Date().toISOString();
        nodeToPending._originalParentId = nodeInfo.parent?.id || 'root';
        nodeToPending._originalIndex = nodeInfo.index;
        
        // Get or initialize pending array
        let pendingItems = stateManager.getPendingItems() || [];
        pendingItems.push(nodeToPending);
        stateManager.setPendingItems(pendingItems);

        // Remove from document structure
        const result = findAndDeleteNode(documentStructure, nodeId);
        
        if (!result) {
            throw new Error(`Failed to remove node ${nodeId}`);
        }

        // Update state with modified structure
        stateManager.setDocumentStructure(documentStructure);

        // Save to version control working copy (with updated pending items)
        saveWorkingCopy(documentStructure, pendingItems);

        // Re-render the tree and Pending section
        renderDocumentStructure(documentStructure);
        renderPendingItems();

        // Clear content editor if pending node was being edited
        const currentNode = stateManager.getCurrentEditingItem();
        if (currentNode && currentNode.id === nodeId) {
            stateManager.setCurrentEditingItem(null);
            const myList = document.getElementById('myList');
            if (myList) myList.innerHTML = '';
            const contentTitle = document.getElementById('contentTitle');
            if (contentTitle) contentTitle.value = '';
            const contentID = document.getElementById('contentID');
            if (contentID) contentID.textContent = '';
        }

        // Auto-save after moving to pending
        scheduleAutoSave();

        // Show brief informational message
        const nodeName = nodeToPending.title || nodeToPending.name || 'Item';
        showSuccess(`${nodeName} moved to Pending`);

        console.log(`Deleted node ${nodeId} successfully`);

    } catch (error) {
        console.error(`Error deleting node ${nodeId}:`, error);
        showError(`Failed to delete node: ${error.message}`);
        throw error;
    }
}

/**
 * Helper function to find and delete a node from the tree
 * @private
 * @param {Array} nodes - Array of nodes to search
 * @param {string} targetId - ID of node to delete
 * @returns {boolean} True if node was found and deleted
 */
function findAndDeleteNode(nodes, targetId) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Found the target node at this level
        if (node.id === targetId) {
            // Recursively delete all child IDs
            DocumentNode.deleteIdsRecursively(node);
            // Remove from array
            nodes.splice(i, 1);
            return true;
        }
        
        // Search in children
        if (node.children && node.children.length > 0) {
            if (findAndDeleteNode(node.children, targetId)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Unlocks a document for editing
 * TODO: Implement document locking mechanism
 * @param {string} docId - The document ID to unlock
 */
export function unlockDocument(docId) {
    try {
        console.log(`Unlocking document ${docId}...`);
        
        // TODO: Implement unlock logic
        // TODO: Check permissions
        // TODO: Update lock status

        console.log('Document unlocked successfully');

    } catch (error) {
        console.error(`Error unlocking document ${docId}:`, error);
        throw error;
    }
}

/**
 * Creates a new blank document
 */
export async function createNewDocument() {
    try {
        console.log('=== CREATE NEW DOCUMENT STARTED ===');
        
        // Check if there are unsaved changes
        if (hasUncommittedChanges()) {
            console.log('Uncommitted changes detected, prompting user...');
            const confirmed = await showConfirm(
                'You have unsaved changes. Creating a new document will discard them. Continue?',
                'Create New Document'
            );
            
            if (!confirmed) {
                console.log('New document creation cancelled by user');
                return;
            }
        }

        // Clear existing IDs
        console.log('Clearing existing DocumentNode IDs...');
        DocumentNode._existingIds.clear();
        console.log('IDs cleared. Count:', DocumentNode._existingIds.size);
        
        // Clear the tree DOM
        console.log('Looking for tree container...');
        const treeContainer = document.querySelector('.tree');
        console.log('Tree container found:', !!treeContainer);
        
        if (treeContainer) {
            console.log('Tree container children before clear:', treeContainer.children.length);
            console.log('Tree container innerHTML length:', treeContainer.innerHTML.length);
            treeContainer.innerHTML = '';
            console.log('Tree container cleared. Children after:', treeContainer.children.length);
        } else {
            console.warn('Tree container not found in DOM!');
        }
        
        // Clear pending items from state and DOM
        console.log('Clearing pending items...');
        const currentPending = stateManager.getPendingItems() || [];
        console.log('Current pending items:', currentPending.length);
        
        // Delete IDs to prevent conflicts
        currentPending.forEach(item => {
            DocumentNode.deleteIdsRecursively(item);
        });
        
        // Clear pending state
        stateManager.setPendingItems([]);
        
        // Re-render empty pending
        renderPendingItems();
        console.log('Pending items cleared');
        
        // Create a single root node
        console.log('Creating new root node...');
        const newRoot = new DocumentNode('1', 'New Document', [], []);
        const rootNodes = [newRoot];
        console.log('New root node created:', newRoot.id, newRoot.name);
        
        // Update state
        console.log('Updating state with new structure...');
        stateManager.setDocumentStructure(rootNodes);
        console.log('State updated');
        
        // Smart tree initialization (collapses and loads first node)
        console.log('Initializing tree state...');
        initializeTreeState(rootNodes);
        console.log('Tree state initialized');
        
        // Clear any existing revision history
        console.log('Clearing revision history...');
        saveRevisionsToStorage([]);
        console.log('Revision history cleared');
        
        // Save the new blank document
        console.log('Saving new document...');
        saveDocument();
        console.log('Document saved');
        
        showSuccess('New document created');
        console.log('=== CREATE NEW DOCUMENT COMPLETED ===');

    } catch (error) {
        console.error('Error creating new document:', error);
        console.error('Stack trace:', error.stack);
        showError('Failed to create new document');
    }
}

/**
 * Triggers the import document flow
 */
export function importDocument() {
    try {
        const fileInput = document.getElementById('fileInput');
        
        if (!fileInput) {
            throw new Error('File input element not found');
        }

        // Trigger file selection dialog
        fileInput.click();

    } catch (error) {
        console.error('Error triggering import:', error);
        showError('Failed to open import dialog');
    }
}

/**
 * Initialize tree state based on last edit time
 * Collapses all nodes to root level, then expands path to last edited node if edited within 24 hours
 * @param {DocumentNode[]} rootNodes - The root nodes of the document
 */
async function initializeTreeState(rootNodes) {
    try {
        const { findLastEditedNode, collapseAllExcept } = await import('./tree-renderer.js');
        
        // Find last edited node within 24 hours
        const lastEdited = findLastEditedNode(rootNodes, 24);
        
        if (lastEdited) {
            console.log(`Found recently edited node: ${lastEdited.node.id} at ${lastEdited.node.lastEditTime}`);
            
            // Collapse all nodes except the path to last edited (excluding the final node itself)
            const pathToParent = lastEdited.path.slice(0, -1);
            collapseAllExcept(pathToParent, rootNodes);
            
            // Render with collapse states applied
            renderDocumentStructure(rootNodes);
            
            // Load the last edited node into editor
            setTimeout(() => {
                const nodeElement = document.querySelector(`[data-node-id="${lastEdited.node.id}"]`);
                if (nodeElement) {
                    nodeElement.click();
                }
            }, 100);
        } else {
            console.log('No recent edits found, collapsing all subnodes and loading first root node');
            
            // Collapse all subnodes (all nodes with children should be collapsed)
            collapseAllExcept([], rootNodes);
            
            // Render with collapse states applied
            renderDocumentStructure(rootNodes);
            
            // Load first root node
            if (rootNodes.length > 0) {
                setTimeout(() => {
                    const firstNodeElement = document.querySelector(`[data-node-id="${rootNodes[0].id}"]`);
                    if (firstNodeElement) {
                        firstNodeElement.click();
                    }
                }, 100);
            }
        }
    } catch (error) {
        console.error('Error initializing tree state:', error);
        // Fallback: just load first root node
        if (rootNodes.length > 0) {
            setTimeout(() => {
                const firstNodeElement = document.querySelector(`[data-node-id="${rootNodes[0].id}"]`);
                if (firstNodeElement) {
                    firstNodeElement.click();
                }
            }, 100);
        }
    }
}

/**
 * Loads document from storage or falls back to test data
 * @param {Object[]} testData - Optional test data to use if no saved document
 * @returns {Object[]} The loaded document structure
 */
export function loadInitialData(testData = null) {
    try {
        // Try to load from storage first
        const savedDocument = loadDocumentFromStorage();
        
        if (savedDocument && savedDocument.length > 0) {
            console.log('Loading document from local storage...');
            
            // Clear existing IDs and hydrate
            DocumentNode._existingIds.clear();
            const rootNodes = savedDocument.map(jsonNode => 
                DocumentNode.fromJSON(jsonNode, null)
            );

            // Update state first
            stateManager.setDocumentStructure(rootNodes);
            
            // Smart tree initialization (sets collapse states, then renders)
            initializeTreeState(rootNodes);

            return rootNodes;
        }

        // Fall back to test data if provided
        if (testData) {
            console.log('No saved document found, loading test data...');
            return loadTestData(testData);
        }

        // No data available
        console.log('No document to load');
        return [];

    } catch (error) {
        console.error('Error loading initial data:', error);
        
        // Try test data as last resort
        if (testData) {
            console.log('Falling back to test data due to error...');
            return loadTestData(testData);
        }
        
        return [];
    }
}

/**
 * Loads test/demo data into the application
 * @param {Object[]} testData - Array of test document nodes
 */
export function loadTestData(testData) {
    try {
        if (!Array.isArray(testData)) {
            throw new Error('Test data must be an array');
        }

        // Reconstruct tree from flat list
        const nestedStructure = reconstructTreeFromFlatList(testData);
        
        console.log(`Loaded test data: ${nestedStructure.length} root nodes`);

        // Clear existing IDs and hydrate
        DocumentNode._existingIds.clear();
        const rootNodes = nestedStructure.map(jsonNode => 
            DocumentNode.fromJSON(jsonNode, null)
        );

        // Update state and render
        stateManager.setDocumentStructure(rootNodes);
        renderDocumentStructure(rootNodes);

        return rootNodes;

    } catch (error) {
        console.error('Error loading test data:', error);
        throw error;
    }
}

/**
 * Export complete document with version history
 */
export async function exportCompleteDocument() {
    try {
        const { exportVersionHistory, clearUnsavedExport, getDefaultFilename } = await import('./version-control.js');
        const { createExportPackage, downloadExportFile, saveVersionHistoryToStorage } = await import('./storage-manager.js');
        const { exportUsersData } = await import('./user-manager.js');
        
        // Get current state
        const documentStructure = stateManager.getDocumentStructure();
        const versionHistory = exportVersionHistory();
        const usersData = exportUsersData();
        
        if (!versionHistory) {
            showError('No version history available to export');
            return false;
        }
        
        // Get document title and subtitle
        const titleElement = document.getElementById('document-name');
        const subtitleElement = document.getElementById('document-subtitle');
        const documentTitle = titleElement?.value || titleElement?.textContent || 'Untitled Document';
        const documentSubtitle = subtitleElement?.value || '';
        
        // Create export package (includes users data)
        const exportPackage = createExportPackage(documentStructure, versionHistory, documentTitle, documentSubtitle, usersData);
        
        // Save to localStorage
        saveVersionHistoryToStorage(versionHistory);
        
        // Generate filename from document title
        const sanitizedTitle = documentTitle
            .replace(/[^a-z0-9\s-]/gi, '')  // Remove special characters
            .replace(/\s+/g, '_')            // Replace spaces with underscores
            .toLowerCase()
            .substring(0, 50);               // Limit length
        
        const version = versionHistory.metadata.currentVersion || 0;
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${sanitizedTitle}_v${version}_${timestamp}.json`;
        
        // Download file with user-controlled name
        const success = await downloadExportFile(exportPackage, filename);
        
        if (success) {
            clearUnsavedExport();
            showSuccess('Document exported successfully!');
        }
        
        return success;
        
    } catch (error) {
        console.error('Error exporting document:', error);
        showError(`Export failed: ${error.message}`);
        return false;
    }
}

/**
 * Import complete document from file with unsaved changes check
 */
export async function importCompleteDocument() {
    try {
        const { hasUnsavedChanges, importVersionHistory, clearUnsavedExport } = await import('./version-control.js');
        const { validateAndExtractImport, saveVersionHistoryToStorage } = await import('./storage-manager.js');
        
        // Check for unsaved changes
        if (hasUnsavedChanges()) {
            const confirmImport = await showConfirm(
                'You have unsaved changes. Importing will overwrite your current document.\\n\\n' +
                'Would you like to export the current document before importing?',
                'Yes, Export First',
                'No, Import Anyway'
            );
            
            if (confirmImport) {
                // User wants to export first
                await exportCompleteDocument();
            }
            // If user chose "No, Import Anyway", we continue with import
        }
        
        // Trigger file input
        const fileInput = document.getElementById('import-file-input');
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                // Validate and extract
                const validated = validateAndExtractImport(importData);
                if (!validated) return;
                
                // Import version history
                const success = importVersionHistory(validated.versionHistory);
                if (!success) {
                    showError('Failed to import version history');
                    return;
                }
                
                // Update state
                stateManager.setDocumentStructure(validated.documentStructure);
                
                // Restore document title and subtitle if available
                if (importData.metadata) {
                    const titleElement = document.getElementById('document-name');
                    const subtitleElement = document.getElementById('document-subtitle');
                    
                    if (titleElement && importData.metadata.documentTitle) {
                        titleElement.value = importData.metadata.documentTitle;
                    }
                    
                    if (subtitleElement && importData.metadata.documentSubtitle) {
                        subtitleElement.value = importData.metadata.documentSubtitle;
                    }
                }
                
                // Restore pending items if available
                if (importData.pendingItems && Array.isArray(importData.pendingItems)) {
                    stateManager.setPendingItems(importData.pendingItems);
                    console.log(`Restored ${importData.pendingItems.length} pending items`);
                } else {
                    stateManager.setPendingItems([]);
                }
                
                // Restore users if available
                if (importData.users) {
                    const { importUsersData, updateUserSelector } = await import('./user-manager.js');
                    const imported = importUsersData(importData.users);
                    if (imported) {
                        console.log(`Restored ${importData.users.users?.length || 0} users`);
                        updateUserSelector();
                    }
                }
                
                // Save to localStorage
                saveDocumentToStorage(validated.documentStructure);
                saveVersionHistoryToStorage(validated.versionHistory);
                
                // Re-render everything
                renderDocumentStructure(validated.documentStructure);
                renderPendingItems();
                
                // Rebuild revision list from imported history
                const { buildRevisionListFromHistory } = await import('./revision-manager.js');
                buildRevisionListFromHistory();
                
                // Clear unsaved flag
                clearUnsavedExport();
                
                showSuccess('Document imported successfully!');
                
            } catch (error) {
                console.error('Error importing file:', error);
                showError(`Import failed: ${error.message}`);
            }
            
            // Reset file input
            fileInput.value = '';
        };
        
        fileInput.click();
        return true;
        
    } catch (error) {
        console.error('Error in import process:', error);
        showError(`Import failed: ${error.message}`);
        return false;
    }
}
