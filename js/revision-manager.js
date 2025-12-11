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
    listItem.className = 'revision-item';

    // Main container for revision header
    const revisionHeader = document.createElement('div');
    revisionHeader.className = 'content-container';

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

    // View changes button (toggle)
    const viewButton = document.createElement('button');
    viewButton.className = 'dynamic-item text-button';
    viewButton.textContent = 'View Changes';
    viewButton.setAttribute('id', `view-revision-${revisionItem.id}`);

    // Revert button
    const revertButton = document.createElement('button');
    revertButton.className = 'dynamic-item text-button';
    revertButton.textContent = 'Revert';
    revertButton.setAttribute('id', `revert-to-document-${revisionItem.id}`);

    revisionButtons.appendChild(viewButton);
    revisionButtons.appendChild(revertButton);

    revisionHeader.appendChild(revisionContent);
    revisionHeader.appendChild(revisionButtons);

    // Create collapsible changes section
    const changesSection = document.createElement('div');
    changesSection.className = 'revision-changes-section';
    changesSection.setAttribute('id', `changes-section-${revisionItem.id}`);
    changesSection.style.display = 'none';

    const changesTitle = document.createElement('h4');
    changesTitle.textContent = 'Changes in this version:';
    changesTitle.className = 'changes-title';

    const changesList = document.createElement('ul');
    changesList.className = 'changes-list';
    changesList.setAttribute('id', `changes-list-${revisionItem.id}`);

    changesSection.appendChild(changesTitle);
    changesSection.appendChild(changesList);

    listItem.appendChild(revisionHeader);
    listItem.appendChild(changesSection);

    return listItem;
}

/**
 * View a specific revision - toggle changes display
 * @param {string|number} revisionId - The revision ID to view
 */
export function viewRevision(revisionId) {
    try {
        const version = parseInt(revisionId, 10);
        console.log('Viewing changes for revision:', version);
        
        const changesSection = document.getElementById(`changes-section-${version}`);
        const changesList = document.getElementById(`changes-list-${version}`);
        const viewButton = document.getElementById(`view-revision-${version}`);
        
        if (!changesSection || !changesList) {
            console.error('Changes section not found for revision:', version);
            return;
        }
        
        // Toggle visibility
        if (changesSection.style.display === 'none') {
            // Show changes - parse and display if not already populated
            if (changesList.children.length === 0) {
                populateChangesList(version, changesList);
            }
            changesSection.style.display = 'block';
            viewButton.textContent = 'Hide Changes';
        } else {
            // Hide changes
            changesSection.style.display = 'none';
            viewButton.textContent = 'View Changes';
        }
        
    } catch (error) {
        console.error(`Error viewing revision ${revisionId}:`, error);
        alert(`Failed to view changes: ${error.message}`);
    }
}

/**
 * Populate the changes list for a specific revision
 * @param {number} version - Version number
 * @param {HTMLElement} changesList - The UL element to populate
 */
function populateChangesList(version, changesList) {
    try {
        const history = getVersionHistory();
        const commit = history.find(c => c.version === version);
        
        if (!commit || !commit.patch) {
            changesList.innerHTML = '<div class="change-item no-changes">No changes recorded</div>';
            return;
        }
        
        const patches = commit.patch;
        
        if (patches.length === 0) {
            changesList.innerHTML = '<div class="change-item no-changes">No changes in this version</div>';
            return;
        }
        
        // Get previous version state for before/after comparison
        let previousState = null;
        if (version > 0) {
            try {
                previousState = getDocumentAtVersion(version - 1);
            } catch (e) {
                console.warn('Could not load previous state:', e);
            }
        }
        
        // Parse each patch operation
        patches.forEach((patch, index) => {
            const changeItem = document.createElement('div');
            changeItem.className = 'change-item';
            
            const changeDescription = parsePatchOperation(patch, previousState);
            changeItem.innerHTML = changeDescription;
            
            changesList.appendChild(changeItem);
        });
        
    } catch (error) {
        console.error('Error populating changes list:', error);
        changesList.innerHTML = '<div class="change-item error">Error loading changes</div>';
    }
}

/**
 * Parse a JSON Patch operation into human-readable description
 * @param {Object} patch - JSON Patch operation
 * @param {Array} previousState - Previous document state for before/after comparison
 * @returns {string} HTML string describing the change
 */
