/*
// =========================================================================
// DOCUMENT & LEARNING MANAGEMENT SYSTEM (DLMS)
// Main Application Entry Point
// =========================================================================
//
// This file serves as the main entry point and coordinates all modules.
// Individual functionality has been separated into dedicated modules:
// - state-manager.js: Centralized state management
// - revision-manager.js: Revision list and version control
// - tree-reconstruction.js: Hierarchical tree building from flat data
// - tree-renderer.js: DOM rendering of document tree
// - content-editor.js: Content editing functionality
// - data-operations.js: Import/export/save operations
// - event-handlers.js: Centralized event delegation
// - documentnode.js: DocumentNode class definition
//
// =========================================================================
*/

// Import modules
import './logger.js';
import DocumentNode from './documentnode.js';
import { stateManager } from './state-manager.js';
import { buildRevisionList, buildRevisionListFromHistory, RevisionDocument } from './revision-manager.js';
import { reconstructTreeFromFlatList } from './tree-reconstruction.js';
import { renderDocumentStructure } from './tree-renderer.js';
import { initializeContentEditor, initializeContentEditorDragDrop } from './content-editor.js';
import { initializeFileInput, loadInitialData, saveDocument, commitDocument, downloadVersionedDocument, exportCompleteDocument, importCompleteDocument } from './data-operations.js';
import { initializeAllEventHandlers } from './event-handlers.js';
import { 
    initializeStorage, 
    getStorageInfo, 
    clearStorage,
    setAutoSave,
    isAutoSaveEnabled,
    createBackup,
    listBackups,
    scheduleAutoSave,
    loadPendingFromStorage
} from './storage-manager.js';
import {
    initializeVersionedDocument,
    getVersionHistory,
    getDocumentStats,
    hasUncommittedChanges,
    revertToVersion
} from './version-control.js';
import { renderPendingItems, clearAllPending } from './pending-manager.js';
import { exportToPDF } from './print-formatter.js';
import { initializeSearch } from './search-manager.js';
import { initializeMenu, setUsername } from './menu-manager.js';
import { initializeContextMenu } from './context-menu.js';
import { initializeUndoManager } from './undo-manager.js';
import { initializeTheme } from './theme-manager.js';
import { initializeMessageCenter, showNotification, showSuccess } from './message-center.js';
import { initializeUserManagement, updateUserSelector, getCurrentUserInfo, exportUsersData, importUsersData } from './user-manager.js';

// =========================================================================
// CONFIGURATION & CONSTANTS
// =========================================================================

import { DEBUG_MODE, logDebug } from './logger.js';

/**
 * Debug logging utility
 * @param {string} message - The debug message
 * @param {*} data - Optional data to log
 */
function debugMessage(message, data = null) {
    if (!DEBUG_MODE) return;

    if (data !== null && data !== undefined) {
        logDebug('DEBUG:', message, data);
    } else {
        logDebug('DEBUG:', message);
    }
}

// =========================================================================
// UTILITY FUNCTIONS
// =========================================================================

/**
 * Query DOM elements and log if not found
 * @param {string} selector - CSS selector
 * @param {string} name - Element name for logging
 * @returns {Element|null}
 */
function getElement(selector, name = null) {
    const element = document.getElementById(selector);
    if (!element && name) {
        console.warn(`${name} element not found: #${selector}`);
    }
    return element;
}

/**
 * Query multiple DOM elements by IDs
 * @param {...string} ids - Element IDs to query
 * @returns {object} Object with id as key and element as value
 */
function getElements(...ids) {
    return ids.reduce((acc, id) => {
        acc[id] = document.getElementById(id);
        return acc;
    }, {});
}

/**
 * Update button state (disabled, opacity, cursor, title)
 * @param {Element} button - Button element
 * @param {boolean} enabled - Whether button should be enabled
 * @param {string} title - Button title/tooltip
 */
function setButtonState(button, enabled, title = '') {
    if (!button) return;
    
    button.disabled = !enabled;
    button.style.opacity = enabled ? '1' : '0.5';
    button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    if (title) button.title = title;
}

