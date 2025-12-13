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
import { showError, showSuccess, showConfirm } from './message-center.js';

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
                
                // Add searchable text data attribute
                const searchableText = [
                    `v${revisionItem.id}`,
                    revisionItem.date instanceof Date ? revisionItem.date.toLocaleString() : revisionItem.date,
                    revisionItem.user,
                    revisionItem.commitNotes
                ].join(' ').toLowerCase();
                listItem.dataset.searchText = searchableText;
                
                revisions.appendChild(listItem);
            } catch (error) {
                console.error(`Failed to create revision item ${revisionItem.id}:`, error);
            }
        });
        
        // Initialize search functionality
        initializeRevisionListSearch();

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
    revisionHeader.className = 'revision-header';

    // Content section with columns
    const revisionContent = document.createElement('div');
    revisionContent.className = 'revision-content';
    
    const formattedDate = revisionItem.date instanceof Date 
        ? revisionItem.date.toLocaleString()
        : revisionItem.date;
    
    // Version column
    const versionCol = document.createElement('div');
    versionCol.className = 'revision-version';
    versionCol.textContent = `v${revisionItem.id}`;
    
    // Date/time column
    const dateCol = document.createElement('div');
    dateCol.className = 'revision-date';
    dateCol.textContent = formattedDate;
    
    // User column
    const userCol = document.createElement('div');
    userCol.className = 'revision-user';
    userCol.textContent = revisionItem.user;
    
    // Commit message column (truncated with tooltip)
    const messageCol = document.createElement('div');
    messageCol.className = 'revision-message';
    messageCol.textContent = revisionItem.commitNotes;
    messageCol.setAttribute('data-tooltip', revisionItem.commitNotes);
    
    revisionContent.appendChild(versionCol);
    revisionContent.appendChild(dateCol);
    revisionContent.appendChild(userCol);
    revisionContent.appendChild(messageCol);

    // Buttons section
    const revisionButtons = document.createElement('div');
    revisionButtons.className = 'revision-buttons';

    // View changes button (toggle)
    const viewButton = document.createElement('button');
    viewButton.className = 'btn dynamic-item';
    viewButton.textContent = 'View Changes';
    viewButton.setAttribute('id', `view-revision-${revisionItem.id}`);

    // Revert button
    const revertButton = document.createElement('button');
    revertButton.className = 'btn dynamic-item';
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

    // Header with title and search
    const changesHeader = document.createElement('div');
    changesHeader.className = 'changes-header-row';
    
    const changesTitle = document.createElement('h4');
    changesTitle.textContent = 'Changes in this version:';
    changesTitle.className = 'changes-title';
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'changes-search-inline';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input changes-search-input';
    searchInput.placeholder = 'Filter changes...';
    searchInput.setAttribute('data-changes-list', `changes-list-${revisionItem.id}`);
    
    const resultsCount = document.createElement('span');
    resultsCount.className = 'search-results-count';
    resultsCount.setAttribute('id', `search-count-${revisionItem.id}`);
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(resultsCount);
    
    changesHeader.appendChild(changesTitle);
    changesHeader.appendChild(searchContainer);

    const changesList = document.createElement('ul');
    changesList.className = 'changes-list';
    changesList.setAttribute('id', `changes-list-${revisionItem.id}`);

    changesSection.appendChild(changesHeader);
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
            
            // Clear search in this section
            const searchInput = changesSection.querySelector('.changes-search-input');
            if (searchInput) {
                searchInput.value = '';
                const resultsCount = changesSection.querySelector('.search-results-count');
                filterChangesInSection(changesList, '', resultsCount);
            }
        }
        
    } catch (error) {
        console.error(`Error viewing revision ${revisionId}:`, error);
        showError(`Failed to view changes: ${error.message}`);
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
        const author = commit.author || 'User';
        
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
        
        // Create table-like header
        const headerRow = document.createElement('div');
        headerRow.className = 'change-header';
        headerRow.innerHTML = `
            <div class="change-col-time">Time</div>
            <div class="change-col-user">User</div>
            <div class="change-col-action">Action</div>
            <div class="change-col-previous">Previous</div>
            <div class="change-col-current">Current</div>
        `;
        changesList.appendChild(headerRow);
        
        // Store all changes data for search functionality
        const allChanges = patches.map(patch => {
            const changeItem = document.createElement('div');
            changeItem.className = 'change-item';
            
            const changeData = parsePatchOperation(patch, previousState, author);
            changeItem.innerHTML = changeData;
            
            // Store searchable text for filtering
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = changeData;
            changeItem.dataset.searchText = tempDiv.textContent.toLowerCase();
            
            return changeItem;
        });
        
        // Append all changes
        allChanges.forEach(item => changesList.appendChild(item));
        
        // Initialize search for this changes list
        initializeChangesSearch(changesList);
        
    } catch (error) {
        console.error('Error populating changes list:', error);
        changesList.innerHTML = '<div class="change-item error">Error loading changes</div>';
    }
}

