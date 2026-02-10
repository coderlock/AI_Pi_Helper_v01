/**
 * Chat Container Component
 * Main chat interface managing messages and input
 * Optimized for incremental rendering and smart auto-scroll
 */
import { ChatMessage, LLMProvider } from '../../shared/types';
export interface ChatContainerOptions {
    container: HTMLElement;
    onSendMessage?: (message: string) => void;
}
export declare class ChatContainer {
    private container;
    private messagesContainer;
    private inputContainer;
    private emptyState;
    private providerSelect;
    private chatInput;
    private messages;
    private settings;
    private onSendMessage?;
    private isLoading;
    private renderedMessageCount;
    private currentRequestId;
    private currentStreamingMessage;
    constructor(options: ChatContainerOptions);
    /**
     * Initialize the chat container
     */
    initialize(): Promise<void>;
    /**
     * Render the chat container
     */
    private render;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Show visual feedback when provider changes
     */
    private showProviderChangeFeedback;
    /**
     * Load messages from store
     */
    loadMessages(): Promise<void>;
    /**
     * Render messages incrementally (optimization: only render new messages)
     */
    private renderMessages;
    /**
     * Smart auto-scroll: only scroll if user is near bottom
     */
    private smartScrollToBottom;
    /**
     * Force scroll to bottom (for new user messages)
     */
    private scrollToBottom;
    /**
     * Handle sending a message
     */
    private handleSendMessage;
    /**
     * Set up streaming listeners
     */
    private setupStreamingListeners;
    /**
     * Set loading state
     */
    private setLoading;
    /**
     * Show error message
     */
    private showError;
    /**
     * Clear all messages
     */
    clearMessages(): Promise<void>;
    /**
     * Focus the input
     */
    focus(): void;
    /**
     * Add a message programmatically (for Phase 4 streaming)
     */
    addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage>;
    /**
     * Get current provider
     */
    getSelectedProvider(): LLMProvider;
    /**
     * Refresh messages from store
     */
    refresh(): Promise<void>;
}
//# sourceMappingURL=chat-container.d.ts.map