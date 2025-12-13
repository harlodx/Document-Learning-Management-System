/**
 * User Management Module
 * Handles user creation, selection, and tracking of user-specific changes
 */

import { stateManager } from './state-manager.js';
import { showPrompt, showConfirm, showError, showSuccess } from './message-center.js';
import { scheduleAutoSave } from './storage-manager.js';

/**
 * User class representing a system user
 */
class User {
    constructor(id, name, email = '', role = 'Editor', color = null) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.color = color || this.generateColor();
        this.createdAt = new Date().toISOString();
        this.lastActive = new Date().toISOString();
    }

    /**
     * Generate a unique color for the user
     */
    generateColor() {
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', 
            '#F44336', '#00BCD4', '#E91E63', '#3F51B5',
            '#FFC107', '#009688', '#673AB7', '#FF5722'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Update last active timestamp
     */
    updateActivity() {
        this.lastActive = new Date().toISOString();
    }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            color: this.color,
            createdAt: this.createdAt,
            lastActive: this.lastActive
        };
    }

    /**
     * Create User from JSON
     */
    static fromJSON(json) {
        const user = new User(json.id, json.name, json.email, json.role, json.color);
        user.createdAt = json.createdAt;
        user.lastActive = json.lastActive;
        return user;
    }
}

/**
 * Initialize user management system
 */
export function initializeUserManagement() {
    console.log('Initializing user management...');
    
    // Load users from state or create default
    let users = stateManager.getUsers();
    if (!users || users.length === 0) {
        const defaultUser = new User('user-1', 'Default User', '', 'Editor');
        stateManager.setUsers([defaultUser]);
        stateManager.setCurrentUser(defaultUser);
        console.log('Created default user');
    } else {
        // Set first user as current if none selected
        if (!stateManager.getCurrentUser()) {
            stateManager.setCurrentUser(users[0]);
        }
    }
    
    // Update UI
    updateUserDisplay();
    
    console.log('User management initialized');
}

/**
 * Create a new user
 */
export async function createNewUser() {
    console.log('=== CREATE NEW USER ===');
    
    try {
        // Prompt for user name
        const userName = await showPrompt(
            'Enter user name:',
            '',
            'User Name'
        );
        
        if (!userName || userName.trim() === '') {
            console.log('User creation cancelled - no name provided');
            return null;
        }
        
        // Prompt for email (optional)
        const userEmail = await showPrompt(
            'Enter email (optional):',
            '',
            'Email'
        );
        
        // Generate unique ID
        const users = stateManager.getUsers() || [];
        const newId = `user-${users.length + 1}`;
        
        // Create new user
        const newUser = new User(newId, userName.trim(), userEmail?.trim() || '', 'Editor');
        
        // Add to users list
        users.push(newUser);
        stateManager.setUsers(users);
        
        console.log('New user created:', newUser.name, newUser.id);
        showSuccess(`User "${newUser.name}" created successfully`);
        
        // Update UI
        updateUserSelector();
        
        // Auto-save
        scheduleAutoSave();
        
        return newUser;
        
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Failed to create user');
        return null;
    }
}

/**
 * Switch to a different user
 */
export function switchUser(userId) {
    console.log('=== SWITCH USER ===');
    console.log('Switching to user ID:', userId);
    
    const users = stateManager.getUsers() || [];
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        console.error('User not found:', userId);
        showError('User not found');
        return false;
    }
    
    // Update last active timestamp
    user.updateActivity();
    
    // Set as current user
    stateManager.setCurrentUser(user);
    stateManager.setUsers(users); // Trigger save with updated timestamp
    
    // Update UI
    updateUserDisplay();
    
    console.log('Switched to user:', user.name);
    showSuccess(`Switched to ${user.name}`);
    
    // Auto-save
    scheduleAutoSave();
    
    return true;
}

/**
 * Delete a user
 */
export async function deleteUser(userId) {
    console.log('=== DELETE USER ===');
    console.log('Deleting user ID:', userId);
    
    const users = stateManager.getUsers() || [];
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        console.error('User not found:', userId);
        return false;
    }
    
    // Prevent deleting if it's the only user
    if (users.length === 1) {
        showError('Cannot delete the only user');
        return false;
    }
    
    // Prevent deleting current user
    const currentUser = stateManager.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        showError('Cannot delete the currently active user. Switch to another user first.');
        return false;
    }
    
    // Confirm deletion
    const confirmed = await showConfirm(
        `Delete user "${user.name}"?\n\nThis action cannot be undone.`,
        'Delete User',
        'Cancel'
    );
    
    if (!confirmed) {
        console.log('User deletion cancelled');
        return false;
    }
    
    // Remove user from list
    const updatedUsers = users.filter(u => u.id !== userId);
    stateManager.setUsers(updatedUsers);
    
    console.log('User deleted:', user.name);
    showSuccess(`User "${user.name}" deleted`);
    
    // Update UI
    updateUserSelector();
    
    // Auto-save
    scheduleAutoSave();
    
    return true;
}

