/**
 * State Manager Module
 * Centralized state management for document structure and application state
 */

class StateManager {
    constructor() {
        this._documentStructure = [];
        this._currentEditingItem = null;
        this._pendingItems = [];
        this._users = [];
        this._currentUser = null;
        this._listeners = new Map();
    }

    /**
     * Get the current document structure
     * @returns {Array} The document structure array
     */
    getDocumentStructure() {
        return this._documentStructure;
    }

    /**
     * Set the document structure with validation
     * @param {Array} structure - The new document structure
     * @throws {Error} If structure is not a valid array
     */
    setDocumentStructure(structure) {
        if (!Array.isArray(structure)) {
            throw new Error('Document structure must be an array');
        }
        
        this._documentStructure = structure;
        this._notifyListeners('documentStructureChanged', structure);
    }

    /**
     * Get the currently editing item
     * @returns {Object|null} The current item being edited
     */
    getCurrentEditingItem() {
        return this._currentEditingItem;
    }

    /**
     * Set the currently editing item
     * @param {Object|null} item - The item being edited
     */
    setCurrentEditingItem(item) {
        this._currentEditingItem = item;
        this._notifyListeners('editingItemChanged', item);
    }

    /**
     * Subscribe to state changes
     * @param {string} event - The event name to listen for
     * @param {Function} callback - The callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        
        this._listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this._listeners.get(event);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    /**
     * Notify all listeners of a state change
     * @private
     * @param {string} event - The event name
     * @param {*} data - The data to pass to listeners
     */
    _notifyListeners(event, data) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in state listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get pending items
     * @returns {Array} The array of pending items
     */
    getPendingItems() {
        return this._pendingItems;
    }

    /**
     * Set pending items
     * @param {Array} items - The pending items array
     */
    setPendingItems(items) {
        if (!Array.isArray(items)) {
            throw new Error('Pending items must be an array');
        }
        this._pendingItems = items;
        this._notifyListeners('pendingItemsChanged', items);
    }

    /**
     * Get users
     * @returns {Array} The array of users
     */
    getUsers() {
        return this._users;
    }

    /**
     * Set users
     * @param {Array} users - The users array
     */
    setUsers(users) {
        if (!Array.isArray(users)) {
            throw new Error('Users must be an array');
        }
        this._users = users;
        this._notifyListeners('usersChanged', users);
    }

    /**
     * Get current user
     * @returns {Object|null} The current user
     */
    getCurrentUser() {
        return this._currentUser;
    }

    /**
     * Set current user
     * @param {Object|null} user - The current user
     */
    setCurrentUser(user) {
        this._currentUser = user;
        this._notifyListeners('currentUserChanged', user);
    }

    /**
     * Reset all state to initial values
     */
    reset() {
        this._documentStructure = [];
        this._currentEditingItem = null;
        this._pendingItems = [];
        this._users = [];
        this._currentUser = null;
        this._notifyListeners('stateReset', null);
    }
    
    /**
     * Alias for addListener (for compatibility)
     */
    addListener(event, callback) {
        return this.subscribe(event, callback);
    }
}

// Export singleton instance
export const stateManager = new StateManager();
