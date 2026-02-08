"use strict";
/**
 * Preload Script
 * Securely exposes Electron APIs to the renderer process
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const types_1 = require("../shared/types");
// Store callbacks for cleanup
const callbacks = new Map();
/**
 * Register a callback for an IPC channel
 */
function registerCallback(channel, callback) {
    if (!callbacks.has(channel)) {
        callbacks.set(channel, new Set());
    }
    callbacks.get(channel).add(callback);
}
/**
 * Create the API object to expose to renderer
 */
const electronAPI = {
    // Terminal operations
    sendTerminalInput: (data) => {
        electron_1.ipcRenderer.send(types_1.IPC_CHANNELS.TERMINAL_INPUT, data);
    },
    onTerminalData: (callback) => {
        const wrappedCallback = (_event, data) => {
            callback(data);
        };
        registerCallback(types_1.IPC_CHANNELS.TERMINAL_DATA, wrappedCallback);
        electron_1.ipcRenderer.on(types_1.IPC_CHANNELS.TERMINAL_DATA, wrappedCallback);
    },
    resizeTerminal: (cols, rows) => {
        electron_1.ipcRenderer.send(types_1.IPC_CHANNELS.TERMINAL_RESIZE, cols, rows);
    },
    // Window controls
    minimizeWindow: () => {
        electron_1.ipcRenderer.send(types_1.IPC_CHANNELS.WINDOW_MINIMIZE);
    },
    maximizeWindow: () => {
        electron_1.ipcRenderer.send(types_1.IPC_CHANNELS.WINDOW_MAXIMIZE);
    },
    closeWindow: () => {
        electron_1.ipcRenderer.send(types_1.IPC_CHANNELS.WINDOW_CLOSE);
    },
    isMaximized: async () => {
        return await electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED);
    },
    // Utility
    getPlatform: () => {
        return process.platform;
    },
    // Cleanup
    removeAllListeners: (channel) => {
        const channelCallbacks = callbacks.get(channel);
        if (channelCallbacks) {
            channelCallbacks.forEach((callback) => {
                electron_1.ipcRenderer.removeListener(channel, callback);
            });
            callbacks.delete(channel);
        }
    }
};
// Expose the API to renderer
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('Preload script loaded successfully');
//# sourceMappingURL=preload.js.map