/**
 * Format timestamp to time string
 * @param {string} isoString - ISO timestamp string
 * @returns {string} Formatted time string
 */
function formatTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
        });
    } catch (e) {
        return '—';
    }
}

/**
 * Parse a Pending-related operation into human-readable description
 * @param {Object} patch - JSON Patch operation
 * @param {Object} previousState - Previous document state
 * @param {string} author - User who made the change
 * @returns {string} HTML string describing the change
 */
function parsePendingOperation(patch, previousState = null, author = 'User') {
    const { op, path, value } = patch;
    const pathParts = path.split('/').filter(p => p);
    
    let action = '';
    let previousVal = '—';
    let currentVal = '—';
    let cssClass = '';
    
    // Get the Pending item title if available
    const getPendingTitle = (item) => {
        if (!item) return 'Untitled';
        return item.title || item.name || 'Untitled';
    };
    
    // Extract Pending items from previous state
    const previousPending = previousState?.pendingItems || [];
    
    try {
        switch (op) {
            case 'add':
                // Adding to Pending (deleting from document)
                cssClass = 'change-remove';
                const itemTitle = getPendingTitle(value);
                action = `Moved '${itemTitle}' to Pending`;
                previousVal = 'Document';
                currentVal = 'Pending';
                break;
                
            case 'remove':
                // Removing from Pending (either restoring or permanently deleting)
                const PendingIndex = parseInt(pathParts[1]);
                const removedItem = previousPending[PendingIndex];
                const removedTitle = getPendingTitle(removedItem);
                
                cssClass = 'change-remove';
                action = `Permanently deleted '${removedTitle}'`;
                previousVal = 'Pending';
                currentVal = '—';
                break;
                
            case 'replace':
                cssClass = 'change-replace';
                action = `Modified Pending item`;
                break;
                
            default:
                cssClass = 'change-other';
                action = `Pending operation: ${op}`;
        }
    } catch (error) {
        console.warn('Error parsing Pending operation:', error);
        cssClass = 'change-other';
        action = 'Pending operation';
    }
    
    // Format timestamp
    const timeStr = patch.timestamp ? formatTime(patch.timestamp) : '—';
    
    return `
        <div class="change-col-time">${timeStr}</div>
        <div class="change-col-user">${author}</div>
        <div class="change-col-action ${cssClass}">${action}</div>
        <div class="change-col-previous">${previousVal}</div>
        <div class="change-col-current">${currentVal}</div>
    `;
}

/**
 * Parse a JSON Patch operation into human-readable description
 * @param {Object} patch - JSON Patch operation
 * @param {Array} previousState - Previous document state for before/after comparison
 * @param {string} author - User who made the change
 * @returns {string} HTML string describing the change
 */
