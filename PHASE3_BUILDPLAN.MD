Next Phase

Once Phase 2C fixes are verified, proceed to Phase 3: Basic Chat UI Panel.

text


---

# Phase 3 Build Plan: Basic Chat UI Panel

Save this as `PHASE3_BUILDPLAN.md` in your project root.

---

```markdown
# Pi Assistant - Phase 3 Build Plan
## Basic Chat UI Panel

### Prerequisites

- Phase 1 completed (Electron app with xterm.js terminal)
- Phase 2A completed (SSH connection working)
- Phase 2B completed (Server profiles & credential storage)
- Phase 2C completed (Bug fixes applied)

### Overview

Replace the placeholder chat panel with a functional chat UI. This phase focuses on the UI/UX foundation—actual LLM integration comes in Phase 4.

---

### What We're Building

| Feature | Description |
|---------|-------------|
| Chat Messages | User and assistant message bubbles |
| Chat Input | Textarea with send button |
| Message History | Persisted to electron-store |
| Auto-scroll | Scroll to newest message |
| Timestamps | Show when messages were sent |
| Empty State | Helpful prompt when no messages |
| Provider Selector | UI prep for Claude/GPT-4/Moonshot |

---

### New Dependencies

```bash
npm install uuid
# uuid should already be installed from Phase 2B

No new dependencies required for Phase 3 base.
Updated Project Structure

text

src/
├── main/
│   ├── main.ts                    # UPDATE: Add chat IPC handlers
│   ├── preload.ts                 # UPDATE: Expose chat API
│   └── store/
│       ├── server-store.ts        # KEEP
│       ├── credential-store.ts    # KEEP
│       └── chat-store.ts          # NEW: Chat history persistence
├── renderer/
│   ├── index.html                 # UPDATE: Replace chat placeholder
│   ├── renderer.ts                # UPDATE: Initialize chat
│   ├── components/
│   │   ├── server-dropdown.ts     # KEEP
│   │   ├── server-modal.ts        # KEEP
│   │   ├── chat-container.ts      # NEW: Main chat component
│   │   ├── chat-message.ts        # NEW: Message bubble component
│   │   └── chat-input.ts          # NEW: Input component
│   └── styles/
│       ├── main.css               # KEEP
│       ├── layout.css             # KEEP
│       ├── components.css         # KEEP
│       └── chat.css               # NEW: Chat-specific styles
└── shared/
    └── types.ts                   # UPDATE: Add chat types

Type Definitions
Update src/shared/types.ts

Add these types:

typescript

// ============== CHAT TYPES ==============

/**
 * LLM Provider options
 */
export type LLMProvider = 'claude' | 'openai' | 'moonshot';

/**
 * Chat message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Single chat message
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  provider?: LLMProvider;      // Which LLM generated this (for assistant messages)
  isError?: boolean;           // True if this is an error message
  metadata?: {
    model?: string;            // e.g., "claude-3-sonnet", "gpt-4"
    tokens?: number;           // Token count if available
  };
}

/**
 * Chat session/conversation
 */
export interface ChatSession {
  id: string;
  title: string;              // Auto-generated or user-set
  messages: ChatMessage[];
  provider: LLMProvider;
  createdAt: number;
  updatedAt: number;
}

/**
 * Chat settings stored in electron-store
 */
export interface ChatSettings {
  selectedProvider: LLMProvider;
  maxHistoryMessages: number;  // How many messages to keep in memory
  autoScroll: boolean;
}

/**
 * Provider configuration (API keys stored separately in credential-store)
 */
export interface ProviderConfig {
  provider: LLMProvider;
  displayName: string;
  models: string[];
  defaultModel: string;
  isConfigured: boolean;       // Has API key
}

// ============== CHAT IPC CHANNELS ==============

