"use strict";
/**
 * Chat Store
 * Manages chat history persistence using electron-store
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStore = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const uuid_1 = require("uuid");
const DEFAULT_SETTINGS = {
    selectedProvider: 'claude',
    maxHistoryMessages: 100,
    autoScroll: true
};
class ChatStore {
    constructor() {
        this.store = new electron_store_1.default({
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
    ensureDefaultSession() {
        const sessions = this.store.get('sessions', []);
        if (sessions.length === 0) {
            this.createSession();
        }
    }
    /**
     * Get the active session ID (or first session)
     */
    getActiveSessionId() {
        let activeId = this.store.get('activeSessionId');
        if (!activeId) {
            const sessions = this.store.get('sessions', []);
            if (sessions.length > 0) {
                activeId = sessions[0].id;
                this.store.set('activeSessionId', activeId);
            }
            else {
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
    getSessions() {
        return this.store.get('sessions', []);
    }
    /**
     * Get a specific session
     */
    getSession(sessionId) {
        const sessions = this.store.get('sessions', []);
        return sessions.find(s => s.id === sessionId) || null;
    }
    /**
     * Get messages for a session (or active session)
     */
    getMessages(sessionId) {
        const id = sessionId || this.getActiveSessionId();
        const session = this.getSession(id);
        return session?.messages || [];
    }
    /**
     * Create a new chat session
     */
    createSession(provider) {
        const settings = this.getSettings();
        const session = {
            id: (0, uuid_1.v4)(),
            title: `Chat ${new Date().toLocaleDateString()}`,
            messages: [],
            provider: provider || settings.selectedProvider,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        const sessions = this.store.get('sessions', []);
        sessions.unshift(session); // Add to beginning
        this.store.set('sessions', sessions);
        this.store.set('activeSessionId', session.id);
        console.log(`Chat session created: ${session.id}`);
        return session;
    }
    /**
     * Add a message to a session
     */
    addMessage(message, sessionId) {
        const id = sessionId || this.getActiveSessionId();
        const sessions = this.store.get('sessions', []);
        const sessionIndex = sessions.findIndex(s => s.id === id);
        if (sessionIndex === -1) {
            throw new Error('Session not found');
        }
        const newMessage = {
            ...message,
            id: (0, uuid_1.v4)(),
            timestamp: Date.now()
        };
        sessions[sessionIndex].messages.push(newMessage);
        sessions[sessionIndex].updatedAt = Date.now();
        // Update title based on first user message
        if (message.role === 'user' &&
            sessions[sessionIndex].messages.filter(m => m.role === 'user').length === 1) {
            sessions[sessionIndex].title = this.generateTitle(message.content);
        }
        // Enforce max messages limit
        const settings = this.getSettings();
        if (sessions[sessionIndex].messages.length > settings.maxHistoryMessages) {
            sessions[sessionIndex].messages = sessions[sessionIndex].messages.slice(-settings.maxHistoryMessages);
        }
        this.store.set('sessions', sessions);
        return newMessage;
    }
    /**
     * Generate a title from message content
     */
    generateTitle(content) {
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
    clearHistory(sessionId) {
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
    deleteSession(sessionId) {
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
    getSettings() {
        return this.store.get('settings', DEFAULT_SETTINGS);
    }
    /**
     * Update chat settings
     */
    updateSettings(updates) {
        const current = this.getSettings();
        const updated = { ...current, ...updates };
        this.store.set('settings', updated);
        return updated;
    }
    /**
     * Set active session
     */
    setActiveSession(sessionId) {
        this.store.set('activeSessionId', sessionId);
    }
    /**
     * Get active session
     */
    getActiveSession() {
        const activeId = this.getActiveSessionId();
        return this.getSession(activeId);
    }
}
exports.ChatStore = ChatStore;
//# sourceMappingURL=chat-store.js.map