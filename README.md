# Document & Learning Management System (DLMS)

A comprehensive web-based application for hierarchical document creation, management, and version control with full offline capability.

## Features

### 🌳 Hierarchical Document Structure
- Create unlimited nested document trees
- Drag-and-drop reorganization
- Automatic ID management and re-numbering
- Visual tree rendering with indent guides
- **Smart tree loading** - Automatically collapses subnodes on load
- **Last edit tracking** - Returns to recently edited nodes (within 24 hours)
- **Collapse state management** - Preserves user's view preferences during session

### 💾 Git-like Version Control
- **Save** - Fast, frequent working copy saves
- **Commit** - Strategic version creation with messages
- **History** - Complete version history with JSON Patch deltas
- **Revert** - Restore any previous version
- **View** - Preview any version without changing current work
- **Timestamp tracking** - Individual change timestamps for full audit trail

### 📁 File Management
- **Download** - Export complete document with full version history
- **Import** - Load documents with preserved history
- **Self-contained** - Everything in one portable JSON file
- **User-defined filenames** - Specify name and location

### 🔄 Auto-Save
- Automatic saving with 2-second debounce
- localStorage persistence across sessions
- Toggle on/off as needed
- Visual save indicators

### 📊 Revision Tracking
- View all committed versions
- See commit messages, authors, dates, and **individual change times**
- **Dual-level search** - Filter both revisions and individual changes
- Track document statistics
- **Real-time change filtering** - Search by time, user, action, or content
- **Zebra-striped displays** - Enhanced readability for change lists

### 🎨 Modern UI/UX
- **Custom modal dialogs** - Consistent, themed confirmation and input prompts
- **Unified messaging system** - Toast notifications for all app messages
- **Dark theme support** - Automatic theme switching
- **Responsive design** - Works on desktop and mobile
- **Smooth animations** - Polished interactions throughout

### 🗑️ Soft Delete System
- **Junk management** - Safely remove nodes without permanent deletion
- **Restore capability** - Recover junked items anytime
- **Permanent delete option** - Clear junk when ready
- **Bulk operations** - Clear all junk at once

### 🎨 Modern Modular Architecture
- Clean separation of concerns
- Comprehensive error handling
- Event-driven architecture
- Easy to extend and maintain

## Quick Start

1. Open `index.html` in a modern browser
2. Start editing the document tree
3. Click **Save** to save your working copy
4. Click **Commit** to create a version with message
5. Click **Download** to export your document

## Documentation

- **[Quick Reference](QUICK_REFERENCE.md)** - Fast command reference
- **[Version Control Guide](VERSION_CONTROL_GUIDE.md)** - Complete workflow guide
- **[Module Documentation](MODULES.md)** - Technical architecture
- **[Storage Guide](STORAGE_GUIDE.md)** - Browser storage details

## Workflow

```
Edit Document → Save → Keep Editing → Save → Commit with Message
                                                      ↓
                                          Version Created in History
                                                      ↓
                                          Download to Your Machine
```

## Browser Console Access

Press **F12** to open console, then:

```javascript
// Save current work
DLMS.saveDocument()

// Commit to version history
DLMS.commitDocument()

// Download with full history
DLMS.downloadVersionedDocument()

// View version history
DLMS.getVersionHistory()

// Check for uncommitted changes
DLMS.hasUncommittedChanges()

// View document statistics
DLMS.getDocumentStats()
```

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more commands.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Version Control**: JSON Patch (RFC 6902) via fast-json-patch
- **Storage**: localStorage + file downloads
- **Architecture**: Modular, event-driven
- **No backend required**: Fully client-side

## Project Structure

```
DLMS/
├── index.html                      # Main application
├── js/
│   ├── script.js                   # Application entry point
│   ├── version-control.js          # Version control system
│   ├── data-operations.js          # File operations & smart loading
│   ├── revision-manager.js         # Revision UI with search
│   ├── state-manager.js            # State management
│   ├── storage-manager.js          # Browser storage
│   ├── tree-renderer.js            # Tree visualization & collapse
│   ├── tree-reconstruction.js      # Tree building
│   ├── content-editor.js           # Content editing with timestamps
│   ├── event-handlers.js           # Event delegation
│   ├── storage-ui.js               # Storage controls
│   ├── documentnode.js             # Document node class
│   ├── message-center.js           # Unified messaging & modals
│   ├── junk-manager.js             # Soft delete management
│   ├── undo-manager.js             # Undo/redo functionality
│   ├── context-menu.js             # Right-click operations
│   ├── theme-manager.js            # Theme switching
│   ├── menu-manager.js             # Menu system
│   ├── search-manager.js           # Search functionality
│   └── print-formatter.js          # Print/PDF export
├── css/
│   └── styles.css                  # Application styles
└── docs/
    ├── README.md                   # This file
    ├── QUICK_REFERENCE.md          # Quick reference card
    ├── VERSION_CONTROL_GUIDE.md    # Complete VC guide
    ├── MODULES.md                  # Module documentation
    └── STORAGE_GUIDE.md            # Storage documentation
```