/**
 * Get current user info
 */
export function getCurrentUserInfo() {
    const user = stateManager.getCurrentUser();
    if (!user) {
        console.warn('No current user set');
        return null;
    }
    
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        color: user.color,
        timestamp: new Date().toISOString()
    };
}

/**
 * Update the user display in the menu
 */
function updateUserDisplay() {
    const user = stateManager.getCurrentUser();
    if (!user) return;
    
    console.log('Updating user display for:', user.name);
    
    // Update user name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }
    
    // Update user role
    const userRoleElement = document.querySelector('.user-role');
    if (userRoleElement) {
        userRoleElement.textContent = user.role;
    }
    
    // Update avatar - create circular logo with initial
    const avatarElement = document.querySelector('.user-avatar');
    if (avatarElement) {
        const initial = user.name.charAt(0).toUpperCase();
        avatarElement.innerHTML = `
            <div style="width: 50px; height: 50px; border-radius: 50%; background-color: ${user.color}; 
                        display: flex; align-items: center; justify-content: center; 
                        font-weight: 700; font-size: 20px; color: white;">
                ${initial}
            </div>
        `;
    }
}

/**
 * Update the user selector dropdown in the menu
 */
export function updateUserSelector() {
    const users = stateManager.getUsers() || [];
    const currentUser = stateManager.getCurrentUser();
    
    console.log('Updating user selector. Total users:', users.length);
    
    // Find or create the user selector container
    let selectorContainer = document.getElementById('user-selector-container');
    
    if (!selectorContainer) {
        // Create selector container inside user section
        const userSection = document.querySelector('.menu-user-section');
        if (!userSection) {
            console.error('User section not found');
            return;
        }
        
        selectorContainer = document.createElement('div');
        selectorContainer.id = 'user-selector-container';
        selectorContainer.className = 'user-selector-container';
        
        // Append to user section
        userSection.appendChild(selectorContainer);
        
        // Add click handler to toggle dropdown
        let clickAdded = false;
        userSection.addEventListener('click', (e) => {
            // Don't toggle if clicking inside the dropdown
            if (e.target.closest('#user-selector-container')) {
                return;
            }
            e.stopPropagation();
            selectorContainer.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-user-section')) {
                selectorContainer.classList.remove('active');
            }
        });
    }
    
    // Build selector HTML
    let html = `
        <div class="user-selector-header">
            <span>Switch User</span>
            <button id="add-user-btn" class="icon-btn" title="Add new user">
                <span>➕</span>
            </button>
        </div>
        <div class="user-list">
    `;
    
    users.forEach(user => {
        const isActive = currentUser && currentUser.id === user.id;
        html += `
            <div class="user-list-item ${isActive ? 'active' : ''}" data-user-id="${user.id}">
                <div class="user-list-avatar" style="background-color: ${user.color}">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <div class="user-list-info">
                    <div class="user-list-name">${user.name}</div>
                    <div class="user-list-role">${user.role}</div>
                </div>
                ${!isActive && users.length > 1 ? `
                    <button class="user-delete-btn" data-user-id="${user.id}" title="Delete user">
                        <span>🗑</span>
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
    `;
    
    selectorContainer.innerHTML = html;
    
    // Attach event listeners
    attachUserSelectorListeners();
}

/**
 * Attach event listeners to user selector elements
 */
function attachUserSelectorListeners() {
    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', async () => {
            await createNewUser();
        });
    }
    
    // User selection
    document.querySelectorAll('.user-list-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't switch if clicking delete button
            if (e.target.closest('.user-delete-btn')) return;
            
            const userId = item.getAttribute('data-user-id');
            switchUser(userId);
        });
    });
    
    // User deletion
    document.querySelectorAll('.user-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute('data-user-id');
            await deleteUser(userId);
        });
    });
}

/**
 * Export users data
 */
export function exportUsersData() {
    const users = stateManager.getUsers() || [];
    const currentUser = stateManager.getCurrentUser();
    
    return {
        users: users.map(u => u.toJSON ? u.toJSON() : u),
        currentUserId: currentUser ? currentUser.id : null
    };
}

/**
 * Import users data
 */
export function importUsersData(data) {
    console.log('Importing users data...');
    
    if (!data || !data.users) {
        console.warn('No users data to import');
        return;
    }
    
    // Reconstruct User objects
    const users = data.users.map(userData => User.fromJSON(userData));
    stateManager.setUsers(users);
    
    // Set current user
    if (data.currentUserId) {
        const currentUser = users.find(u => u.id === data.currentUserId);
        if (currentUser) {
            stateManager.setCurrentUser(currentUser);
        } else {
            stateManager.setCurrentUser(users[0]);
        }
    } else {
        stateManager.setCurrentUser(users[0]);
    }
    
    console.log('Users imported:', users.length);
    updateUserDisplay();
    updateUserSelector();
}

export { User };
