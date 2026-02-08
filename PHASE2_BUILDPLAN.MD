The user wants a simpler minimal version to test SSH connection first before building the full Phase 2. This is a smart approach - get the core SSH functionality working before adding all the UI complexity.

Let me create a minimal implementation that:

    Adds ssh2 dependency
    Creates a basic SSH manager
    Adds a simple way to test connection (maybe a hardcoded test or simple prompt)
    Connects the SSH output to the existing terminal

This should be quick to implement and will validate that:

    ssh2 works with Electron
    We can establish SSH connections
    We can pipe data between SSH and xterm.js
    The authentication works

I'll keep it simple:

    Hardcoded test credentials (user can edit)
    Simple IPC to trigger connection
    Minimal UI (maybe just a button or keyboard shortcut)
    Use existing terminal for output

Minimal SSH Connection Test

Let's build a bare-bones SSH test to verify everything works before adding the full UI.
What We're Building

A minimal test that:

    Adds one button: "Connect to Pi"
    Prompts for host/username/password
    Establishes SSH connection
    Pipes SSH data to existing terminal
    Adds "Disconnect" to return to local shell

Step 1: Install SSH Dependency

powershell

cd C:\Users\mike_\OneDrive\Documents\AI_pi_helper
npm install ssh2
npm install --save-dev @types/ssh2

Step 2: Create SSH Manager

Create new file: src/main/ssh-manager.ts

typescript

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

Step 3: Update Main Process

Update src/main/main.ts - add these changes:

typescript

/**
 * Add these imports at the top
 */
import { SSHManager, SSHConfig, SSHStatus } from './ssh-manager';

/**
 * Add these variables after existing declarations
 */
let sshManager: SSHManager | null = null;
let isSSHActive = false;

/**
 * Add this function after initializePty()
 */
