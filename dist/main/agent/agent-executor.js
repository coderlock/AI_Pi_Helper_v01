"use strict";
/**
 * Agent Executor
 * Orchestrates command execution and manages agent state
 * Handles approval flow for non-read-only commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExecutor = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const types_1 = require("../../shared/types");
const DEFAULT_TIMEOUT = 60000; // 60 seconds
class AgentExecutor extends events_1.EventEmitter {
    constructor(terminalBridge) {
        super();
        this.mainWindow = null;
        this.state = 'idle';
        // Pending approval tracking
        this.pendingApprovals = new Map();
        this.terminalBridge = terminalBridge;
    }
    /**
     * Set main window for IPC events
     */
    setMainWindow(window) {
        this.mainWindow = window;
        this.terminalBridge.setMainWindow(window);
    }
    /**
     * Get current agent state
     */
    getState() {
        return this.state;
    }
    /**
     * Set agent state and notify renderer
     */
    setState(state, message, command) {
        this.state = state;
        this.sendStatusUpdate({ state, message, command });
    }
    /**
     * Send status update to renderer
     */
    sendStatusUpdate(status) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(types_1.IPC_CHANNELS.AGENT_STATUS_UPDATE, status);
        }
        this.emit('statusUpdate', status);
    }
    /**
     * Execute a command (with approval flow for non-read-only commands)
     */
    async executeCommand(request) {
        // Build full request with defaults
        const fullRequest = {
            id: request.id || (0, uuid_1.v4)(),
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
        }
        else {
            return this.executeDirectly(fullRequest);
        }
    }
    /**
     * Execute a read-only command directly (no approval needed)
     */
    async executeDirectly(request) {
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
        }
        catch (error) {
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
    async executeWithApproval(request) {
        // Update state to waiting
        this.setState('waiting', 'Waiting for approval...', request.command);
        // Create approval request
        const approvalRequest = {
            id: request.id,
            command: request.command,
            description: request.description || 'Execute command',
            isReadOnly: request.isReadOnly
        };
        // Send approval request to renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(types_1.IPC_CHANNELS.AGENT_REQUEST_APPROVAL, approvalRequest);
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
    async handleApprovalResponse(response, timeoutMessage) {
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
            }
            catch (error) {
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
        }
        else {
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
    cancelCommand(commandId) {
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
    getTerminalContext() {
        return this.terminalBridge.getContext();
    }
    /**
     * Check if a command is currently running
     */
    isExecuting() {
        return this.terminalBridge.isCommandRunning() || this.pendingApprovals.size > 0;
    }
    /**
     * Process terminal data (delegate to bridge)
     */
    processTerminalData(data) {
        this.terminalBridge.processTerminalData(data);
    }
}
exports.AgentExecutor = AgentExecutor;
//# sourceMappingURL=agent-executor.js.map