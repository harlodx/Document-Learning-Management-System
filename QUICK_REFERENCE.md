# DLMS Quick Reference Card

## Save & Commit Workflow

```
┌─────────────────────┐
│   Make Changes      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────┐
│   SAVE DOCUMENT     │────▶│  Saved* (Orange) │
│  (or auto-save)     │     │  Uncommitted     │
└──────────┬──────────┘     └──────────────────┘
           │
           ▼
┌─────────────────────┐
│   Make More Changes │ ◀─── Can repeat
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────┐
│   COMMIT CHANGES    │────▶│ Version Created  │
│ (with message)      │     │  History Updated │
└─────────────────────┘     └──────────────────┘
```

## Buttons

| Button | Action | When to Use |
|--------|--------|-------------|
| 💾 **Save Document** | Save working copy | After any edits |
| ✓ **Commit** | Create version | After logical milestone |
| 📥 **Download** | Export to file | Backup, share, archive |
| 📤 **Import** | Load from file | Open saved document |

## Visual Indicators

### Save Status (Top Right)
- `✓ Saved` (Green) = Clean, committed
- `⚠ Saved*` (Orange) = Uncommitted changes
- `✓ Committed v#` (Blue) = Just committed

### Commit Button
- Gray = No changes to commit
- **Orange pulsing** = Has uncommitted changes

## Revision List Actions

Each version shows:
- **View** = Preview that version (read-only)
- **Revert** = Restore to that version (must save & commit)

## Console Commands

```javascript
// Save current work
DLMS.saveDocument()

// Commit to history
DLMS.commitDocument()

// Download file
DLMS.downloadVersionedDocument()

// Check status
DLMS.hasUncommittedChanges()  // true/false
DLMS.getDocumentStats()        // full stats
DLMS.getVersionHistory()       // all versions

// Revert to version 3
DLMS.revertToVersion(3)
```

## Best Practices

### ✅ DO
- Save frequently (or use auto-save)
- Commit at logical points
- Write clear commit messages
- Download regularly as backup
- Commit before major changes

### ❌ DON'T
- Commit every tiny change
- Use vague commit messages ("update", "changes")
- Forget to commit before closing
- Delete files without backup

## Typical Workflow

```
Day 1:
  Edit document → Auto-save → Keep editing
  End of session → Manual save → Commit "Day 1 progress"
  Download as backup

Day 2:
  Edit more → Auto-save → Edit more
  Major milestone → Save → Commit "Completed section 3"
  Continue editing → Auto-save
  End of day → Save → Commit "Day 2 final"
  Download as backup
```

## File Naming

Default: `{name}_v{version}_{date}.json`

Examples:
- `dlms_document_v5_2025-12-11.json`
- `training_manual_v12_2025-12-11.json`

## Keyboard Shortcuts

*Note: Currently no shortcuts - use buttons or console*

Future:
- Ctrl+S = Save (browsers capture this)
- Use console commands for now

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No commit button | Make changes and save first |
| Commit button gray | No uncommitted changes |
| Can't download | Check popup blocker |
| Lost changes | Check localStorage or backups |

## Storage Limits

- **localStorage**: ~5-10 MB per browser
- **File downloads**: Unlimited
- **Versions**: Hundreds (efficient patches)

## Version History Size

Typical sizes:
- 10 versions: ~50-100 KB
- 50 versions: ~200-500 KB
- 100 versions: ~500 KB - 1 MB

*History is compressed using JSON Patch (only differences)*

## Important Notes

⚠️ **Before closing browser**: Commit your changes!  
⚠️ **Before major edits**: Commit a safe restore point!  
⚠️ **Regular backups**: Download files weekly!  
⚠️ **Version 0**: Always exists (empty/initial state)  
⚠️ **Revert**: Doesn't delete newer versions  

## Getting Help

1. Press F12 to open console
2. Type `DLMS` to see available commands
3. Check VERSION_CONTROL_GUIDE.md for details
4. Export document before troubleshooting

---

**Remember**: Save often, commit strategically, download regularly!
