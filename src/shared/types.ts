/**
 * Shared TypeScript interfaces and types
 * Used by both main and renderer processes
 */

// ============== AGENT TYPES (shared) ==============

import type { 
  AgentState, 
  AgentStatusUpdate, 
  CommandRequest, 
  CommandResult,
  TerminalContext,
  CommandApprovalRequest,
  CommandApprovalResponse 
} from '../main/agent/types';

// Re-export for renderer use
export type { 
  AgentState, 
  AgentStatusUpdate, 
  CommandRequest, 
  CommandResult,
  TerminalContext,
  CommandApprovalRequest,
  CommandApprovalResponse 
};

// ============== TERMINAL TYPES ==============

// Terminal resize dimensions
export interface TerminalDimensions {
  cols: number;
  rows: number;
}

// Window state for persistence
export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

// Layout configuration
export interface LayoutConfig {
  terminalPanelWidth: number; // percentage (0-100)
}

// Connection status for future SSH implementation
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============== SERVER TYPES ==============

/**
 * Authentication method
 */
export type AuthMethod = 'password' | 'key';

/**
 * Server profile stored in electron-store
 * Note: Password is NOT stored here - it goes in credential-store
 */
export interface ServerProfile {
  id: string;
  name: string;
  description: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  privateKeyPath?: string;        // Future: SSH key support
  saveCredentials: boolean;
  lastConnected: number | null;   // Timestamp
  createdAt: number;
  updatedAt: number;
}

/**
 * Data for creating/updating a server
 */
export interface ServerFormData {
  name: string;
  description: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  password?: string;
  privateKeyPath?: string;
  saveCredentials: boolean;
}

/**
 * Server list item for display (subset of ServerProfile)
 */
export interface ServerListItem {
  id: string;
  name: string;
  description: string;
  host: string;
  username: string;
  lastConnected: number | null;
  hasStoredPassword: boolean;
}

/**
 * Quick connect data (not saved)
 */
export interface QuickConnectData {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Result from SSH connection attempt
 */
export interface SSHConnectionResult {
  success: boolean;
  error?: string;
  serverId?: string;
}

// ============== CHAT TYPES ==============

/**
 * LLM Provider options
 */
export type LLMProvider = 'anthropic' | 'openai' | 'moonshot';

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
    inputTokens?: number;      // Input tokens used
    outputTokens?: number;     // Output tokens generated
    totalTokens?: number;      // Total tokens
    cost?: number;             // Estimated cost in USD
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
  usageStats?: SessionUsageStats;
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
 * Model definition
 */
export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: LLMProvider;
  contextWindow: number;
  pricing: {
    input: number;   // per 1M tokens
    output: number;  // per 1M tokens
  };
  capabilities?: {
    vision?: boolean;
    thinking?: boolean;
  };
}

/**
 * Provider configuration (API keys stored separately in credential-store)
 */
export interface ProviderConfig {
  provider: LLMProvider;
  displayName: string;
  models: ModelDefinition[];
  defaultModel: string;
  apiEndpoint: string;
  isConfigured: boolean;       // Has API key
}

/**
 * LLM request options
 */
export interface LLMRequestOptions {
  provider: LLMProvider;
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * LLM message format (for API calls)
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: any[];  // Tool calls made by assistant
  toolCallId?: string;  // ID of the tool call this message responds to
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;  // in USD
}

/**
 * LLM response (non-streaming)
 */
export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: LLMProvider;
  finishReason: 'stop' | 'length' | 'error';
}

/**
 * Streaming chunk
 */
export interface LLMStreamChunk {
  content: string;
  isComplete: boolean;
  usage?: TokenUsage;  // Only on final chunk
  toolCalls?: any[];  // Tool calls requested by LLM
  isToolResult?: boolean;  // True if this chunk is a tool result notification
}

/**
 * Session usage statistics
 */
export interface SessionUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  messageCount: number;
}

/**
 * App settings
 */
export interface AppSettings {
  llm: {
    selectedProvider: LLMProvider;
    selectedModels: {
      anthropic: string;
      openai: string;
      moonshot: string;
    };
    temperature: number;
    maxTokens: number;
  };
  ui: {
    autoScroll: boolean;
    showTokenCounts: boolean;
    showCostEstimates: boolean;
  };
}

/**
 * API key status for a provider
 */
export interface APIKeyStatus {
  provider: LLMProvider;
  isSet: boolean;
  isValid?: boolean;  // Only known after test
  lastTested?: number;
}

// ============== PROMPT TYPES ==============

/**
 * System prompt definition
 */
export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  isBuiltIn: boolean;        // True for default templates
  isDefault: boolean;        // True for the currently selected default
  createdAt: number;
  updatedAt: number;
}

/**
 * Prompt creation/update data
 */
export interface PromptFormData {
  name: string;
  content: string;
  description?: string;
}

/**
 * Prompt list item (for dropdown display)
 */
export interface PromptListItem {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  isDefault: boolean;
}

/**
 * Prompt change event (for chat display)
 */
export interface PromptChangeEvent {
  previousPromptId: string | null;
  previousPromptName: string | null;
  newPromptId: string;
  newPromptName: string;
  timestamp: number;
}

