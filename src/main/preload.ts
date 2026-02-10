/**
 * Preload Script
 * Securely exposes Electron APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, ElectronAPI } from '../shared/types';

// Store callbacks for cleanup
const callbacks = new Map<string, Set<(...args: any[]) => void>>();

/**
 * Register a callback for an IPC channel
 */
function registerCallback(channel: string, callback: (...args: any[]) => void): void {
  if (!callbacks.has(channel)) {
    callbacks.set(channel, new Set());
  }
  callbacks.get(channel)!.add(callback);
}

/**
 * Create the API object to expose to renderer
 */
const electronAPI: ElectronAPI = {
  // Terminal operations
  sendTerminalInput: (data: string) => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_INPUT, data);
  },

  onTerminalData: (callback: (data: string) => void) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: string) => {
      callback(data);
    };
    registerCallback(IPC_CHANNELS.TERMINAL_DATA, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, wrappedCallback);
  },

  resizeTerminal: (cols: number, rows: number) => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, cols, rows);
  },

  // Window controls
  minimizeWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE);
  },

  maximizeWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE);
  },

  closeWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE);
  },

  isMaximized: async () => {
    return await ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED);
  },

  // SSH connection
  sshConnect: (config: { host: string; port: number; username: string; password: string }) => {
    return ipcRenderer.invoke('ssh:connect', config);
  },

  sshDisconnect: () => {
    return ipcRenderer.invoke('ssh:disconnect');
  },

  sshGetStatus: () => {
    return ipcRenderer.invoke('ssh:status');
  },

  onSSHStatus: (callback: (data: { status: string; message?: string }) => void) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: { status: string; message?: string }) => {
      callback(data);
    };
    registerCallback('ssh:status', wrappedCallback);
    ipcRenderer.on('ssh:status', wrappedCallback);
  },

  // Server management
  getServers: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_LIST);
  },

  getServer: (id: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_GET, id);
  },

  createServer: (data) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_CREATE, data);
  },

  updateServer: (id: string, data) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_UPDATE, id, data);
  },

  deleteServer: (id: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_DELETE, id);
  },

  connectToServer: (id: string, password?: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_CONNECT, id, password);
  },

  serverHasPassword: (id: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_HAS_PASSWORD, id);
  },

  testConnection: (config) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SERVER_TEST_CONNECTION, config);
  },

  // Chat
  getChatMessages: (sessionId?: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_MESSAGES, sessionId),

  addChatMessage: (message, sessionId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_ADD_MESSAGE, message, sessionId),

  clearChatHistory: (sessionId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_CLEAR_HISTORY, sessionId),

  getChatSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SETTINGS),

  updateChatSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_UPDATE_SETTINGS, settings),

  getChatSessions: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSIONS),

  getChatSession: (sessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSION, sessionId),

  createChatSession: (provider) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_CREATE_SESSION, provider),

  deleteChatSession: (sessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_DELETE_SESSION, sessionId),

  // LLM
  sendLLMMessage: (options) => 
    ipcRenderer.invoke(IPC_CHANNELS.LLM_SEND_MESSAGE, options),

  onLLMStreamChunk: (callback) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: any) => {
      callback(data);
    };
    registerCallback(IPC_CHANNELS.LLM_STREAM_CHUNK, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_CHUNK, wrappedCallback);
  },

  onLLMStreamEnd: (callback) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: any) => {
      callback(data);
    };
    registerCallback(IPC_CHANNELS.LLM_STREAM_END, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_END, wrappedCallback);
  },

  onLLMStreamError: (callback) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: any) => {
      callback(data);
    };
    registerCallback(IPC_CHANNELS.LLM_STREAM_ERROR, wrappedCallback);
    ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_ERROR, wrappedCallback);
  },

  cancelLLMRequest: (requestId: string) => {
    ipcRenderer.send(IPC_CHANNELS.LLM_CANCEL, requestId);
  },

  getProviders: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_GET_PROVIDERS),

  testAPIKey: (provider, apiKey: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST_API_KEY, provider, apiKey),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

  updateSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  getAPIKeyStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_API_KEY_STATUS),

  setAPIKey: (provider, apiKey: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_API_KEY, provider, apiKey),

  deleteAPIKey: (provider) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_DELETE_API_KEY, provider),

  // Utility
  getPlatform: () => {
    return process.platform;
  },

  // Cleanup
  removeAllListeners: (channel: string) => {
    const channelCallbacks = callbacks.get(channel);
    if (channelCallbacks) {
      channelCallbacks.forEach((callback) => {
        ipcRenderer.removeListener(channel, callback as any);
      });
      callbacks.delete(channel);
    }
  }
};

// Expose the API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded successfully');