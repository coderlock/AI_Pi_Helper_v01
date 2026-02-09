/**
 * Shared TypeScript interfaces and types
 * Used by both main and renderer processes
 */
export interface TerminalDimensions {
    cols: number;
    rows: number;
}
export interface WindowState {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized: boolean;
}
export interface LayoutConfig {
    terminalPanelWidth: number;
}
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
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
    privateKeyPath?: string;
    saveCredentials: boolean;
    lastConnected: number | null;
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
    provider?: LLMProvider;
    isError?: boolean;
    metadata?: {
        model?: string;
        tokens?: number;
    };
}
/**
 * Chat session/conversation
 */
export interface ChatSession {
    id: string;
    title: string;
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
    maxHistoryMessages: number;
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
    isConfigured: boolean;
}
export declare const IPC_CHANNELS: {
    readonly TERMINAL_DATA: "terminal:data";
    readonly TERMINAL_INPUT: "terminal:input";
    readonly TERMINAL_RESIZE: "terminal:resize";
    readonly TERMINAL_READY: "terminal:ready";
    readonly WINDOW_MINIMIZE: "window:minimize";
    readonly WINDOW_MAXIMIZE: "window:maximize";
    readonly WINDOW_CLOSE: "window:close";
    readonly WINDOW_IS_MAXIMIZED: "window:is-maximized";
    readonly SSH_CONNECT: "ssh:connect";
    readonly SSH_DISCONNECT: "ssh:disconnect";
    readonly SSH_STATUS: "ssh:status";
    readonly SERVER_LIST: "server:list";
    readonly SERVER_GET: "server:get";
    readonly SERVER_CREATE: "server:create";
    readonly SERVER_UPDATE: "server:update";
    readonly SERVER_DELETE: "server:delete";
    readonly SERVER_CONNECT: "server:connect";
    readonly SERVER_HAS_PASSWORD: "server:has-password";
    readonly SERVER_TEST_CONNECTION: "server:test-connection";
    readonly CHAT_GET_MESSAGES: "chat:get-messages";
    readonly CHAT_ADD_MESSAGE: "chat:add-message";
    readonly CHAT_CLEAR_HISTORY: "chat:clear-history";
    readonly CHAT_GET_SETTINGS: "chat:get-settings";
    readonly CHAT_UPDATE_SETTINGS: "chat:update-settings";
    readonly CHAT_GET_SESSIONS: "chat:get-sessions";
    readonly CHAT_GET_SESSION: "chat:get-session";
    readonly CHAT_CREATE_SESSION: "chat:create-session";
    readonly CHAT_DELETE_SESSION: "chat:delete-session";
};
export interface ElectronAPI {
    sendTerminalInput: (data: string) => void;
    onTerminalData: (callback: (data: string) => void) => void;
    resizeTerminal: (cols: number, rows: number) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    isMaximized: () => Promise<boolean>;
    sshConnect: (config: {
        host: string;
        port: number;
        username: string;
        password: string;
    }) => Promise<{
        success: boolean;
        error?: string;
    }>;
    sshDisconnect: () => Promise<{
        success: boolean;
    }>;
    sshGetStatus: () => Promise<{
        isConnected: boolean;
        status: string;
        connectionInfo?: {
            host: string;
            username: string;
        } | null;
    }>;
    onSSHStatus: (callback: (data: {
        status: string;
        message?: string;
    }) => void) => void;
    getServers: () => Promise<ServerListItem[]>;
    getServer: (id: string) => Promise<ServerProfile | null>;
    createServer: (data: ServerFormData) => Promise<ServerProfile>;
    updateServer: (id: string, data: Partial<ServerFormData>) => Promise<ServerProfile | null>;
    deleteServer: (id: string) => Promise<boolean>;
    connectToServer: (id: string, password?: string) => Promise<SSHConnectionResult>;
    serverHasPassword: (id: string) => Promise<boolean>;
    testConnection: (config: {
        host: string;
        port: number;
        username: string;
        password: string;
    }) => Promise<{
        success: boolean;
        error?: string;
    }>;
    getChatMessages: (sessionId?: string) => Promise<ChatMessage[]>;
    addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>, sessionId?: string) => Promise<ChatMessage>;
    clearChatHistory: (sessionId?: string) => Promise<void>;
    getChatSettings: () => Promise<ChatSettings>;
    updateChatSettings: (settings: Partial<ChatSettings>) => Promise<ChatSettings>;
    getChatSessions: () => Promise<ChatSession[]>;
    getChatSession: (sessionId: string) => Promise<ChatSession | null>;
    createChatSession: (provider?: LLMProvider) => Promise<ChatSession>;
    deleteChatSession: (sessionId: string) => Promise<boolean>;
    getPlatform: () => NodeJS.Platform;
    removeAllListeners: (channel: string) => void;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=types.d.ts.map