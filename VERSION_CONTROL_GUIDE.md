# DLMS Version Control Guide

## Overview

The DLMS now includes a **complete local version control system** with Git-like save/commit workflow. All version history is stored within the document file itself, making it portable and self-contained.

## Key Concepts

### Save vs. Commit

The system uses a two-step workflow similar to Git:

1. **SAVE** - Saves your working copy (in-memory changes)
   - Fast and frequent
   - Can be done multiple times
   - Creates no version history entry
   - Changes are marked as "uncommitted"

2. **COMMIT** - Commits saved changes to version history
   - Less frequent
   - Creates a permanent version with message
   - Generates a JSON Patch (delta) of changes
   - Allows you to revert to this point later

### Version History

- **Version 0** - Initial/empty state
- **Version 1+** - Each commit creates a new version
- **Patches** - Only differences are stored (efficient)
- **Self-contained** - All history is in one JSON file

## Workflow

### Basic Workflow

```
1. Make changes to document
   ↓
2. Click "Save Document" (or auto-save triggers)
   → Working copy saved
   → Uncommitted changes indicator appears
   ↓
3. Click "Commit" when ready
   → Prompted for commit message
   → New version created
   → History updated
```

### Example Workflow

```
User Action                 | System State
---------------------------|---------------------------
Edit document tree         | Uncommitted changes
Save                       | Saved* (uncommitted)
Edit more                  | Still uncommitted
Save again                 | Saved* (uncommitted)
Commit "Added sections"    | Version 1 created
Edit again                 | Uncommitted changes
Save                       | Saved* (uncommitted)
Commit "Restructured"      | Version 2 created
```

## Features

### 1. Save Working Copy

**Action**: Click "Save Document" button

**What happens:**
- Current document state saved to memory
- localStorage updated for persistence
- Uncommitted changes flag set
- Orange "Saved*" indicator appears
- Commit button turns orange with pulsing animation

**When to use:**
- After making changes
- Before taking a break
- Frequently (or let auto-save do it)

### 2. Commit Changes

**Action**: Click "Commit" button

**What happens:**
- Prompted for commit message
- Prompted for author name (stored for future commits)
- JSON Patch generated (only differences)
- New version added to history
- Revision list updated
- Blue "Committed v#" indicator appears

**When to use:**
- After completing a logical unit of work
- Before major restructuring
- When you want a restore point
- End of work session

### 3. Download Document

**Action**: Click "Download Document" or "Export" button

**What happens:**
- Prompted for filename
- Default name includes document name, version, and date
- Example: `dlms_document_v5_2025-12-11.json`
- Complete document with ALL version history downloaded
- File saved to your Downloads folder (or chosen location)

**File contents:**
```json
{
  "metadata": {
    "documentName": "DLMS Document",
    "currentVersion": 5,
    "created": "2025-12-11T10:00:00.000Z",
    "lastModified": "2025-12-11T15:30:00.000Z"
  },
  "document": [ /* current document structure */ ],
  "history": [
    {
      "version": 1,
      "timestamp": "2025-12-11T10:15:00.000Z",
      "author": "John Doe",
      "message": "Initial structure",
      "patch": [ /* JSON Patch operations */ ],
      "nodeCount": 15
    },
    // ... more versions
  ],
  "uncommittedChanges": false
}
```

### 4. View Version History

**Action**: Click dropdown arrow in Revisions panel

**What you see:**
- List of all committed versions (newest first)
- Version number
- Date/time of commit
- Author name
- Commit message
- "View" and "Revert" buttons for each version

### 5. View Specific Version

**Action**: Click "View" button on a revision

**What happens:**
- Document reconstructed at that version
- Display switches to show that version
- Alert explains this is preview only
- No changes to current working copy
- Click Revert to actually restore

### 6. Revert to Previous Version

**Action**: Click "Revert" button on a revision

**What happens:**
- Confirmation prompt appears
- If confirmed, document restored to that version
- Working copy updated
- Marked as uncommitted changes
- You must SAVE and COMMIT to make permanent

**Important**: Reverting does NOT delete newer versions. It just loads an old version into your working copy.

## Console Commands

All version control functions are accessible via browser console (F12):

### Basic Commands

```javascript
// Save current working copy
DLMS.saveDocument()
// Returns: { success: true, uncommittedChanges: true }

// Commit changes
DLMS.commitDocument()
// Prompts for message and author
// Returns: { success: true, version: 3, message: "..." }

// Download document with history
DLMS.downloadVersionedDocument()
// Prompts for filename

// Check for uncommitted changes
DLMS.hasUncommittedChanges()
// Returns: true or false
```

### Advanced Commands

```javascript
// View version history
const history = DLMS.getVersionHistory()
console.log(history)

// Get document statistics
const stats = DLMS.getDocumentStats()
console.log(stats)
// {
//   documentName: "DLMS Document",
//   currentVersion: 5,
//   totalVersions: 5,
//   nodeCount: 47,
//   uncommittedChanges: false,
//   historySizeKB: "12.34",
//   totalSizeKB: "56.78"
// }

// Revert to specific version
DLMS.revertToVersion(3)
// Reverts to version 3 (remember to save and commit!)
```

## File Management

### Downloading Files

**Default filename format:**
```
{document_name}_v{version}_{date}.json
```

**Examples:**
- `dlms_document_v0_2025-12-11.json` (initial)
- `my_procedures_v5_2025-12-11.json`
- `training_manual_v12_2025-12-11.json`

**Custom filename:**
- When prompted, enter any name you want
- `.json` extension added automatically if missing

### Opening Files

**To open a downloaded document:**

1. Click "Import Document" button
2. Select your `.json` file
3. System loads:
   - Current document structure
   - Full version history
   - All metadata

**Everything is preserved!**

