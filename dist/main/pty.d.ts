/**
 * PTY Manager
 * Manages the pseudo-terminal process for local shell
 */
import { BrowserWindow } from 'electron';
export declare class PtyManager {
    private ptyProcess;
    private window;
    private dataListeners;
    constructor(window: BrowserWindow);
    /**
     * Add a data listener (for agent processing)
     */
    addDataListener(listener: (data: string) => void): void;
    /**
     * Initialize the PTY process
     */
    private initialize;
    /**
     * Get the default shell for the current platform
     */
    private getDefaultShell;
    /**
     * Write data to the PTY process
     */
    write(data: string): void;
    /**
     * Resize the PTY process
     */
    resize(cols: number, rows: number): void;
    /**
     * Clean up and dispose the PTY process
     */
    dispose(): void;
}
//# sourceMappingURL=pty.d.ts.map