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
 * Show input prompt (for future implementation)
 */
export function showInput(promptText, callback) {
    // For now, just show as message
    // TODO: Implement actual input functionality
    showMessage(promptText, 'input', 0);
}

/**
 * Get current message info
 */
export function getCurrentMessage() {
    return currentMessage;
}
