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