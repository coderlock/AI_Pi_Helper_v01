/**
 * Chat Store
 * Manages chat history persistence using electron-store
 */
import { ChatMessage, ChatSession, ChatSettings, LLMProvider } from '../../shared/types';
export declare class ChatStore {
    private store;
    constructor();
    /**
     * Ensure a default session exists
     */
    private ensureDefaultSession;
    /**
     * Get the active session ID (or first session)
     */
    private getActiveSessionId;
    /**
     * Get all sessions
     */
    getSessions(): ChatSession[];
    /**
     * Get a specific session
     */
    getSession(sessionId: string): ChatSession | null;
    /**
     * Get messages for a session (or active session)
     */
    getMessages(sessionId?: string): ChatMessage[];
    /**
     * Create a new chat session
     */
    createSession(provider?: LLMProvider): ChatSession;
    /**
     * Add a message to a session
     */
    addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>, sessionId?: string): ChatMessage;
    /**
     * Generate a title from message content
     */
    private generateTitle;
    /**
     * Clear messages in a session
     */
    clearHistory(sessionId?: string): void;
    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean;
    /**
     * Get chat settings
     */
    getSettings(): ChatSettings;
    /**
     * Update chat settings
     */
    updateSettings(updates: Partial<ChatSettings>): ChatSettings;
    /**
     * Set active session
     */
    setActiveSession(sessionId: string): void;
    /**
     * Get active session
     */
    getActiveSession(): ChatSession | null;
}
//# sourceMappingURL=chat-store.d.ts.map