function parsePatchOperation(patch, previousState = null) {
    const { op, path, value, from } = patch;
    
    // Extract meaningful parts from the path
    const pathParts = path.split('/').filter(p => p);
    
    let icon = '';
    let description = '';
    let cssClass = '';
    
    // Helper to get node ID from path
    const getNodeIdFromPath = (pathStr) => {
        const parts = pathStr.split('/').filter(p => p);
        if (parts.length === 0) return null;
        
        // Navigate through the path to find the node ID
        let nodeId = null;
        try {
            // First element is the root index
            if (previousState && previousState[parts[0]]) {
                nodeId = previousState[parts[0]].id || (parseInt(parts[0]) + 1).toString();
                
                // If there are more parts, we're navigating into children
                let current = previousState[parts[0]];
                for (let i = 1; i < parts.length; i += 2) {
                    if (parts[i] === 'children' && parts[i + 1] !== undefined) {
                        const childIndex = parseInt(parts[i + 1]);
                        if (current.children && current.children[childIndex]) {
                            current = current.children[childIndex];
                            nodeId = current.id || nodeId + '-' + (childIndex + 1);
                        }
                    }
                }
            } else {
                // Fallback: construct ID from path indices
                nodeId = (parseInt(parts[0]) + 1).toString();
                for (let i = 1; i < parts.length; i += 2) {
                    if (parts[i] === 'children' && parts[i + 1] !== undefined) {
                        nodeId += '-' + (parseInt(parts[i + 1]) + 1);
                    }
                }
            }
        } catch (e) {
            console.warn('Error extracting node ID:', e);
        }
        
        return nodeId;
    };
    
    // Helper to get previous value from previousState
    const getPreviousValue = (pathStr) => {
        if (!previousState) return null;
        
        const parts = pathStr.split('/').filter(p => p);
        try {
            let current = previousState;
            
            // Navigate through each part of the path
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                // Check if it's an array index
                if (!isNaN(part)) {
                    const index = parseInt(part);
                    if (Array.isArray(current) && current[index] !== undefined) {
                        current = current[index];
                    } else {
                        return null;
                    }
                } else {
                    // It's a property name
                    if (current && current[part] !== undefined) {
                        current = current[part];
                    } else {
                        return null;
                    }
                }
            }
            
            return current;
        } catch (e) {
            console.warn('Error getting previous value:', e);
            return null;
        }
    };
    
    const nodeId = getNodeIdFromPath(path);
    const nodeRef = nodeId ? `node ${nodeId}` : 'a node';
    
    switch (op) {
        case 'add':
            icon = '➕';
            cssClass = 'change-add';
            
            if (pathParts[pathParts.length - 2] === 'children') {
                // Adding a child node
                const childTitle = getNodeTitle(value);
                const childId = value.id || 'new child';
                description = `Added child ${nodeRef ? nodeRef + ' → ' : ''}${childId}: "${childTitle}"`;
            } else if (pathParts[1] === 'content') {
                // Adding content
                const contentText = Array.isArray(value) ? value.join(', ') : truncateValue(value, 50);
                description = `Added content to ${nodeRef}: "${contentText}"`;
            } else if (pathParts.length === 1) {
                // Adding a root node
                const nodeTitle = getNodeTitle(value);
                const newNodeId = value.id || (parseInt(pathParts[0]) + 1).toString();
                description = `Added ${newNodeId}: "${nodeTitle}"`;
            } else {
                const property = pathParts[pathParts.length - 1];
                description = `Added ${property} to ${nodeRef}: "${truncateValue(value, 50)}"`;
            }
            break;
            
        case 'remove':
            icon = '❌';
            cssClass = 'change-remove';
            
            if (pathParts[pathParts.length - 2] === 'children') {
                description = `Removed child from ${nodeRef}`;
            } else if (pathParts.length === 1) {
                // Removing a root node
                description = `Removed ${nodeRef}`;
            } else {
                const property = pathParts[pathParts.length - 1];
                description = `Removed ${property} from ${nodeRef}`;
            }
            break;
            
        case 'replace':
            icon = '✏️';
            cssClass = 'change-replace';
            
            const property = pathParts[pathParts.length - 1];
            const previousValue = getPreviousValue(path);
            
            if (property === 'name' || property === 'title') {
                const oldText = previousValue !== null && previousValue !== undefined ? truncateValue(previousValue, 40) : 'none';
                const newText = truncateValue(value, 40);
                description = `Changed ${nodeRef} from: "${oldText}", to: "${newText}"`;
            } else if (property === 'content') {
                const oldContent = previousValue !== null && previousValue !== undefined 
                    ? (Array.isArray(previousValue) ? previousValue.join(', ') : truncateValue(previousValue, 40)) 
                    : 'empty';
                const newContent = Array.isArray(value) ? value.join(', ') : truncateValue(value, 40);
                description = `Changed ${nodeRef} content from: "${oldContent}", to: "${newContent}"`;
            } else if (!isNaN(property)) {
                // It's an array index (content item)
                const oldText = previousValue !== null && previousValue !== undefined ? truncateValue(previousValue, 40) : 'none';
                const newText = truncateValue(value, 40);
                const itemNumber = parseInt(property) + 1;
                description = `Changed ${nodeRef} item ${itemNumber} from: "${oldText}", to: "${newText}"`;
            } else {
                const oldVal = previousValue !== null && previousValue !== undefined ? truncateValue(previousValue, 40) : 'none';
                const newVal = truncateValue(value, 40);
                description = `Changed ${nodeRef} ${property} from: "${oldVal}", to: "${newVal}"`;
            }
            break;
            
        case 'move':
            icon = '↔️';
            cssClass = 'change-move';
            const fromId = getNodeIdFromPath(from);
            const toId = getNodeIdFromPath(path);
            description = `Moved ${fromId ? 'node ' + fromId : 'a node'} to position ${toId || 'new location'}`;
            break;
            
        case 'copy':
            icon = '📋';
            cssClass = 'change-copy';
            const copyFromId = getNodeIdFromPath(from);
            const copyToId = getNodeIdFromPath(path);
            description = `Copied ${copyFromId ? 'node ' + copyFromId : 'a node'} to ${copyToId || 'new location'}`;
            break;
            
        default:
            icon = '🔄';
            cssClass = 'change-other';
            description = `${op} operation on ${nodeRef}`;
    }
    
    return `<span class="change-icon">${icon}</span><span class="${cssClass}">${description}</span>`;
}

/**
 * Get node title from value object
 * @param {*} value - The value from patch
 * @returns {string} Node title or description
 */
function getNodeTitle(value) {
    if (!value) return 'Unknown';
    if (typeof value === 'object' && value.title) return value.title;
    if (typeof value === 'string') return value;
    return JSON.stringify(value).substring(0, 50);
}

/**
 * Truncate long values for display
 * @param {*} value - The value to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated string
 */
function truncateValue(value, maxLength = 100) {
    if (value === null || value === undefined) return 'null';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
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
