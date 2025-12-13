/**
 * Storage Manager Module
 * Handles local browser storage for document persistence
 */

import { stateManager } from './state-manager.js';
import { showError } from './message-center.js';

// Storage keys
const STORAGE_KEYS = {
    DOCUMENT: 'dlms_document_structure',
    REVISIONS: 'dlms_revisions',
    METADATA: 'dlms_metadata',
    AUTO_SAVE_ENABLED: 'dlms_auto_save_enabled',
    DOCUMENT_TITLE: 'dlms_document_title',
    DOCUMENT_SUBTITLE: 'dlms_document_subtitle',
    JUNK_ITEMS: 'dlms_junk_items'
};

// Auto-save configuration
let autoSaveEnabled = true;
let autoSaveTimeout = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds after last change

/**
 * Checks if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Gets the storage size information
 * @returns {Object} Storage size info
 */
export function getStorageInfo() {
    if (!isLocalStorageAvailable()) {
        return { available: false, error: 'localStorage not available' };
    }

    try {
        let total = 0;
        const details = {};

        for (const key in STORAGE_KEYS) {
            const storageKey = STORAGE_KEYS[key];
            const value = localStorage.getItem(storageKey);
            const size = value ? new Blob([value]).size : 0;
            details[key] = {
                key: storageKey,
                size: size,
                sizeKB: (size / 1024).toFixed(2)
            };
            total += size;
        }

        return {
            available: true,
            totalSize: total,
            totalSizeKB: (total / 1024).toFixed(2),
            totalSizeMB: (total / 1024 / 1024).toFixed(2),
            details,
            estimatedQuota: '5-10 MB (browser dependent)'
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return { available: true, error: error.message };
    }
}

/**
 * Saves document structure to localStorage
 * @param {Object[]} documentStructure - The document structure to save
 * @returns {boolean} True if save was successful
 */
export function saveDocumentToStorage(documentStructure) {
    if (!isLocalStorageAvailable()) {
        console.error('localStorage is not available');
        return false;
    }

    try {
        // Convert to JSON
        const jsonString = JSON.stringify(documentStructure);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.DOCUMENT, jsonString);
        
        // Update metadata
        updateMetadata({
            lastSaved: new Date().toISOString(),
            documentSize: new Blob([jsonString]).size,
            nodeCount: countNodes(documentStructure)
        });

        console.log('Document saved to local storage');
        return true;

    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded. Document is too large.');
            showError('Storage quota exceeded. Please export your document to a file.');
        } else {
            console.error('Error saving document to storage:', error);
        }
        return false;
    }
}

/**
 * Loads document structure from localStorage
 * @returns {Object[]|null} The loaded document structure or null if not found
 */
export function loadDocumentFromStorage() {
    if (!isLocalStorageAvailable()) {
        console.error('localStorage is not available');
        return null;
    }

    try {
        const jsonString = localStorage.getItem(STORAGE_KEYS.DOCUMENT);
        
        if (!jsonString) {
            console.log('No saved document found in storage');
            return null;
        }

        const documentStructure = JSON.parse(jsonString);
        
        if (!Array.isArray(documentStructure)) {
            throw new Error('Invalid document structure in storage');
        }

        console.log(`Loaded document with ${countNodes(documentStructure)} nodes from storage`);
        return documentStructure;

    } catch (error) {
        console.error('Error loading document from storage:', error);
        return null;
    }
}

/**
 * Saves revisions to localStorage
 * @param {Object[]} revisions - Array of revision objects
 * @returns {boolean} True if save was successful
 */
export function saveRevisionsToStorage(revisions) {
    if (!isLocalStorageAvailable()) {
        return false;
    }

    try {
        const jsonString = JSON.stringify(revisions);
        localStorage.setItem(STORAGE_KEYS.REVISIONS, jsonString);
        console.log('Revisions saved to local storage');
        return true;

    } catch (error) {
        console.error('Error saving revisions to storage:', error);
        return false;
    }
}

/**
 * Loads revisions from localStorage
 * @returns {Object[]|null} The loaded revisions or null
 */
export function loadRevisionsFromStorage() {
    if (!isLocalStorageAvailable()) {
        return null;
    }

    try {
        const jsonString = localStorage.getItem(STORAGE_KEYS.REVISIONS);
        
        if (!jsonString) {
            return null;
        }

        const revisions = JSON.parse(jsonString);
        return Array.isArray(revisions) ? revisions : null;

    } catch (error) {
        console.error('Error loading revisions from storage:', error);
        return null;
    }
}

/**
 * Saves junk items to localStorage
 * @param {Object[]} junkItems - Array of junked items
 * @returns {boolean} True if save was successful
 */
