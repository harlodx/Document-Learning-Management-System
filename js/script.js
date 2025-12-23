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
 * Initialize index panel toggle functionality
 */
function initializeIndexPanel() {
    const indexToggle = document.getElementById('index-toggle');
    const indexPanel = document.getElementById('index-panel');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    
    if (!indexToggle || !indexPanel || !main) {
        console.warn('Index panel elements not found');
        return;
    }
    
    // Start with panel open by default - add active classes immediately
    indexToggle.classList.add('active');
    main.classList.add('index-open');
    if (header) header.classList.add('index-open');
    
    console.log('Index panel initialization:', {
        panelVisible: indexPanel.classList.contains('open'),
        panelLeft: window.getComputedStyle(indexPanel).left,
        mainMarginLeft: window.getComputedStyle(main).marginLeft,
        toggleActive: indexToggle.classList.contains('active'),
        mainIndexOpen: main.classList.contains('index-open')
    });
    
    indexToggle.addEventListener('click', () => {
        const isOpen = indexPanel.classList.contains('open');
        
        if (isOpen) {
            // Close the panel
            indexPanel.classList.remove('open');
            indexToggle.classList.remove('active');
            main.classList.remove('index-open');
            if (header) header.classList.remove('index-open');
        } else {
            // Open the panel
            indexPanel.classList.add('open');
            indexToggle.classList.add('active');
            main.classList.add('index-open');
            if (header) header.classList.add('index-open');
        }
        
        console.log('Index panel toggled:', !isOpen ? 'opened' : 'closed');
    });
    
    debugMessage('Index panel toggle initialized');
}

/**
 * Sets up export and import button handlers
 */
function setupExportImportHandlers() {
    const newBtn = document.getElementById('new-document-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const pdfBtn = document.getElementById('export-pdf-btn');
    
    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            console.log('New document button clicked');
            const { createNewDocument } = await import('./data-operations.js');
            await createNewDocument();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            console.log('Export button clicked');
            await exportCompleteDocument();
        });
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            console.log('Import button clicked');
            await importCompleteDocument();
        });
    }
    
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            console.log('PDF export button clicked');
            const documentStructure = stateManager.getDocumentStructure();
            const title = document.getElementById('document-name')?.value || 'Untitled Document';
            const subtitle = document.getElementById('document-subtitle')?.value || '';
            exportToPDF(documentStructure, title, subtitle);
        });
    }
    
    // Set up save and commit button handlers
    const saveBtn = document.getElementById('saveDocument');
    const commitBtn = document.getElementById('commitDocument');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            console.log('Save button clicked');
            saveDocument();
        });
    }
    
    if (commitBtn) {
        commitBtn.addEventListener('click', () => {
            console.log('Commit button clicked');
            commitDocument();
        });
    }
    
    // Set up auto-save for title and subtitle changes
    const titleElement = document.getElementById('document-name');
    const subtitleElement = document.getElementById('document-subtitle');
    
    if (titleElement) {
        titleElement.addEventListener('input', () => {
            scheduleAutoSave();
        });
    }
    
    if (subtitleElement) {
        subtitleElement.addEventListener('input', () => {
            scheduleAutoSave();
        });
    }
    
    // Set up clear all pending button
    const clearAllPendingBtn = document.getElementById('clear-all-pending-btn');
    if (clearAllPendingBtn) {
        clearAllPendingBtn.addEventListener('click', () => {
            clearAllPending();
        });
    }
    
    // Set up Add Root and Add Subnode buttons
    setupAddNodeButtons();
}

/**
 * Set up Add Root and Add Subnode button handlers
 */
async function setupAddNodeButtons() {
    const addRootBtn = document.getElementById('add-root-btn');
    const addSubnodeBtn = document.getElementById('add-subnode-btn');
    
    console.log('Setting up Add Node buttons...');
    console.log('Add Root button found:', !!addRootBtn);
    console.log('Add Subnode button found:', !!addSubnodeBtn);
    
    if (addRootBtn) {
        addRootBtn.addEventListener('click', async () => {
            console.log('Add Root button clicked');
            const { handleAddRootNode } = await import('./context-menu.js');
            
            // Get currently editing item to insert after
            const currentItem = stateManager.getCurrentEditingItem();
            const nodeId = currentItem ? currentItem.id : null;
            
            console.log('Adding root node. Current editing item:', nodeId);
            await handleAddRootNode(nodeId);
        });
    }
    
    if (addSubnodeBtn) {
        addSubnodeBtn.addEventListener('click', async () => {
            console.log('Add Subnode button clicked');
            const { handleAddSubnode } = await import('./context-menu.js');
            
            // Get currently editing item as parent
            const currentItem = stateManager.getCurrentEditingItem();
            
            if (!currentItem) {
                console.warn('No node selected - cannot add subnode');
                const { showError } = await import('./message-center.js');
                showError('Please select a node first');
                return;
            }
            
            console.log('Adding subnode to:', currentItem.id);
            await handleAddSubnode(currentItem.id);
        });
        
        // Listen for selection changes
        console.log('Adding listener for editingItemChanged...');
        stateManager.addListener('editingItemChanged', () => {
            console.log('editingItemChanged event fired!');
            updateAddSubnodeButtonState();
        });
        
        // Set initial button state
        console.log('Setting initial Add Subnode button state...');
        updateAddSubnodeButtonState();
    }
    
    console.log('Add Node buttons setup complete');
}

/**
 * Update the Add Subnode button state based on selection
 */
function updateAddSubnodeButtonState() {
    console.log('=== UPDATE ADD SUBNODE BUTTON STATE ===');
    
    const addSubnodeBtn = document.getElementById('add-subnode-btn');
    console.log('Button element found:', !!addSubnodeBtn);
    
    if (!addSubnodeBtn) {
        console.warn('Add Subnode button not found in DOM');
        return;
    }
    
    const currentItem = stateManager.getCurrentEditingItem();
    console.log('Current editing item:', currentItem);
    console.log('Current item ID:', currentItem?.id);
    console.log('Current item name:', currentItem?.name);
    
    if (!currentItem) {
        addSubnodeBtn.disabled = true;
        addSubnodeBtn.style.opacity = '0.5';
        addSubnodeBtn.style.cursor = 'not-allowed';
        addSubnodeBtn.title = 'Please select a node first';
        console.log('✗ Add Subnode button DISABLED (no selection)');
    } else {
        addSubnodeBtn.disabled = false;
        addSubnodeBtn.style.opacity = '1';
        addSubnodeBtn.style.cursor = 'pointer';
        addSubnodeBtn.title = `Add a subnode to "${currentItem.name}"`;
        console.log('✓ Add Subnode button ENABLED (node selected:', currentItem.id, currentItem.name, ')');
    }
    
    console.log('Button disabled state:', addSubnodeBtn.disabled);
    console.log('Button opacity:', addSubnodeBtn.style.opacity);
}

/**
 * Shows a temporary save indicator to the user
 * @param {string} message - The message to show
 * @param {boolean} hasUncommitted - Whether there are uncommitted changes
 * @param {string} color - Optional background color
 */
// Removed showSaveIndicator function - now using centralized message center

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
