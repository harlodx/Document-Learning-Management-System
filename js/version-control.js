/**
 * Version Control Module
 * Handles local version tracking with JSON Patch-based history
 */

import * as jsonpatch from 'https://cdn.jsdelivr.net/npm/fast-json-patch@3.1.1/index.mjs';

/**
 * Self-contained document structure with embedded version history
 */
class VersionedDocument {
    constructor(documentName = 'Untitled Document') {
        this.metadata = {
            documentName: documentName,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            currentVersion: 0
        };
        this.document = [];
        this.history = [];
        this.uncommittedChanges = false;
    }
}

// Current working document
let currentDocument = null;
let workingCopy = null; // In-memory working copy (saved but not committed)
let lastCommittedState = null; // Last committed state for comparison

/**
 * Initializes a new versioned document
 * @param {string} documentName - Name of the document
 * @param {Object[]} initialData - Initial document structure
 * @returns {VersionedDocument} The initialized document
 */
export function initializeVersionedDocument(documentName, initialData = []) {
    currentDocument = new VersionedDocument(documentName);
    currentDocument.document = initialData;
    workingCopy = JSON.parse(JSON.stringify(initialData));
    lastCommittedState = JSON.parse(JSON.stringify(initialData));
    
    // Create version 0 commit with the initial state
    if (initialData.length > 0) {
        const initialCommit = {
            version: 0,
            timestamp: new Date().toISOString(),
            author: 'System',
            message: 'Initial document state',
            patch: jsonpatch.compare([], initialData), // Patch from empty to initial
            nodeCount: countNodes(initialData)
        };
        currentDocument.history.push(initialCommit);
    }
    
    console.log(`Initialized versioned document: ${documentName}`);
    return currentDocument;
}

/**
 * Gets the current versioned document
 * @returns {VersionedDocument} The current document
 */
export function getCurrentDocument() {
    return currentDocument;
}

/**
 * Updates the working copy (save without commit)
 * @param {Object[]} newDocumentState - The new document state
 */
export function saveWorkingCopy(newDocumentState) {
    if (!currentDocument) {
        throw new Error('No document initialized. Call initializeVersionedDocument first.');
    }

    workingCopy = JSON.parse(JSON.stringify(newDocumentState));
    currentDocument.document = workingCopy;
    currentDocument.metadata.lastModified = new Date().toISOString();
    
    // Check if there are uncommitted changes
    const hasChanges = JSON.stringify(workingCopy) !== JSON.stringify(lastCommittedState);
    currentDocument.uncommittedChanges = hasChanges;

    console.log('Working copy saved. Uncommitted changes:', hasChanges);
    
    return {
        success: true,
        uncommittedChanges: hasChanges
    };
}

/**
 * Commits the current working copy to version history
 * @param {string} commitMessage - Description of the changes
 * @param {string} author - Author of the commit
 * @returns {Object} Commit result with version number
 */
export function commitChanges(commitMessage, author = 'User') {
    if (!currentDocument) {
        throw new Error('No document initialized');
    }

    if (!currentDocument.uncommittedChanges) {
        console.log('No uncommitted changes to commit');
        return {
            success: false,
            message: 'No changes to commit'
        };
    }

    try {
        // Generate patch from last committed state to current working copy
        const patch = jsonpatch.compare(lastCommittedState, workingCopy);

        // Create commit entry
        const commit = {
            version: currentDocument.metadata.currentVersion + 1,
            timestamp: new Date().toISOString(),
            author: author,
            message: commitMessage,
            patch: patch,
            nodeCount: countNodes(workingCopy)
        };

        // Add to history
        currentDocument.history.push(commit);
        currentDocument.metadata.currentVersion = commit.version;
        currentDocument.metadata.lastModified = commit.timestamp;
        currentDocument.uncommittedChanges = false;

        // Update last committed state
        lastCommittedState = JSON.parse(JSON.stringify(workingCopy));

        console.log(`Committed version ${commit.version}: ${commitMessage}`);

        return {
            success: true,
            version: commit.version,
            message: commitMessage
        };

    } catch (error) {
        console.error('Error committing changes:', error);
        throw error;
    }
}

/**
 * Gets the full version history
 * @returns {Object[]} Array of commit objects
 */
export function getVersionHistory() {
    if (!currentDocument) {
        return [];
    }
    return currentDocument.history;
}

/**
 * Gets a specific version of the document
 * @param {number} version - Version number to retrieve
 * @returns {Object[]} Document state at that version
 */
export function getDocumentAtVersion(version) {
    if (!currentDocument) {
        throw new Error('No document initialized');
    }

    if (version < 0 || version > currentDocument.metadata.currentVersion) {
        throw new Error(`Invalid version: ${version}`);
    }

    try {
        // Start from empty state and apply patches sequentially
        let documentState = [];
        
        // Apply patches from version 0 up to and including target version
        for (let i = 0; i <= version; i++) {
            const commit = currentDocument.history[i];
            if (commit && commit.patch && commit.patch.length > 0) {
                try {
                    const result = jsonpatch.applyPatch(
                        documentState,
                        commit.patch,
                        false, // validate - set to false for performance
                        true   // mutate document
                    );
                    documentState = result.newDocument;
                } catch (patchError) {
                    console.error(`Error applying patch for version ${i}:`, patchError);
                    console.error('Patch:', commit.patch);
                    console.error('Current state:', JSON.stringify(documentState, null, 2));
                    throw patchError;
                }
            }
        }

        return documentState;

    } catch (error) {
        console.error(`Error reconstructing version ${version}:`, error);
        throw error;
    }
}