### File Compatibility

**Files include:**
- ✅ Current document structure
- ✅ Complete version history
- ✅ All commit messages
- ✅ Author information
- ✅ Timestamps
- ✅ Metadata

**Files are portable:**
- Can be emailed
- Can be stored in cloud (Dropbox, Google Drive, etc.)
- Can be version-controlled externally (Git)
- Can be backed up
- Work on any computer with DLMS

## Visual Indicators

### Save Indicator (Top-right)

| Indicator | Color | Meaning |
|-----------|-------|---------|
| ✓ Saved | Green | Saved, no uncommitted changes |
| ⚠ Saved* | Orange | Saved, but has uncommitted changes |
| ✓ Committed v# | Blue | Just committed to version history |

### Commit Button

| State | Appearance | Meaning |
|-------|------------|---------|
| Normal | Gray | No uncommitted changes |
| Has Changes | Orange, pulsing | Uncommitted changes exist - commit recommended |

## Best Practices

### 1. Save Frequently

**Do this:**
- Let auto-save handle routine saves
- Manually save before breaks
- Save before major operations

**Don't do this:**
- Worry about saving too often
- Wait until end of day to save

### 2. Commit Strategically

**Good commit points:**
- ✅ Completed a logical section
- ✅ Before restructuring
- ✅ End of work session
- ✅ Before testing major changes
- ✅ Achieved a milestone

**Write good commit messages:**
```
Good:
- "Added training procedures section"
- "Reorganized chapter 3 structure"
- "Fixed broken ID chains in section 2"

Bad:
- "changes"
- "asdf"
- "update"
```

### 3. Download Regularly

**Download when:**
- End of major work session
- Before making risky changes
- Weekly backup
- Before sharing with others

**Naming convention:**
```
{project}_{version}_{date}.json

Examples:
- training_manual_v5_2025-12-11.json
- procedures_draft_v3_2025-12-11.json
- final_document_v1_2025-12-11.json
```

### 4. Use Versions Wisely

**Create versions for:**
- Completed milestones
- Working states you might want to return to
- Before major experiments

**Don't create versions for:**
- Every tiny change (use auto-save)
- Test edits you'll immediately undo

## Troubleshooting

### "No changes to commit"

**Cause**: You haven't made any edits since last commit

**Solution**: Make changes, save, then commit

### Commit button not orange

**Cause**: No uncommitted changes

**Check**:
```javascript
DLMS.hasUncommittedChanges()
```

### Can't see version history

**Cause**: No commits made yet

**Solution**: 
1. Make some changes
2. Save
3. Commit with message

### Version list empty

**Cause**: Document has no committed versions

**Solution**: Commit your first version

### File won't download

**Browser issues:**
- Check popup blocker
- Check download permissions
- Try different browser

**Console command:**
```javascript
DLMS.downloadVersionedDocument('my_document.json')
```

## Advanced Usage

### Comparing Versions

**Console only** (no UI yet):

```javascript
// Compare version 2 to version 5
const changes = DLMS.getChangesBetweenVersions(2, 5)
console.log(changes)
// {
//   fromVersion: 2,
//   toVersion: 5,
//   changeCount: 47,
//   changes: [ /* JSON Patch operations */ ]
// }
```

### Manual Commit

```javascript
// Commit with specific message and author
DLMS.commitDocument(null, 'Added glossary section', 'Jane Smith')
```

### Inspect Patch Operations

```javascript
const history = DLMS.getVersionHistory()
const lastCommit = history[history.length - 1]
console.log('Last commit patches:', lastCommit.patch)
```

## Technical Details

### JSON Patch Format

Uses RFC 6902 JSON Patch standard:

```javascript
[
  { "op": "add", "path": "/0/children/0", "value": {...} },
  { "op": "replace", "path": "/0/name", "value": "New Name" },
  { "op": "remove", "path": "/1" }
]
```

**Operations:**
- `add` - New node added
- `remove` - Node deleted
- `replace` - Node modified
- `move` - Node moved
- `copy` - Node copied

### Storage Efficiency

**Space savings:**
- Only differences stored per version
- Typical commit: 1-5 KB
- Full document: 50-500 KB
- 100 versions ≈ 500 KB - 1 MB

**Performance:**
- Fast saves (instant)
- Fast commits (< 100ms)
- Version reconstruction (< 500ms)
- Scales to hundreds of versions

### Browser Compatibility

**Requires:**
- Modern browser (Chrome, Firefox, Edge, Safari)
- localStorage enabled
- ES6 module support

**Tested on:**
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## FAQ

**Q: What happens if I close the browser without committing?**  
A: Your saves are preserved in localStorage, but uncommitted changes aren't in version history. Commit before closing for best safety.

**Q: Can I undo a commit?**  
A: Commits are permanent in history, but you can revert to any previous version.

**Q: How many versions can I have?**  
A: Practically unlimited. Storage is efficient. Hundreds of versions are fine.

**Q: Can I delete old versions?**  
A: Not currently in the UI. The history is compact, so there's rarely a need.

**Q: What if I lose my download file?**  
A: Check localStorage - your data persists there. Use browser storage tools to export.

**Q: Can multiple people work on the same document?**  
A: Not simultaneously. But you can share files and merge manually (no auto-merge yet).

**Q: Is version history encrypted?**  
A: No. Don't store sensitive data. Use encrypted storage for sensitive documents.

## Support

For issues:
1. Check browser console (F12) for errors
2. Try `DLMS.getDocumentStats()` to diagnose
3. Export your document before troubleshooting
4. Review this guide

For debugging:
```javascript
// Enable debug mode
// Already enabled by default

// View full state
console.log(DLMS)

// Export for backup
DLMS.downloadVersionedDocument('backup.json')
```
