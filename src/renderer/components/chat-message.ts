/**
 * Chat Message Component
 * Renders a single chat message bubble
 */

import { ChatMessage, MessageRole } from '../../shared/types';

export interface ChatMessageOptions {
  message: ChatMessage;
  onCopy?: (content: string) => void;
}

export class ChatMessageComponent {
  private element: HTMLElement;
  private message: ChatMessage;

  constructor(options: ChatMessageOptions) {
    this.message = options.message;
    this.element = this.render(options.onCopy);
  }

  /**
   * Render the message element
   */
  private render(onCopy?: (content: string) => void): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message ${this.message.role}`;
    wrapper.dataset.messageId = this.message.id;

    if (this.message.isError) {
      wrapper.classList.add('error');
    }

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = this.getAvatarIcon();
    wrapper.appendChild(avatar);

    // Content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper';

    // Header with role and timestamp
    const header = document.createElement('div');
    header.className = 'message-header';

    const roleLabel = document.createElement('span');
    roleLabel.className = 'message-role';
    roleLabel.textContent = this.getRoleLabel();
    header.appendChild(roleLabel);

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = this.formatTimestamp();
    header.appendChild(timestamp);

    contentWrapper.appendChild(header);

    // Message content
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = this.message.content;
    contentWrapper.appendChild(content);

    // Metadata (tokens and cost) for assistant messages
    if (this.message.role === 'assistant' && this.message.metadata) {
      const metadata = this.renderMetadata();
      if (metadata) {
        contentWrapper.appendChild(metadata);
      }
    }

    // Actions (copy button)
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = '📋';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(this.message.content);
      copyBtn.innerHTML = '✓';
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
      }, 1500);
      onCopy?.(this.message.content);
    });
    actions.appendChild(copyBtn);

    contentWrapper.appendChild(actions);
    wrapper.appendChild(contentWrapper);

    return wrapper;
  }

  /**
   * Render metadata (tokens and cost)
   */
  private renderMetadata(): HTMLElement | null {
    if (!this.message.metadata) return null;

    const meta = this.message.metadata;
    if (!meta.totalTokens && !meta.cost) return null;

    const metadataEl = document.createElement('div');
    metadataEl.className = 'message-metadata';

    const parts: string[] = [];

    if (meta.model) {
      parts.push(`<span class="meta-item">🤖 ${meta.model}</span>`);
    }

    if (meta.totalTokens) {
      parts.push(`<span class="meta-item">📊 ${meta.totalTokens.toLocaleString()} tokens</span>`);
    }

    if (meta.inputTokens && meta.outputTokens) {
      parts.push(`<span class="meta-item meta-detail">(${meta.inputTokens.toLocaleString()} in / ${meta.outputTokens.toLocaleString()} out)</span>`);
    }

    if (meta.cost && meta.cost > 0) {
      const costStr = meta.cost < 0.01 ? '< $0.01' : `$${meta.cost.toFixed(4)}`;
      parts.push(`<span class="meta-item meta-cost">💰 ${costStr}</span>`);
    }

    metadataEl.innerHTML = parts.join(' ');
    return metadataEl;
  }

  /**
   * Get avatar icon based on role
   */
  private getAvatarIcon(): string {
    switch (this.message.role) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  }

  /**
   * Get display label for role
   */
  private getRoleLabel(): string {
    switch (this.message.role) {
      case 'user':
        return 'You';
      case 'assistant':
        return this.getProviderLabel();
      case 'system':
        return 'System';
      default:
        return 'Message';
    }
  }

  /**
   * Get provider label for assistant messages
   */
  private getProviderLabel(): string {
    if (!this.message.provider) return 'Assistant';
    
    switch (this.message.provider) {
      case 'anthropic':
        return 'Claude';
      case 'openai':
        return 'ChatGPT';
      case 'moonshot':
        return 'Moonshot';
      default:
        return 'Assistant';
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(): string {
    const date = new Date(this.message.timestamp);
    const now = new Date();
    
    // If today, just show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show date without year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Update message content (for streaming responses in Phase 4)
   */
  updateContent(content: string): void {
    const contentEl = this.element.querySelector('.message-content');
    if (contentEl) {
      contentEl.textContent = content;
    }
  }
}
