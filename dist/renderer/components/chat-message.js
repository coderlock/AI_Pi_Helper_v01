"use strict";
/**
 * Chat Message Component
 * Renders a single chat message bubble
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageComponent = void 0;
class ChatMessageComponent {
    constructor(options) {
        this.message = options.message;
        this.element = this.render(options.onCopy);
    }
    /**
     * Render the message element
     */
    render(onCopy) {
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
     * Get avatar icon based on role
     */
    getAvatarIcon() {
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
    getRoleLabel() {
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
    getProviderLabel() {
        if (!this.message.provider)
            return 'Assistant';
        switch (this.message.provider) {
            case 'claude':
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
    formatTimestamp() {
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
    getElement() {
        return this.element;
    }
    /**
     * Update message content (for streaming responses in Phase 4)
     */
    updateContent(content) {
        const contentEl = this.element.querySelector('.message-content');
        if (contentEl) {
            contentEl.textContent = content;
        }
    }
}
exports.ChatMessageComponent = ChatMessageComponent;
//# sourceMappingURL=chat-message.js.map