// Add to existing IPC_CHANNELS:
export const IPC_CHANNELS = {
  // ... existing channels ...

  // Chat
  CHAT_GET_MESSAGES: 'chat:get-messages',
  CHAT_ADD_MESSAGE: 'chat:add-message',
  CHAT_CLEAR_HISTORY: 'chat:clear-history',
  CHAT_GET_SETTINGS: 'chat:get-settings',
  CHAT_UPDATE_SETTINGS: 'chat:update-settings',
  CHAT_GET_SESSIONS: 'chat:get-sessions',
  CHAT_GET_SESSION: 'chat:get-session',
  CHAT_CREATE_SESSION: 'chat:create-session',
  CHAT_DELETE_SESSION: 'chat:delete-session',
} as const;

// ============== ELECTRON API EXTENSIONS ==============

// Add to existing ElectronAPI interface:
export interface ElectronAPI {
  // ... existing methods ...

  // Chat
  getChatMessages: (sessionId?: string) => Promise<ChatMessage[]>;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>, sessionId?: string) => Promise<ChatMessage>;
  clearChatHistory: (sessionId?: string) => Promise<void>;
  getChatSettings: () => Promise<ChatSettings>;
  updateChatSettings: (settings: Partial<ChatSettings>) => Promise<ChatSettings>;
  getChatSessions: () => Promise<ChatSession[]>;
  getChatSession: (sessionId: string) => Promise<ChatSession | null>;
  createChatSession: (provider?: LLMProvider) => Promise<ChatSession>;
  deleteChatSession: (sessionId: string) => Promise<boolean>;
}

Chat Store
New file: src/main/store/chat-store.ts

typescript

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
  MessageRole
} from '../../shared/types';

interface ChatStoreData {
  sessions: ChatSession[];
  activeSessionId: string | null;
  settings: ChatSettings;
}

const DEFAULT_SETTINGS: ChatSettings = {
  selectedProvider: 'claude',
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
}

Update Main Process
Update src/main/main.ts

Add chat store initialization and IPC handlers:

typescript

/**
 * Add import at top
 */
import { ChatStore } from './store/chat-store';
import { ChatMessage, ChatSettings, LLMProvider } from '../shared/types';

/**
 * Add variable after existing store declarations
 */
let chatStore: ChatStore;

/**
 * Update initializeStores() to include chat store
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  chatStore = new ChatStore();  // ADD THIS
  console.log('Stores initialized');
  console.log(`Secure storage available: ${credentialStore.isAvailable()}`);
}

/**
 * Add these IPC handlers in setupIpcHandlers()
 */

// ============== CHAT HANDLERS ==============

// Get messages
ipcMain.handle(IPC_CHANNELS.CHAT_GET_MESSAGES, (_, sessionId?: string) => {
  return chatStore.getMessages(sessionId);
});

// Add message
ipcMain.handle(IPC_CHANNELS.CHAT_ADD_MESSAGE, (_, message: Omit<ChatMessage, 'id' | 'timestamp'>, sessionId?: string) => {
  return chatStore.addMessage(message, sessionId);
});

// Clear history
ipcMain.handle(IPC_CHANNELS.CHAT_CLEAR_HISTORY, (_, sessionId?: string) => {
  chatStore.clearHistory(sessionId);
});

// Get settings
ipcMain.handle(IPC_CHANNELS.CHAT_GET_SETTINGS, () => {
  return chatStore.getSettings();
});

// Update settings
ipcMain.handle(IPC_CHANNELS.CHAT_UPDATE_SETTINGS, (_, settings: Partial<ChatSettings>) => {
  return chatStore.updateSettings(settings);
});

// Get all sessions
ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSIONS, () => {
  return chatStore.getSessions();
});

// Get single session
ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSION, (_, sessionId: string) => {
  return chatStore.getSession(sessionId);
});

// Create session
ipcMain.handle(IPC_CHANNELS.CHAT_CREATE_SESSION, (_, provider?: LLMProvider) => {
  return chatStore.createSession(provider);
});

// Delete session
ipcMain.handle(IPC_CHANNELS.CHAT_DELETE_SESSION, (_, sessionId: string) => {
  return chatStore.deleteSession(sessionId);
});

