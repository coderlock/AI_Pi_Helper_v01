/**
 * Shared TypeScript interfaces and types
 * Used by both main and renderer processes
 */

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