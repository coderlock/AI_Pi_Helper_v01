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
};
//# sourceMappingURL=types.js.map