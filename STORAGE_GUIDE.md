# DLMS Local Storage Guide

## Overview

The DLMS (Document & Learning Management System) now includes a comprehensive local browser storage system that automatically saves your work and persists data across browser sessions.

## Features

### ✅ Auto-Save
- **Automatic**: Saves changes 2 seconds after you stop editing
- **Smart**: Only saves when changes are detected
- **Toggle**: Can be enabled/disabled at any time
- **Visual Feedback**: Shows "Auto-saved" notification when complete

### 💾 Manual Save
- Click the "Save Document" button in the UI
- Or use console command: `DLMS.saveDocument()`
- Provides immediate save confirmation

### 📦 Backups
- Create named backups before major changes
- List all available backups
- Restore from backup if needed

### 📊 Storage Monitoring
- View storage usage statistics
- Monitor document size
- Check available quota
- See breakdown by data type

### 📤 Export/Import
- Export all data to JSON file
- Import data from backup file
- Perfect for moving between devices

## How to Use

### Browser Console Commands

All storage functions are accessible via the browser console (F12):

```javascript
// Save current document
DLMS.saveDocument()

// View storage information
DLMS.getStorageInfo()
// Returns: { totalSizeKB: "45.32", details: {...} }

// Check auto-save status
DLMS.isAutoSaveEnabled()
// Returns: true or false

// Toggle auto-save
DLMS.setAutoSave(false)  // Disable auto-save
DLMS.setAutoSave(true)   // Enable auto-save

// Create a backup
DLMS.createBackup('before_restructure')

// List all backups
DLMS.listBackups()
// Returns: ['backup_2025-12-11T10:30:00.000Z', 'before_restructure', ...]

// Clear all storage (DANGER!)
DLMS.clearStorage()
// WARNING: This deletes everything!
```

### Storage Limits

**localStorage Limits by Browser:**
- Chrome/Edge: ~10 MB
- Firefox: ~10 MB
- Safari: ~5 MB
- Mobile browsers: ~5 MB

**What happens when storage is full:**
- You'll see an error message
- Auto-save will stop working
- Manual save will prompt you to export to file

**Solutions:**
1. Export and clear old data
2. Use browser's "Export All Data" feature
3. Delete unnecessary backups

## Data Structure

### What Gets Saved

```javascript
{
  // Main document tree (largest)
  document: [
    { id: "1", name: "Section 1", content: [...], children: [...] },
    { id: "2", name: "Section 2", content: [...], children: [...] }
  ],
  
  // Revision history
  revisions: [
    { id: 1, date: "2025-12-11", user: "Name", commitNotes: "..." }
  ],
  
  // Metadata
  metadata: {
    lastSaved: "2025-12-11T10:30:00.000Z",
    documentSize: 45632,
    nodeCount: 127
  }
}
```

### localStorage Keys

The system uses these keys:
- `dlms_document_structure` - Your document tree
- `dlms_revisions` - Version history
- `dlms_metadata` - Last saved time, size, etc.
- `dlms_auto_save_enabled` - Auto-save preference
- `dlms_backup_*` - Named backups

## Best Practices

### 1. Regular Backups
Create backups before:
- Major restructuring
- Bulk deletions
- Experimental changes

```javascript
DLMS.createBackup('before_major_edit')
```

### 2. Monitor Storage
Check storage usage periodically:

```javascript
const info = DLMS.getStorageInfo()
console.log(`Using ${info.totalSizeMB} MB`)
```

### 3. Export Important Work
For critical documents:
1. Use "Export All Data" button
2. Save the JSON file to your computer
3. Keep multiple versions

### 4. Clear Old Data
Remove unnecessary data:
- Delete test data before production
- Clear old backups you don't need
- Export then clear when storage is full

## Troubleshooting

### Auto-save Not Working

**Check if enabled:**
```javascript
DLMS.isAutoSaveEnabled()
```

**Enable it:**
```javascript
DLMS.setAutoSave(true)
```

**Check for errors:**
- Open browser console (F12)
- Look for red error messages
- Check storage quota

### Data Not Loading

**Verify data exists:**
```javascript
const info = DLMS.getStorageInfo()
console.log(info.details)
```

**Try manual load:**
```javascript
// Refresh the page
location.reload()
```

**Export as backup:**
If data is corrupted, export what you can before clearing.

### Storage Full Error

**Solutions:**

1. **Export current work:**
   - Click "Export All Data"
   - Save the JSON file

2. **Clear storage:**
```javascript
DLMS.clearStorage()
```

3. **Import critical data back:**
   - Use "Import Document" feature
   - Select your exported JSON file

### Lost Data Recovery

**Check backups:**
```javascript
const backups = DLMS.listBackups()
console.log(backups)
```

**Browser history:**
- Check browser cache (may have old copies)
- Use browser's "Restore Session" if recently closed

**Prevention:**
- Always export critical work to files
- Create backups before major changes
- Use version control for important documents

## Development/Testing

### Clear Test Data

When switching from test to production:

```javascript
// Clear everything
DLMS.clearStorage()

// Refresh to start clean
location.reload()
```

### View Raw Storage

Open browser DevTools:
1. Go to "Application" or "Storage" tab
2. Select "Local Storage"
3. Find keys starting with `dlms_`
4. View/edit raw JSON data

### Disable Auto-save for Testing

```javascript
DLMS.setAutoSave(false)
```

Then manually save when needed:
```javascript
DLMS.saveDocument()
```

## Privacy & Security

### What's Stored Locally

- All document data stays in YOUR browser
- Nothing is sent to external servers
- Data is stored using browser's localStorage API

### Clearing Data

**Manually:**
```javascript
DLMS.clearStorage()
```

**Browser clearing:**
- Clearing browser data removes localStorage
- Incognito/Private mode doesn't persist data
- Closing browser keeps data (unless configured otherwise)

### Sharing Between Devices

localStorage is per-browser, per-device. To sync:

1. Export on Device A
2. Transfer JSON file
3. Import on Device B

**Future enhancement**: Could add cloud sync with user accounts.

## API Reference

### Core Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `saveDocument()` | Manual save | boolean |
| `getStorageInfo()` | Storage statistics | object |
| `clearStorage()` | Delete all data | boolean |
| `setAutoSave(enabled)` | Toggle auto-save | void |
| `isAutoSaveEnabled()` | Check auto-save | boolean |
| `createBackup(name)` | Create backup | boolean |
| `listBackups()` | List backups | string[] |

### Events

| Event | When Fired | Detail |
|-------|------------|--------|
| `dlms:autosaved` | After auto-save | `{ timestamp }` |
| `dlms:saved` | After manual save | `{ timestamp }` |

## Support

For issues or questions:
1. Check browser console for errors
2. Review this guide
3. Check MODULES.md for technical details
4. Export data as backup before troubleshooting
