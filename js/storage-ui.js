/**
 * Storage UI Controls
 * Provides UI components for storage management
 */

import { 
    getStorageInfo, 
    clearStorage, 
    setAutoSave, 
    isAutoSaveEnabled,
    createBackup,
    listBackups,
    exportAllData,
    importAllData
} from './storage-manager.js';
import { saveDocument } from './data-operations.js';

/**
 * Creates a storage info panel
 * @returns {HTMLElement} The storage info panel element
 */
export function createStorageInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'storage-info-panel';
    panel.className = 'storage-info-panel';
    
    updateStorageInfoPanel(panel);
    
    return panel;
}

/**
 * Updates the storage info panel with current data
 * @param {HTMLElement} panel - The panel element to update
 */
export function updateStorageInfoPanel(panel) {
    const info = getStorageInfo();
    
    if (!info.available) {
        panel.innerHTML = `
            <h3>⚠️ Storage Unavailable</h3>
            <p>${info.error || 'localStorage is not available in this browser'}</p>
        `;
        return;
    }

    const autoSaveStatus = isAutoSaveEnabled() ? '✓ Enabled' : '✗ Disabled';
    
    panel.innerHTML = `
        <h3>💾 Storage Information</h3>
        <div class="storage-stats">
            <p><strong>Total Size:</strong> ${info.totalSizeKB} KB (${info.totalSizeMB} MB)</p>
            <p><strong>Estimated Quota:</strong> ${info.estimatedQuota}</p>
            <p><strong>Auto-save:</strong> ${autoSaveStatus}</p>
        </div>
        <div class="storage-details">
            <h4>Breakdown:</h4>
            <ul>
                ${Object.entries(info.details).map(([key, detail]) => `
                    <li>${key}: ${detail.sizeKB} KB</li>
                `).join('')}
            </ul>
        </div>
    `;
}

/**
 * Creates storage control buttons
 * @returns {HTMLElement} Container with storage control buttons
 */
export function createStorageControls() {
    const container = document.createElement('div');
    container.id = 'storage-controls';
    container.className = 'storage-controls';
    
    // Manual Save Button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save Now';
    saveBtn.className = 'storage-btn save-btn';
    saveBtn.onclick = () => {
        const success = saveDocument();
        if (success) {
            alert('Document saved successfully!');
        }
    };
    
    // Auto-save Toggle
    const autoSaveBtn = document.createElement('button');
    updateAutoSaveButton(autoSaveBtn);
    autoSaveBtn.className = 'storage-btn autosave-btn';
    autoSaveBtn.onclick = () => {
        const newState = !isAutoSaveEnabled();
        setAutoSave(newState);
        updateAutoSaveButton(autoSaveBtn);
        alert(`Auto-save ${newState ? 'enabled' : 'disabled'}`);
    };
    
    // Create Backup Button
    const backupBtn = document.createElement('button');
    backupBtn.textContent = '📦 Create Backup';
    backupBtn.className = 'storage-btn backup-btn';
    backupBtn.onclick = () => {
        const name = prompt('Enter backup name (optional):');
        const success = createBackup(name || undefined);
        if (success) {
            alert('Backup created successfully!');
        }
    };
    
    // Export Button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤 Export All Data';
    exportBtn.className = 'storage-btn export-btn';
    exportBtn.onclick = () => {
        const data = exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dlms_backup_${new Date().toISOString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Clear Storage Button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Clear Storage';
    clearBtn.className = 'storage-btn clear-btn';
    clearBtn.onclick = () => {
        if (confirm('Are you sure you want to clear all stored data? This cannot be undone!')) {
            if (confirm('Really sure? Consider creating a backup first.')) {
                const success = clearStorage();
                if (success) {
                    alert('Storage cleared. Refresh the page to start fresh.');
                }
            }
        }
    };
    
    // Storage Info Button
    const infoBtn = document.createElement('button');
    infoBtn.textContent = 'ℹ️ Storage Info';
    infoBtn.className = 'storage-btn info-btn';
    infoBtn.onclick = () => {
        const info = getStorageInfo();
        console.log('Storage Info:', info);
        alert(`Storage: ${info.totalSizeKB} KB used\nAuto-save: ${isAutoSaveEnabled() ? 'ON' : 'OFF'}\nSee console for details.`);
    };
    
    container.appendChild(saveBtn);
    container.appendChild(autoSaveBtn);
    container.appendChild(backupBtn);
    container.appendChild(exportBtn);
    container.appendChild(infoBtn);
    container.appendChild(clearBtn);
    
    return container;
}

/**
 * Updates the auto-save button text
 * @private
 */
function updateAutoSaveButton(button) {
    const enabled = isAutoSaveEnabled();
    button.textContent = enabled ? '⏸️ Disable Auto-save' : '▶️ Enable Auto-save';
}

/**
 * Injects storage controls into the page
 * @param {string} targetId - ID of the element to inject controls into
 */
export function injectStorageControls(targetId = 'storage-controls-container') {
    const target = document.getElementById(targetId);
    
    if (!target) {
        console.warn(`Target element ${targetId} not found for storage controls`);
        return;
    }
    
    const controls = createStorageControls();
    target.appendChild(controls);
}

/**
 * Shows a list of available backups
 */
export function showBackupsList() {
    const backups = listBackups();
    
    if (backups.length === 0) {
        alert('No backups found.');
        return;
    }
    
    console.log('Available backups:', backups);
    alert(`Found ${backups.length} backup(s):\n${backups.join('\n')}\n\nSee console for details.`);
}
