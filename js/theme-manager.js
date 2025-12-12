/*
// =========================================================================
// THEME MANAGER MODULE
// Handles light/dark theme switching
// =========================================================================
*/

const THEME_KEY = 'dlms_theme';
const CONTRAST_KEY = 'dlms_contrast';
const DARK_THEME_CLASS = 'dark-theme';
const HIGH_CONTRAST_CLASS = 'high-contrast';

/**
 * Initialize theme system
 */
export function initializeTheme() {
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
    
    // Load saved contrast or default to low
    const savedContrast = localStorage.getItem(CONTRAST_KEY) || 'low';
    applyContrast(savedContrast);
    
    // Set up theme toggle
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
        themeToggle.addEventListener('change', handleThemeToggle);
    }
    
    // Set up contrast toggle
    const contrastToggle = document.getElementById('contrast-toggle-checkbox');
    if (contrastToggle) {
        contrastToggle.checked = savedContrast === 'high';
        contrastToggle.addEventListener('change', handleContrastToggle);
    }
    
    console.log('Theme system initialized:', savedTheme, 'contrast:', savedContrast);
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

/**
 * Handle contrast toggle change
 */
function handleContrastToggle(event) {
    const newContrast = event.target.checked ? 'high' : 'low';
    applyContrast(newContrast);
    localStorage.setItem(CONTRAST_KEY, newContrast);
    console.log('Contrast changed to:', newContrast);
}

/**
 * Apply contrast to document
 */
function applyContrast(contrast) {
    if (contrast === 'high') {
        document.body.classList.add(HIGH_CONTRAST_CLASS);
    } else {
        document.body.classList.remove(HIGH_CONTRAST_CLASS);
    }
}

/**
 * Get current contrast
 */
export function getCurrentContrast() {
    return document.body.classList.contains(HIGH_CONTRAST_CLASS) ? 'high' : 'low';
}

/**
 * Toggle contrast programmatically
 */
export function toggleContrast() {
    const currentContrast = getCurrentContrast();
    const newContrast = currentContrast === 'low' ? 'high' : 'low';
    applyContrast(newContrast);
    localStorage.setItem(CONTRAST_KEY, newContrast);
    
    // Update checkbox if it exists
    const contrastToggle = document.getElementById('contrast-toggle-checkbox');
    if (contrastToggle) {
        contrastToggle.checked = newContrast === 'high';
    }
    
    return newContrast;
}
