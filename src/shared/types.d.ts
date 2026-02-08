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
export declare const IPC_CHANNELS: {
    readonly TERMINAL_DATA: "terminal:data";
    readonly TERMINAL_INPUT: "terminal:input";
    readonly TERMINAL_RESIZE: "terminal:resize";
    readonly TERMINAL_READY: "terminal:ready";
    readonly WINDOW_MINIMIZE: "window:minimize";
    readonly WINDOW_MAXIMIZE: "window:maximize";
    readonly WINDOW_CLOSE: "window:close";
    readonly WINDOW_IS_MAXIMIZED: "window:is-maximized";
};
export interface ElectronAPI {
    sendTerminalInput: (data: string) => void;
    onTerminalData: (callback: (data: string) => void) => void;
    resizeTerminal: (cols: number, rows: number) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    isMaximized: () => Promise<boolean>;
    getPlatform: () => NodeJS.Platform;
    removeAllListeners: (channel: string) => void;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=types.d.ts.map