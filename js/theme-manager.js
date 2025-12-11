/*
// =========================================================================
// THEME MANAGER MODULE
// Handles light/dark theme switching
// =========================================================================
*/

const THEME_KEY = 'dlms_theme';
const DARK_THEME_CLASS = 'dark-theme';

/**
 * Initialize theme system
 */
export function initializeTheme() {
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
    
    // Set up theme toggle
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
        themeToggle.addEventListener('change', handleThemeToggle);
    }
    
    console.log('Theme system initialized:', savedTheme);
}

/**
 * Handle theme toggle change
 */
function handleThemeToggle(event) {
    const newTheme = event.target.checked ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    console.log('Theme changed to:', newTheme);
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add(DARK_THEME_CLASS);
    } else {
        document.body.classList.remove(DARK_THEME_CLASS);
    }
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
    return document.body.classList.contains(DARK_THEME_CLASS) ? 'dark' : 'light';
}

/**
 * Toggle theme programmatically
 */
export function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Update checkbox if it exists
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    if (themeToggle) {
        themeToggle.checked = newTheme === 'dark';
    }
    
    return newTheme;
}
