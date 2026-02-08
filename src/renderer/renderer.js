"use strict";
/**
 * Renderer Process Entry Point
 * Initializes all UI components and connects them to the main process
 */
Object.defineProperty(exports, "__esModule", { value: true });
const terminal_1 = require("./terminal");
const layout_1 = require("./layout");
// Global references
let terminalManager = null;
let layoutManager = null;
/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing Pi Assistant...');
    // Initialize layout
    initializeLayout();
    // Initialize terminal
    initializeTerminal();
    // Initialize window controls
    initializeWindowControls();
    // Set up global keyboard shortcuts
    setupKeyboardShortcuts();
    console.log('Pi Assistant initialized successfully');
}
/**
 * Initialize the split-pane layout
 */
function initializeLayout() {
    const leftPanel = document.getElementById('terminal-panel');
    const rightPanel = document.getElementById('chat-panel');
    const handle = document.getElementById('resize-handle');
    if (!leftPanel || !rightPanel || !handle) {
        console.error('Layout elements not found');
        return;
    }
    layoutManager = new layout_1.LayoutManager({
        leftPanel,
        rightPanel,
        handle,
        minPanelWidth: 200,
        onResize: () => {
            // Refit terminal when layout changes
            if (terminalManager) {
                terminalManager.fit();
            }
        }
    });
    layoutManager.initialize();
}
/**
 * Initialize the terminal emulator
 */
function initializeTerminal() {
    const container = document.getElementById('terminal-container');
    if (!container) {
        console.error('Terminal container not found');
        return;
    }
    terminalManager = new terminal_1.TerminalManager({
        container,
        onData: (data) => {
            // Send user input to main process
            window.electronAPI.sendTerminalInput(data);
        },
        onResize: (cols, rows) => {
            // Notify main process of resize
            window.electronAPI.resizeTerminal(cols, rows);
            // Update status bar
            updateTerminalSize(cols, rows);
        }
    });
    terminalManager.initialize();
    // Listen for terminal data from main process
    window.electronAPI.onTerminalData((data) => {
        if (terminalManager) {
            terminalManager.write(data);
        }
    });
    // Initial resize notification
    const dims = terminalManager.getDimensions();
    window.electronAPI.resizeTerminal(dims.cols, dims.rows);
    updateTerminalSize(dims.cols, dims.rows);
}
/**
 * Update terminal size display in status bar
 */
function updateTerminalSize(cols, rows) {
    const sizeElement = document.getElementById('terminal-size');
    if (sizeElement) {
        sizeElement.textContent = `${cols}×${rows}`;
    }
}
/**
 * Initialize window control buttons
 */
function initializeWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    minimizeBtn?.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });
    maximizeBtn?.addEventListener('click', async () => {
        window.electronAPI.maximizeWindow();
        // Update maximize button icon based on state
        await updateMaximizeButton();
    });
    closeBtn?.addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });
    // Update maximize button on window state change
    // Note: In a full implementation, you'd listen for maximize/unmaximize events
}
/**
 * Update maximize button appearance based on window state
 */
async function updateMaximizeButton() {
    const maximizeBtn = document.getElementById('maximize-btn');
    if (!maximizeBtn)
        return;
    const isMaximized = await window.electronAPI.isMaximized();
    if (isMaximized) {
        // Show restore icon (two overlapping rectangles)
        maximizeBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
        <rect x="0" y="2" width="8" height="8" fill="var(--bg-primary)" stroke="currentColor" stroke-width="1"/>
      </svg>
    `;
        maximizeBtn.setAttribute('aria-label', 'Restore');
    }
    else {
        // Show maximize icon (single rectangle)
        maximizeBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
    `;
        maximizeBtn.setAttribute('aria-label', 'Maximize');
    }
}
/**
 * Set up global keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ctrl+Shift+I: Open DevTools (handled by Electron, but we can add more)
        // Ctrl+L: Clear terminal
        if (event.ctrlKey && event.key === 'l') {
            event.preventDefault();
            terminalManager?.clear();
        }
        // Ctrl+Shift+T: Focus terminal
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
            event.preventDefault();
            terminalManager?.focus();
        }
        // F11: Toggle maximize
        if (event.key === 'F11') {
            event.preventDefault();
            window.electronAPI.maximizeWindow();
        }
        // Escape: Blur terminal (for accessibility)
        if (event.key === 'Escape') {
            terminalManager?.blur();
        }
    });
}
/**
 * Handle page unload for cleanup
 */
function cleanup() {
    terminalManager?.dispose();
    layoutManager?.dispose();
    window.electronAPI.removeAllListeners('terminal:data');
}
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
// Cleanup on unload
window.addEventListener('beforeunload', cleanup);
//# sourceMappingURL=renderer.js.map