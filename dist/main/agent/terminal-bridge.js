"use strict";
/**
 * Terminal Bridge
 * Routes command execution to the appropriate terminal (local PTY or SSH)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalBridge = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
// Markers for output capture
const START_MARKER = '<<<PIASSIST_START_';
const END_MARKER = '<<<PIASSIST_END_';
const EXIT_MARKER = '<<<PIASSIST_EXIT_';
class TerminalBridge extends events_1.EventEmitter {
    constructor() {
        super();
        this.sshManager = null;
        this.ptyManager = null;
        this.mainWindow = null;
        this.isSSHActive = false;
        // Active command tracking
        this.activeCommand = null;
        // Output capture state
        this.isCapturing = false;
        this.captureBuffer = '';
    }
    /**
     * Set the SSH manager reference
     */
    setSSHManager(manager, isActive) {
        this.sshManager = manager;
        this.isSSHActive = isActive;
    }
    /**
     * Set the PTY manager reference
     */
    setPtyManager(manager) {
        this.ptyManager = manager;
    }
    /**
     * Set main window for IPC
     */
    setMainWindow(window) {
        this.mainWindow = window;
    }
    /**
     * Update SSH active state
     */
    setSSHActive(isActive) {
        this.isSSHActive = isActive;
    }
    /**
     * Get current terminal context
     */
    getContext() {
        if (this.isSSHActive && this.sshManager?.isConnected()) {
            const info = this.sshManager.getConnectionInfo();
            return {
                connectionType: 'ssh',
                connectionInfo: info ? `${info.username}@${info.host}` : 'unknown',
                isConnected: true
            };
        }
        return {
            connectionType: 'local',
            connectionInfo: 'localhost',
            isConnected: this.ptyManager !== null
        };
    }
    /**
     * Execute a command and capture output
     */
    async executeCommand(request) {
        // Check if another command is running
        if (this.activeCommand) {
            throw new Error('Another command is already running');
        }
        // Check terminal availability
        if (this.isSSHActive) {
            if (!this.sshManager?.isConnected()) {
                throw new Error('SSH not connected');
            }
        }
        else {
            if (!this.ptyManager) {
                throw new Error('Local terminal not available');
            }
        }
        const commandId = request.id || (0, uuid_1.v4)();
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            // Set up command tracking
            this.activeCommand = {
                id: commandId,
                command: request.command,
                buffer: '',
                startTime,
                timeout: null,
                resolve,
                reject
            };
            // Set up timeout
            this.activeCommand.timeout = setTimeout(() => {
                this.handleTimeout(commandId);
            }, request.timeout);
            // Start capturing
            this.isCapturing = true;
            this.captureBuffer = '';
            // Build wrapped command with markers
            const wrappedCommand = this.buildWrappedCommand(commandId, request.command);
            // Send to appropriate terminal
            this.sendToTerminal(wrappedCommand);
        });
    }
    /**
     * Build command with output markers
     */
    buildWrappedCommand(commandId, command) {
        // The command sequence:
        // 1. Print start marker
        // 2. Run the actual command
        // 3. Capture exit code
        // 4. Print exit code marker
        // 5. Print end marker
        const startMarker = `${START_MARKER}${commandId}>>>`;
        const endMarker = `${END_MARKER}${commandId}>>>`;
        const exitMarker = `${EXIT_MARKER}${commandId}_`;
        // Works for both bash/sh and PowerShell
        const context = this.getContext();
        if (context.connectionType === 'local' && process.platform === 'win32') {
            // PowerShell command wrapping
            return `Write-Host "${startMarker}"; ${command}; $__exit_code=$LASTEXITCODE; Write-Host "${exitMarker}$__exit_code>>>"; Write-Host "${endMarker}"\r\n`;
        }
        else {
            // Bash/sh command wrapping (for SSH and Unix local)
            return `echo "${startMarker}" && ${command}; __exit_code=$?; echo "${exitMarker}\${__exit_code}>>>"; echo "${endMarker}"\n`;
        }
    }
    /**
     * Send command to the active terminal
     */
    sendToTerminal(command) {
        if (this.isSSHActive && this.sshManager?.isConnected()) {
            this.sshManager.write(command);
        }
        else if (this.ptyManager) {
            this.ptyManager.write(command);
        }
    }
    /**
     * Process incoming terminal data
     * Call this from the terminal data handler
     */
    processTerminalData(data) {
        if (!this.isCapturing || !this.activeCommand) {
            return;
        }
        this.captureBuffer += data;
        // Check for end marker
        const endMarkerFull = `${END_MARKER}${this.activeCommand.id}>>>`;
        const endIndex = this.captureBuffer.indexOf(endMarkerFull);
        if (endIndex !== -1) {
            this.completeCapture();
        }
    }
    /**
     * Complete the output capture and resolve the promise
     */
    completeCapture() {
        if (!this.activeCommand)
            return;
        const { id, command, startTime, timeout, resolve } = this.activeCommand;
        // Clear timeout
        if (timeout) {
            clearTimeout(timeout);
        }
        // Parse the captured output
        const result = this.parseOutput(id, command, this.captureBuffer, startTime);
        // Clean up
        this.isCapturing = false;
        this.captureBuffer = '';
        this.activeCommand = null;
        resolve(result);
    }
    /**
     * Parse captured output to extract stdout, stderr, and exit code
     */
    parseOutput(commandId, command, buffer, startTime) {
        const startMarker = `${START_MARKER}${commandId}>>>`;
        const endMarker = `${END_MARKER}${commandId}>>>`;
        const exitMarkerPrefix = `${EXIT_MARKER}${commandId}_`;
        let stdout = '';
        let stderr = '';
        let exitCode = null;
        // Find start marker
        const startIndex = buffer.indexOf(startMarker);
        if (startIndex === -1) {
            // Marker not found - return raw buffer
            stdout = buffer;
        }
        else {
            // Extract content after start marker
            let content = buffer.substring(startIndex + startMarker.length);
            // Find and extract exit code
            const exitMatch = content.match(new RegExp(`${exitMarkerPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)>>>`));
            if (exitMatch) {
                exitCode = parseInt(exitMatch[1], 10);
                // Remove exit code line from content
                content = content.replace(exitMatch[0], '');
            }
            // Find end marker and truncate
            const endIndex = content.indexOf(endMarker);
            if (endIndex !== -1) {
                content = content.substring(0, endIndex);
            }
            // Clean up the content
            stdout = content
                .replace(/\r\n/g, '\n') // Normalize line endings
                .replace(/^\n+/, '') // Remove leading newlines
                .replace(/\n+$/, ''); // Remove trailing newlines
            // Note: stderr is captured in stdout for interactive shells
            // For proper stderr separation, we'd need exec mode (future enhancement)
        }
        return {
            id: commandId,
            command,
            stdout,
            stderr,
            exitCode,
            timedOut: false,
            durationMs: Date.now() - startTime
        };
    }
    /**
     * Handle command timeout
     */
    handleTimeout(commandId) {
        if (!this.activeCommand || this.activeCommand.id !== commandId) {
            return;
        }
        const { command, startTime, resolve } = this.activeCommand;
        // Send Ctrl+C to kill the command
        this.sendToTerminal('\x03');
        // Clean up
        this.isCapturing = false;
        const partialOutput = this.captureBuffer;
        this.captureBuffer = '';
        this.activeCommand = null;
        resolve({
            id: commandId,
            command,
            stdout: partialOutput,
            stderr: '',
            exitCode: null,
            timedOut: true,
            durationMs: Date.now() - startTime,
            error: 'Command timed out'
        });
    }
    /**
     * Cancel the currently running command
     */
    cancelCommand(commandId) {
        if (!this.activeCommand || this.activeCommand.id !== commandId) {
            return false;
        }
        const { command, startTime, timeout, resolve } = this.activeCommand;
        // Clear timeout
        if (timeout) {
            clearTimeout(timeout);
        }
        // Send Ctrl+C to kill the command
        this.sendToTerminal('\x03');
        // Clean up
        this.isCapturing = false;
        const partialOutput = this.captureBuffer;
        this.captureBuffer = '';
        this.activeCommand = null;
        resolve({
            id: commandId,
            command,
            stdout: partialOutput,
            stderr: '',
            exitCode: null,
            timedOut: false,
            durationMs: Date.now() - startTime,
            error: 'Command cancelled by user'
        });
        return true;
    }
    /**
     * Check if a command is currently running
     */
    isCommandRunning() {
        return this.activeCommand !== null;
    }
    /**
     * Get the ID of the currently running command
     */
    getActiveCommandId() {
        return this.activeCommand?.id || null;
    }
}
exports.TerminalBridge = TerminalBridge;
//# sourceMappingURL=terminal-bridge.js.map