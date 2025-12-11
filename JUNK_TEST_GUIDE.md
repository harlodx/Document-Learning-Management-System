# Junk Feature - Quick Test Guide

## How to Test

### Setup
1. Open `index.html` in your browser
2. Make sure you have some nodes in the document tree
3. Look for the "Junk / Trash" section in the left sidebar

### Test 1: Basic Soft Delete
1. Find any node in the document tree
2. Click the × (delete) button
3. **Expected**: Confirmation dialog appears: "Move node to junk? You can restore it later from the Junk section."
4. Click OK
5. **Expected**: 
   - Node disappears from tree
   - Node appears in Junk section with title and timestamp
   - Junk shows buttons: "↺ Restore" and "🗑 Delete"

### Test 2: Restore from Junk
1. In the Junk section, find a junked item
2. Click "↺ Restore" button
3. **Expected**:
   - Item disappears from Junk section
   - Item reappears in document tree at original location
   - Tree structure is maintained

### Test 3: Permanent Delete
1. Junk an item (if needed)
2. Click "🗑 Delete" button on junk item
3. **Expected**: Confirmation dialog: "Permanently delete '[title]'? This cannot be undone!"
4. Click OK
5. **Expected**:
   - Item removed from Junk section
   - Item cannot be recovered

### Test 4: Clear All Junk
1. Junk multiple items (2-3 items)
2. Click "Clear All" button at bottom of Junk section
3. **Expected**: Confirmation: "Permanently delete all X junked item(s)? This cannot be undone!"
4. Click OK
5. **Expected**:
   - All items removed from Junk
   - Section shows "No junked items"

### Test 5: Persistence (Page Reload)
1. Junk a few items
2. Reload the page (F5 or Ctrl+R)
3. **Expected**:
   - Junked items still appear in Junk section
   - All metadata preserved (title, date)

### Test 6: Export with Junk
1. Junk some items
2. Click Export button
3. Save the JSON file
4. Open the JSON file in a text editor
5. **Expected**: File contains `junkItems` array with your junked items

### Test 7: Import with Junk
1. Export a document with junked items (from Test 6)
2. Clear/delete some tree items
3. Click Import button
4. Select the exported file
5. **Expected**:
   - Document tree restored
   - Junk items restored in Junk section
   - Can restore junked items from import

### Test 8: Nested Items
1. Delete a node that has children
2. **Expected**: Parent and all children appear as one item in Junk
3. Restore the item
4. **Expected**: Parent and all children restored to tree

### Test 9: Empty State
1. Clear all junk (or start fresh)
2. **Expected**: Junk section shows "No junked items" in italic gray text

### Test 10: Auto-Save
1. Open browser DevTools (F12)
2. Go to Application tab → Local Storage
3. Find `dlms_junk_items` key
4. Junk an item
5. Wait 2-3 seconds
6. **Expected**: `dlms_junk_items` updates with new item

## Visual Checks

### Styling
- Junk items should have light gray background (#f9f9f9)
- Hover should change to slightly darker (#f0f0f0)
- Restore button should be green (#4CAF50)
- Delete button should be red (#f44336)
- Clear All button should be red (#f44336)
- Buttons should have smooth hover transitions

### Layout
- Title and date should stack vertically
- Buttons should be side-by-side on the right
- Section should scroll if more than ~8 items
- Clear All button below the scrollable area

## Expected Console Messages

When testing, you should see these console messages:
- "Loaded X junked items" (on startup, if items exist)
- "Restored item [id] from junk" (when restoring)
- "Permanently deleted junked item [id]" (when deleting)
- "Cleared all junk items" (when clearing all)
- "Junk items saved to local storage" (on changes)

## Common Issues to Check

1. **Delete button shows confirmation**: The message should say "Move to junk?" not "Delete node?"
2. **Items appear in junk**: After clicking OK, item should immediately show in Junk section
3. **Restore works**: Item goes back to correct location in tree
4. **Persistence**: Items survive page reload
5. **Export includes junk**: JSON file has junkItems array
6. **Import restores junk**: Imported file brings back junk items

## Browser Console Tests

You can also test programmatically in browser console:

```javascript
// Check junk items
stateManager.getJunkItems()

// Manually add test junk item
const testItem = {
  id: "test_123",
  title: "Test Junk Item",
  content: "Test content",
  children: [],
  _junkedAt: new Date().toISOString(),
  _originalParentId: "root",
  _originalIndex: 0
};
stateManager.setJunkItems([...stateManager.getJunkItems(), testItem]);
renderJunkItems();

// Clear all junk
stateManager.setJunkItems([]);
renderJunkItems();
```

## Success Criteria

✅ All 10 tests pass
✅ No console errors
✅ Visual styling looks good
✅ Confirmations appear for destructive actions
✅ Auto-save works (check localStorage)
✅ Export/import includes junk items
✅ Items restore to correct positions
✅ Page reloads preserve junk items

## Troubleshooting

**Problem**: Junk section doesn't appear
- **Check**: HTML has `<div id="junk-items-container">`
- **Check**: CSS loaded correctly

**Problem**: Delete button still permanently deletes
- **Check**: `deleteNode()` function updated in data-operations.js
- **Check**: Browser cache cleared (hard refresh: Ctrl+Shift+R)

**Problem**: Items don't restore to correct location
- **Check**: `findNodeById()` helper function in junk-manager.js
- **Check**: Parent IDs are correct when junking

**Problem**: Junk doesn't persist
- **Check**: localStorage enabled in browser
- **Check**: `saveJunkToStorage()` being called
- **Check**: DevTools → Application → Local Storage

**Problem**: Import doesn't restore junk
- **Check**: Export file contains `junkItems` array
- **Check**: Import function updated to handle junkItems
- **Check**: `stateManager.setJunkItems()` called in import
