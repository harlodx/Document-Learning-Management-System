# Junk/Trash Feature Documentation

## Overview
The junk/trash system provides a soft-delete mechanism where deleted nodes are moved to a "junk" section instead of being permanently removed. Users can restore items from junk or permanently delete them.

## Features Implemented

### 1. Soft Delete
- When clicking the delete button (×) on a tree node, users are prompted to move the item to junk
- The node is cloned with metadata before removal:
  - `_junkedAt`: ISO timestamp of when item was junked
  - `_originalParentId`: ID of parent node (or 'root' if at root level)
  - `_originalIndex`: Position in parent's children array
- Node is removed from document tree and added to junk array

### 2. Junk Display Section
- Located in the sidebar (left panel)
- Shows all junked items with:
  - Item title
  - Date/time when junked
  - Restore button (↺ Restore)
  - Permanent delete button (🗑 Delete)
- Empty state shows "No junked items"
- Scrollable if many items (max-height: 300px)

### 3. Restore Functionality
- Clicking "Restore" moves item back to document tree
- Smart placement:
  - If original parent exists: restores to original position
  - If original parent missing: restores to root level
  - If original index out of bounds: appends to parent's children
- Removes junk metadata after restoration
- Updates both tree and junk displays
- Auto-saves changes

### 4. Permanent Delete
- Clicking "Delete" on junk item shows confirmation dialog
- Permanently removes item and all child nodes
- Cleans up all node IDs to prevent conflicts
- Cannot be undone
- Auto-saves changes

### 5. Clear All Junk
- Button at bottom of junk section
- Confirms before clearing all junked items
- Permanently deletes all items in junk
- Shows count of items being deleted
- Auto-saves changes

### 6. Persistence
- Junk items saved to localStorage automatically
- Loaded on application startup
- Survives page reloads
- Storage key: `dlms_junk_items`

### 7. Export/Import Integration
- Junk items included in export JSON
- Export structure includes `junkItems` array
- Import restores junked items from file
- Maintains metadata for future restoration
- Allows transferring work-in-progress with junked items

## Module Architecture

### junk-manager.js (NEW)
- `renderJunkItems()`: Renders junk section UI
- `restoreFromJunk(nodeId)`: Restores item to tree
- `permanentlyDeleteFromJunk(nodeId)`: Permanently removes item
- `clearAllJunk()`: Clears all junk items
- Helper functions for node finding and HTML escaping

### state-manager.js (ENHANCED)
- Added `_junkItems` array to state
- `getJunkItems()`: Returns junk array
- `setJunkItems(items)`: Updates junk with event notification
- Emits `junkItemsChanged` event when junk is modified
- `reset()`: Now clears junk items

### storage-manager.js (ENHANCED)
- Added `JUNK_ITEMS` storage key
- `saveJunkToStorage(items)`: Saves to localStorage
- `loadJunkFromStorage()`: Loads from localStorage
- `scheduleAutoSave()`: Now saves junk items
- `createExportPackage()`: Includes junk in export
- `initializeStorage()`: Subscribes to junk changes for auto-save

### data-operations.js (ENHANCED)
- Added `findNodeAndParent()`: Helper to find nodes with context
- `deleteNode()`: Rewritten to soft delete
  - Prompts user with "Move to junk?" message
  - Clones node with metadata
  - Adds to junk array
  - Removes from tree
  - Calls `renderJunkItems()`
- `importCompleteDocument()`: Restores junk from import
- Imports `renderJunkItems` from junk-manager

### script.js (ENHANCED)
- Imports junk-manager functions
- Loads junk items on startup
- Renders junk section on initialization
- Wires up "Clear All Junk" button

### styles.css (ENHANCED)
- `.junk-items`: Scrollable container
- `.junk-item`: Individual junk item styling
- `.junk-item-info`: Title and date layout
- `.junk-item-actions`: Button group styling
- `.restore-btn`: Green restore button
- `.delete-junk-btn`: Red delete button
- `#clear-all-junk-btn`: Red clear all button
- Hover states for all interactive elements

### index.html (ENHANCED)
- Added `<div id="junk-items-container">` for rendering
- Added `<button id="clear-all-junk-btn">` for clearing all
- Structured junk section with heading and description

## User Workflow

### Deleting an Item
1. Click × button on any tree node
2. Confirm "Move node to junk?" dialog
3. Node moves to junk section
4. Tree updates automatically
5. Changes auto-save

### Restoring an Item
1. Find item in junk section
2. Click "↺ Restore" button
3. Item moves back to tree at original location
4. Junk section updates
5. Changes auto-save

### Permanently Deleting
1. Click "🗑 Delete" on junk item
2. Confirm permanent deletion
3. Item removed completely
4. Cannot be undone

### Clearing All Junk
1. Click "Clear All" button at bottom of junk section
2. Confirm clearing all items
3. All junk items permanently deleted

### Export/Import with Junk
1. Export: Junk items automatically included in JSON
2. Import: Junk items restored from file
3. All metadata preserved for restoration

## Data Structure

### Junked Node Structure
```javascript
{
  id: "node_123",
  title: "My Node",
  content: "...",
  children: [...],
  // Junk metadata
  _junkedAt: "2025-01-15T12:34:56.789Z",
  _originalParentId: "node_456",  // or 'root'
  _originalIndex: 2
}
```

### Export Package Structure
```javascript
{
  metadata: {
    exportDate: "...",
    appVersion: "1.0",
    documentTitle: "...",
    documentSubtitle: "..."
  },
  documentStructure: [...],
  versionHistory: {...},
  junkItems: [...]  // NEW
}
```

## Testing Checklist

- [ ] Delete node moves to junk with confirmation
- [ ] Deleted node shows in junk section with title and date
- [ ] Restore button moves item back to tree
- [ ] Item restores to correct location
- [ ] Permanent delete removes item completely
- [ ] Clear All removes all junk items with confirmation
- [ ] Junk persists across page reloads
- [ ] Export includes junk items
- [ ] Import restores junk items
- [ ] Multiple items can be junked
- [ ] Nested items preserve children when junked
- [ ] Empty junk shows "No junked items"
- [ ] Styling looks good (colors, spacing, hover states)

## Future Enhancements (Not Implemented)

- Search/filter in junk section
- Sort junk by date/name
- Preview junked item content
- Undo last delete (temporary buffer)
- Auto-clear old junk items (e.g., after 30 days)
- Restore to custom location (not just original)
- Batch operations (restore/delete multiple items)

## Technical Notes

### ID Management
- Junked nodes keep their IDs for restoration
- Permanent delete cleans up IDs via `DocumentNode.deleteIdsRecursively()`
- Prevents ID conflicts when restoring

### Auto-Save
- Junk changes trigger auto-save (2 second debounce)
- Saves to localStorage via subscription system
- Also saves on document structure changes

### Error Handling
- All operations wrapped in try-catch
- User-friendly alert messages
- Console errors for debugging
- Graceful fallbacks (e.g., restore to root if parent missing)

### Event Flow
1. User clicks delete → `deleteNode()` called
2. Node cloned and added to state → `setJunkItems()` 
3. State change triggers event → `junkItemsChanged`
4. Storage manager listens → `saveJunkToStorage()`
5. Renderer updates UI → `renderJunkItems()`

## Summary

The junk/trash system provides a safety net for users, allowing them to recover from accidental deletions. It integrates seamlessly with the existing export/import and auto-save features, ensuring junked items are preserved across sessions and file transfers. The UI is intuitive with clear actions (restore vs. permanent delete) and proper confirmation dialogs for destructive operations.
