/**
 * Agent Executor
 * Orchestrates command execution and manages agent state
 * Handles approval flow for non-read-only commands
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { 
  CommandRequest, 
  CommandResult, 
  AgentState, 
  AgentStatusUpdate,
  TerminalContext,
  CommandApprovalRequest,
  CommandApprovalResponse
} from './types';
import { TerminalBridge } from './terminal-bridge';
import { IPC_CHANNELS } from '../../shared/types';

const DEFAULT_TIMEOUT = 60000; // 60 seconds

export class AgentExecutor extends EventEmitter {
  private terminalBridge: TerminalBridge;
  private mainWindow: BrowserWindow | null = null;
  private state: AgentState = 'idle';
  
  // Pending approval tracking
  private pendingApprovals: Map<string, {
    request: CommandRequest;
    resolve: (result: CommandResult) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(terminalBridge: TerminalBridge) {
    super();
    this.terminalBridge = terminalBridge;
  }

  /**
   * Set main window for IPC events
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
    this.terminalBridge.setMainWindow(window);
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Set agent state and notify renderer
   */
  setState(state: AgentState, message?: string, command?: string): void {
    this.state = state;
    this.sendStatusUpdate({ state, message, command });
  }

  /**
   * Send status update to renderer
   */
  private sendStatusUpdate(status: AgentStatusUpdate): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.AGENT_STATUS_UPDATE, status);
    }
    this.emit('statusUpdate', status);
  }

  /**
   * Execute a command (with approval flow for non-read-only commands)
   */
  async executeCommand(request: Partial<CommandRequest>): Promise<CommandResult> {
    // Build full request with defaults
    const fullRequest: CommandRequest = {
      id: request.id || uuidv4(),
      command: request.command || '',
      timeout: request.timeout || DEFAULT_TIMEOUT,
      isReadOnly: request.isReadOnly ?? false,
      description: request.description
    };

    if (!fullRequest.command) {
      throw new Error('Command is required');
    }

    // Check if approval is needed
    if (!fullRequest.isReadOnly) {
      return this.executeWithApproval(fullRequest);
    } else {
      return this.executeDirectly(fullRequest);
    }
  }

  /**
   * Execute a read-only command directly (no approval needed)
   */
  private async executeDirectly(request: CommandRequest): Promise<CommandResult> {
    // Update state
    this.setState('executing', request.description || 'Running command...', request.command);

    try {
      const result = await this.terminalBridge.executeCommand(request);

      // Log result
      console.log(`Command completed: ${request.command}`);
      console.log(`Exit code: ${result.exitCode}, Duration: ${result.durationMs}ms`);

      // Update state
      this.setState('idle');

      return result;
    } catch (error: any) {
      console.error(`Command failed: ${request.command}`, error);
      
      // Update state
      this.setState('idle');

      return {
        id: request.id,
        command: request.command,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        durationMs: 0,
        error: error.message
      };
    }
  }

  /**
   * Execute a write command with user approval
   */
  private async executeWithApproval(request: CommandRequest): Promise<CommandResult> {
    // Update state to waiting
    this.setState('waiting', 'Waiting for approval...', request.command);

    // Create approval request
    const approvalRequest: CommandApprovalRequest = {
      id: request.id,
      command: request.command,
      description: request.description || 'Execute command',
      isReadOnly: request.isReadOnly
    };

    // Send approval request to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.AGENT_REQUEST_APPROVAL, approvalRequest);
    }

    // Wait for approval response
    return new Promise((resolve, reject) => {
      // Store pending approval
      this.pendingApprovals.set(request.id, {
        request,
        resolve,
        reject
      });

      // Timeout for approval (2 minutes)
      setTimeout(() => {
        if (this.pendingApprovals.has(request.id)) {
          this.handleApprovalResponse({
            id: request.id,
            approved: false
          }, 'Approval timeout');
        }
      }, 120000);
    });
  }

  /**
   * Handle approval response from user
   */
  async handleApprovalResponse(response: CommandApprovalResponse, timeoutMessage?: string): Promise<void> {
    const pending = this.pendingApprovals.get(response.id);
    
    if (!pending) {
      console.warn(`No pending approval found for command ${response.id}`);
      return;
    }

    // Remove from pending
    this.pendingApprovals.delete(response.id);

    if (response.approved) {
      // User approved - execute the command
      this.setState('executing', pending.request.description || 'Running command...', pending.request.command);

      try {
        const result = await this.terminalBridge.executeCommand(pending.request);
        
        console.log(`Approved command completed: ${pending.request.command}`);
        console.log(`Exit code: ${result.exitCode}, Duration: ${result.durationMs}ms`);

        this.setState('idle');
        pending.resolve(result);
      } catch (error: any) {
        console.error(`Approved command failed: ${pending.request.command}`, error);
        
        this.setState('idle');
        pending.resolve({
          id: pending.request.id,
          command: pending.request.command,
          stdout: '',
          stderr: '',
          exitCode: null,
          timedOut: false,
          durationMs: 0,
          error: error.message
        });
      }
    } else {
      // User denied or timeout
      this.setState('idle');
      pending.resolve({
        id: pending.request.id,
        command: pending.request.command,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        durationMs: 0,
        error: timeoutMessage || 'Command execution denied by user'
      });
    }
  }

  /**
   * Cancel the currently running command
   */
  cancelCommand(commandId: string): boolean {
    // Check if it's a pending approval
    if (this.pendingApprovals.has(commandId)) {
      this.handleApprovalResponse({
        id: commandId,
        approved: false
      }, 'Cancelled by user');
      return true;
    }

    // Try to cancel active command
    const cancelled = this.terminalBridge.cancelCommand(commandId);
    if (cancelled) {
      this.setState('idle', 'Command cancelled');
    }
    return cancelled;
  }

  /**
   * Get terminal context for LLM
   */
  getTerminalContext(): TerminalContext {
    return this.terminalBridge.getContext();
  }

  /**
   * Check if a command is currently running
   */
  isExecuting(): boolean {
    return this.terminalBridge.isCommandRunning() || this.pendingApprovals.size > 0;
  }

  /**
   * Process terminal data (delegate to bridge)
   */
  processTerminalData(data: string): void {
    this.terminalBridge.processTerminalData(data);
  }
}
