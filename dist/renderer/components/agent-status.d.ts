/**
 * Agent Status Component
 * Shows what the agent is currently doing
 */
import { AgentState, AgentStatusUpdate } from '../../shared/types';
export interface AgentStatusOptions {
    container: HTMLElement;
}
export declare class AgentStatus {
    private container;
    private statusElement;
    private approvalDialog;
    private currentState;
    private listeners;
    constructor(options: AgentStatusOptions);
    /**
     * Render the status element
     */
    private render;
    /**
     * Attach event listeners
     */
    private attachListeners;
    /**
     * Update the status display
     */
    updateStatus(status: AgentStatusUpdate): void;
    /**
     * Show approval dialog for command execution
     */
    private showApprovalDialog;
    /**
     * Truncate long commands for display
     */
    private truncateCommand;
    /**
     * Escape HTML for safe display
     */
    private escapeHtml;
    /**
     * Get current state
     */
    getState(): AgentState;
    /**
     * Event emitter methods
     */
    on(event: string, callback: Function): void;
    private emit;
}
//# sourceMappingURL=agent-status.d.ts.map