function parsePatchOperation(patch, previousState = null, author = 'User') {
    const { op, path, value, from } = patch;
    
    // Extract meaningful parts from the path
    const pathParts = path.split('/').filter(p => p);
    
    let icon = '';
    let description = '';
    let cssClass = '';
    
    // Check if this is a Pending-related operation
    const isPendingOperation = pathParts[0] === 'pendingItems';
    const isDocumentOperation = pathParts[0] === 'document';
    
    // Handle Pending operations specially
    if (isPendingOperation) {
        return parsePendingOperation(patch, previousState, author);
    }
    
    // Adjust pathParts if using new format with /document/ prefix
    if (isDocumentOperation) {
        pathParts.shift(); // Remove 'document' from the beginning
    }
    
    // Helper to get node ID from path
    const getNodeIdFromPath = (pathStr) => {
        const parts = pathStr.split('/').filter(p => p);
        if (parts.length === 0) return null;
        
        // Get the actual document array (handle both old and new format)
        const documentArray = previousState?.document || previousState;
        if (!Array.isArray(documentArray)) return null;
        
        // Navigate through the path to find the node ID
        let nodeId = null;
        try {
            // First element is the root index
            if (documentArray && documentArray[parts[0]]) {
                nodeId = documentArray[parts[0]].id || (parseInt(parts[0]) + 1).toString();
                
                // If there are more parts, we're navigating into children
                let current = documentArray[parts[0]];
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
            // Start from the appropriate root (handle both old and new format)
            let current = previousState?.document || previousState;
            
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
    
    let action = '';
    let previousVal = '—';
    let currentVal = '';
    
    switch (op) {
        case 'add':
            cssClass = 'change-add';
            
            if (pathParts[pathParts.length - 2] === 'children') {
                // Adding a child node
                const childTitle = getNodeTitle(value);
                const childId = value.id || 'new child';
                action = `Added child to ${nodeRef}`;
                currentVal = `${childId}: ${childTitle}`;
            } else if (pathParts[1] === 'content') {
                // Adding content
                const contentText = Array.isArray(value) ? value.join(', ') : truncateValue(value, 50);
                action = `Added content to ${nodeRef}`;
                currentVal = contentText;
            } else if (pathParts.length === 1) {
                // Adding a root node
                const nodeTitle = getNodeTitle(value);
                const newNodeId = value.id || (parseInt(pathParts[0]) + 1).toString();
                action = `Added ${newNodeId}`;
                currentVal = nodeTitle;
            } else {
                const property = pathParts[pathParts.length - 1];
                action = `Added ${property} to ${nodeRef}`;
                currentVal = truncateValue(value, 50);
            }
            break;
            
        case 'remove':
            cssClass = 'change-remove';
            
            if (pathParts[pathParts.length - 2] === 'children') {
                action = `Removed child from ${nodeRef}`;
                const previousValue = getPreviousValue(path);
                previousVal = previousValue ? getNodeTitle(previousValue) : 'unknown';
            } else if (pathParts.length === 1) {
                // Removing a root node
                action = `Removed ${nodeRef}`;
                const previousValue = getPreviousValue(path);
                previousVal = previousValue ? getNodeTitle(previousValue) : 'unknown';
            } else {
                const property = pathParts[pathParts.length - 1];
                action = `Removed ${property} from ${nodeRef}`;
                const previousValue = getPreviousValue(path);
                previousVal = previousValue ? truncateValue(previousValue, 40) : 'unknown';
            }
            currentVal = '—';
            break;
            
        case 'replace':
            cssClass = 'change-replace';
            
            const property = pathParts[pathParts.length - 1];
            const previousValue = getPreviousValue(path);
            
            if (property === 'name' || property === 'title') {
                action = `Changed ${nodeRef} title`;
                previousVal = previousValue !== null && previousValue !== undefined ? truncateValue(previousValue, 40) : 'none';
                currentVal = truncateValue(value, 40);
            } else if (property === 'content') {
                action = `Changed ${nodeRef} content`;
                previousVal = previousValue !== null && previousValue !== undefined 
                    ? (Array.isArray(previousValue) ? previousValue.join(', ') : truncateValue(previousValue, 40)) 
                    : 'empty';
                currentVal = Array.isArray(value) ? value.join(', ') : truncateValue(value, 40);
            } else if (!isNaN(property)) {
                // It's an array index (content item)
                const itemNumber = parseInt(property) + 1;
                action = `Changed ${nodeRef} item ${itemNumber}`;
                previousVal = previousValue !== null && previousValue !== undefined ? truncateValue(previousValue, 40) : 'none';
                currentVal = truncateValue(value, 40);
            } else {
                action = `Changed ${nodeRef} ${property}`;
                previousVal = previousValue !== null && previousValue !== undefined ? truncateValue(previousValue, 40) : 'none';
                currentVal = truncateValue(value, 40);
            }
            break;
            
        case 'move':
            cssClass = 'change-move';
            const fromId = getNodeIdFromPath(from);
            const toId = getNodeIdFromPath(path);
            action = 'Moved node';
            previousVal = fromId ? `Position ${fromId}` : 'old position';
            currentVal = toId ? `Position ${toId}` : 'new position';
            break;
            
        case 'copy':
            cssClass = 'change-copy';
            const copyFromId = getNodeIdFromPath(from);
            const copyToId = getNodeIdFromPath(path);
            action = 'Copied node';
            previousVal = copyFromId ? `Node ${copyFromId}` : 'source';
            currentVal = copyToId ? `Node ${copyToId}` : 'destination';
            break;
            
        default:
            cssClass = 'change-other';
            action = `${op} operation on ${nodeRef}`;
            previousVal = '—';
            currentVal = '—';
    }
    
    // Format timestamp if available
    const timeStr = patch.timestamp ? formatTime(patch.timestamp) : '—';
    
    return `
        <div class="change-col-time">${timeStr}</div>
        <div class="change-col-user">${author}</div>
        <div class="change-col-action ${cssClass}">${action}</div>
        <div class="change-col-previous">${previousVal}</div>
        <div class="change-col-current">${currentVal}</div>
    `;
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
 * Initialize search functionality for a changes list
 * @param {HTMLElement} changesList - The changes list container
 */
function initializeChangesSearch(changesList) {
    const changesSection = changesList.closest('.revision-changes-section');
    if (!changesSection) return;
    
    const searchInput = changesSection.querySelector('.changes-search-input');
    const resultsCount = changesSection.querySelector('.search-results-count');
    
    if (!searchInput) return;
    
    // Add search event listener
    searchInput.addEventListener('input', (e) => {
        filterChangesInSection(changesList, e.target.value, resultsCount);
    });
    
    // Initial count
    updateSearchResultsCountForSection(changesList, resultsCount);
}

/**
 * Filter changes in a specific section based on search query
 * @param {HTMLElement} changesList - The changes list to filter
 * @param {string} query - Search query string
 * @param {HTMLElement} resultsCount - Results counter element
 */
function filterChangesInSection(changesList, query, resultsCount) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Get change items in this specific section
    const changeItems = changesList.querySelectorAll('.change-item:not(.no-changes)');
    
    let visibleCount = 0;
    
    changeItems.forEach(item => {
        const searchText = item.dataset.searchText || '';
        
        if (normalizedQuery === '' || searchText.includes(normalizedQuery)) {
            item.style.display = 'grid';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    updateSearchResultsCountForSection(changesList, resultsCount, visibleCount);
}

/**
 * Update search results count display for a specific section
 * @param {HTMLElement} changesList - The changes list element
 * @param {HTMLElement} resultsCount - Results counter element
 * @param {number} visible - Number of visible items (optional)
 */
function updateSearchResultsCountForSection(changesList, resultsCount, visible = null) {
    if (!resultsCount) return;
    
    const changeItems = changesList.querySelectorAll('.change-item:not(.no-changes)');
    const total = changeItems.length;
    
    if (visible === null) {
        visible = Array.from(changeItems).filter(item => item.style.display !== 'none').length;
    }
    
    if (total === 0) {
        resultsCount.textContent = '';
    } else if (visible === total) {
        resultsCount.textContent = `${total}`;
    } else {
        resultsCount.textContent = `${visible}/${total}`;
    }
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
 * Initialize search functionality for the revision list
 */
function initializeRevisionListSearch() {
    const searchInput = document.getElementById('revision-tracking-search');
    const resultsCount = document.getElementById('revision-tracking-count');
    
    if (!searchInput) return;
    
    // Remove any existing listener
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    // Add search event listener
    newSearchInput.addEventListener('input', (e) => {
        filterRevisionList(e.target.value);
    });
    
    // Initial count
    updateRevisionListCount();
}

/**
 * Filter revision list and change entries based on search query
 * @param {string} query - Search query string
 */
function filterRevisionList(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const revisionItems = document.querySelectorAll('.revision-item');
    
    let visibleRevisionCount = 0;
    
    revisionItems.forEach(item => {
        const revisionSearchText = item.dataset.searchText || '';
        const changeItems = item.querySelectorAll('.change-item:not(.no-changes)');
        
        // If no query, show everything
        if (normalizedQuery === '') {
            item.style.display = 'block';
            changeItems.forEach(change => change.style.display = 'grid');
            visibleRevisionCount++;
            return;
        }
        
        // Check if revision metadata matches
        const revisionMatches = revisionSearchText.includes(normalizedQuery);
        
        // Check if any change entries match
        let hasMatchingChanges = false;
        let visibleChangeCount = 0;
        
        changeItems.forEach(change => {
            const changeSearchText = change.dataset.searchText || '';
            if (changeSearchText.includes(normalizedQuery)) {
                change.style.display = 'grid';
                hasMatchingChanges = true;
                visibleChangeCount++;
            } else {
                change.style.display = 'none';
            }
        });
        
        // Show revision if either the revision matches OR it has matching changes
        if (revisionMatches || hasMatchingChanges) {
            item.style.display = 'block';
            visibleRevisionCount++;
            
            // If revision matches, show all changes
            if (revisionMatches) {
                changeItems.forEach(change => change.style.display = 'grid');
            }
        } else {
            item.style.display = 'none';
        }
    });
    
    updateRevisionListCount(visibleRevisionCount, revisionItems.length);
}

/**
 * Update revision list search results count
 * @param {number} visible - Number of visible items
 * @param {number} total - Total number of items
 */
function updateRevisionListCount(visible = null, total = null) {
    const resultsCount = document.getElementById('revision-tracking-count');
    if (!resultsCount) return;
    
    const revisionItems = document.querySelectorAll('.revision-item');
    total = total ?? revisionItems.length;
    
    if (visible === null) {
        visible = Array.from(revisionItems).filter(item => item.style.display !== 'none').length;
    }
    
    if (total === 0) {
        resultsCount.textContent = '';
    } else if (visible === total) {
        resultsCount.textContent = `${total}`;
    } else {
        resultsCount.textContent = `${visible}/${total}`;
    }
}

/**
 * Revert document to a specific revision
 * @param {string|number} revisionId - The revision ID to revert to
 */
export async function revertDocument(revisionId) {
    try {
        const version = parseInt(revisionId, 10);
        
        const confirmed = await showConfirm(
            `Revert to version ${version}?\n\n` +
            `This will replace your current working copy.\n` +
            `You'll need to SAVE and COMMIT to make it permanent.`,
            'Revert',
            'Cancel'
        );
        if (!confirmed) {
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
            
            showSuccess(
                `Reverted to version ${version} | ` +
                `Remember to: 1. Click SAVE to save your working copy | ` +
                `2. Click COMMIT to make it permanent`
            );
        }
        
    } catch (error) {
        console.error(`Error reverting to revision ${revisionId}:`, error);
        showError(`Failed to revert: ${error.message}`);
        throw error;
    }
}

/**
 * Toggle visibility of revision details
 */
export function toggleDetails() {
    try {
        const details = document.querySelector('.revisions');
        const subtitle = document.querySelector('.document-subtitle');
        
        if (!details) {
            throw new Error('Revisions container not found');
        }

        details.classList.toggle('hidden');
        if (subtitle) {
            subtitle.classList.toggle('hidden');
        }

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
