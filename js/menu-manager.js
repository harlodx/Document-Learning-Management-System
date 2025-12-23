/**
 * Menu Manager Module
 * Handles slide-out menu functionality and keyboard shortcuts
 */

import { saveDocument, commitDocument } from './data-operations.js';
import { showSuccess } from './message-center.js';

const LOG_ENABLED = typeof globalThis !== 'undefined' ? !!globalThis.LOG_ENABLED : false;
let isMenuOpen = false;
let ispendingPanelOpen = false;

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

    // Initialize pending panel
    initializePendingPanel();

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();

    if (LOG_ENABLED) console.log('Menu manager initialized');
}

/**
 * Initialize pending panel functionality
 */
function initializePendingPanel() {
    const pendingToggle = document.getElementById('pending-toggle');
    const pendingPanel = document.getElementById('pending-panel');

    if (!pendingToggle || !pendingPanel) {
        console.error('pending panel elements not found');
        return;
    }

    // Toggle pending panel on button click
    pendingToggle.addEventListener('click', togglePendingPanel);
    
    // Monitor panel for state changes and keep toggle in sync
    const observer = new MutationObserver(() => {
        syncPendingToggleState();
    });
    
    observer.observe(pendingPanel, { attributes: true, attributeFilter: ['class'] });

    if (LOG_ENABLED) console.log('pending panel initialized');
}

/**
 * Sync the toggle button state with the actual panel state
 */
function syncPendingToggleState() {
    const pendingPanel = document.getElementById('pending-panel');
    const pendingToggle = document.getElementById('pending-toggle');
    
    if (!pendingPanel || !pendingToggle) return;
    
    const isPanelOpen = pendingPanel.classList.contains('open');
    
    if (isPanelOpen) {
        pendingToggle.classList.add('active');
        ispendingPanelOpen = true;
    } else {
        pendingToggle.classList.remove('active');
        ispendingPanelOpen = false;
    }
}

/**
 * Toggle pending panel open/closed
 */
function togglePendingPanel() {
    if (ispendingPanelOpen) {
        closePendingPanel();
    } else {
        openPendingPanel();
    }
}

/**
 * Open the pending panel
 */
function openPendingPanel() {
    const pendingPanel = document.getElementById('pending-panel');
    const pendingToggle = document.getElementById('pending-toggle');

    pendingPanel.classList.add('open');
    pendingToggle.classList.add('active');
    
    ispendingPanelOpen = true;
}

/**
 * Close the pending panel
 */
function closePendingPanel() {
    const pendingPanel = document.getElementById('pending-panel');
    const pendingToggle = document.getElementById('pending-toggle');

    pendingPanel.classList.remove('open');
    pendingToggle.classList.remove('active');
    
    ispendingPanelOpen = false;
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
    const menuToggle = document.getElementById('menu-toggle');

    sideMenu.classList.add('open');
    menuOverlay.classList.add('active');
    menuToggle.classList.add('active');
    
    isMenuOpen = true;
}

/**
 * Close the menu
 */
function closeMenu() {
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const menuToggle = document.getElementById('menu-toggle');

    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('active');
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
            if (LOG_ENABLED) console.log('Keyboard shortcut: Save (Ctrl+S)');
            saveDocument();
            showSuccess('Document Saved');
        }
        
        // Ctrl+Shift+S or Cmd+Shift+S - Commit
        if ((e.ctrlKey || e.metaKey) && e.key === 'S' && e.shiftKey) {
            e.preventDefault();
            if (LOG_ENABLED) console.log('Keyboard shortcut: Commit (Ctrl+Shift+S)');
            commitDocument();
            showSuccess('Changes Committed');
        }

        // Escape - Close menu or pending panel
        if (e.key === 'Escape') {
            if (isMenuOpen) {
                closeMenu();
            } else if (ispendingPanelOpen) {
                closePendingPanel();
            }
        }
    });

    if (LOG_ENABLED) {
        console.log('Keyboard shortcuts initialized:');
        console.log('  - Ctrl+S (or Cmd+S): Save Draft');
        console.log('  - Ctrl+Shift+S (or Cmd+Shift+S): Commit Changes');
        console.log('  - Escape: Close Menu');
    }
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
