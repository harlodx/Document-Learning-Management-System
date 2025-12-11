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

            // Render the imported structure
            renderDocumentStructure(rootNodes);

            console.log(`Successfully imported document with ${rootNodes.length} root nodes`);

        } catch (error) {
            console.error('Import failed:', error);
            alert(`Import failed: ${error.message}`);
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
export function downloadVersionedDocument(customFilename = null) {
    try {
        // Get default filename
        const defaultFilename = getDefaultFilename();
        
        // Prompt user for filename if not provided
        let filename = customFilename;
        if (!filename) {
            filename = prompt(
                'Enter filename for download:\n(Include full version history)',
                defaultFilename
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
        
        alert(
            `Successfully downloaded: ${filename}\n\n` +
            `Version: ${stats.currentVersion}\n` +
            `Total versions: ${stats.totalVersions}\n` +
            `Nodes: ${stats.nodeCount}\n` +
            `Size: ${stats.totalSizeKB} KB`
        );

    } catch (error) {
        console.error('Download failed:', error);
        alert(`Download failed: ${error.message}`);
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
        
        if (!documentStructure || documentStructure.length === 0) {
            throw new Error('No document to save');
        }

        console.log(`Saving document ${docId || 'default'}...`);
        
        // Save to version control (working copy)
        const result = saveWorkingCopy(documentStructure);
        
        // Also save to localStorage for persistence
        const storageSuccess = saveDocumentToStorage(documentStructure);
        
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
        alert(`Failed to save document: ${error.message}`);
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
export function commitDocument(docId, commitMessage = '', author = 'User') {
    try {
        // Check if there are uncommitted changes
        if (!hasUncommittedChanges()) {
            alert('No changes to commit. Make changes and save first.');
            return { success: false, message: 'No changes to commit' };
        }

        // Prompt for commit message if not provided
        let message = commitMessage;
        if (!message) {
            message = prompt('Enter commit message:', 'Updated document');
            if (!message) {
                return { success: false, message: 'Commit cancelled' };
            }
        }

        // Prompt for author name if not provided
        let authorName = author;
        if (author === 'User') {
            const storedAuthor = localStorage.getItem('dlms_author_name');
            if (storedAuthor) {
                authorName = storedAuthor;
            } else {
                const promptedName = prompt('Enter your name:', 'User');
                if (promptedName) {
                    authorName = promptedName;
                    localStorage.setItem('dlms_author_name', promptedName);
                }
            }
        }

        console.log(`Committing document ${docId || 'default'}: ${message}`);
        
        // Commit to version history
        const result = commitChanges(message, authorName);
        
        if (result.success) {
            console.log(`Committed as version ${result.version}`);
            
            // Save committed state to localStorage
            const currentDoc = getCurrentDocument();
            if (currentDoc) {
                saveDocumentToStorage(currentDoc.document);
            }
            
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
            
            alert(`Successfully committed version ${result.version}:\n${message}`);
        }

        return result;

    } catch (error) {
        console.error(`Error committing document ${docId}:`, error);
        alert(`Failed to commit: ${error.message}`);
        throw error;
    }
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
        alert('Failed to open import dialog');
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

            // Update state and render
            stateManager.setDocumentStructure(rootNodes);
            renderDocumentStructure(rootNodes);

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
