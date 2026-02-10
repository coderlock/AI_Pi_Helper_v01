/**
 * Agent Executor
 * Orchestrates command execution and manages agent state
 * Handles approval flow for non-read-only commands
 */
import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { CommandRequest, CommandResult, AgentState, TerminalContext, CommandApprovalResponse } from './types';
import { TerminalBridge } from './terminal-bridge';
export declare class AgentExecutor extends EventEmitter {
    private terminalBridge;
    private mainWindow;
    private state;
    private pendingApprovals;
    constructor(terminalBridge: TerminalBridge);
    /**
     * Set main window for IPC events
     */
    setMainWindow(window: BrowserWindow | null): void;
    /**
     * Get current agent state
     */
    getState(): AgentState;
    /**
     * Set agent state and notify renderer
     */
    setState(state: AgentState, message?: string, command?: string): void;
    /**
     * Send status update to renderer
     */
    private sendStatusUpdate;
    /**
     * Execute a command (with approval flow for non-read-only commands)
     */
    executeCommand(request: Partial<CommandRequest>): Promise<CommandResult>;
    /**
     * Execute a read-only command directly (no approval needed)
     */
    private executeDirectly;
    /**
     * Execute a write command with user approval
     */
    private executeWithApproval;
    /**
     * Handle approval response from user
     */
    handleApprovalResponse(response: CommandApprovalResponse, timeoutMessage?: string): Promise<void>;
    /**
     * Cancel the currently running command
     */
    cancelCommand(commandId: string): boolean;
    /**
     * Get terminal context for LLM
     */
    getTerminalContext(): TerminalContext;
    /**
     * Check if a command is currently running
     */
    isExecuting(): boolean;
    /**
     * Process terminal data (delegate to bridge)
     */
    processTerminalData(data: string): void;
}
//# sourceMappingURL=agent-executor.d.ts.map