/**
 * Message Center Module
 * Centralized system for tooltips, notifications, errors, and user input
 */

let messageTimeout = null;
let currentMessage = null;

/**
 * Initialize the message center
 */
export function initializeMessageCenter() {
    // Create message center element if it doesn't exist
    if (!document.getElementById('message-center')) {
        const messageCenter = document.createElement('div');
        messageCenter.id = 'message-center';
        messageCenter.className = 'message-center';
        document.body.appendChild(messageCenter);
    }

    // Add hover listeners to all elements with tooltips
    setupTooltipListeners();

    console.log('Message center initialized');
}

/**
 * Setup tooltip listeners for elements with data-tooltip
 */
function setupTooltipListeners() {
    // Use event delegation on document
    let hoverTimeout = null;

    document.addEventListener('mouseover', (e) => {
        const tooltipElement = e.target.closest('[data-tooltip]');
        if (tooltipElement) {
            const tooltip = tooltipElement.getAttribute('data-tooltip');
            if (tooltip) {
                // Clear any existing hover timeout
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                }
                
                // Show tooltip after 1 second
                hoverTimeout = setTimeout(() => {
                    showMessage(tooltip, 'tooltip');
                }, 1000);
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        const tooltipElement = e.target.closest('[data-tooltip]');
        if (tooltipElement) {
            // Clear hover timeout
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            
            // Hide tooltip if currently showing
            if (currentMessage && currentMessage.type === 'tooltip') {
                hideMessage();
            }
        }
    });
}

/**
 * Show a message in the message center
 * @param {string} text - The message text
 * @param {string} type - Type: 'tooltip', 'notification', 'error', 'success', 'input'
 * @param {number} duration - Duration in ms (0 = permanent, default 3000 for notifications)
 */
export function showMessage(text, type = 'notification', duration = null) {
    const messageCenter = document.getElementById('message-center');
    if (!messageCenter) {
        console.error('Message center not found');
        return;
    }

    // Clear existing timeout
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }

    // Store current message info
    currentMessage = { text, type };

    // Set default durations based on type
    if (duration === null) {
        switch (type) {
            case 'tooltip':
                duration = 0; // Tooltips stay until mouse leaves
                break;
            case 'notification':
            case 'success':
                duration = 2000;
                break;
            case 'error':
                duration = 4000;
                break;
            case 'input':
                duration = 0; // Input stays until closed
                break;
            default:
                duration = 3000;
        }
    }

    // Update message center
    messageCenter.textContent = text;
    messageCenter.className = `message-center show ${type}`;

    // Auto-hide after duration if not permanent
    if (duration > 0) {
        messageTimeout = setTimeout(() => {
            hideMessage();
        }, duration);
    }
}

/**
 * Hide the message center
 */
export function hideMessage() {
    const messageCenter = document.getElementById('message-center');
    if (!messageCenter) return;

    messageCenter.classList.remove('show');
    currentMessage = null;

    // Clear timeout
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
}

/**
 * Show a notification (success/info)
 */
export function showNotification(text, duration = 2000) {
    showMessage(text, 'notification', duration);
}

/**
 * Show a success message
 */
export function showSuccess(text, duration = 2000) {
    showMessage(text, 'success', duration);
}

/**
 * Show an error message
 */
export function showError(text, duration = 4000) {
    showMessage(text, 'error', duration);
}

/**
 * Show custom confirmation dialog
 * @param {string} message - The confirmation message
 * @param {string} confirmText - Text for confirm button (default: "OK")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
export function showConfirm(message, confirmText = 'OK', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-dialog modal-confirm';
        
        // Message content
        const messageDiv = document.createElement('div');
        messageDiv.className = 'modal-message';
        messageDiv.textContent = message;
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.className = 'modal-btn modal-btn-cancel';
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
        
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = confirmText;
        confirmBtn.className = 'modal-btn modal-btn-confirm';
        confirmBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        
        modal.appendChild(messageDiv);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus confirm button
        confirmBtn.focus();
        
        // Handle escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

/**
 * Show custom prompt dialog
 * @param {string} message - The prompt message
 * @param {string} defaultValue - Default input value
 * @param {string} placeholder - Input placeholder text
 * @returns {Promise<string|null>} - Input value if confirmed, null if cancelled
 */
export function showPrompt(message, defaultValue = '', placeholder = '') {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-dialog modal-prompt';
        
        // Message content
        const messageDiv = document.createElement('div');
        messageDiv.className = 'modal-message';
        messageDiv.textContent = message;
        
        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'modal-input';
        input.value = defaultValue;
        input.placeholder = placeholder;
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'modal-btn modal-btn-cancel';
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(null);
        };
        
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'OK';
        confirmBtn.className = 'modal-btn modal-btn-confirm';
        confirmBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(input.value);
        };
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        
        modal.appendChild(messageDiv);
        modal.appendChild(input);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus and select input
        input.focus();
        input.select();
        
        // Handle enter key on input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.body.removeChild(overlay);
                resolve(input.value);
            } else if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                resolve(null);
            }
        });
    });
}

/**
 * Get current message info
 */
export function getCurrentMessage() {
    return currentMessage;
}
