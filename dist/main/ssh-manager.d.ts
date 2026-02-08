/**
 * SSH Manager - Minimal Version for Testing
 * Handles SSH connections using ssh2 library
 */
export type SSHStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface SSHConfig {
    host: string;
    port: number;
    username: string;
    password: string;
}
export interface SSHManagerOptions {
    onData: (data: string) => void;
    onStatus: (status: SSHStatus, message?: string) => void;
}
export declare class SSHManager {
    private client;
    private stream;
    private status;
    private options;
    private currentConfig;
    constructor(options: SSHManagerOptions);
    /**
     * Connect to SSH server
     */
    connect(config: SSHConfig): Promise<boolean>;
    /**
     * Open interactive shell session
     */
    private openShell;
    /**
     * Write data to SSH session
     */
    write(data: string): void;
    /**
     * Resize remote PTY
     */
    resize(cols: number, rows: number): void;
    /**
     * Disconnect from server
     */
    disconnect(): void;
    /**
     * Cleanup resources
     */
    private cleanup;
    /**
     * Update and broadcast status
     */
    private setStatus;
    /**
     * Get current status
     */
    getStatus(): SSHStatus;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get current connection info
     */
    getConnectionInfo(): {
        host: string;
        username: string;
    } | null;
}
//# sourceMappingURL=ssh-manager.d.ts.map