/**
 * Setup event listener with optional handler
 * @param {string} elementId - Element ID
 * @param {string} event - Event type (e.g., 'click')
 * @param {Function} handler - Event handler function
 * @returns {Element|null}
 */
function setupEventListener(elementId, event, handler) {
    const element = getElement(elementId);
    if (element && handler) {
        element.addEventListener(event, handler);
    }
    return element;
}

/**
 * Toggle CSS classes on element
 * @param {Element} element - DOM element
 * @param {string[]} classes - Class names to toggle
 * @param {boolean} force - True/false to force state
 */
function toggleClasses(element, classes, force = null) {
    if (!element) return;
    classes.forEach(cls => {
        element.classList.toggle(cls, force !== null ? force : undefined);
    });
}

/**
 * Check if element has class(es)
 * @param {Element} element - DOM element
 * @param {string[]} classes - Class names to check
 * @returns {boolean}
 */
function hasClasses(element, classes) {
    if (!element) return false;
    return classes.every(cls => element.classList.contains(cls));
}

// =========================================================================
// TEST DATA DEFINITIONS
// =========================================================================

/**
 * Test JSON Document structure
 */
class TestJsonDocument {
    constructor(id, name, content = [], order, children = []) {
        this.id = id;
        this.name = name;
        this.content = content;
        this.order = order;
        this.children = children;
    }
}

// Create test document nodes
const testNodes = {
    node_1_1_1: new TestJsonDocument(
        '1-1-1',
        'T 1.1.1',
        ['List all necessary tools and access credentials.', 'Something else to test with.'],
        15
    ),
    node_1_1: new TestJsonDocument(
        '1-1',
        'T 1.1',
        'Initial steps before starting the procedure.',
        14
    ),
    node_1_2: new TestJsonDocument(
        '1-2',
        'T 1.2',
        'The main procedural steps.',
        13
    ),
    node_1_2b: new TestJsonDocument(
        '1-2',
        'T 1.2 Duplicate',
        'Citations and reference materials.',
        12
    ),
    node_1_2_2: new TestJsonDocument(
        '1-2-2',
        'T 1.22',
        'The main procedural steps.',
        11
    ),
    node_1_2_2b: new TestJsonDocument(
        '1-2-2b',
        'T 1.22 Duplicate',
        'Citations and reference materials.',
        10
    ),
    node_1_3: new TestJsonDocument(
        '1-3',
        'T 1.3',
        'Citations and reference materials.',
        9
    ),
    node_1: new TestJsonDocument(
        '1',
        'T 1',
        'Overview of the entire process.',
        8,
        []
    ),
    node_2: new TestJsonDocument(
        '2',
        'T 2',
        'Checklist for final review.',
        7
    ),
    node_3: new TestJsonDocument(
        '3',
        'T 3',
        'Supplementary information and resources.',
        6
    ),
    node_3_1_1: new TestJsonDocument(
        '3-1-1-1',
        'T 3.1.1.1',
        'Links to external resources and references.',
        5
    ),
    node_3_22: new TestJsonDocument(
        '3-22',
        'T 3.22',
        'Extra documents and materials for reference.',
        4
    ),
    node_3_22b: new TestJsonDocument(
        '3-22',
        'T 3.22b',
        'A duplicate ID',
        2
    ),
    node_3_22c: new TestJsonDocument(
        '3-22',
        'T 3.22c',
        'A duplicate ID',
        1
    )
};

// Flat list of test nodes (intentionally out of order)
const flatNodeList = [
    testNodes.node_3,
    testNodes.node_1,
    testNodes.node_1_3,
    testNodes.node_1_1,
    testNodes.node_1_1_1,
    testNodes.node_1_2,
    testNodes.node_1_2b,
    testNodes.node_2,
    testNodes.node_3_1_1,
    testNodes.node_3_22,
    testNodes.node_3_22b,
    testNodes.node_3_22c,
    testNodes.node_1_2_2,
    testNodes.node_1_2_2b
];

// =========================================================================
// TEST REVISION DATA
// =========================================================================

