/**
 * Chat Container Component
 * Main chat interface managing messages and input
 * Optimized for incremental rendering and smart auto-scroll
 */

import { ChatMessage, ChatSettings, LLMProvider } from '../../shared/types';
import { ChatMessageComponent } from './chat-message';
import { ChatInput } from './chat-input';

export interface ChatContainerOptions {
  container: HTMLElement;
  onSendMessage?: (message: string) => void;
}

export class ChatContainer {
  private container: HTMLElement;
  private messagesContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private emptyState!: HTMLElement;
  private providerSelect!: HTMLSelectElement;
  private chatInput!: ChatInput;
  private messages: ChatMessage[] = [];
  private settings!: ChatSettings;
  private onSendMessage?: (message: string) => void;
  private isLoading: boolean = false;
  private renderedMessageCount: number = 0; // Track rendered messages for incremental rendering
  private currentRequestId: string | null = null;
  private currentStreamingMessage: string = '';

  constructor(options: ChatContainerOptions) {
    this.container = options.container;
    this.onSendMessage = options.onSendMessage;
  }

  /**
   * Initialize the chat container
   */
  async initialize(): Promise<void> {
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

    console.log('Chat container initialized');
  }

  /**
   * Render the chat container
   */
  private render(): void {
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

    this.messagesContainer = this.container.querySelector('#chat-messages')!;
    this.inputContainer = this.container.querySelector('#chat-input-area')!;
    this.emptyState = this.container.querySelector('#chat-empty-state')!;
    this.providerSelect = this.container.querySelector('#provider-select')!;

    // Initialize chat input
    this.chatInput = new ChatInput({
      container: this.inputContainer,
      onSend: (message) => this.handleSendMessage(message),
      placeholder: 'Ask the AI assistant... (Enter to send)'
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Provider select change
    this.providerSelect.addEventListener('change', async () => {
      const provider = this.providerSelect.value as LLMProvider;
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
  private showProviderChangeFeedback(provider: LLMProvider): void {
    const providerNames: Record<LLMProvider, string> = {
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
  async loadMessages(): Promise<void> {
    try {
      this.messages = await window.electronAPI.getChatMessages();
      this.renderMessages();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  /**
   * Render messages incrementally (optimization: only render new messages)
   */
  private renderMessages(): void {
    // Show/hide empty state
    if (this.messages.length === 0) {
      this.emptyState.classList.remove('hidden');
      this.renderedMessageCount = 0;
    } else {
      this.emptyState.classList.add('hidden');
      
      // Incremental rendering: only render new messages
      const messagesToRender = this.messages.slice(this.renderedMessageCount);
      
      messagesToRender.forEach(message => {
        const component = new ChatMessageComponent({ message });
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
  private smartScrollToBottom(): void {
    if (!this.settings.autoScroll) return;

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
  private scrollToBottom(): void {
    if (this.settings.autoScroll) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(content: string): Promise<void> {
    if (this.isLoading || !content.trim()) return;

    try {
      // Get current provider settings
      const provider = this.providerSelect.value as LLMProvider;
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

    } catch (error: any) {
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
  private setupStreamingListeners(): void {
    // Handle streaming chunks
    window.electronAPI.onLLMStreamChunk((data) => {
      if (data.requestId !== this.currentRequestId) return;

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
      if (data.requestId !== this.currentRequestId) return;

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
            const component = new ChatMessageComponent({ message: lastMessage });
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
      if (data.requestId !== this.currentRequestId) return;

      // Replace last message with error
      if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'assistant') {
        const lastMessage = this.messages.pop();
        // Remove from DOM
        const lastMessageEl = this.messagesContainer.querySelector(`.chat-message[data-message-id="${lastMessage!.id}"]`);
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
  private setLoading(loading: boolean): void {
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
    } else {
      // Remove loading indicator
      const loadingEl = document.getElementById('loading-indicator');
      loadingEl?.remove();
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorMessage: ChatMessage = {
      id: 'error-' + Date.now(),
      role: 'assistant',
      content: `⚠️ ${message}`,
      timestamp: Date.now(),
      isError: true
    };

    const component = new ChatMessageComponent({ message: errorMessage });
    this.messagesContainer.appendChild(component.getElement());
    this.scrollToBottom();
  }

  /**
   * Clear all messages
   */
  async clearMessages(): Promise<void> {
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
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.chatInput.focus();
  }

  /**
   * Add a message programmatically (for Phase 4 streaming)
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const newMessage = await window.electronAPI.addChatMessage(message);
    this.messages.push(newMessage);
    this.renderMessages();
    return newMessage;
  }

  /**
   * Get current provider
   */
  getSelectedProvider(): LLMProvider {
    return this.settings.selectedProvider;
  }

  /**
   * Refresh messages from store
   */
  async refresh(): Promise<void> {
    await this.loadMessages();
  }
}