export function saveJunkToStorage(junkItems) {
    if (!isLocalStorageAvailable()) {
        return false;
    }

    try {
        const jsonString = JSON.stringify(junkItems || []);
        localStorage.setItem(STORAGE_KEYS.JUNK_ITEMS, jsonString);
        console.log('Junk items saved to local storage');
        return true;

    } catch (error) {
        console.error('Error saving junk items to storage:', error);
        return false;
    }
}

/**
 * Loads junk items from localStorage
 * @returns {Object[]|null} The loaded junk items or null
 */
export function loadJunkFromStorage() {
    if (!isLocalStorageAvailable()) {
        return null;
    }

    try {
        const jsonString = localStorage.getItem(STORAGE_KEYS.JUNK_ITEMS);
        
        if (!jsonString) {
            return [];
        }

        const junkItems = JSON.parse(jsonString);
        return Array.isArray(junkItems) ? junkItems : [];

    } catch (error) {
        console.error('Error loading junk items from storage:', error);
        return [];
    }
}

/**
 * Updates metadata in localStorage
 * @private
 * @param {Object} updates - Metadata updates
 */
function updateMetadata(updates) {
    try {
        const existing = getMetadata();
        const metadata = { ...existing, ...updates };
        localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    } catch (error) {
        console.error('Error updating metadata:', error);
    }
}

/**
 * Gets metadata from localStorage
 * @returns {Object} The metadata object
 */
export function getMetadata() {
    if (!isLocalStorageAvailable()) {
        return {};
    }

    try {
        const jsonString = localStorage.getItem(STORAGE_KEYS.METADATA);
        return jsonString ? JSON.parse(jsonString) : {};
    } catch (error) {
        console.error('Error getting metadata:', error);
        return {};
    }
}

/**
 * Counts total nodes in document structure
 * @private
 * @param {Object[]} nodes - Array of nodes
 * @returns {number} Total count
 */
function countNodes(nodes) {
    if (!Array.isArray(nodes)) {
        return 0;
    }

    let count = nodes.length;
    nodes.forEach(node => {
        if (node.children && Array.isArray(node.children)) {
            count += countNodes(node.children);
        }
    });
    return count;
}

/**
 * Clears all stored data
 * @returns {boolean} True if successful
 */
export function clearStorage() {
    if (!isLocalStorageAvailable()) {
        return false;
    }

    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('All storage cleared');
        return true;

    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

/**
 * Saves version history to localStorage
 * @param {Object} versionHistory - Complete version history object
 * @returns {boolean} True if save was successful
 */
export function saveVersionHistoryToStorage(versionHistory) {
    if (!isLocalStorageAvailable()) {
        return false;
    }

    try {
        const jsonString = JSON.stringify(versionHistory);
        localStorage.setItem('dlms_version_history', jsonString);
        console.log('Version history saved to local storage');
        return true;

    } catch (error) {
        console.error('Error saving version history to storage:', error);
        return false;
    }
}

/**
 * Loads version history from localStorage
 * @returns {Object|null} The loaded version history or null
 */
export function loadVersionHistoryFromStorage() {
    if (!isLocalStorageAvailable()) {
        return null;
    }

    try {
        const jsonString = localStorage.getItem('dlms_version_history');
        
        if (!jsonString) {
            return null;
        }

        const versionHistory = JSON.parse(jsonString);
        return versionHistory;

    } catch (error) {
        console.error('Error loading version history from storage:', error);
        return null;
    }
}

/**
 * Exports complete document with version history as downloadable file
 * @param {Object} documentStructure - Current document structure
 * @param {Object} versionHistory - Complete version history
 * @param {string} documentTitle - The document title
 * @param {string} documentSubtitle - The document subtitle
 * @returns {Object} Complete export package
 */
export function createExportPackage(documentStructure, versionHistory, documentTitle = '', documentSubtitle = '', usersData = null) {
    const junkItems = stateManager.getJunkItems() || [];
    
    const exportPackage = {
        metadata: {
            exportDate: new Date().toISOString(),
            appVersion: '1.0',
            documentName: versionHistory?.metadata?.documentName || documentTitle || 'Untitled Document',
            documentTitle: documentTitle,
            documentSubtitle: documentSubtitle
        },
        documentStructure: documentStructure,
        versionHistory: versionHistory,
        junkItems: junkItems
    };
    
    // Include users data if provided
    if (usersData) {
        exportPackage.users = usersData;
    }
    
    return exportPackage;
}

/**
 * Downloads export package as JSON file with user-controlled filename
 * @param {Object} exportPackage - The complete export package
 * @param {string} suggestedFilename - Suggested filename
 * @returns {Promise<boolean>} True if download was successful
 */
export async function downloadExportFile(exportPackage, suggestedFilename = null) {
    try {
        const jsonString = JSON.stringify(exportPackage, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const defaultFilename = suggestedFilename || `dlms_export_${new Date().toISOString().split('T')[0]}.json`;
        
        // Check if File System Access API is available
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultFilename,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                console.log('Export file saved via File System Access API');
                return true;
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('User cancelled save dialog');
                    return false;
                }
                throw err;
            }
        } else {
            // Fallback to traditional download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Export file downloaded (fallback method)');
            return true;
        }

    } catch (error) {
        console.error('Error downloading export file:', error);
        return false;
    }
}

