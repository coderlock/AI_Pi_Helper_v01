/**
 * Terminal Bridge
 * Routes command execution to the appropriate terminal (local PTY or SSH)
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CommandRequest, CommandResult, TerminalContext } from './types';
import { SSHManager } from '../ssh-manager';
import { PtyManager } from '../pty';
import { BrowserWindow } from 'electron';

// Markers for output capture
const START_MARKER = '<<<PIASSIST_START_';
const END_MARKER = '<<<PIASSIST_END_';
const EXIT_MARKER = '<<<PIASSIST_EXIT_';

export class TerminalBridge extends EventEmitter {
  private sshManager: SSHManager | null = null;
  private ptyManager: PtyManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isSSHActive: boolean = false;
  
  // Active command tracking
  private activeCommand: {
    id: string;
    command: string;
    buffer: string;
    startTime: number;
    timeout: NodeJS.Timeout | null;
    resolve: (result: CommandResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  // Output capture state
  private isCapturing: boolean = false;
  private captureBuffer: string = '';

  constructor() {
    super();
  }

  /**
   * Set the SSH manager reference
   */
  setSSHManager(manager: SSHManager | null, isActive: boolean): void {
    this.sshManager = manager;
    this.isSSHActive = isActive;
  }

  /**
   * Set the PTY manager reference
   */
  setPtyManager(manager: PtyManager | null): void {
    this.ptyManager = manager;
  }

  /**
   * Set main window for IPC
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Update SSH active state
   */
  setSSHActive(isActive: boolean): void {
    this.isSSHActive = isActive;
  }

  /**
   * Get current terminal context
   */
  getContext(): TerminalContext {
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
  async executeCommand(request: CommandRequest): Promise<CommandResult> {
    // Check if another command is running
    if (this.activeCommand) {
      throw new Error('Another command is already running');
    }

    // Check terminal availability
    if (this.isSSHActive) {
      if (!this.sshManager?.isConnected()) {
        throw new Error('SSH not connected');
      }
    } else {
      if (!this.ptyManager) {
        throw new Error('Local terminal not available');
      }
    }

    const commandId = request.id || uuidv4();
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
  private buildWrappedCommand(commandId: string, command: string): string {
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
    } else {
      // Bash/sh command wrapping (for SSH and Unix local)
      return `echo "${startMarker}" && ${command}; __exit_code=$?; echo "${exitMarker}\${__exit_code}>>>"; echo "${endMarker}"\n`;
    }
  }

  /**
   * Send command to the active terminal
   */
  private sendToTerminal(command: string): void {
    if (this.isSSHActive && this.sshManager?.isConnected()) {
      this.sshManager.write(command);
    } else if (this.ptyManager) {
      this.ptyManager.write(command);
    }
  }

  /**
   * Process incoming terminal data
   * Call this from the terminal data handler
   */
  processTerminalData(data: string): void {
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
  private completeCapture(): void {
    if (!this.activeCommand) return;

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
  private parseOutput(
    commandId: string, 
    command: string, 
    buffer: string,
    startTime: number
  ): CommandResult {
    const startMarker = `${START_MARKER}${commandId}>>>`;
    const endMarker = `${END_MARKER}${commandId}>>>`;
    const exitMarkerPrefix = `${EXIT_MARKER}${commandId}_`;

    let stdout = '';
    let stderr = '';
    let exitCode: number | null = null;

    // Find start marker
    const startIndex = buffer.indexOf(startMarker);
    if (startIndex === -1) {
      // Marker not found - return raw buffer
      stdout = buffer;
    } else {
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
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/^\n+/, '')      // Remove leading newlines
        .replace(/\n+$/, '');     // Remove trailing newlines

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
  private handleTimeout(commandId: string): void {
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
  cancelCommand(commandId: string): boolean {
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
  isCommandRunning(): boolean {
    return this.activeCommand !== null;
  }

  /**
   * Get the ID of the currently running command
   */
  getActiveCommandId(): string | null {
    return this.activeCommand?.id || null;
  }
}
