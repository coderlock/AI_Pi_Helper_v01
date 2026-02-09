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

  