const testRevisions = [
    new RevisionDocument(
        1,
        new Date('2025-12-10T10:00:00'),
        'Harlo',
        'Added recursive check for existing tree objects'
    ),
    new RevisionDocument(
        2,
        new Date('2025-12-10T14:30:00'),
        'Harlo',
        'Implemented tree reconstruction with cleanup groups'
    ),
    new RevisionDocument(
        3,
        new Date('2025-12-11T09:15:00'),
        'Harlo',
        'Refactored code into modules with error handling'
    )
];

// =========================================================================
// APPLICATION INITIALIZATION
// =========================================================================

/**
 * Initializes the application
 */
async function initializeApplication() {
    try {
        debugMessage('Initializing DLMS application...');
        
        // Initialize theme system first (affects visual rendering)
        debugMessage('Initializing theme...');
        initializeTheme();

        // Initialize message center (for tooltips, notifications, errors)
        debugMessage('Initializing message center...');
        initializeMessageCenter();

        // Initialize menu system
        debugMessage('Initializing menu...');
        initializeMenu();
        
        // Initialize index panel toggle
        debugMessage('Initializing index panel...');
        initializeIndexPanel();
        
        // Initialize user management system
        debugMessage('Initializing user management...');
        initializeUserManagement();
        updateUserSelector();

        // Initialize storage system
        const storageAvailable = initializeStorage();
        if (storageAvailable) {
            debugMessage('Local storage initialized');
            debugMessage('Storage info:', getStorageInfo());
        } else {
            console.warn('Local storage unavailable - changes will not be saved');
        }

        // Initialize all event handlers
        initializeAllEventHandlers();

        // Initialize content editor
        initializeContentEditor();
        
        // Initialize content editor drag and drop
        initializeContentEditorDragDrop();

        // Initialize file input
        initializeFileInput();
        
        // Initialize export/import buttons
        setupExportImportHandlers();
        
        // Load title and subtitle from localStorage
        loadTitleAndSubtitle();
        
        // Load pending items from localStorage
        const pendingItems = loadPendingFromStorage();
        if (pendingItems && pendingItems.length > 0) {
            stateManager.setPendingItems(pendingItems);
            debugMessage(`Loaded ${pendingItems.length} pending items`);
        }
        renderPendingItems();
        
        // Initialize search functionality
        debugMessage('Initializing search...');
        initializeSearch();
        
        // Initialize context menu
        debugMessage('Initializing context menu...');
        initializeContextMenu();
        
        // Initialize undo manager
        debugMessage('Initializing undo manager...');
        initializeUndoManager();

        // Load data from storage or use test data as fallback
        debugMessage('Loading document data...');
        const loadedData = await loadInitialData(flatNodeList);
        
        if (loadedData && loadedData.length > 0) {
            debugMessage(`Loaded ${loadedData.length} root nodes`);
        }

        // Get pending items from state (already loaded above)
        const currentPendingItems = stateManager.getPendingItems() || [];

        // Initialize version control with loaded data and pending items
        debugMessage('Initializing version control...');
        const documentName = 'DLMS Document'; // TODO: Get from user or metadata
        initializeVersionedDocument(documentName, loadedData, currentPendingItems);

        // Build revision list from version history
        debugMessage('Building revision list from version history...');
        buildRevisionListFromHistory();

        // Subscribe to state changes
        stateManager.subscribe('documentStructureChanged', (structure) => {
            debugMessage('Document structure changed', structure);
        });

        // Set up auto-save indicator
        window.addEventListener('dlms:autosaved', (event) => {
            debugMessage('Auto-saved at:', event.detail.timestamp);
            showNotification('✓ Auto-saved', 4000);
        });

        window.addEventListener('dlms:saved', (event) => {
            debugMessage('Manually saved at:', event.detail.timestamp);
            const uncommitted = event.detail.uncommittedChanges;
            if (uncommitted) {
                showNotification('⚠ Saved (uncommitted changes)', 4000);
            } else {
                showSuccess('✓ Saved', 4000);
            }
        });

        window.addEventListener('dlms:committed', (event) => {
            debugMessage('Committed version:', event.detail.version);
            showSuccess(`✓ Committed v${event.detail.version}`, 4000);
        });

        // Set up revision refresh handler
        window.addEventListener('dlms:refreshRevisions', () => {
            debugMessage('Refreshing revision list...');
            buildRevisionListFromHistory();
        });

        debugMessage('Application initialized successfully');
        debugMessage(`Auto-save is ${isAutoSaveEnabled() ? 'enabled' : 'disabled'}`);

        // Show initial document stats
        const stats = getDocumentStats();
        if (stats) {
            debugMessage('Document stats:', stats);
        }

    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Application failed to initialize. Please refresh the page.');
    }
}

