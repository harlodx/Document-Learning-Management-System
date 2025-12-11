# DLMS JavaScript Modules Documentation

## Overview

The DLMS (Document & Learning Management System) JavaScript code has been refactored into modular components with comprehensive error handling. This document provides an overview of each module and how they work together.

## Module Architecture

```
js/
├── script.js                  # Main entry point
├── documentnode.js           # DocumentNode class (existing)
├── state-manager.js          # State management
├── revision-manager.js       # Revision/version control
├── tree-reconstruction.js    # Tree building from flat data
├── tree-renderer.js          # DOM rendering
├── content-editor.js         # Content editing
├── data-operations.js        # Import/export/save
├── event-handlers.js         # Event delegation
├── storage-manager.js        # Local browser storage (NEW)
└── storage-ui.js             # Storage UI controls (NEW)
```

## Module Details

### 1. `script.js` - Main Entry Point
**Purpose**: Application initialization and coordination  
**Responsibilities**:
- Initialize all modules
- Load test data
- Set up event listeners
- Coordinate module interactions

**Key Functions**:
- `initializeApplication()` - Main initialization function
- `debugMessage(message, data)` - Debug logging utility

### 2. `state-manager.js` - State Management
**Purpose**: Centralized application state  
**Exports**: `stateManager` (singleton instance)

**Key Methods**:
- `getDocumentStructure()` - Get current document structure
- `setDocumentStructure(structure)` - Update document structure with validation
- `getCurrentEditingItem()` - Get currently editing item
- `setCurrentEditingItem(item)` - Set currently editing item
- `subscribe(event, callback)` - Subscribe to state changes
- `reset()` - Reset all state

**Events**:
- `documentStructureChanged` - Fired when document structure updates
- `editingItemChanged` - Fired when editing item changes
- `stateReset` - Fired when state is reset

### 3. `revision-manager.js` - Revision Management
**Purpose**: Handle document revisions and version history  
**Exports**: 
- `RevisionDocument` class
- `buildRevisionList(revisionList)`
- `viewRevision(revisionId)`
- `revertDocument(revisionId)`
- `toggleDetails()`
- `toggleRevisionList()`

**Error Handling**:
- Validates revision list container exists
- Handles invalid revision data gracefully
- Provides placeholder when no revisions exist

### 4. `tree-reconstruction.js` - Tree Building
**Purpose**: Reconstruct hierarchical tree from flat data  
**Exports**:
- `reconstructTreeFromFlatList(flatList)` - Main reconstruction function
- `validateFlatList(flatList)` - Validation utility

**Features**:
- Handles broken ID chains
- Groups problematic nodes in cleanup containers
- Validates input data
- Provides detailed error messages

**Error Handling**:
- Input validation
- Graceful handling of missing parents
- Cleanup node generation for orphaned items

### 5. `tree-renderer.js` - Tree Rendering
**Purpose**: Render document tree as HTML  
**Exports**:
- `renderDocumentStructure(documentStructure, containerId)` - Render entire tree
- `buildNestedList(nodes, parentElement)` - Build nested lists
- `findNodeById(documentStructure, targetId)` - Find nodes by ID
- `updateNodeDisplay(nodeId, updates)` - Update individual nodes

**Error Handling**:
- Validates container element exists
- Handles empty document structures
- Gracefully handles invalid nodes
- Provides error messages in DOM

### 6. `content-editor.js` - Content Editing
**Purpose**: Handle content editing functionality  
**Exports**:
- `loadContentForEditing(node)` - Load content for a node
- `populateContentList(contentNode)` - Populate content list
- `addListItem(text)` - Add new content item
- `clearContentList()` - Clear and cleanup
- `initializeContentEditor()` - Initialize editor
- `cleanup()` - Remove all event listeners

**Features**:
- Event listener tracking and cleanup
- Inline editing support
- Auto-save on blur
- Enter key support

**Error Handling**:
- Validates required DOM elements
- Tracks event listeners for cleanup
- Handles missing content gracefully

