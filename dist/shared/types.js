"use strict";
/**
 * Shared TypeScript interfaces and types
 * Used by both main and renderer processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// IPC channel names as constants to prevent typos
exports.IPC_CHANNELS = {
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
};
//# sourceMappingURL=types.js.map