// IPC channel names as constants to prevent typos
export const IPC_CHANNELS = {
  // Terminal
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_READY: 'terminal:ready',
  
  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // SSH (from Phase 2A)
  SSH_CONNECT: 'ssh:connect',
  SSH_DISCONNECT: 'ssh:disconnect',
  SSH_STATUS: 'ssh:status',

  // Server management
  SERVER_LIST: 'server:list',
  SERVER_GET: 'server:get',
  SERVER_CREATE: 'server:create',
  SERVER_UPDATE: 'server:update',
  SERVER_DELETE: 'server:delete',
  SERVER_CONNECT: 'server:connect',
  SERVER_HAS_PASSWORD: 'server:has-password',
  SERVER_TEST_CONNECTION: 'server:test-connection',

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

  // LLM
  LLM_SEND_MESSAGE: 'llm:send-message',
  LLM_STREAM_CHUNK: 'llm:stream-chunk',
  LLM_STREAM_END: 'llm:stream-end',
  LLM_STREAM_ERROR: 'llm:stream-error',
  LLM_CANCEL: 'llm:cancel',
  LLM_GET_PROVIDERS: 'llm:get-providers',
  LLM_TEST_API_KEY: 'llm:test-api-key',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_GET_API_KEY_STATUS: 'settings:get-api-key-status',
  SETTINGS_SET_API_KEY: 'settings:set-api-key',
  SETTINGS_DELETE_API_KEY: 'settings:delete-api-key',

  // Prompts
  PROMPT_LIST: 'prompt:list',
  PROMPT_GET: 'prompt:get',
  PROMPT_GET_ACTIVE: 'prompt:get-active',
  PROMPT_CREATE: 'prompt:create',
  PROMPT_UPDATE: 'prompt:update',
  PROMPT_DELETE: 'prompt:delete',
  PROMPT_SET_ACTIVE: 'prompt:set-active',
  PROMPT_SET_DEFAULT: 'prompt:set-default',
  PROMPT_RESET_BUILT_IN: 'prompt:reset-built-in',

  // Agent
  AGENT_EXECUTE_COMMAND: 'agent:execute-command',
  AGENT_CANCEL_COMMAND: 'agent:cancel-command',
  AGENT_GET_CONTEXT: 'agent:get-context',
  AGENT_STATUS_UPDATE: 'agent:status-update',
  AGENT_REQUEST_APPROVAL: 'agent:request-approval',
  AGENT_APPROVAL_RESPONSE: 'agent:approval-response',
} as const;

// Electron API exposed to renderer via preload
export interface ElectronAPI {
  // Terminal operations
  sendTerminalInput: (data: string) => void;
  onTerminalData: (callback: (data: string) => void) => void;
  resizeTerminal: (cols: number, rows: number) => void;
  
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  
  // SSH connection
  sshConnect: (config: { 
    host: string; 
    port: number; 
    username: string; 
    password: string 
  }) => Promise<{ success: boolean; error?: string }>;
  sshDisconnect: () => Promise<{ success: boolean }>;
  sshGetStatus: () => Promise<{ 
    isConnected: boolean; 
    status: string;
    connectionInfo?: { host: string; username: string } | null 
  }>;
  onSSHStatus: (callback: (data: { status: string; message?: string }) => void) => void;
  
  // Server management
  getServers: () => Promise<ServerListItem[]>;
  getServer: (id: string) => Promise<ServerProfile | null>;
  createServer: (data: ServerFormData) => Promise<ServerProfile>;
  updateServer: (id: string, data: Partial<ServerFormData>) => Promise<ServerProfile | null>;
  deleteServer: (id: string) => Promise<boolean>;
  connectToServer: (id: string, password?: string) => Promise<SSHConnectionResult>;
  serverHasPassword: (id: string) => Promise<boolean>;
  testConnection: (config: { host: string; port: number; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  
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

  // LLM
  sendLLMMessage: (options: LLMRequestOptions) => Promise<string>;  // Returns request ID
  onLLMStreamChunk: (callback: (data: { requestId: string; chunk: LLMStreamChunk }) => void) => void;
  onLLMStreamEnd: (callback: (data: { requestId: string; usage: TokenUsage }) => void) => void;
  onLLMStreamError: (callback: (data: { requestId: string; error: string }) => void) => void;
  cancelLLMRequest: (requestId: string) => void;
  getProviders: () => Promise<ProviderConfig[]>;
  testAPIKey: (provider: LLMProvider, apiKey: string) => Promise<{ valid: boolean; error?: string }>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getAPIKeyStatus: () => Promise<APIKeyStatus[]>;
  setAPIKey: (provider: LLMProvider, apiKey: string) => Promise<boolean>;
  deleteAPIKey: (provider: LLMProvider) => Promise<boolean>;

  // Prompts
  getPrompts: () => Promise<PromptListItem[]>;
  getPrompt: (id: string) => Promise<SystemPrompt | null>;
  getActivePrompt: () => Promise<SystemPrompt>;
  createPrompt: (data: PromptFormData) => Promise<SystemPrompt>;
  updatePrompt: (id: string, data: Partial<PromptFormData>) => Promise<SystemPrompt | null>;
  deletePrompt: (id: string) => Promise<boolean>;
  setActivePrompt: (id: string) => Promise<void>;
  setDefaultPrompt: (id: string) => Promise<void>;
  resetBuiltInPrompt: (id: string) => Promise<SystemPrompt>;

  // Agent
  executeCommand: (request: CommandRequest) => Promise<CommandResult>;
  cancelCommand: (commandId: string) => void;
  getTerminalContext: () => Promise<TerminalContext>;
  onAgentStatusUpdate: (callback: (status: AgentStatusUpdate) => void) => void;
  onAgentRequestApproval: (callback: (request: CommandApprovalRequest) => void) => void;
  sendAgentApprovalResponse: (response: CommandApprovalResponse) => void;

  // Utility
  getPlatform: () => NodeJS.Platform;
  
  // Cleanup
  removeAllListeners: (channel: string) => void;
}

// Extend Window interface to include our API
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}