/**
 * Loads document title and subtitle from localStorage
 */
function loadTitleAndSubtitle() {
    try {
        const titleElement = document.getElementById('document-name');
        const subtitleElement = document.getElementById('document-subtitle');
        
        const savedTitle = localStorage.getItem('dlms_document_title');
        const savedSubtitle = localStorage.getItem('dlms_document_subtitle');
        
        if (titleElement && savedTitle) {
            titleElement.value = savedTitle;
        }
        
        if (subtitleElement && savedSubtitle) {
            subtitleElement.value = savedSubtitle;
        }
        
        debugMessage('Loaded title and subtitle from storage');
    } catch (error) {
        console.error('Error loading title/subtitle:', error);
    }
}

/**
 * Toggle panel open/close state with related elements
 * @param {Element} toggle - Toggle button element
 * @param {Element} panel - Panel element
 * @param {Element[]} relatedElements - Elements affected by toggle
 */
function togglePanelState(toggle, panel, relatedElements = []) {
    if (!toggle || !panel) return;
    
    const isOpen = panel.classList.contains('open');
    const newState = !isOpen;
    
    // Update panel and toggle
    toggleClasses(panel, ['open'], newState);
    toggleClasses(toggle, ['active'], newState);
    
    // Update related elements
    relatedElements.forEach(el => {
        if (el) toggleClasses(el, ['index-open'], newState);
    });
    
    debugMessage(`Index panel ${newState ? 'opened' : 'closed'}`);
}

/**
 * Initialize index panel toggle functionality
 */
function initializeIndexPanel() {
    const { 'index-toggle': indexToggle, 'index-panel': indexPanel } = getElements('index-toggle', 'index-panel');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    
    if (!indexToggle || !indexPanel || !main) {
        console.warn('Index panel elements not found');
        return;
    }
    
    // Start with panel open by default
    toggleClasses(indexToggle, ['active'], true);
    toggleClasses(main, ['index-open'], true);
    if (header) toggleClasses(header, ['index-open'], true);
    
    debugMessage('Index panel initialized (open by default)');
    
    // Set up toggle click handler
    indexToggle.addEventListener('click', () => {
        togglePanelState(indexToggle, indexPanel, [main, header]);
    });
    
    debugMessage('Index panel toggle initialized');
}

/**
 * Sets up export and import button handlers
 */
function setupExportImportHandlers() {
    // Document operation buttons
    setupEventListener('new-document-btn', 'click', async () => {
        debugMessage('New document button clicked');
        const { createNewDocument } = await import('./data-operations.js');
        await createNewDocument();
    });
    
    setupEventListener('export-btn', 'click', async () => {
        debugMessage('Export button clicked');
        await exportCompleteDocument();
    });
    
    setupEventListener('import-btn', 'click', async () => {
        debugMessage('Import button clicked');
        await importCompleteDocument();
    });
    
    setupEventListener('export-pdf-btn', 'click', () => {
        debugMessage('PDF export button clicked');
        const documentStructure = stateManager.getDocumentStructure();
        const title = document.getElementById('document-name')?.value || 'Untitled Document';
        const subtitle = document.getElementById('document-subtitle')?.value || '';
        exportToPDF(documentStructure, title, subtitle);
    });
    
    // Save and commit buttons
    setupEventListener('saveDocument', 'click', () => {
        debugMessage('Save button clicked');
        saveDocument();
    });
    
    setupEventListener('commitDocument', 'click', () => {
        debugMessage('Commit button clicked');
        commitDocument();
    });
    
    // Title and subtitle auto-save
    ['document-name', 'document-subtitle'].forEach(id => {
        setupEventListener(id, 'input', scheduleAutoSave);
    });
    
    // Clear pending items
    setupEventListener('clear-all-pending-btn', 'click', clearAllPending);
    
    // Set up Add Root and Add Subnode buttons
    setupAddNodeButtons();
}