/**
 * Imports complete document from file
 * @param {Object} importData - The imported data package
 * @returns {Object|null} The imported data or null if invalid
 */
export function validateAndExtractImport(importData) {
    try {
        // Validate structure
        if (!importData || typeof importData !== 'object') {
            throw new Error('Invalid import data format');
        }
        
        if (!importData.documentStructure || !Array.isArray(importData.documentStructure)) {
            throw new Error('Invalid document structure in import');
        }
        
        if (!importData.versionHistory || !importData.versionHistory.metadata) {
            throw new Error('Invalid version history in import');
        }
        
        console.log('Import data validated successfully');
        return {
            documentStructure: importData.documentStructure,
            versionHistory: importData.versionHistory
        };

    } catch (error) {
        console.error('Error validating import:', error);
        showError(`Import failed: ${error.message}`);
        return null;
    }
}

/**
 * Enables or disables auto-save
 * @param {boolean} enabled - Whether auto-save should be enabled
 */
export function setAutoSave(enabled) {
    autoSaveEnabled = enabled;
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, JSON.stringify(enabled));
    console.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Gets auto-save status
 * @returns {boolean} Whether auto-save is enabled
 */
export function isAutoSaveEnabled() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_ENABLED);
        return stored ? JSON.parse(stored) : true; // Default to enabled
    } catch {
        return true;
    }
}

/**
 * Schedules an auto-save operation
 * @param {Object[]} documentStructure - The document to save
 */
export function scheduleAutoSave(documentStructure) {
    if (!autoSaveEnabled) {
        return;
    }

    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Schedule new save
    autoSaveTimeout = setTimeout(() => {
        saveDocumentToStorage(documentStructure);
        
        // Also save title and subtitle
        const titleElement = document.getElementById('document-name');
        const subtitleElement = document.getElementById('document-subtitle');
        
        if (titleElement) {
            localStorage.setItem(STORAGE_KEYS.DOCUMENT_TITLE, titleElement.value || '');
        }
        
        if (subtitleElement) {
            localStorage.setItem(STORAGE_KEYS.DOCUMENT_SUBTITLE, subtitleElement.value || '');
        }
        
        // Save junk items
        const junkItems = stateManager.getJunkItems();
        if (junkItems) {
            localStorage.setItem(STORAGE_KEYS.JUNK_ITEMS, JSON.stringify(junkItems));
        }
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('dlms:autosaved', {
            detail: { timestamp: new Date().toISOString() }
        }));
    }, AUTO_SAVE_DELAY);
}

/**
 * Initializes storage manager and sets up auto-save
 */
export function initializeStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage not available - data will not persist');
        return false;
    }

    // Load auto-save preference
    autoSaveEnabled = isAutoSaveEnabled();

    // Subscribe to state changes for auto-save
    stateManager.subscribe('documentStructureChanged', (structure) => {
        if (autoSaveEnabled) {
            scheduleAutoSave(structure);
        }
    });
    
    // Subscribe to junk items changes for auto-save
    stateManager.subscribe('junkItemsChanged', (junkItems) => {
        if (autoSaveEnabled) {
            saveJunkToStorage(junkItems);
        }
    });

    // Show storage info in console
    const info = getStorageInfo();
    console.log('Storage initialized:', info);

    return true;
}

/**
 * Creates a backup of current storage
 * @param {string} backupName - Optional backup name
 * @returns {boolean} True if successful
 */
export function createBackup(backupName = null) {
    const name = backupName || `backup_${new Date().toISOString()}`;
    
    try {
        const data = exportAllData();
        const backupKey = `dlms_backup_${name}`;
        localStorage.setItem(backupKey, JSON.stringify(data));
        
        console.log(`Backup created: ${name}`);
        return true;

    } catch (error) {
        console.error('Error creating backup:', error);
        return false;
    }
}

/**
 * Lists all available backups
 * @returns {string[]} Array of backup names
 */
export function listBackups() {
    const backups = [];
    
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('dlms_backup_')) {
                backups.push(key.replace('dlms_backup_', ''));
            }
        }
    } catch (error) {
        console.error('Error listing backups:', error);
    }

    return backups;
}

// Export storage keys for direct access if needed
export { STORAGE_KEYS };
