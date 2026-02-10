/**
 * PTY Manager
 * Manages the pseudo-terminal process for local shell
 */

import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import * as os from 'os';

export class PtyManager {
  private ptyProcess: pty.IPty | null = null;
  private window: BrowserWindow;
  private dataListeners: ((data: string) => void)[] = [];

  constructor(window: BrowserWindow) {
    this.window = window;
    this.initialize();
  }

  /**
   * Add a data listener (for agent processing)
   */
  addDataListener(listener: (data: string) => void): void {
    this.dataListeners.push(listener);
  }

  /**
   * Initialize the PTY process
   */
  private initialize(): void {
    // Detect the shell based on the platform
    const shell = this.getDefaultShell();
    const initialCols = 80;
    const initialRows = 24;

    try {
      // Spawn the PTY process
      this.ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: initialCols,
        rows: initialRows,
        cwd: os.homedir(),
        env: process.env as { [key: string]: string }
      });

      // Listen for data from the PTY
      this.ptyProcess.onData((data: string) => {
        this.window.webContents.send(IPC_CHANNELS.TERMINAL_DATA, data);
        // Call all data listeners
        for (const listener of this.dataListeners) {
          listener(data);
        }
      });

      // Listen for PTY exit
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`PTY process exited with code ${exitCode} and signal ${signal}`);
        this.ptyProcess = null;
      });

      console.log(`PTY spawned with PID: ${this.ptyProcess.pid}`);
    } catch (error) {
      console.error('Failed to spawn PTY:', error);
    }
  }

  /**
   * Get the default shell for the current platform
   */
  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return 'powershell.exe';
    } else {
      return process.env.SHELL || '/bin/bash';
    }
  }

  /**
   * Write data to the PTY process
   */
  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  /**
   * Resize the PTY process
   */
  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (error) {
        console.error('Failed to resize PTY:', error);
      }
    }
  }

  /**
   * Clean up and dispose the PTY process
   */
  dispose(): void {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch (error) {
        console.error('Failed to kill PTY process:', error);
      }
      this.ptyProcess = null;
    }
  }
}