Update Preload Script
Update src/main/preload.ts

Add chat methods:

typescript

/**
 * Add to the electronAPI object
 */

// Chat
getChatMessages: (sessionId?: string) => 
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_MESSAGES, sessionId),

addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>, sessionId?: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_ADD_MESSAGE, message, sessionId),

clearChatHistory: (sessionId?: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_CLEAR_HISTORY, sessionId),

getChatSettings: () =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SETTINGS),

updateChatSettings: (settings: Partial<ChatSettings>) =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_UPDATE_SETTINGS, settings),

getChatSessions: () =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSIONS),

getChatSession: (sessionId: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSION, sessionId),

createChatSession: (provider?: LLMProvider) =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_CREATE_SESSION, provider),

deleteChatSession: (sessionId: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.CHAT_DELETE_SESSION, sessionId),

Chat Components
New file: src/renderer/components/chat-message.ts

typescript

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

New file: src/renderer/components/chat-input.ts

typescript

/**
 * Chat Input Component
 * Textarea with send button and keyboard handling
 */

export interface ChatInputOptions {
  container: HTMLElement;
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export class ChatInput {
  private container: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private onSend: (message: string) => void;
  private _disabled: boolean = false;

  constructor(options: ChatInputOptions) {
    this.container = options.container;
    this.onSend = options.onSend;
    this._disabled = options.disabled || false;
    
    this.render(options.placeholder);
    this.attachEventListeners();
  }

  /**
   * Render the input component
   */
  private render(placeholder?: string): void {
    this.container.innerHTML = `
      <div class="chat-input-wrapper">
        <textarea 
          id="chat-message-input"
          class="chat-textarea"
          placeholder="${placeholder || 'Type a message...'}"
          rows="1"
          ${this._disabled ? 'disabled' : ''}
        ></textarea>
        <button 
          id="chat-send-btn"
          class="chat-send-btn"
          title="Send message (Enter)"
          ${this._disabled ? 'disabled' : ''}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.724 1.053a.5.5 0 0 0-.714.545l1.403 4.85a.5.5 0 0 0 .397.354l5.69.953c.268.053.268.437 0 .49l-5.69.953a.5.5 0 0 0-.397.354l-1.403 4.85a.5.5 0 0 0 .714.545l13-6.5a.5.5 0 0 0 0-.894l-13-6.5z"/>
          </svg>
        </button>
      </div>
    `;

    this.textarea = this.container.querySelector('#chat-message-input')!;
    this.sendButton = this.container.querySelector('#chat-send-btn')!;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Auto-resize textarea
    this.textarea.addEventListener('input', () => {
      this.autoResize();
    });

    // Send on Enter (Shift+Enter for newline)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Send button click
    this.sendButton.addEventListener('click', () => {
      this.handleSend();
    });
  }

  /**
   * Auto-resize textarea based on content
   */
  private autoResize(): void {
    this.textarea.style.height = 'auto';
    const maxHeight = 120; // Max 120px (about 5 lines)
    const newHeight = Math.min(this.textarea.scrollHeight, maxHeight);
    this.textarea.style.height = `${newHeight}px`;
  }

  /**
   * Handle send action
   */
  private handleSend(): void {
    if (this._disabled) return;

    const message = this.textarea.value.trim();
    if (!message) return;

    this.onSend(message);
    this.clear();
  }

  /**
   * Clear input
   */
  clear(): void {
    this.textarea.value = '';
    this.autoResize();
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.textarea.focus();
  }

  /**
   * Blur the input
   */
  blur(): void {
    this.textarea.blur();
  }

  /**
   * Get/set disabled state
   */
  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    this.textarea.disabled = value;
    this.sendButton.disabled = value;
  }

  /**
   * Set placeholder text
   */
  setPlaceholder(text: string): void {
    this.textarea.placeholder = text;
  }

  /**
   * Get current input value
   */
  getValue(): string {
    return this.textarea.value;
  }

