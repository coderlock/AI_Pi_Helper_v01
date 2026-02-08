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
};
//# sourceMappingURL=main.js.map