## Key Concepts

### Save vs Commit

| Action | Purpose | Frequency | Creates Version |
|--------|---------|-----------|-----------------|
| **Save** | Preserve work in progress | Very frequent | No |
| **Commit** | Create version milestone | Strategic | Yes |

### Version History

- Stored as **JSON Patch** deltas (only differences)
- **Self-contained** within document file
- **Portable** - works on any machine
- **Efficient** - hundreds of versions in ~1 MB

### File Format

```json
{
  "metadata": {
    "documentName": "My Document",
    "currentVersion": 5,
    "created": "2025-12-11T10:00:00.000Z",
    "lastModified": "2025-12-11T15:30:00.000Z"
  },
  "document": [ /* current document tree */ ],
  "history": [
    {
      "version": 1,
      "timestamp": "2025-12-11T10:15:00.000Z",
      "author": "John Doe",
      "message": "Initial structure",
      "patch": [ /* JSON Patch operations */ ]
    }
    // ... more versions
  ]
}
```

## Requirements

- **Modern browser** (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- **localStorage enabled**
- **ES6 module support**
- **~5-10 MB storage** (for localStorage backup)
- **No installation** - just open and use

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Mobile | Modern | ✅ Should work |

## Use Cases

- **Training Manuals** - Structured procedures with version tracking
- **Documentation** - Technical docs with revision history
- **Standard Operating Procedures** - Safety-critical documents
- **Course Materials** - Educational content organization
- **Project Planning** - Hierarchical task structures
- **Knowledge Bases** - Organized information repositories

## Features in Detail

### 📝 Document Editing
- Rich text content per node
- Multi-paragraph support
- Inline editing
- Auto-save of edits
- **Last edit timestamps** - Track when each node was modified
- Content item management (add, edit, delete)

### 🔢 Automatic ID Management
- Sequential IDs (1, 1-1, 1-1-1, etc.)
- Auto-renumbering on restructure
- Handles duplicates and breaks
- Cleanup containers for orphaned nodes

### 🎯 Version Control
- Complete history in single file
- View any previous version
- Revert to any version
- Compare versions (console)
- JSON Patch for efficiency
- **Individual change timestamps** - Audit trail for every modification
- **Searchable history** - Find changes by time, user, action, or content

### 💼 Professional Workflow
- Separate save/commit actions
- Commit messages and authors
- Visual indicators for uncommitted changes
- Download with custom filenames
- Import with preserved history
- **Smart resume** - Return to your last edited location
- **Custom modals** - Professional confirmation and input dialogs
- **Unified notifications** - Consistent feedback system

## Recent Updates

### Version 2.0 (December 2025)
- ✅ **Smart document loading** - Auto-collapse subnodes, return to last edit
- ✅ **Timestamp tracking** - Full audit trail for individual changes
- ✅ **Dual-level search** - Filter revisions and changes simultaneously
- ✅ **Custom modals** - Replaced all browser dialogs with themed modals
- ✅ **Enhanced UI** - Zebra striping, improved contrast, better readability
- ✅ **Unified messaging** - Consistent toast notifications throughout
- ✅ **Last edit memory** - Automatically opens recently edited branches

## Future Enhancements

- [ ] Cloud sync (optional)
- [ ] Multi-user collaboration
- [ ] Conflict resolution
- [ ] Branch/merge capability
- [ ] Export to PDF/Word (basic print support exists)
- [ ] Rich text formatting
- [ ] Attachments support
- [ ] Full-text search across document
- [ ] Keyboard shortcuts
- [ ] Change comparison view
- [ ] Export to Markdown

## Contributing

This is a portfolio project. Feel free to fork and adapt for your needs.

## License

MIT License - See LICENSE file for details

## Author

Created as part of a portfolio project demonstrating:
- Modern JavaScript architecture
- Version control systems
- Client-side data management
- User experience design
- Technical documentation

---

**Remember**: Save often, commit strategically, download regularly!
