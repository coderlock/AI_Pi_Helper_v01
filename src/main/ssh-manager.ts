/**
 * SSH Manager - Minimal Version for Testing
 * Handles SSH connections using ssh2 library
 */

import { Client, ClientChannel } from 'ssh2';

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

export class SSHManager {
  private client: Client | null = null;
  private stream: ClientChannel | null = null;
  private status: SSHStatus = 'disconnected';
  private options: SSHManagerOptions;
  private currentConfig: SSHConfig | null = null;

  constructor(options: SSHManagerOptions) {
    this.options = options;
  }

  /**
   * Connect to SSH server
   */
  async connect(config: SSHConfig): Promise<boolean> {
    // Disconnect existing connection first
    if (this.client) {
      this.disconnect();
    }

    this.currentConfig = config;
    this.setStatus('connecting');

    return new Promise((resolve) => {
      this.client = new Client();

      // Connection ready - open shell
      this.client.on('ready', () => {
        console.log('SSH connection ready');
        this.openShell(resolve);
      });

      // Connection error
      this.client.on('error', (err) => {
        console.error('SSH connection error:', err.message);
        this.setStatus('error', err.message);
        this.cleanup();
        resolve(false);
      });

      // Connection closed
      this.client.on('close', () => {
        console.log('SSH connection closed');
        if (this.status === 'connected') {
          this.setStatus('disconnected');
        }
        this.cleanup();
      });

      // Connection timeout
      this.client.on('timeout', () => {
        console.error('SSH connection timeout');
        this.setStatus('error', 'Connection timeout');
        this.cleanup();
        resolve(false);
      });

      // Attempt connection
      console.log(`Connecting to ${config.username}@${config.host}:${config.port}...`);
      
      try {
        this.client.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          readyTimeout: 10000,
          keepaliveInterval: 30000,
          keepaliveCountMax: 3,
        });
      } catch (err: any) {
        console.error('SSH connect error:', err.message);
        this.setStatus('error', err.message);
        resolve(false);
      }
    });
  }

  /**
   * Open interactive shell session
   */
  private openShell(resolve: (success: boolean) => void): void {
    if (!this.client) {
      resolve(false);
      return;
    }

    this.client.shell(
      {
        term: 'xterm-256color',
        cols: 80,
        rows: 24,
      },
      (err, stream) => {
        if (err) {
          console.error('Failed to open shell:', err.message);
          this.setStatus('error', `Failed to open shell: ${err.message}`);
          this.cleanup();
          resolve(false);
          return;
        }

        this.stream = stream;

        // Handle data from remote server
        stream.on('data', (data: Buffer) => {
          this.options.onData(data.toString('utf8'));
        });

        // Handle stderr
        stream.stderr.on('data', (data: Buffer) => {
          this.options.onData(data.toString('utf8'));
        });

        // Handle stream close
        stream.on('close', () => {
          console.log('SSH shell stream closed');
          this.disconnect();
        });

        // Handle stream error
        stream.on('error', (err: Error) => {
          console.error('SSH stream error:', err.message);
          this.setStatus('error', err.message);
        });

        this.setStatus('connected');
        console.log('SSH shell opened successfully');
        resolve(true);
      }
    );
  }

  /**
   * Write data to SSH session
   */
  write(data: string): void {
    if (this.stream && this.status === 'connected') {
      this.stream.write(data);
    }
  }

  /**
   * Resize remote PTY
   */
  resize(cols: number, rows: number): void {
    if (this.stream && this.status === 'connected') {
      try {
        this.stream.setWindow(rows, cols, 0, 0);
        console.log(`SSH PTY resized to ${cols}x${rows}`);
      } catch (err) {
        console.error('Failed to resize SSH PTY:', err);
      }
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log('Disconnecting SSH...');
    this.cleanup();
    this.setStatus('disconnected');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      try {
        this.stream.close();
      } catch (e) {
        // Ignore close errors
      }
      this.stream = null;
    }

    if (this.client) {
      try {
        this.client.end();
      } catch (e) {
        // Ignore end errors
      }
      this.client = null;
    }

    this.currentConfig = null;
  }

  /**
   * Update and broadcast status
   */
  private setStatus(status: SSHStatus, message?: string): void {
    this.status = status;
    this.options.onStatus(status, message);
  }

  /**
   * Get current status
   */
  getStatus(): SSHStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get current connection info
   */
  getConnectionInfo(): { host: string; username: string } | null {
    if (this.currentConfig && this.status === 'connected') {
      return {
        host: this.currentConfig.host,
        username: this.currentConfig.username,
      };
    }
    return null;
  }
}
