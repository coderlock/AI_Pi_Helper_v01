/**
 * Agent Status Component
 * Shows what the agent is currently doing
 */

import { AgentState, AgentStatusUpdate, CommandApprovalRequest } from '../../shared/types';

export interface AgentStatusOptions {
  container: HTMLElement;
}

export class AgentStatus {
  private container: HTMLElement;
  private statusElement!: HTMLElement;
  private approvalDialog!: HTMLElement | null;
  private currentState: AgentState = 'idle';
  private listeners: Map<string, Function[]> = new Map();

  constructor(options: AgentStatusOptions) {
    this.container = options.container;
    this.render();
    this.attachListeners();
  }

  /**
   * Render the status element
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="agent-status hidden" id="agent-status">
        <div class="agent-status-indicator">
          <span class="agent-spinner"></span>
          <span class="agent-status-text">Thinking...</span>
        </div>
        <button class="agent-cancel-btn" id="agent-cancel-btn" title="Cancel">
          ✕
        </button>
      </div>
    `;
    
    this.statusElement = this.container.querySelector('#agent-status')!;
  }

  /**
   * Attach event listeners
   */
  private attachListeners(): void {
    // Listen for status updates from main process
    window.electronAPI.onAgentStatusUpdate((status) => {
      this.updateStatus(status);
    });

    // Listen for approval requests
    window.electronAPI.onAgentRequestApproval((request) => {
      this.showApprovalDialog(request);
    });

    // Cancel button
    const cancelBtn = this.container.querySelector('#agent-cancel-btn');
    cancelBtn?.addEventListener('click', () => {
      this.emit('cancel');
    });
  }

  /**
   * Update the status display
   */
  updateStatus(status: AgentStatusUpdate): void {
    this.currentState = status.state;

    const textElement = this.statusElement.querySelector('.agent-status-text')!;
    
    if (status.state === 'idle') {
      this.statusElement.classList.add('hidden');
      return;
    }

    this.statusElement.classList.remove('hidden');
    
    // Update text based on state
    switch (status.state) {
      case 'thinking':
        textElement.textContent = status.message || 'Thinking...';
        this.statusElement.classList.remove('executing', 'waiting');
        this.statusElement.classList.add('thinking');
        break;
      
      case 'executing':
        textElement.textContent = status.message || 'Running command...';
        if (status.command) {
          textElement.textContent += `: ${this.truncateCommand(status.command)}`;
        }
        this.statusElement.classList.remove('thinking', 'waiting');
        this.statusElement.classList.add('executing');
        break;
      
      case 'waiting':
        textElement.textContent = status.message || 'Waiting for approval...';
        this.statusElement.classList.remove('thinking', 'executing');
        this.statusElement.classList.add('waiting');
        break;
      
      case 'validating':
        textElement.textContent = status.message || 'Validating results...';
        this.statusElement.classList.remove('executing', 'waiting');
        this.statusElement.classList.add('thinking');
        break;
    }
  }

  /**
   * Show approval dialog for command execution
   */
  private showApprovalDialog(request: CommandApprovalRequest): void {
    // Remove existing dialog if any
    if (this.approvalDialog) {
      this.approvalDialog.remove();
    }

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'agent-approval-dialog';
    dialog.innerHTML = `
      <div class="approval-dialog-overlay"></div>
      <div class="approval-dialog-content">
        <div class="approval-dialog-header">
          <h3>⚠️ Command Approval Required</h3>
        </div>
        <div class="approval-dialog-body">
          <p class="approval-description"><strong>${this.escapeHtml(request.description)}</strong></p>
          <div class="approval-command">
            <code>${this.escapeHtml(request.command)}</code>
          </div>
          <p class="approval-warning">
            ⚠️ This command will modify your system. Review carefully before approving.
          </p>
        </div>
        <div class="approval-dialog-footer">
          <button class="btn btn-secondary" id="approval-deny">
            ✕ Deny
          </button>
          <button class="btn btn-primary" id="approval-approve">
            ✓ Approve
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    this.approvalDialog = dialog;

    // Handle approval
    const approveBtn = dialog.querySelector('#approval-approve');
    approveBtn?.addEventListener('click', () => {
      window.electronAPI.sendAgentApprovalResponse({
        id: request.id,
        approved: true
      });
      dialog.remove();
      this.approvalDialog = null;
    });

    // Handle denial
    const denyBtn = dialog.querySelector('#approval-deny');
    denyBtn?.addEventListener('click', () => {
      window.electronAPI.sendAgentApprovalResponse({
        id: request.id,
        approved: false
      });
      dialog.remove();
      this.approvalDialog = null;
    });

    // Handle overlay click (deny)
    const overlay = dialog.querySelector('.approval-dialog-overlay');
    overlay?.addEventListener('click', () => {
      window.electronAPI.sendAgentApprovalResponse({
        id: request.id,
        approved: false
      });
      dialog.remove();
      this.approvalDialog = null;
    });
  }

  /**
   * Truncate long commands for display
   */
  private truncateCommand(command: string): string {
    if (command.length <= 40) return command;
    return command.substring(0, 37) + '...';
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.currentState;
  }

  /**
   * Event emitter methods
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(...args));
  }
}
