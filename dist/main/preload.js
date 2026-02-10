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
    // SSH connection
    sshConnect: (config) => {
        return electron_1.ipcRenderer.invoke('ssh:connect', config);
    },
    sshDisconnect: () => {
        return electron_1.ipcRenderer.invoke('ssh:disconnect');
    },
    sshGetStatus: () => {
        return electron_1.ipcRenderer.invoke('ssh:status');
    },
    onSSHStatus: (callback) => {
        const wrappedCallback = (_event, data) => {
            callback(data);
        };
        registerCallback('ssh:status', wrappedCallback);
        electron_1.ipcRenderer.on('ssh:status', wrappedCallback);
    },
    // Server management
    getServers: () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_LIST);
    },
    getServer: (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_GET, id);
    },
    createServer: (data) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_CREATE, data);
    },
    updateServer: (id, data) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_UPDATE, id, data);
    },
    deleteServer: (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_DELETE, id);
    },
    connectToServer: (id, password) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_CONNECT, id, password);
    },
    serverHasPassword: (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_HAS_PASSWORD, id);
    },
    testConnection: (config) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SERVER_TEST_CONNECTION, config);
    },
    // Chat
    getChatMessages: (sessionId) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_GET_MESSAGES, sessionId),
    addChatMessage: (message, sessionId) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_ADD_MESSAGE, message, sessionId),
    clearChatHistory: (sessionId) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_CLEAR_HISTORY, sessionId),
    getChatSettings: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_GET_SETTINGS),
    updateChatSettings: (settings) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_UPDATE_SETTINGS, settings),
    getChatSessions: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_GET_SESSIONS),
    getChatSession: (sessionId) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_GET_SESSION, sessionId),
    createChatSession: (provider) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_CREATE_SESSION, provider),
    deleteChatSession: (sessionId) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CHAT_DELETE_SESSION, sessionId),
    // LLM
    sendLLMMessage: (options) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LLM_SEND_MESSAGE, options),
    onLLMStreamChunk: (callback) => {
        const wrappedCallback = (_event, data) => {
            callback(data);
        };
        registerCallback(types_1.IPC_CHANNELS.LLM_STREAM_CHUNK, wrappedCallback);
        electron_1.ipcRenderer.on(types_1.IPC_CHANNELS.LLM_STREAM_CHUNK, wrappedCallback);
    },
    onLLMStreamEnd: (callback) => {
        const wrappedCallback = (_event, data) => {
            callback(data);
        };
        registerCallback(types_1.IPC_CHANNELS.LLM_STREAM_END, wrappedCallback);
        electron_1.ipcRenderer.on(types_1.IPC_CHANNELS.LLM_STREAM_END, wrappedCallback);
    },
    onLLMStreamError: (callback) => {
        const wrappedCallback = (_event, data) => {
            callback(data);
        };
        registerCallback(types_1.IPC_CHANNELS.LLM_STREAM_ERROR, wrappedCallback);
        electron_1.ipcRenderer.on(types_1.IPC_CHANNELS.LLM_STREAM_ERROR, wrappedCallback);
    },
    cancelLLMRequest: (requestId) => {
        electron_1.ipcRenderer.send(types_1.IPC_CHANNELS.LLM_CANCEL, requestId);
    },
    getProviders: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LLM_GET_PROVIDERS),
    testAPIKey: (provider, apiKey) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LLM_TEST_API_KEY, provider, apiKey),
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_GET),
    updateSettings: (settings) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_UPDATE, settings),
    getAPIKeyStatus: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_GET_API_KEY_STATUS),
    setAPIKey: (provider, apiKey) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_SET_API_KEY, provider, apiKey),
    deleteAPIKey: (provider) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_DELETE_API_KEY, provider),
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