/**
 * Reverts to a specific version
 * @param {number} targetVersion - Version to revert to
 * @returns {Object} Revert result
 */
export function revertToVersion(targetVersion) {
    if (!currentDocument) {
        throw new Error('No document initialized');
    }

    try {
        // Get document state at target version
        const revertedState = getDocumentAtVersion(targetVersion);

        // Update working copy
        workingCopy = JSON.parse(JSON.stringify(revertedState));
        currentDocument.document = workingCopy;

        // Mark as having uncommitted changes
        currentDocument.uncommittedChanges = true;
        currentDocument.metadata.lastModified = new Date().toISOString();

        console.log(`Reverted to version ${targetVersion}. Commit to save this reversion.`);

        return {
            success: true,
            version: targetVersion,
            uncommittedChanges: true,
            message: `Reverted to version ${targetVersion}`
        };

    } catch (error) {
        console.error('Error reverting to version:', error);
        throw error;
    }
}

/**
 * Exports the versioned document as JSON string
 * @returns {string} JSON string of the complete document with history
 */
export function exportVersionedDocument() {
    if (!currentDocument) {
        throw new Error('No document initialized');
    }

    return JSON.stringify(currentDocument, null, 2);
}

/**
 * Imports a versioned document from JSON string
 * @param {string} jsonString - JSON string of versioned document
 * @returns {VersionedDocument} The imported document
 */
export function importVersionedDocument(jsonString) {
    try {
        const imported = JSON.parse(jsonString);

        // Validate structure
        if (!imported.metadata || !imported.document || !Array.isArray(imported.history)) {
            throw new Error('Invalid versioned document format');
        }

        currentDocument = imported;
        workingCopy = JSON.parse(JSON.stringify(imported.document));
        
        // Reconstruct last committed state
        if (imported.metadata.currentVersion > 0) {
            lastCommittedState = getDocumentAtVersion(imported.metadata.currentVersion);
        } else {
            lastCommittedState = [];
        }

        console.log(`Imported document: ${imported.metadata.documentName}, version ${imported.metadata.currentVersion}`);

        return currentDocument;

    } catch (error) {
        console.error('Error importing versioned document:', error);
        throw error;
    }
}

/**
 * Gets document metadata
 * @returns {Object} Document metadata
 */
export function getDocumentMetadata() {
    if (!currentDocument) {
        return null;
    }
    return { ...currentDocument.metadata };
}

/**
 * Updates document metadata
 * @param {Object} updates - Metadata updates
 */
export function updateDocumentMetadata(updates) {
    if (!currentDocument) {
        throw new Error('No document initialized');
    }

    currentDocument.metadata = {
        ...currentDocument.metadata,
        ...updates,
        lastModified: new Date().toISOString()
    };
}

/**
 * Checks if there are uncommitted changes
 * @returns {boolean} True if there are uncommitted changes
 */
export function hasUncommittedChanges() {
    return currentDocument ? currentDocument.uncommittedChanges : false;
}

/**
 * Gets statistics about the document
 * @returns {Object} Document statistics
 */
export function getDocumentStats() {
    if (!currentDocument) {
        return null;
    }

    const currentNodeCount = countNodes(currentDocument.document);
    const historySize = JSON.stringify(currentDocument.history).length;
    const totalSize = JSON.stringify(currentDocument).length;

    return {
        documentName: currentDocument.metadata.documentName,
        currentVersion: currentDocument.metadata.currentVersion,
        totalVersions: currentDocument.history.length,
        nodeCount: currentNodeCount,
        uncommittedChanges: currentDocument.uncommittedChanges,
        historySizeKB: (historySize / 1024).toFixed(2),
        totalSizeKB: (totalSize / 1024).toFixed(2),
        created: currentDocument.metadata.created,
        lastModified: currentDocument.metadata.lastModified
    };
}

/**
 * Counts total nodes in document structure
 * @private
 */
function countNodes(nodes) {
    if (!Array.isArray(nodes)) {
        return 0;
    }

    let count = nodes.length;
    nodes.forEach(node => {
        if (node.children && Array.isArray(node.children)) {
            count += countNodes(node.children);
        }
    });
    return count;
}

/**
 * Gets changes between two versions
 * @param {number} fromVersion - Starting version
 * @param {number} toVersion - Ending version
 * @returns {Object} Change summary
 */
export function getChangesBetweenVersions(fromVersion, toVersion) {
    if (!currentDocument) {
        throw new Error('No document initialized');
    }

    try {
        const fromState = getDocumentAtVersion(fromVersion);
        const toState = getDocumentAtVersion(toVersion);

        const changes = jsonpatch.compare(fromState, toState);

        return {
            fromVersion,
            toVersion,
            changeCount: changes.length,
            changes
        };

    } catch (error) {
        console.error('Error comparing versions:', error);
        throw error;
    }
}

/**
 * Creates a default filename for export
 * @returns {string} Formatted filename
 */
export function getDefaultFilename() {
    if (!currentDocument) {
        return 'document_v0.json';
    }

    const docName = currentDocument.metadata.documentName
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
    const version = currentDocument.metadata.currentVersion;
    const timestamp = new Date().toISOString().split('T')[0];

    return `${docName}_v${version}_${timestamp}.json`;
}
