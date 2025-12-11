/*
// =========================================================================
// UNDO MANAGER MODULE
// Handles undo/redo functionality for document changes
// =========================================================================
*/

import { stateManager } from './state-manager.js';
import { renderDocumentStructure } from './tree-renderer.js';

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
function saveStateToHistory(structure) {
    // Deep clone the structure
    const stateCopy = JSON.parse(JSON.stringify(structure));
    
    // Add to undo stack
    undoStack.push(stateCopy);
    
    // Limit history size
    if (undoStack.length > MAX_HISTORY_SIZE) {
        undoStack.shift(); // Remove oldest
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    console.log('State saved to history. Undo stack size:', undoStack.length);
}

/**
 * Save current state before making a change
 * Call this before operations like delete, move, etc.
 */
export function saveStateBeforeChange() {
    const currentStructure = stateManager.getDocumentStructure();
    const stateCopy = JSON.parse(JSON.stringify(currentStructure));
    
    // Only save if this is a new state (not same as last saved)
    if (undoStack.length === 0 || JSON.stringify(undoStack[undoStack.length - 1]) !== JSON.stringify(stateCopy)) {
        undoStack.push(stateCopy);
        
        if (undoStack.length > MAX_HISTORY_SIZE) {
            undoStack.shift();
        }
        
        // Clear redo stack
        redoStack = [];
        
        console.log('State saved before change. Undo stack size:', undoStack.length);
    }
}

/**
 * Undo the last action
 */
export function undo() {
    if (!canUndo()) {
        console.warn('Nothing to undo');
        return false;
    }
    
    // Get current state and save to redo stack
    const currentStructure = stateManager.getDocumentStructure();
    const currentStateCopy = JSON.parse(JSON.stringify(currentStructure));
    redoStack.push(currentStateCopy);
    
    // Pop from undo stack
    const previousState = undoStack.pop();
    
    // Restore previous state
    isUndoRedoOperation = true;
    stateManager.setDocumentStructure(previousState);
    renderDocumentStructure(previousState);
    isUndoRedoOperation = false;
    
    console.log('Undo performed. Undo stack size:', undoStack.length, 'Redo stack size:', redoStack.length);
    return true;
}

/**
 * Redo the last undone action
 */
export function redo() {
    if (!canRedo()) {
        console.warn('Nothing to redo');
        return false;
    }
    
    // Get current state and save to undo stack
    const currentStructure = stateManager.getDocumentStructure();
    const currentStateCopy = JSON.parse(JSON.stringify(currentStructure));
    undoStack.push(currentStateCopy);
    
    // Pop from redo stack
    const nextState = redoStack.pop();
    
    // Restore next state
    isUndoRedoOperation = true;
    stateManager.setDocumentStructure(nextState);
    renderDocumentStructure(nextState);
    isUndoRedoOperation = false;
    
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
