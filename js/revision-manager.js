/**
 * Revision Manager Module
 * Handles revision list building, display, and version control operations
 */

import { 
    getVersionHistory, 
    getDocumentAtVersion,
    revertToVersion as vcRevertToVersion
} from './version-control.js';
import { renderDocumentStructure } from './tree-renderer.js';
import { stateManager } from './state-manager.js';
import DocumentNode from './documentnode.js';

/**
 * Revision document structure
 */
export class RevisionDocument {
    constructor(id, date, user, commitNotes) {
        if (!id || !date || !user) {
            throw new Error('Revision requires id, date, and user');
        }
        
        this.id = id;
        this.date = date instanceof Date ? date : new Date(date);
        this.user = user;
        this.commitNotes = commitNotes || '';
    }
}

/**
 * Builds revision list from version control history
 */
export function buildRevisionListFromHistory() {
    const history = getVersionHistory();
    
    // Convert version control commits to revision documents
    const revisionList = history.map(commit => ({
        id: commit.version,
        date: new Date(commit.timestamp),
        user: commit.author,
        commitNotes: commit.message
    }));
    
    buildRevisionList(revisionList);
}

/**
 * Builds and renders the revision list in the DOM
 * @param {RevisionDocument[]|Object[]} revisionList - Array of revision items
 * @throws {Error} If revision list container is not found
 */
export function buildRevisionList(revisionList) {
    const revisions = document.getElementById('revisions-list');
    
    if (!revisions) {
        throw new Error('Revisions list container not found in DOM');
    }

    const revisionPlaceholder = {
        id: 0,
        date: new Date(),
        user: 'System',
        commitNotes: 'Initial state - Make changes, save, and commit to create versions'
    };

    try {
        // Clear existing content
        revisions.innerHTML = '';

        // Validate input
        if (!Array.isArray(revisionList)) {
            console.warn('Invalid revision list, using empty array');
            revisionList = [];
        }

        // Use placeholder if empty
        const displayList = revisionList.length > 0 
            ? [...revisionList].sort((a, b) => b.id - a.id) // Sort descending by ID
            : [revisionPlaceholder];

        // Build revision items
        displayList.forEach(revisionItem => {
            try {
                const listItem = createRevisionListItem(revisionItem);
                revisions.appendChild(listItem);
            } catch (error) {
                console.error(`Failed to create revision item ${revisionItem.id}:`, error);
            }
        });

    } catch (error) {
        console.error('Error building revision list:', error);
        revisions.innerHTML = '<li class="error-message">Failed to load revisions</li>';
    }
}

/**
 * Creates a single revision list item element
 * @private
 * @param {RevisionDocument} revisionItem - The revision data
 * @returns {HTMLElement} The created list item
 */
function createRevisionListItem(revisionItem) {
    const listItem = document.createElement('li');
    listItem.setAttribute('id', `revision-${revisionItem.id}`);
    listItem.className = 'revision-item content-container';

    // Content section
    const revisionContent = document.createElement('div');
    revisionContent.className = 'content-left';
    
    const formattedDate = revisionItem.date instanceof Date 
        ? revisionItem.date.toLocaleString()
        : revisionItem.date;
    
    revisionContent.textContent = `${revisionItem.id} - ${formattedDate} - ${revisionItem.user} - ${revisionItem.commitNotes}`;

    // Buttons section
    const revisionButtons = document.createElement('div');
    revisionButtons.className = 'right-buttons';

    // View button
    const viewButton = document.createElement('button');
    viewButton.className = 'dynamic-item text-button';
    viewButton.textContent = 'View';
    viewButton.setAttribute('id', `view-revision-${revisionItem.id}`);

    // Revert button
    const revertButton = document.createElement('button');
    revertButton.className = 'dynamic-item text-button';
    revertButton.textContent = 'Revert';
    revertButton.setAttribute('id', `revert-to-document-${revisionItem.id}`);

    revisionButtons.appendChild(viewButton);
    revisionButtons.appendChild(revertButton);

    listItem.appendChild(revisionContent);
    listItem.appendChild(revisionButtons);

    return listItem;
}

/**
 * View a specific revision
 * @param {string|number} revisionId - The revision ID to view
 */
export function viewRevision(revisionId) {
    try {
        const version = parseInt(revisionId, 10);
        console.log('Viewing revision:', version);
        
        // Get document state at this version
        const documentState = getDocumentAtVersion(version);
        
        // Convert to DocumentNode instances
        DocumentNode._existingIds.clear();
        const rootNodes = documentState.map(jsonNode => 
            DocumentNode.fromJSON(jsonNode, null)
        );
        
        // Render but don't update state (preview only)
        renderDocumentStructure(rootNodes);
        
        alert(
            `Viewing Version ${version}\n\n` +
            `This is a preview. The document has not been changed.\n` +
            `To restore this version, use the Revert button.`
        );
        
    } catch (error) {
        console.error(`Error viewing revision ${revisionId}:`, error);
        alert(`Failed to view revision: ${error.message}`);
        throw error;
    }
}

/**
 * Revert document to a specific revision
 * @param {string|number} revisionId - The revision ID to revert to
 */
export function revertDocument(revisionId) {
    try {
        const version = parseInt(revisionId, 10);
        
        if (!confirm(
            `Revert to version ${version}?\n\n` +
            `This will replace your current working copy.\n` +
            `You'll need to SAVE and COMMIT to make it permanent.`
        )) {
            return;
        }
        
        console.log('Reverting to revision:', version);
        
        // Revert in version control
        const result = vcRevertToVersion(version);
        
        if (result.success) {
            // Get the reverted document state
            const documentState = getDocumentAtVersion(version);
            
            // Convert to DocumentNode instances
            DocumentNode._existingIds.clear();
            const rootNodes = documentState.map(jsonNode => 
                DocumentNode.fromJSON(jsonNode, null)
            );
            
            // Update state and render
            stateManager.setDocumentStructure(rootNodes);
            renderDocumentStructure(rootNodes);
            
            alert(
                `Reverted to version ${version}\n\n` +
                `Remember to:\n` +
                `1. Click SAVE to save your working copy\n` +
                `2. Click COMMIT to make it permanent`
            );
        }
        
    } catch (error) {
        console.error(`Error reverting to revision ${revisionId}:`, error);
        alert(`Failed to revert: ${error.message}`);
        throw error;
    }
}

/**
 * Toggle visibility of revision details
 */
export function toggleDetails() {
    try {
        const details = document.querySelector('.revisions');
        
        if (!details) {
            throw new Error('Revisions container not found');
        }

        details.classList.toggle('hidden');

        const toggleElement = document.getElementById('toggleDetails');
        if (toggleElement) {
            toggleElement.classList.toggle('rotated');
        }
    } catch (error) {
        console.error('Error toggling details:', error);
    }
}

/**
 * Toggle visibility of revision list items (except first)
 */
export function toggleRevisionList() {
    try {
        const revisions = document.querySelectorAll('.revision-item');
        
        revisions.forEach((item, index) => {
            if (index !== 0) {
                item.classList.toggle('hidden');
            }
        });

        const toggleElement = document.getElementById('toggleRevisionList');
        if (toggleElement) {
            toggleElement.classList.toggle('rotated');
        }
    } catch (error) {
        console.error('Error toggling revision list:', error);
    }
}
