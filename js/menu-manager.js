/**
 * Menu Manager Module
 * Handles slide-out menu functionality and keyboard shortcuts
 */

import { saveDocument, commitDocument } from './data-operations.js';
import { showSuccess } from './message-center.js';

let isMenuOpen = false;

/**
 * Initialize menu functionality
 */
export function initializeMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const mainContainer = document.getElementById('dynamic-container');

    if (!menuToggle || !sideMenu || !menuOverlay) {
        console.error('Menu elements not found');
        return;
    }

    // Toggle menu on button click
    menuToggle.addEventListener('click', toggleMenu);

    // Close menu when clicking overlay
    menuOverlay.addEventListener('click', closeMenu);

    // Close menu when clicking menu items (except theme toggle)
    sideMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (menuItem && !menuItem.classList.contains('menu-theme-toggle')) {
            closeMenu();
        }
    });

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();

    console.log('Menu manager initialized');
}

/**
 * Toggle menu open/closed
 */
function toggleMenu() {
    if (isMenuOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

/**
 * Open the menu
 */
function openMenu() {
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const mainContainer = document.getElementById('dynamic-container');
    const menuToggle = document.getElementById('menu-toggle');

    sideMenu.classList.add('open');
    menuOverlay.classList.add('active');
    mainContainer.classList.add('menu-active');
    menuToggle.classList.add('active');
    
    isMenuOpen = true;
}

/**
 * Close the menu
 */
function closeMenu() {
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const mainContainer = document.getElementById('dynamic-container');
    const menuToggle = document.getElementById('menu-toggle');

    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('active');
    mainContainer.classList.remove('menu-active');
    menuToggle.classList.remove('active');
    
    isMenuOpen = false;
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
            e.preventDefault();
            console.log('Keyboard shortcut: Save (Ctrl+S)');
            saveDocument();
            showSuccess('Document Saved');
        }
        
        // Ctrl+Shift+S or Cmd+Shift+S - Commit
        if ((e.ctrlKey || e.metaKey) && e.key === 'S' && e.shiftKey) {
            e.preventDefault();
            console.log('Keyboard shortcut: Commit (Ctrl+Shift+S)');
            commitDocument();
            showSuccess('Changes Committed');
        }

        // Escape - Close menu
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });

    console.log('Keyboard shortcuts initialized:');
    console.log('  - Ctrl+S (or Cmd+S): Save Draft');
    console.log('  - Ctrl+Shift+S (or Cmd+Shift+S): Commit Changes');
    console.log('  - Escape: Close Menu');
}

/**
 * Set username display
 */
export function setUsername(username) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = username || 'User Name';
    }
}