function initializeSSHManager(): void {
  sshManager = new SSHManager({
    onData: (data: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, data);
      }
    },
    onStatus: (status: SSHStatus, message?: string) => {
      console.log(`SSH Status: ${status}${message ? ` - ${message}` : ''}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ssh:status', { status, message });
      }
      
      // If disconnected or error, flag SSH as inactive
      if (status === 'disconnected' || status === 'error') {
        isSSHActive = false;
      } else if (status === 'connected') {
        isSSHActive = true;
      }
    }
  });
}

/**
 * Update the setupIpcHandlers() function - add these handlers
 */
function setupIpcHandlers(): void {
  // ... keep all existing handlers ...

  // ============== NEW SSH HANDLERS ==============

  // Connect to SSH server
  ipcMain.handle('ssh:connect', async (_event, config: SSHConfig) => {
    if (!sshManager) {
      initializeSSHManager();
    }

    try {
      // Clear the terminal before connecting
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, '\x1b[2J\x1b[H');
        mainWindow.webContents.send(
          IPC_CHANNELS.TERMINAL_DATA,
          `\x1b[33mConnecting to ${config.username}@${config.host}:${config.port}...\x1b[0m\r\n`
        );
      }

      const success = await sshManager!.connect(config);
      
      if (success) {
        isSSHActive = true;
        return { success: true };
      } else {
        return { success: false, error: 'Connection failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Disconnect SSH and return to local terminal
  ipcMain.handle('ssh:disconnect', async () => {
    if (sshManager) {
      sshManager.disconnect();
    }
    isSSHActive = false;

    // Clear terminal and show message
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, '\x1b[2J\x1b[H');
      mainWindow.webContents.send(
        IPC_CHANNELS.TERMINAL_DATA,
        '\x1b[33mDisconnected from SSH. Returning to local terminal...\x1b[0m\r\n\r\n'
      );
    }

    // Reinitialize local PTY
    if (ptyManager) {
      ptyManager.dispose();
    }
    initializePty();

    return { success: true };
  });

  // Get SSH status
  ipcMain.handle('ssh:status', () => {
    return {
      isConnected: sshManager?.isConnected() || false,
      status: sshManager?.getStatus() || 'disconnected',
      connectionInfo: sshManager?.getConnectionInfo()
    };
  });

  // ============== UPDATE EXISTING TERMINAL HANDLER ==============
  // Replace the existing TERMINAL_INPUT handler with this:
  
  ipcMain.on(IPC_CHANNELS.TERMINAL_INPUT, (_event, data: string) => {
    // Route to SSH if connected, otherwise to local PTY
    if (isSSHActive && sshManager?.isConnected()) {
      sshManager.write(data);
    } else if (ptyManager) {
      ptyManager.write(data);
    }
  });

  // ============== UPDATE EXISTING RESIZE HANDLER ==============
  // Replace the existing TERMINAL_RESIZE handler with this:

  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, cols: number, rows: number) => {
    // Resize both SSH and local PTY
    if (sshManager?.isConnected()) {
      sshManager.resize(cols, rows);
    }
    if (ptyManager) {
      ptyManager.resize(cols, rows);
    }
  });
}

/**
 * Update the window close handler to cleanup SSH
 * Find the mainWindow.on('closed') handler and update it:
 */
mainWindow.on('closed', () => {
  mainWindow = null;
  if (ptyManager) {
    ptyManager.dispose();
    ptyManager = null;
  }
  if (sshManager) {
    sshManager.disconnect();
    sshManager = null;
  }
});

Step 4: Update Preload Script

Update src/main/preload.ts - add SSH methods:

typescript

/**
 * Add to the electronAPI object (inside contextBridge.exposeInMainWorld)
 */

// Add these new methods to the existing electronAPI object:

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
  ipcRenderer.on('ssh:status', wrappedCallback);
},

Step 5: Update Types

Update src/shared/types.ts - add SSH types to the ElectronAPI interface:

typescript

/**
 * Add these to the ElectronAPI interface
 */

// SSH connection (add to existing interface)
sshConnect: (config: { 
  host: string; 
  port: number; 
  username: string; 
  password: string 
}) => Promise<{ success: boolean; error?: string }>;

sshDisconnect: () => Promise<{ success: boolean }>;

sshGetStatus: () => Promise<{ 
  isConnected: boolean; 
  status: string;
  connectionInfo?: { host: string; username: string } | null 
}>;

onSSHStatus: (callback: (data: { status: string; message?: string }) => void) => void;

Step 6: Update HTML

Update src/renderer/index.html - add a simple connection UI:

Find the terminal panel header and replace it with:

html

<!-- Left Panel: Terminal -->
<section id="terminal-panel" class="panel">
  <div class="panel-header">
    <div class="panel-header-left">
      <span class="panel-title">Terminal</span>
      <!-- Simple connection indicator -->
      <span id="connection-badge" class="connection-badge local">
        <span class="status-dot"></span>
        <span id="connection-label">Local</span>
      </span>
    </div>
    <div class="panel-header-right">
      <!-- Simple test buttons -->
      <button id="btn-ssh-connect" class="header-button" title="Connect to SSH">
        🔌 Connect
      </button>
      <button id="btn-ssh-disconnect" class="header-button hidden" title="Disconnect">
        ⏏ Disconnect
      </button>
    </div>
  </div>
  <div id="terminal-container"></div>
</section>

Add this to the modal container (before </body>):

html

<!-- Simple SSH Connect Dialog -->
<div id="ssh-dialog" class="modal-overlay hidden">
  <div class="modal ssh-modal">
    <div class="modal-header">
      <h2 class="modal-title">Connect to SSH Server</h2>
      <button class="modal-close" id="ssh-dialog-close">✕</button>
    </div>
    <div class="modal-body">
      <form id="ssh-form">
        <div class="form-group">
          <label for="ssh-host">Host</label>
          <input type="text" id="ssh-host" name="host" 
                 placeholder="192.168.1.100" required>
        </div>
        <div class="form-group">
          <label for="ssh-port">Port</label>
          <input type="number" id="ssh-port" name="port" 
                 value="22" min="1" max="65535" required>
        </div>
        <div class="form-group">
          <label for="ssh-username">Username</label>
          <input type="text" id="ssh-username" name="username" 
                 placeholder="pi" required>
        </div>
        <div class="form-group">
          <label for="ssh-password">Password</label>
          <input type="password" id="ssh-password" name="password" 
                 placeholder="Enter password" required>
        </div>
        <div id="ssh-error" class="form-status error hidden">
          <span class="status-message"></span>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-ghost" id="btn-ssh-cancel">
        Cancel
      </button>
      <button type="submit" class="btn btn-primary" id="btn-ssh-submit" form="ssh-form">
        Connect
      </button>
    </div>
  </div>
</div>

Step 7: Add Simple CSS

Add to src/renderer/styles/layout.css:

css

/* ==================== Header Buttons ==================== */
.header-button {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.header-button:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.header-button.hidden {
  display: none;
}

/* Connection Badge Updates */
.connection-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  background-color: var(--bg-tertiary);
  margin-left: 10px;
}

.connection-badge .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.connection-badge.local .status-dot {
  background-color: var(--text-secondary);
}

.connection-badge.connecting .status-dot {
  background-color: var(--accent-warning);
  animation: pulse 1s infinite;
}

.connection-badge.connected .status-dot {
  background-color: var(--accent-success);
  box-shadow: 0 0 6px var(--accent-success);
}

.connection-badge.error .status-dot {
  background-color: var(--accent-error);
}

/* ==================== Simple Modal ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-overlay.hidden {
  display: none;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  width: 360px;
  max-width: 90%;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-primary);
}

.modal-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--text-secondary);
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
}

/* Form Styles */
.form-group {
  margin-bottom: 12px;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group input::placeholder {
  color: var(--text-disabled);
}

.form-status {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.form-status.error {
  background: rgba(241, 76, 76, 0.1);
  border: 1px solid var(--accent-error);
  color: var(--accent-error);
}

.form-status.hidden {
  display: none;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-secondary);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

Step 8: Update Renderer

Update src/renderer/renderer.ts - add SSH UI logic:

typescript

/**
 * Add these variables at the top (after existing variables)
 */
let isSSHConnected = false;

/**
 * Add this function after existing functions
 */
function initializeSSH(): void {
  const connectBtn = document.getElementById('btn-ssh-connect');
  const disconnectBtn = document.getElementById('btn-ssh-disconnect');
  const dialog = document.getElementById('ssh-dialog');
  const form = document.getElementById('ssh-form') as HTMLFormElement;
  const closeBtn = document.getElementById('ssh-dialog-close');
  const cancelBtn = document.getElementById('btn-ssh-cancel');
  const submitBtn = document.getElementById('btn-ssh-submit');
  const errorDiv = document.getElementById('ssh-error');
  const connectionBadge = document.getElementById('connection-badge');
  const connectionLabel = document.getElementById('connection-label');

  if (!connectBtn || !disconnectBtn || !dialog || !form) {
    console.error('SSH UI elements not found');
    return;
  }

  // Show connect dialog
  connectBtn.addEventListener('click', () => {
    dialog.classList.remove('hidden');
    const hostInput = document.getElementById('ssh-host') as HTMLInputElement;
    hostInput?.focus();
  });

  // Close dialog
  const closeDialog = () => {
    dialog.classList.add('hidden');
    form.reset();
    errorDiv?.classList.add('hidden');
  };

  closeBtn?.addEventListener('click', closeDialog);
  cancelBtn?.addEventListener('click', closeDialog);

  // Close on overlay click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dialog.classList.contains('hidden')) {
      closeDialog();
    }
  });

  // Handle form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const host = (document.getElementById('ssh-host') as HTMLInputElement).value;
    const port = parseInt((document.getElementById('ssh-port') as HTMLInputElement).value, 10);
    const username = (document.getElementById('ssh-username') as HTMLInputElement).value;
    const password = (document.getElementById('ssh-password') as HTMLInputElement).value;

    // Disable submit button
    if (submitBtn) {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = 'Connecting...';
    }

    // Update status
    updateConnectionStatus('connecting');

    try {
      const result = await window.electronAPI.sshConnect({ host, port, username, password });
      
      if (result.success) {
        closeDialog();
        isSSHConnected = true;
        connectBtn.classList.add('hidden');
        disconnectBtn?.classList.remove('hidden');
        updateConnectionStatus('connected', `${username}@${host}`);
        
        // Focus terminal
        terminalManager?.focus();
      } else {
        // Show error
        if (errorDiv) {
          errorDiv.classList.remove('hidden');
          const msgSpan = errorDiv.querySelector('.status-message');
          if (msgSpan) {
            msgSpan.textContent = result.error || 'Connection failed';
          }
        }
        updateConnectionStatus('error');
      }
    } catch (err: any) {
      if (errorDiv) {
        errorDiv.classList.remove('hidden');
        const msgSpan = errorDiv.querySelector('.status-message');
        if (msgSpan) {
          msgSpan.textContent = err.message || 'Connection failed';
        }
      }
      updateConnectionStatus('error');
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = 'Connect';
      }
    }
  });

  // Handle disconnect
  disconnectBtn.addEventListener('click', async () => {
    disconnectBtn.setAttribute('disabled', 'true');
    disconnectBtn.textContent = 'Disconnecting...';
    
    try {
      await window.electronAPI.sshDisconnect();
      isSSHConnected = false;
      disconnectBtn.classList.add('hidden');
      connectBtn.classList.remove('hidden');
      updateConnectionStatus('local');
      
      // Focus terminal
      terminalManager?.focus();
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      disconnectBtn.removeAttribute('disabled');
      disconnectBtn.textContent = '⏏ Disconnect';
    }
  });

  // Listen for SSH status changes from main process
  window.electronAPI.onSSHStatus((data) => {
    console.log('SSH status changed:', data);
    if (data.status === 'disconnected' && isSSHConnected) {
      // Connection was lost
      isSSHConnected = false;
      disconnectBtn?.classList.add('hidden');
      connectBtn.classList.remove('hidden');
      updateConnectionStatus('local');
    }
  });

  // Helper function to update connection status badge
  function updateConnectionStatus(status: string, label?: string): void {
    if (!connectionBadge || !connectionLabel) return;

    // Remove all status classes
    connectionBadge.classList.remove('local', 'connecting', 'connected', 'error');
    
    // Add new status class
    connectionBadge.classList.add(status);
    
    // Update label
    switch (status) {
      case 'local':
        connectionLabel.textContent = 'Local';
        break;
      case 'connecting':
        connectionLabel.textContent = 'Connecting...';
        break;
      case 'connected':
        connectionLabel.textContent = label || 'Connected';
        break;
      case 'error':
        connectionLabel.textContent = 'Error';
        break;
    }
  }

  console.log('SSH UI initialized');
}

/**
 * Update initializeApp() to call initializeSSH
 */
function initializeApp(): void {
  console.log('Initializing Pi Assistant...');

  initializeLayout();
  initializeTerminal();
  initializeWindowControls();
  setupKeyboardShortcuts();
  
  // ADD THIS LINE:
  initializeSSH();

  console.log('Pi Assistant initialized successfully');
}

Step 9: Build and Test

powershell

# Build the project
npm run build

# Run the app
npm start

Testing Steps

    App should launch with the terminal showing local PowerShell

    Click "🔌 Connect" button in the terminal header

    Fill in your Pi details:
        Host: 192.168.x.x (your Pi's IP)
        Port: 22
        Username: pi (or your username)
        Password: your password

    Click Connect - you should see:
        "Connecting to pi@192.168.x.x:22..." message
        Then the Pi's terminal prompt

    Test commands:

    bash

    whoami
    hostname
    ls -la
    uname -a

    Click "⏏ Disconnect" - should return to local PowerShell

Troubleshooting
Issue	Check
Connection timeout	Pi is reachable? Try ping 192.168.x.x
Auth failed	Correct username/password? SSH enabled on Pi?
Nothing happens	Check DevTools console (Ctrl+Shift+I) for errors
Build errors	Make sure ssh2 installed: npm list ssh2
What Success Looks Like

text

┌─────────────────────────────────────────────────────────────────┐
│ Terminal [🟢 pi@192.168.1.100]              [⏏ Disconnect]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  pi@raspberrypi:~ $ whoami                                       │
│  pi                                                              │
│  pi@raspberrypi:~ $ hostname                                     │
│  raspberrypi                                                     │
│  pi@raspberrypi:~ $ _                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