/**
 * Terminal Bridge
 * Routes command execution to the appropriate terminal (local PTY or SSH)
 */
import { EventEmitter } from 'events';
import { CommandRequest, CommandResult, TerminalContext } from './types';
import { SSHManager } from '../ssh-manager';
import { PtyManager } from '../pty';
import { BrowserWindow } from 'electron';
export declare class TerminalBridge extends EventEmitter {
    private sshManager;
    private ptyManager;
    private mainWindow;
    private isSSHActive;
    private activeCommand;
    private isCapturing;
    private captureBuffer;
    constructor();
    /**
     * Set the SSH manager reference
     */
    setSSHManager(manager: SSHManager | null, isActive: boolean): void;
    /**
     * Set the PTY manager reference
     */
    setPtyManager(manager: PtyManager | null): void;
    /**
     * Set main window for IPC
     */
    setMainWindow(window: BrowserWindow | null): void;
    /**
     * Update SSH active state
     */
    setSSHActive(isActive: boolean): void;
    /**
     * Get current terminal context
     */
    getContext(): TerminalContext;
    /**
     * Execute a command and capture output
     */
    executeCommand(request: CommandRequest): Promise<CommandResult>;
    /**
     * Build command with output markers
     */
    private buildWrappedCommand;
    /**
     * Send command to the active terminal
     */
    private sendToTerminal;
    /**
     * Process incoming terminal data
     * Call this from the terminal data handler
     */
    processTerminalData(data: string): void;
    /**
     * Complete the output capture and resolve the promise
     */
    private completeCapture;
    /**
     * Parse captured output to extract stdout, stderr, and exit code
     */
    private parseOutput;
    /**
     * Handle command timeout
     */
    private handleTimeout;
    /**
     * Cancel the currently running command
     */
    cancelCommand(commandId: string): boolean;
    /**
     * Check if a command is currently running
     */
    isCommandRunning(): boolean;
    /**
     * Get the ID of the currently running command
     */
    getActiveCommandId(): string | null;
}
//# sourceMappingURL=terminal-bridge.d.ts.map