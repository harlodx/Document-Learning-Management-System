/*
// =========================================================================
// UNDO MANAGER MODULE
// Handles undo/redo functionality for document changes
// =========================================================================
*/

import { stateManager } from './state-manager.js';
import { renderDocumentStructure } from './tree-renderer.js';
import DocumentNode from './documentnode.js';

const MAX_HISTORY_SIZE = 50;
let undoStack = [];
let redoStack = [];

/**
 * Initialize undo manager
 */
export function initializeUndoManager() {
    // Subscribe to document structure changes
    stateManager.subscribe('documentStructureChanged', (structure) => {
        // Save state to undo stack when structure changes
        // Note: We'll use a flag to prevent recording during undo/redo operations
        if (!isUndoRedoOperation) {
            saveStateToHistory(structure);
        }
    });
    
    console.log('Undo manager initialized');
}

let isUndoRedoOperation = false;

/**
 * Save current state to history
 */
function saveStateToHistory(structure, description = 'Document change') {
    // Deep clone the structure
    const stateCopy = JSON.parse(JSON.stringify(structure));
    
    // Create history entry with timestamp and description
    const historyEntry = {
        state: stateCopy,
        timestamp: new Date().toISOString(),
        description: description
    };
    
    // Add to undo stack
    undoStack.push(historyEntry);
    
    // Limit history size
    if (undoStack.length > MAX_HISTORY_SIZE) {
        undoStack.shift(); // Remove oldest
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    console.log('State saved to history with timestamp. Undo stack size:', undoStack.length);
}

/**
 * Save current state before making a change
 * Call this before operations like delete, move, etc.
 */
export function saveStateBeforeChange(description = 'Document change') {
    const currentStructure = stateManager.getDocumentStructure();
    const stateCopy = JSON.parse(JSON.stringify(currentStructure));
    
    // Only save if this is a new state (not same as last saved)
    const lastState = undoStack.length > 0 ? undoStack[undoStack.length - 1].state : null;
    if (undoStack.length === 0 || JSON.stringify(lastState) !== JSON.stringify(stateCopy)) {
        const historyEntry = {
            state: stateCopy,
            timestamp: new Date().toISOString(),
            description: description
        };
        
        undoStack.push(historyEntry);
        
        if (undoStack.length > MAX_HISTORY_SIZE) {
            undoStack.shift();
        }
        
        // Clear redo stack
        redoStack = [];
        
        console.log('State saved before change with timestamp. Undo stack size:', undoStack.length);
    }
}

/**
 * Undo the last action
 */
export async function undo() {
    if (!canUndo()) {
        console.warn('Nothing to undo');
        return false;
    }
    
    // Get current state and save to redo stack
    const currentStructure = stateManager.getDocumentStructure();
    const currentStateCopy = JSON.parse(JSON.stringify(currentStructure));
    const lastUndoEntry = undoStack[undoStack.length - 1];
    const redoEntry = {
        state: currentStateCopy,
        timestamp: new Date().toISOString(),
        description: lastUndoEntry.description || 'Change'
    };
    redoStack.push(redoEntry);
    
    // Pop from undo stack
    const previousEntry = undoStack.pop();
    
    // Reconstruct DocumentNode objects from JSON
    const reconstructedStructure = previousEntry.state.map(nodeJson => DocumentNode.fromJSON(nodeJson));
    
    // Restore previous state
    isUndoRedoOperation = true;
    stateManager.setDocumentStructure(reconstructedStructure);
    renderDocumentStructure(reconstructedStructure);
    isUndoRedoOperation = false;
    
    // Show notification with action description
    const { showStackedNotification } = await import('./message-center.js');
    const description = previousEntry.description || 'Action';
    showStackedNotification(`Undone: ${description}`);
    
    console.log('Undo performed. Undo stack size:', undoStack.length, 'Redo stack size:', redoStack.length);
    return true;
}

/**
 * Redo the last undone action
 */
export async function redo() {
    if (!canRedo()) {
        console.warn('Nothing to redo');
        return false;
    }
    
    // Get current state and save to undo stack
    const currentStructure = stateManager.getDocumentStructure();
    const currentStateCopy = JSON.parse(JSON.stringify(currentStructure));
    const nextEntry = redoStack[redoStack.length - 1];
    const undoEntry = {
        state: currentStateCopy,
        timestamp: new Date().toISOString(),
        description: nextEntry.description || 'Change'
    };
    undoStack.push(undoEntry);
    
    // Pop from redo stack
    const redoEntryPopped = redoStack.pop();
    
    // Reconstruct DocumentNode objects from JSON
    const reconstructedStructure = redoEntryPopped.state.map(nodeJson => DocumentNode.fromJSON(nodeJson));
    
    // Restore next state
    isUndoRedoOperation = true;
    stateManager.setDocumentStructure(reconstructedStructure);
    renderDocumentStructure(reconstructedStructure);
    isUndoRedoOperation = false;
    
    // Show notification with action description
    const { showStackedNotification } = await import('./message-center.js');
    const description = redoEntryPopped.description || 'Action';
    showStackedNotification(`Redone: ${description}`);
    
    console.log('Redo performed. Undo stack size:', undoStack.length, 'Redo stack size:', redoStack.length);
    return true;
}

/**
 * Check if undo is available
 */
export function canUndo() {
    return undoStack.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo() {
    return redoStack.length > 0;
}

/**
 * Get number of available undo actions
 */
export function getUndoCount() {
    return undoStack.length;
}

/**
 * Get number of available redo actions
 */
export function getRedoCount() {
    return redoStack.length;
}

/**
 * Clear undo/redo history
 */
export function clearHistory() {
    undoStack = [];
    redoStack = [];
    console.log('Undo/redo history cleared');
}
