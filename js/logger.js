// Centralized logging control
export const DEBUG_MODE = false;
export const LOG_ENABLED = false;

const originalConsoleLog = console.log.bind(console);
const originalConsoleError = console.error.bind(console);

export function logDebug(...args) {
    if (DEBUG_MODE || LOG_ENABLED) {
        originalConsoleLog(...args);
    }
}

export function logError(...args) {
    // Always surface errors, even when debug logging is off
    originalConsoleError(...args);
}

// Override console.log globally to honor debug flags
if (!(DEBUG_MODE || LOG_ENABLED)) {
    console.log = () => {};
} else {
    console.log = originalConsoleLog;
}

// Preserve console.error for visibility
console.error = originalConsoleError;

// Expose flags/util globally for modules that don't import
if (typeof globalThis !== 'undefined') {
    globalThis.DEBUG_MODE = DEBUG_MODE;
    globalThis.LOG_ENABLED = LOG_ENABLED;
    globalThis.logDebug = logDebug;
    globalThis.logError = logError;
}