  /**
   * Set input value
   */
  setValue(value: string): void {
    this.textarea.value = value;
    this.autoResize();
  }
}

New file: src/renderer/components/chat-container.ts

typescript

/**
 * Chat Container Component
 * Main chat interface managing messages and input
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
            <option value="claude" ${this.settings.selectedProvider === 'claude' ? 'selected' : ''}>
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
      placeholder: 'Ask the AI assistant... (LLM integration coming in Phase 4)'
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
   * Render all messages
   */
  private renderMessages(): void {
    // Clear existing messages (but keep empty state)
    const existingMessages = this.messagesContainer.querySelectorAll('.chat-message');
    existingMessages.forEach(el => el.remove());

    // Show/hide empty state
    if (this.messages.length === 0) {
      this.emptyState.classList.remove('hidden');
    } else {
      this.emptyState.classList.add('hidden');
      
      // Render each message
      this.messages.forEach(message => {
        const component = new ChatMessageComponent({ message });
        this.messagesContainer.appendChild(component.getElement());
      });

      // Scroll to bottom
      this.scrollToBottom();
    }
  }


  /**
   * Handle sending a message
   */
  private async handleSendMessage(content: string): Promise<void> {
    if (this.isLoading || !content.trim()) return;

    try {
      // Add user message
      const userMessage = await window.electronAPI.addChatMessage({
        role: 'user',
        content: content.trim()
      });

      this.messages.push(userMessage);
      this.renderMessages();

      // Show loading state
      this.setLoading(true);

      // Phase 4 will add actual LLM call here
      // For now, add a placeholder response
      await this.addPlaceholderResponse();

    } catch (error) {
      console.error('Failed to send message:', error);
      this.showError('Failed to send message. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Add placeholder response (Phase 4 will replace with real LLM call)
   */
  private async addPlaceholderResponse(): Promise<void> {
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const placeholderResponses = [
      "I'm a placeholder response! LLM integration is coming in Phase 4. Once connected, I'll be able to help you manage your Raspberry Pi, run commands, and troubleshoot issues.",
      "This is where the AI response will appear. In Phase 4, I'll connect to Claude, GPT-4, or Moonshot to provide real assistance.",
      "🚧 LLM integration pending! Soon I'll be able to execute commands on your Pi and help with system administration tasks.",
      "Hello! I'm currently in demo mode. Phase 4 will enable me to actually help you with your Raspberry Pi questions and tasks."
    ];

    const randomResponse = placeholderResponses[Math.floor(Math.random() * placeholderResponses.length)];

    const assistantMessage = await window.electronAPI.addChatMessage({
      role: 'assistant',
      content: randomResponse,
      provider: this.settings.selectedProvider
    });

    this.messages.push(assistantMessage);
    this.renderMessages();
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
      this.renderMessages();
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom(): void {
    if (this.settings.autoScroll) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
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

Update HTML
Update src/renderer/index.html

Replace the chat panel section:

html

<!-- Right Panel: AI Chat -->
<section id="chat-panel" class="panel">
  <div class="panel-header">
    <div class="panel-header-left">
      <span class="panel-title">AI Assistant</span>
    </div>
    <div class="panel-header-right">
      <span id="model-badge" class="model-badge">Claude</span>
    </div>
  </div>
  <!-- Chat container will be populated by JavaScript -->
  <div id="chat-container" class="chat-panel-content"></div>
</section>

Remove or keep the old chat placeholder - it will be replaced by the ChatContainer component.
Chat Styles
New file: src/renderer/styles/chat.css

css

/**
 * Chat Styles
 * Styles for the AI chat interface
 */

/* ==================== CHAT CONTAINER ==================== */

.chat-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ==================== MESSAGES CONTAINER ==================== */

.chat-messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ==================== EMPTY STATE ==================== */

.chat-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-secondary);
  padding: 24px;
}

.chat-empty-state.hidden {
  display: none;
}

.chat-empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.chat-empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.chat-empty-state p {
  font-size: 13px;
  max-width: 280px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.empty-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 280px;
}

.suggestion-btn {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.suggestion-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

/* ==================== CHAT MESSAGE ==================== */

.chat-message {
  display: flex;
  gap: 12px;
  animation: messageSlideIn 0.2s ease;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message.user {
  flex-direction: row-reverse;
}

.chat-message.user .message-content-wrapper {
  align-items: flex-end;
}

.chat-message.user .message-content {
  background: var(--accent-primary);
  color: white;
}

.chat-message.user .message-header {
  flex-direction: row-reverse;
}

/* Avatar */
.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.chat-message.user .message-avatar {
  background: var(--accent-primary);
}

/* Content wrapper */
.message-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 80%;
  min-width: 0;
}

/* Header */
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.message-role {
  font-weight: 600;
  color: var(--text-primary);
}

.message-timestamp {
  color: var(--text-secondary);
}

/* Content */
.message-content {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.chat-message.assistant .message-content {
  border-top-left-radius: 4px;
}

.chat-message.user .message-content {
  border-top-right-radius: 4px;
}

/* Error message */
.chat-message.error .message-content {
  background: rgba(241, 76, 76, 0.1);
  border: 1px solid var(--accent-error);
  color: var(--accent-error);
}

/* Message actions */
.message-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.chat-message:hover .message-actions {
  opacity: 1;
}

.message-action-btn {
  padding: 4px 6px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
  transition: all var(--transition-fast);
}

.message-action-btn:hover {
  opacity: 1;
  background: var(--bg-hover);
}

/* ==================== LOADING INDICATOR ==================== */

.chat-message.loading .message-content {
  padding: 14px 18px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator .dot {
  width: 8px;
  height: 8px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-indicator .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ==================== CHAT INPUT ==================== */

.chat-input-container {
  border-top: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  padding: 12px;
}

.chat-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.provider-select {
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 11px;
  cursor: pointer;
}

.provider-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.clear-chat-btn {
  padding: 4px 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.clear-chat-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.chat-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-textarea {
  flex: 1;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  resize: none;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
}

.chat-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.chat-textarea::placeholder {
  color: var(--text-disabled);
}

.chat-textarea:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}

.chat-send-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.chat-send-btn:hover:not(:disabled) {
  background: var(--accent-secondary);
}

.chat-send-btn:disabled {
  background: var(--bg-tertiary);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.chat-send-btn svg {
  width: 18px;
  height: 18px;
}

/* ==================== SCROLLBAR ==================== */

.chat-messages-container::-webkit-scrollbar {
  width: 8px;
}

.chat-messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages-container::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 4px;
}

.chat-messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

Update Renderer Entry
Update src/renderer/renderer.ts

Add chat initialization:

typescript

/**
 * Add import at top
 */
import { ChatContainer } from './components/chat-container';

/**
 * Add variable after existing declarations
 */
let chatContainer: ChatContainer | null = null;

/**
 * Add this function
 */
async function initializeChat(): Promise<void> {
  const container = document.getElementById('chat-container');
  
  if (!container) {
    console.error('Chat container not found');
    return;
  }

  chatContainer = new ChatContainer({
    container,
    onSendMessage: (message) => {
      console.log('Message sent:', message);
      // Phase 4 will handle actual LLM calls
    }
  });

  await chatContainer.initialize();
  
  // Update model badge when provider changes
  updateModelBadge();

  console.log('Chat initialized');
}

/**
 * Update model badge display
 */
function updateModelBadge(): void {
  const badge = document.getElementById('model-badge');
  if (!badge || !chatContainer) return;

  const provider = chatContainer.getSelectedProvider();
  
  switch (provider) {
    case 'claude':
      badge.textContent = 'Claude';
      badge.style.backgroundColor = 'var(--accent-primary)';
      break;
    case 'openai':
      badge.textContent = 'GPT-4';
      badge.style.backgroundColor = '#10a37f';
      break;
    case 'moonshot':
      badge.textContent = 'Moonshot';
      badge.style.backgroundColor = '#6366f1';
      break;
  }
}

/**
 * Update initializeApp() to include chat
 */
async function initializeApp(): Promise<void> {
  console.log('Initializing Pi Assistant...');

  initializeLayout();
  initializeTerminal();
  initializeWindowControls();
  setupKeyboardShortcuts();
  initializeServerManagement();
  
  // ADD THIS - Note: async
  await initializeChat();

  console.log('Pi Assistant initialized successfully');
}

/**
 * Update cleanup to include chat
 */
function cleanup(): void {
  terminalManager?.dispose();
  layoutManager?.dispose();
  window.electronAPI.removeAllListeners('terminal:data');
  window.electronAPI.removeAllListeners('ssh:status');
  // Chat doesn't need explicit cleanup - messages are persisted
}

Also update the DOMContentLoaded handler if it's not already async:

typescript

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp().catch(err => {
    console.error('Failed to initialize app:', err);
  });
});

Update HTML Head
Update src/renderer/index.html

Add the chat stylesheet in the <head>:

html

<head>
    <!-- ... existing meta tags and stylesheets ... -->
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/layout.css">
    <link rel="stylesheet" href="styles/terminal.css">
    <link rel="stylesheet" href="styles/components.css">
    <link rel="stylesheet" href="styles/chat.css">  <!-- ADD THIS -->
</head>

Verification Checklist

After implementing Phase 3, verify:
UI/Visual

    Chat panel displays empty state on first load
    Suggestion buttons appear in empty state
    Clicking suggestion populates input field
    Provider dropdown shows Claude, GPT-4, Moonshot options
    Model badge in header updates when provider changes
    Clear button visible in chat input header

Functionality

    Typing in input auto-resizes textarea
    Enter sends message (Shift+Enter for newline)
    Send button sends message
    User messages appear with blue bubble on right
    Placeholder responses appear with gray bubble on left
    Loading indicator (typing dots) shows during "response"
    Copy button appears on hover over messages
    Copy button copies message content to clipboard
    Timestamps display correctly
    Clear chat removes all messages

Persistence

    Close and reopen app - messages persist
    Provider selection persists after restart
    Multiple chat sessions can be stored (for future UI)

Layout

    Chat panel resizes correctly with layout handle
    Messages container scrolls when content overflows
    Auto-scroll to bottom on new message
    No visual glitches during resize

Build & Test

powershell

# Rebuild
npm run build

# Test
npm start

Test Scenarios

    Empty State:
        Fresh install should show empty state
        Click suggestion → should populate input

    Send Message:
        Type message → press Enter
        Message appears in bubble
        Placeholder response appears after delay

    Persistence:
        Send a few messages
        Close app completely
        Reopen → messages should still be there

    Provider Switching:
        Change provider in dropdown
        Badge should update
        Setting should persist after restart

    Clear Chat:
        Click Clear button
        Confirm dialog
        All messages removed
        Empty state reappears

Next Phase Preview

Phase 3A will add:

    Markdown rendering in messages
    Code syntax highlighting
    Copy code button for code blocks
    Message timestamps (relative time)

Phase 4 will add:

    Actual LLM API integration
    API key management in settings
    Streaming responses
    Error handling for API calls
    Token counting/limits

Files Created/Modified Summary
File	Action
src/shared/types.ts	UPDATE - Add chat types
src/main/store/chat-store.ts	NEW
src/main/main.ts	UPDATE - Add chat IPC handlers
src/main/preload.ts	UPDATE - Expose chat API
src/renderer/components/chat-message.ts	NEW
src/renderer/components/chat-input.ts	NEW
src/renderer/components/chat-container.ts	NEW
src/renderer/styles/chat.css	NEW
src/renderer/index.html	UPDATE - Chat panel HTML
src/renderer/renderer.ts	UPDATE - Initialize chat

text


---

That completes the **Phase 3 Build Plan**. 
