"use strict";
/**
 * Terminal Manager
 * Wrapper class for xterm.js with addons and configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const xterm_1 = require("xterm");
const xterm_addon_fit_1 = require("xterm-addon-fit");
const xterm_addon_web_links_1 = require("xterm-addon-web-links");
// VS Code Dark+ inspired theme
const TERMINAL_THEME = {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    cursorAccent: '#1e1e1e',
    selectionBackground: '#264f78',
    selectionForeground: '#ffffff',
    selectionInactiveBackground: '#3a3d41',
    // ANSI Colors
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    // Bright ANSI Colors
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff'
};
// Terminal configuration
const TERMINAL_OPTIONS = {
    theme: TERMINAL_THEME,
    fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
    fontSize: 14,
    fontWeight: '400',
    fontWeightBold: '600',
    lineHeight: 1.2,
    letterSpacing: 0,
    cursorBlink: true,
    cursorStyle: 'block',
    cursorWidth: 1,
    scrollback: 10000,
    tabStopWidth: 4,
    bellStyle: 'none',
    allowProposedApi: true,
    allowTransparency: false,
    convertEol: true,
    scrollOnUserInput: true,
    screenReaderMode: false,
    macOptionIsMeta: false,
    macOptionClickForcesSelection: false,
    minimumContrastRatio: 1,
    drawBoldTextInBrightColors: true
};
class TerminalManager {
    terminal;
    fitAddon;
    webLinksAddon;
    container;
    config;
    resizeObserver = null;
    resizeTimeout = null;
    constructor(config) {
        this.config = config;
        this.container = config.container;
        // Initialize terminal with options
        this.terminal = new xterm_1.Terminal(TERMINAL_OPTIONS);
        // Initialize addons
        this.fitAddon = new xterm_addon_fit_1.FitAddon();
        this.webLinksAddon = new xterm_addon_web_links_1.WebLinksAddon();
        // Load addons
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(this.webLinksAddon);
    }
    /**
     * Initialize and open the terminal
     */
    initialize() {
        // Open terminal in container
        this.terminal.open(this.container);
        // Set up data handler (user input)
        this.terminal.onData((data) => {
            this.config.onData(data);
        });
        // Set up resize handler
        this.terminal.onResize(({ cols, rows }) => {
            this.config.onResize(cols, rows);
        });
        // Initial fit
        this.fit();
        // Set up resize observer for container
        this.setupResizeObserver();
        // Focus terminal
        this.focus();
        console.log('Terminal initialized');
    }
    /**
     * Set up ResizeObserver to handle container size changes
     */
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            this.debouncedFit();
        });
        this.resizeObserver.observe(this.container);
    }
    /**
     * Debounced fit to prevent excessive resize calls
     */
    debouncedFit() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.fit();
        }, 50);
    }
    /**
     * Fit terminal to container size
     */
    fit() {
        try {
            this.fitAddon.fit();
            const dimensions = this.getDimensions();
            console.log(`Terminal fit to ${dimensions.cols}x${dimensions.rows}`);
        }
        catch (error) {
            console.error('Failed to fit terminal:', error);
        }
    }
    /**
     * Get current terminal dimensions
     */
    getDimensions() {
        return {
            cols: this.terminal.cols,
            rows: this.terminal.rows
        };
    }
    /**
     * Write data to terminal display
     */
    write(data) {
        this.terminal.write(data);
    }
    /**
     * Write a line to terminal (adds newline)
     */
    writeLine(data) {
        this.terminal.writeln(data);
    }
    /**
     * Clear the terminal
     */
    clear() {
        this.terminal.clear();
    }
    /**
     * Focus the terminal
     */
    focus() {
        this.terminal.focus();
    }
    /**
     * Blur the terminal
     */
    blur() {
        this.terminal.blur();
    }
    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        this.terminal.scrollToBottom();
    }
    /**
     * Select all text in terminal
     */
    selectAll() {
        this.terminal.selectAll();
    }
    /**
     * Get selected text
     */
    getSelection() {
        return this.terminal.getSelection();
    }
    /**
     * Check if terminal has focus
     */
    hasFocus() {
        return document.activeElement === this.terminal.textarea;
    }
    /**
     * Dispose of terminal and cleanup
     */
    dispose() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.terminal.dispose();
        console.log('Terminal disposed');
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=terminal.js.map