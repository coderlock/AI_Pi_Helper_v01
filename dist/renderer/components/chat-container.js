"use strict";
/**
 * Chat Container Component
 * Main chat interface managing messages and input
 * Optimized for incremental rendering and smart auto-scroll
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatContainer = void 0;
const chat_message_1 = require("./chat-message");
const chat_input_1 = require("./chat-input");
class ChatContainer {
    constructor(options) {
        this.messages = [];
        this.isLoading = false;
        this.renderedMessageCount = 0; // Track rendered messages for incremental rendering
        this.currentRequestId = null;
        this.currentStreamingMessage = '';
        this.lastPromptId = '';
        this.lastPromptName = '';
        this.container = options.container;
        this.onSendMessage = options.onSendMessage;
    }
    /**
     * Initialize the chat container
     */
    async initialize() {
        // Load settings
        this.settings = await window.electronAPI.getChatSettings();
        // Render UI
        this.render();
        // Load messages
        await this.loadMessages();
        // Attach listeners
        this.attachEventListeners();
        // Set up streaming listeners
        this.setupStreamingListeners();
        // Load current prompt info
        const activePrompt = await window.electronAPI.getActivePrompt();
        this.lastPromptId = activePrompt.id;
        this.lastPromptName = activePrompt.name;
        console.log('Chat container initialized');
    }
    /**
     * Render the chat container
     */
    render() {
        this.container.innerHTML = `
      <div class="chat-messages-container" id="chat-messages">
        <div class="chat-empty-state" id="chat-empty-state">
          <div class="empty-icon">💬</div>
          <h3>Start a Conversation</h3>
          <p>Ask the AI assistant to help you manage your Raspberry Pi.</p>
          <div class="empty-suggestions">
            <button class="suggestion-btn" data-suggestion="How do I check disk space on my Pi?">
              How do I check disk space?
            </button>
            <button class="suggestion-btn" data-suggestion="Help me set up a cron job">
              Help me set up a cron job
            </button>
            <button class="suggestion-btn" data-suggestion="What's using the most memory?">
              What's using the most memory?
            </button>
          </div>
        </div>
      </div>
      <div class="chat-input-container" id="chat-input-container">
        <div class="chat-input-header">
          <select id="provider-select" class="provider-select" title="Select AI Provider">
            <option value="anthropic" ${this.settings.selectedProvider === 'anthropic' ? 'selected' : ''}>
              Claude
            </option>
            <option value="openai" ${this.settings.selectedProvider === 'openai' ? 'selected' : ''}>
              GPT-4
            </option>
            <option value="moonshot" ${this.settings.selectedProvider === 'moonshot' ? 'selected' : ''}>
              Moonshot
            </option>
          </select>
          <button id="clear-chat-btn" class="clear-chat-btn" title="Clear chat history">
            🗑️ Clear
          </button>
        </div>
        <div id="chat-input-area"></div>
      </div>
    `;
        this.messagesContainer = this.container.querySelector('#chat-messages');
        this.inputContainer = this.container.querySelector('#chat-input-area');
        this.emptyState = this.container.querySelector('#chat-empty-state');
        this.providerSelect = this.container.querySelector('#provider-select');
        // Initialize chat input
        this.chatInput = new chat_input_1.ChatInput({
            container: this.inputContainer,
            onSend: (message) => this.handleSendMessage(message),
            placeholder: 'Ask the AI assistant... (Enter to send)'
        });
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Provider select change
        this.providerSelect.addEventListener('change', async () => {
            const provider = this.providerSelect.value;
            await window.electronAPI.updateChatSettings({ selectedProvider: provider });
            this.settings.selectedProvider = provider;
            // Visual feedback
            this.showProviderChangeFeedback(provider);
        });
        // Clear chat button
        const clearBtn = this.container.querySelector('#clear-chat-btn');
        clearBtn?.addEventListener('click', async () => {
            if (confirm('Clear all messages in this chat?')) {
                await this.clearMessages();
            }
        });
        // Suggestion buttons
        const suggestionBtns = this.container.querySelectorAll('.suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestion = btn.getAttribute('data-suggestion');
                if (suggestion) {
                    this.chatInput.setValue(suggestion);
                    this.chatInput.focus();
                }
            });
        });
    }
    /**
     * Show visual feedback when provider changes
     */
    showProviderChangeFeedback(provider) {
        const providerNames = {
            'anthropic': 'Claude',
            'openai': 'GPT-4',
            'moonshot': 'Moonshot'
        };
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = 'provider-change-notification';
        notification.textContent = `Switched to ${providerNames[provider]}`;
        this.container.appendChild(notification);
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        // Remove after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
    /**
     * Load messages from store
     */
    async loadMessages() {
        try {
            this.messages = await window.electronAPI.getChatMessages();
            this.renderMessages();
        }
        catch (error) {
            console.error('Failed to load messages:', error);
        }
    }
    /**
     * Render messages incrementally (optimization: only render new messages)
     */
    renderMessages() {
        // Show/hide empty state
        if (this.messages.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.renderedMessageCount = 0;
        }
        else {
            this.emptyState.classList.add('hidden');
            // Incremental rendering: only render new messages
            const messagesToRender = this.messages.slice(this.renderedMessageCount);
            messagesToRender.forEach(message => {
                const component = new chat_message_1.ChatMessageComponent({ message });
                this.messagesContainer.appendChild(component.getElement());
            });
            // Update rendered count
            this.renderedMessageCount = this.messages.length;
            // Smart auto-scroll
            this.smartScrollToBottom();
        }
    }
    /**
     * Smart auto-scroll: only scroll if user is near bottom
     */
    smartScrollToBottom() {
        if (!this.settings.autoScroll)
            return;
        const container = this.messagesContainer;
        const threshold = 100; // pixels from bottom
        // Check if user is near bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        if (isNearBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }
    /**
     * Force scroll to bottom (for new user messages)
     */
    scrollToBottom() {
        if (this.settings.autoScroll) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    /**
     * Handle sending a message
     */
    async handleSendMessage(content) {
        if (this.isLoading || !content.trim())
            return;
        try {
            // Get current provider settings
            const provider = this.providerSelect.value;
            const appSettings = await window.electronAPI.getSettings();
            const selectedModel = appSettings.llm.selectedModels[provider];
            // Add user message
            const userMessage = await window.electronAPI.addChatMessage({
                role: 'user',
                content: content.trim()
            });
            this.messages.push(userMessage);
            this.renderMessages();
            this.scrollToBottom(); // Always scroll for user messages
            // Show loading state
            this.setLoading(true);
            // Prepare conversation history
            const conversationMessages = this.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            // Send to LLM
            this.currentStreamingMessage = '';
            this.currentRequestId = await window.electronAPI.sendLLMMessage({
                provider,
                model: selectedModel,
                messages: conversationMessages,
                maxTokens: appSettings.llm.maxTokens,
                temperature: appSettings.llm.temperature,
                stream: true
            });
            // Create placeholder for streaming response
            const assistantMessage = await window.electronAPI.addChatMessage({
                role: 'assistant',
                content: '', // Will be updated as we stream
                provider
            });
            this.messages.push(assistantMessage);
            this.renderMessages();
        }
        catch (error) {
            console.error('Failed to send message:', error);
            // Add error message
            const errorMessage = await window.electronAPI.addChatMessage({
                role: 'assistant',
                content: `Error: ${error.message}`,
                isError: true
            });
            this.messages.push(errorMessage);
            this.renderMessages();
            this.setLoading(false);
        }
    }
    /**
     * Set up streaming listeners
     */
    setupStreamingListeners() {
        // Handle streaming chunks
        window.electronAPI.onLLMStreamChunk((data) => {
            if (data.requestId !== this.currentRequestId)
                return;
            this.currentStreamingMessage += data.chunk.content;
            // Update the last message in the array
            if (this.messages.length > 0) {
                const lastMessage = this.messages[this.messages.length - 1];
                if (lastMessage.role === 'assistant') {
                    lastMessage.content = this.currentStreamingMessage;
                    // Update the DOM directly for streaming messages
                    const lastMessageEl = this.messagesContainer.querySelector(`.chat-message[data-message-id="${lastMessage.id}"] .message-content`);
                    if (lastMessageEl) {
                        lastMessageEl.textContent = this.currentStreamingMessage;
                    }
                    this.scrollToBottom();
                }
            }
        });
        // Handle stream end
        window.electronAPI.onLLMStreamEnd(async (data) => {
            if (data.requestId !== this.currentRequestId)
                return;
            // Update the last message with final token usage
            if (this.messages.length > 0) {
                const lastMessage = this.messages[this.messages.length - 1];
                if (lastMessage.role === 'assistant') {
                    lastMessage.metadata = {
                        ...lastMessage.metadata,
                        inputTokens: data.usage.inputTokens,
                        outputTokens: data.usage.outputTokens,
                        totalTokens: data.usage.totalTokens,
                        cost: data.usage.estimatedCost
                    };
                    // Update in store
                    await window.electronAPI.addChatMessage({
                        role: lastMessage.role,
                        content: lastMessage.content,
                        provider: lastMessage.provider,
                        metadata: lastMessage.metadata
                    });
                    // Re-render the last message to show metadata
                    const lastMessageEl = this.messagesContainer.querySelector(`.chat-message[data-message-id="${lastMessage.id}"]`);
                    if (lastMessageEl) {
                        const component = new chat_message_1.ChatMessageComponent({ message: lastMessage });
                        lastMessageEl.replaceWith(component.getElement());
                    }
                }
            }
            this.currentRequestId = null;
            this.currentStreamingMessage = '';
            this.setLoading(false);
        });
        // Handle stream errors
        window.electronAPI.onLLMStreamError(async (data) => {
            if (data.requestId !== this.currentRequestId)
                return;
            // Replace last message with error
            if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'assistant') {
                const lastMessage = this.messages.pop();
                // Remove from DOM
                const lastMessageEl = this.messagesContainer.querySelector(`.chat-message[data-message-id="${lastMessage.id}"]`);
                lastMessageEl?.remove();
                // Decrement rendered count since we removed a message
                this.renderedMessageCount--;
            }
            const errorMessage = await window.electronAPI.addChatMessage({
                role: 'assistant',
                content: `Error: ${data.error}`,
                isError: true
            });
            this.messages.push(errorMessage);
            this.renderMessages();
            this.currentRequestId = null;
            this.currentStreamingMessage = '';
            this.setLoading(false);
        });
    }
    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.chatInput.disabled = loading;
        if (loading) {
            // Add loading indicator
            const loadingEl = document.createElement('div');
            loadingEl.className = 'chat-message assistant loading';
            loadingEl.id = 'loading-indicator';
            loadingEl.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content-wrapper">
          <div class="message-content">
            <span class="typing-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
          </div>
        </div>
      `;
            this.messagesContainer.appendChild(loadingEl);
            this.scrollToBottom();
        }
        else {
            // Remove loading indicator
            const loadingEl = document.getElementById('loading-indicator');
            loadingEl?.remove();
        }
    }
    /**
     * Show error message
     */
    showError(message) {
        const errorMessage = {
            id: 'error-' + Date.now(),
            role: 'assistant',
            content: `⚠️ ${message}`,
            timestamp: Date.now(),
            isError: true
        };
        const component = new chat_message_1.ChatMessageComponent({ message: errorMessage });
        this.messagesContainer.appendChild(component.getElement());
        this.scrollToBottom();
    }
    /**
     * Clear all messages
     */
    async clearMessages() {
        try {
            await window.electronAPI.clearChatHistory();
            this.messages = [];
            this.renderedMessageCount = 0;
            // Clear DOM
            const existingMessages = this.messagesContainer.querySelectorAll('.chat-message');
            existingMessages.forEach(el => el.remove());
            // Remove loading indicator if present
            const loadingEl = document.getElementById('loading-indicator');
            loadingEl?.remove();
            // Reset loading state completely
            this.isLoading = false;
            // Show empty state
            this.emptyState.classList.remove('hidden');
            // Ensure input is enabled and ready for use
            this.chatInput.disabled = false;
            this.chatInput.focus();
        }
        catch (error) {
            console.error('Failed to clear messages:', error);
        }
    }
    /**
     * Focus the input
     */
    focus() {
        this.chatInput.focus();
    }
    /**
     * Add a message programmatically (for Phase 4 streaming)
     */
    async addMessage(message) {
        const newMessage = await window.electronAPI.addChatMessage(message);
        this.messages.push(newMessage);
        this.renderMessages();
        return newMessage;
    }
    /**
     * Get current provider
     */
    getSelectedProvider() {
        return this.settings.selectedProvider;
    }
    /**
     * Refresh messages from store
     */
    async refresh() {
        await this.loadMessages();
    }
    /**
     * Handle prompt change
     */
    handlePromptChange(promptId, promptName) {
        // Skip if same prompt
        if (promptId === this.lastPromptId)
            return;
        // Add visual indicator in chat
        if (this.messages.length > 0 && this.lastPromptId) {
            this.addPromptChangeIndicator(this.lastPromptName, promptName);
        }
        this.lastPromptId = promptId;
        this.lastPromptName = promptName;
    }
    /**
     * Add prompt change indicator to chat
     */
    addPromptChangeIndicator(fromName, toName) {
        const indicator = document.createElement('div');
        indicator.className = 'prompt-change-indicator';
        indicator.innerHTML = `
      <span class="prompt-change-line"></span>
      <span class="prompt-change-text">Switched to "${this.escapeHtml(toName)}"</span>
      <span class="prompt-change-line"></span>
    `;
        this.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }
    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
exports.ChatContainer = ChatContainer;
//# sourceMappingURL=chat-container.js.map