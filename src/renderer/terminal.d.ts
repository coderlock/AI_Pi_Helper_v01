/**
 * Terminal Manager
 * Wrapper class for xterm.js with addons and configuration
 */
export interface TerminalManagerConfig {
    container: HTMLElement;
    onData: (data: string) => void;
    onResize: (cols: number, rows: number) => void;
}
export declare class TerminalManager {
    private terminal;
    private fitAddon;
    private webLinksAddon;
    private container;
    private config;
    private resizeObserver;
    private resizeTimeout;
    constructor(config: TerminalManagerConfig);
    /**
     * Initialize and open the terminal
     */
    initialize(): void;
    /**
     * Set up ResizeObserver to handle container size changes
     */
    private setupResizeObserver;
    /**
     * Debounced fit to prevent excessive resize calls
     */
    private debouncedFit;
    /**
     * Fit terminal to container size
     */
    fit(): void;
    /**
     * Get current terminal dimensions
     */
    getDimensions(): {
        cols: number;
        rows: number;
    };
    /**
     * Write data to terminal display
     */
    write(data: string): void;
    /**
     * Write a line to terminal (adds newline)
     */
    writeLine(data: string): void;
    /**
     * Clear the terminal
     */
    clear(): void;
    /**
     * Focus the terminal
     */
    focus(): void;
    /**
     * Blur the terminal
     */
    blur(): void;
    /**
     * Scroll to bottom
     */
    scrollToBottom(): void;
    /**
     * Select all text in terminal
     */
    selectAll(): void;
    /**
     * Get selected text
     */
    getSelection(): string;
    /**
     * Check if terminal has focus
     */
    hasFocus(): boolean;
    /**
     * Dispose of terminal and cleanup
     */
    dispose(): void;
}
//# sourceMappingURL=terminal.d.ts.map