### 7. `data-operations.js` - Data Operations
**Purpose**: Handle import, export, and save operations  
**Exports**:
- `importJsonDocument(jsonString)` - Parse JSON
- `handleFileImport(file)` - Import from file (Promise-based)
- `initializeFileInput(inputId)` - Set up file input
- `exportDocumentAsJson(documentStructure)` - Export to JSON
- `downloadDocumentAsFile(documentStructure, filename)` - Download file
- `saveDocument(docId)` - Save document (stub)
- `commitDocument(docId, commitMessage)` - Commit document (stub)
- `unlockDocument(docId)` - Unlock document (stub)
- `importDocument()` - Trigger import
- `loadTestData(testData)` - Load test data

**Error Handling**:
- JSON parsing validation
- File type validation
- Async error handling with Promises
- User-friendly error messages

### 8. `event-handlers.js` - Event Delegation
**Purpose**: Centralized event handling  
**Exports**:
- `handleTreeElementClick(nodeId)` - Handle tree clicks
- `initializeDynamicClickHandler(parentId, targetClass)` - Set up delegation
- `initializeAllEventHandlers()` - Initialize all handlers
- `cleanupEventHandlers(parentId)` - Cleanup

**Features**:
- Event delegation pattern
- Automatic routing based on element ID
- Prevents duplicate listeners
- Centralized click handling

**Routing Logic**:
- `T-*` → Tree element clicks
- `view-revision-*` → View revision
- `revert-to-document-*` → Revert document
- Specific IDs → Named button handlers

## Error Handling Strategy

All modules implement comprehensive error handling:

1. **Input Validation**: All public functions validate inputs
2. **Try-Catch Blocks**: Wrap risky operations
3. **Error Logging**: Detailed console.error messages
4. **User Feedback**: User-friendly error messages where appropriate
5. **Graceful Degradation**: Continue operation when possible
6. **Type Checking**: Validate data types before operations

## Usage Examples

### Loading and Rendering Data

```javascript
import { loadTestData } from './data-operations.js';
import { renderDocumentStructure } from './tree-renderer.js';

// Load test data
const nodes = loadTestData(flatNodeList);

// Render
renderDocumentStructure(nodes);
```

### Subscribing to State Changes

```javascript
import { stateManager } from './state-manager.js';

stateManager.subscribe('documentStructureChanged', (structure) => {
    console.log('Document updated:', structure);
});
```

### Handling File Import

```javascript
import { initializeFileInput } from './data-operations.js';

// Initialize file input handler
initializeFileInput('fileInput');
```

## Migration Notes

### From Old Code to New Modules

| Old Location | New Module | Function/Class |
|-------------|------------|----------------|
| Global `documentStructure` | `state-manager.js` | `stateManager.getDocumentStructure()` |
| `buildRevisionList()` | `revision-manager.js` | `buildRevisionList()` |
| `reconstructTreeFromFlatList()` | `tree-reconstruction.js` | `reconstructTreeFromFlatList()` |
| `renderDocumentStructure()` | `tree-renderer.js` | `renderDocumentStructure()` |
| `addListItem()` | `content-editor.js` | `addListItem()` |
| `importJsonDocument()` | `data-operations.js` | `importJsonDocument()` |
| `initializeDynamicClickHandler()` | `event-handlers.js` | `initializeDynamicClickHandler()` |

### 9. `storage-manager.js` - Local Storage (NEW)
**Purpose**: Persistent local browser storage  
**Exports**:
- `saveDocumentToStorage(documentStructure)` - Save to localStorage
- `loadDocumentFromStorage()` - Load from localStorage
- `saveRevisionsToStorage(revisions)` - Save revisions
- `loadRevisionsFromStorage()` - Load revisions
- `getStorageInfo()` - Get storage usage statistics
- `clearStorage()` - Clear all stored data
- `setAutoSave(enabled)` - Enable/disable auto-save
- `isAutoSaveEnabled()` - Check auto-save status
- `scheduleAutoSave(documentStructure)` - Schedule auto-save
- `initializeStorage()` - Initialize storage system
- `createBackup(backupName)` - Create named backup
- `listBackups()` - List all backups
- `exportAllData()` - Export all data as object
- `importAllData(data)` - Import data from object

