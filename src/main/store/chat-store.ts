/**
 * Chat Store
 * Manages chat history persistence using electron-store
 */

import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatMessage,
  ChatSession,
  ChatSettings,
  LLMProvider,
  MessageRole,
  SessionUsageStats
} from '../../shared/types';

interface ChatStoreData {
  sessions: ChatSession[];
  activeSessionId: string | null;
  settings: ChatSettings;
}

const DEFAULT_SETTINGS: ChatSettings = {
  selectedProvider: 'anthropic',
  maxHistoryMessages: 100,
  autoScroll: true
};

export class ChatStore {
  private store: Store<ChatStoreData>;

  constructor() {
    this.store = new Store<ChatStoreData>({
      name: 'chat-history',
      defaults: {
        sessions: [],
        activeSessionId: null,
        settings: DEFAULT_SETTINGS
      }
    });

    // Ensure at least one session exists
    this.ensureDefaultSession();
  }

  /**
   * Ensure a default session exists
   */
  private ensureDefaultSession(): void {
    const sessions = this.store.get('sessions', []);
    if (sessions.length === 0) {
      this.createSession();
    }
  }

  /**
   * Get the active session ID (or first session)
   */
  private getActiveSessionId(): string {
    let activeId = this.store.get('activeSessionId');
    
    if (!activeId) {
      const sessions = this.store.get('sessions', []);
      if (sessions.length > 0) {
        activeId = sessions[0].id;
        this.store.set('activeSessionId', activeId);
      } else {
        // Create a new session
        const newSession = this.createSession();
        activeId = newSession.id;
      }
    }
    
    return activeId;
  }

  /**
   * Get all sessions
   */
  getSessions(): ChatSession[] {
    return this.store.get('sessions', []);
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): ChatSession | null {
    const sessions = this.store.get('sessions', []);
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Get messages for a session (or active session)
   */
  getMessages(sessionId?: string): ChatMessage[] {
    const id = sessionId || this.getActiveSessionId();
    const session = this.getSession(id);
    return session?.messages || [];
  }

  /**
   * Create a new chat session
   */
  createSession(provider?: LLMProvider): ChatSession {
    const settings = this.getSettings();
    
    const session: ChatSession = {
      id: uuidv4(),
      title: `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      provider: provider || settings.selectedProvider,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const sessions = this.store.get('sessions', []);
    sessions.unshift(session);  // Add to beginning
    this.store.set('sessions', sessions);
    this.store.set('activeSessionId', session.id);

    console.log(`Chat session created: ${session.id}`);
    return session;
  }

  /**
   * Add a message to a session
   */
  addMessage(
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
    sessionId?: string
  ): ChatMessage {
    const id = sessionId || this.getActiveSessionId();
    const sessions = this.store.get('sessions', []);
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }

    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    sessions[sessionIndex].messages.push(newMessage);
    sessions[sessionIndex].updatedAt = Date.now();

    // Update session usage stats if this message has token info
    if (message.metadata?.inputTokens || message.metadata?.outputTokens) {
      this.updateSessionUsage(sessions[sessionIndex], message.metadata);
    }

    // Update title based on first user message
    if (
      message.role === 'user' &&
      sessions[sessionIndex].messages.filter(m => m.role === 'user').length === 1
    ) {
      sessions[sessionIndex].title = this.generateTitle(message.content);
    }

    // Enforce max messages limit
    const settings = this.getSettings();
    if (sessions[sessionIndex].messages.length > settings.maxHistoryMessages) {
      sessions[sessionIndex].messages = sessions[sessionIndex].messages.slice(
        -settings.maxHistoryMessages
      );
    }

    this.store.set('sessions', sessions);
    
    return newMessage;
  }

  /**
   * Generate a title from message content
   */
  private generateTitle(content: string): string {
    // Take first 40 chars, trim to last word
    let title = content.substring(0, 40);
    if (content.length > 40) {
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) {
        title = title.substring(0, lastSpace);
      }
      title += '...';
    }
    return title;
  }

  /**
   * Clear messages in a session
   */
  clearHistory(sessionId?: string): void {
    const id = sessionId || this.getActiveSessionId();
    const sessions = this.store.get('sessions', []);
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex !== -1) {
      sessions[sessionIndex].messages = [];
      sessions[sessionIndex].updatedAt = Date.now();
      this.store.set('sessions', sessions);
      console.log(`Chat history cleared for session: ${id}`);
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const sessions = this.store.get('sessions', []);
    const index = sessions.findIndex(s => s.id === sessionId);

    if (index === -1) {
      return false;
    }

    sessions.splice(index, 1);
    this.store.set('sessions', sessions);

    // If we deleted the active session, switch to another
    const activeId = this.store.get('activeSessionId');
    if (activeId === sessionId) {
      this.store.set('activeSessionId', sessions[0]?.id || null);
      this.ensureDefaultSession();
    }

    console.log(`Chat session deleted: ${sessionId}`);
    return true;
  }

  /**
   * Get chat settings
   */
  getSettings(): ChatSettings {
    return this.store.get('settings', DEFAULT_SETTINGS);
  }

  /**
   * Update chat settings
   */
  updateSettings(updates: Partial<ChatSettings>): ChatSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    this.store.set('settings', updated);
    return updated;
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): void {
    this.store.set('activeSessionId', sessionId);
  }

  /**
   * Get active session
   */
  getActiveSession(): ChatSession | null {
    const activeId = this.getActiveSessionId();
    return this.getSession(activeId);
  }

  /**
   * Update session usage statistics
   */
  private updateSessionUsage(session: ChatSession, metadata: any): void {
    if (!session.usageStats) {
      session.usageStats = {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        messageCount: 0
      };
    }

    if (metadata.inputTokens) {
      session.usageStats.totalInputTokens += metadata.inputTokens;
    }
    if (metadata.outputTokens) {
      session.usageStats.totalOutputTokens += metadata.outputTokens;
    }
    if (metadata.cost) {
      session.usageStats.totalCost += metadata.cost;
    }
    session.usageStats.messageCount++;
  }

  /**
   * Get session usage stats
   */
  getSessionUsage(sessionId?: string): SessionUsageStats | null {
    const id = sessionId || this.getActiveSessionId();
    const session = this.getSession(id);
    return session?.usageStats || null;
  }
}