/**
 * Set up Add Root and Add Subnode button handlers
 */
async function setupAddNodeButtons() {
    const { 'add-root-btn': addRootBtn, 'add-subnode-btn': addSubnodeBtn } = getElements('add-root-btn', 'add-subnode-btn');
    
    debugMessage('Setting up Add Node buttons...');
    
    if (addRootBtn) {
        addRootBtn.addEventListener('click', async () => {
            debugMessage('Add Root button clicked');
            const { handleAddRootNode } = await import('./context-menu.js');
            const currentItem = stateManager.getCurrentEditingItem();
            await handleAddRootNode(currentItem ? currentItem.id : null);
        });
    }
    
    if (addSubnodeBtn) {
        addSubnodeBtn.addEventListener('click', async () => {
            debugMessage('Add Subnode button clicked');
            const { handleAddSubnode } = await import('./context-menu.js');
            const currentItem = stateManager.getCurrentEditingItem();
            
            if (!currentItem) {
                const { showError } = await import('./message-center.js');
                showError('Please select a node first');
                return;
            }
            
            debugMessage('Adding subnode to:', currentItem.id);
            await handleAddSubnode(currentItem.id);
        });
        
        // Listen for selection changes
        stateManager.addListener('editingItemChanged', updateAddSubnodeButtonState);
        updateAddSubnodeButtonState();
    }
    
    debugMessage('Add Node buttons setup complete');
}

/**
 * Update the Add Subnode button state based on selection
 */
function updateAddSubnodeButtonState() {
    const addSubnodeBtn = getElement('add-subnode-btn');
    if (!addSubnodeBtn) return;
    
    const currentItem = stateManager.getCurrentEditingItem();
    const enabled = !!currentItem;
    const title = enabled 
        ? `Add a subnode to "${currentItem.name}"` 
        : 'Please select a node first';
    
    setButtonState(addSubnodeBtn, enabled, title);
    debugMessage(`Add Subnode button ${enabled ? 'enabled' : 'disabled'}`, currentItem);
}

// =========================================================================
// DOM READY EVENT
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApplication();
});

// =========================================================================
// EXPORT FOR TESTING/DEBUGGING
// =========================================================================

// Export utilities for console access during development
if (DEBUG_MODE) {
    window.DLMS = {
        stateManager,
        DocumentNode,
        debugMessage,
        testNodes,
        flatNodeList,
        testRevisions,
        // Expose functions for manual testing
        loadInitialData,
        renderDocumentStructure,
        buildRevisionList,
        // Storage functions
        saveDocument,
        commitDocument,
        downloadVersionedDocument,
        getStorageInfo,
        clearStorage,
        setAutoSave,
        isAutoSaveEnabled,
        createBackup,
        listBackups,
        // Version control functions
        getVersionHistory,
        getDocumentStats,
        hasUncommittedChanges,
        revertToVersion
    };
    console.log('Debug mode enabled. Access DLMS utilities via window.DLMS');
    console.log('\nVersion Control commands:');
    console.log('  DLMS.saveDocument() - Save working copy');
    console.log('  DLMS.commitDocument() - Commit to version history');
    console.log('  DLMS.downloadVersionedDocument() - Download with full history');
    console.log('  DLMS.getVersionHistory() - View all versions');
    console.log('  DLMS.getDocumentStats() - View document statistics');
    console.log('  DLMS.hasUncommittedChanges() - Check for uncommitted changes');
    console.log('  DLMS.revertToVersion(n) - Revert to version n');
    console.log('\nStorage commands:');
    console.log('  DLMS.getStorageInfo() - View storage usage');
    console.log('  DLMS.clearStorage() - Clear all data');
    console.log('  DLMS.setAutoSave(true/false) - Toggle auto-save');
    console.log('  DLMS.createBackup("name") - Create backup');
    console.log('  DLMS.listBackups() - List all backups');
}