**Features**:
- Auto-save with 2-second debounce
- Storage quota monitoring
- Backup/restore functionality
- Storage size tracking
- Browser compatibility check

**Error Handling**:
- Detects localStorage availability
- Handles quota exceeded errors
- JSON parsing validation
- User-friendly error messages

### 10. `storage-ui.js` - Storage UI Controls (NEW)
**Purpose**: UI components for storage management  
**Exports**:
- `createStorageInfoPanel()` - Create storage info display
- `createStorageControls()` - Create control buttons
- `injectStorageControls(targetId)` - Inject controls into page
- `showBackupsList()` - Display available backups

**Controls Provided**:
- Manual save button
- Auto-save toggle
- Create backup button
- Export all data button
- Clear storage button
- Storage info display

## TODO Items

The following functions are implemented as stubs and need completion:

1. **Revision Management**
   - `viewRevision()` - Load and display a specific revision
   - `revertDocument()` - Revert to a previous version

2. **Data Operations**
   - ✅ `saveDocument()` - **IMPLEMENTED** with localStorage
   - `commitDocument()` - Implement commit workflow with version tracking
   - `unlockDocument()` - Implement document locking

3. **Content Editor**
   - `updateSourceData()` - Persist content changes to data structure

4. **Version Control**
   - Implement JSON Patch generation for history
   - Implement patch application for revert
   - Add revision history tracking with storage

## Debugging

Debug mode is enabled by default. Access utilities via browser console:

```javascript
window.DLMS.stateManager.getDocumentStructure()
window.DLMS.testNodes
window.DLMS.renderDocumentStructure(...)
```

To disable debug mode, set `DEBUG_MODE = false` in `script.js`.

## Local Storage System

### How It Works

1. **Auto-save**: Automatically saves changes 2 seconds after the last edit
2. **Manual Save**: Click "Save Now" button or call `DLMS.saveDocument()`
3. **Persistence**: Data survives browser refresh and restart
4. **Storage Limit**: ~5-10 MB depending on browser (localStorage limit)
5. **Backups**: Create named backups for important versions

### Storage Structure

```javascript
localStorage:
  ├── dlms_document_structure     // Main document tree
  ├── dlms_revisions             // Revision history
  ├── dlms_metadata              // Last saved, size, etc.
  ├── dlms_auto_save_enabled     // Auto-save preference
  └── dlms_backup_*              // Named backups
```

### Usage Examples

```javascript
// Manual save
DLMS.saveDocument();

// Check storage usage
const info = DLMS.getStorageInfo();
console.log(`Using ${info.totalSizeKB} KB`);

// Toggle auto-save
DLMS.setAutoSave(false); // Disable
DLMS.setAutoSave(true);  // Enable

// Create backup
DLMS.createBackup('before_major_changes');

// List backups
const backups = DLMS.listBackups();

// Clear all data (use with caution!)
DLMS.clearStorage();
```

### Events

The storage system emits custom events:

- `dlms:autosaved` - Fired when auto-save completes
- `dlms:saved` - Fired when manual save completes

Listen for these events to update UI:

```javascript
window.addEventListener('dlms:autosaved', (e) => {
    console.log('Auto-saved at:', e.detail.timestamp);
});
```

## Benefits of Refactored Architecture

1. **Modularity**: Clear separation of concerns
2. **Maintainability**: Easy to locate and update code
3. **Testability**: Each module can be tested independently
4. **Error Handling**: Comprehensive error handling throughout
5. **Scalability**: Easy to extend functionality
6. **Memory Management**: Proper event listener cleanup
7. **State Management**: Centralized state with subscriber pattern
8. **Type Safety**: Input validation on all public functions
9. **Data Persistence**: Automatic local storage with auto-save (NEW)
10. **User Experience**: Visual save indicators and storage management (NEW)
