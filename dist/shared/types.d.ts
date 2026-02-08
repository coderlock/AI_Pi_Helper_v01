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
    getPlatform: () => NodeJS.Platform;
    removeAllListeners: (channel: string) => void;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=types.d.ts.map