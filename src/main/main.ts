/**
 * Main Process
 * Electron application entry point
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { PtyManager } from './pty';
import { IPC_CHANNELS, ServerFormData, SSHConnectionResult } from '../shared/types';
import { SSHManager, SSHConfig, SSHStatus } from './ssh-manager';
import { CredentialStore } from './store/credential-store';
import { ServerStore } from './store/server-store';

let mainWindow: BrowserWindow | null = null;
let ptyManager: PtyManager | null = null;
let sshManager: SSHManager | null = null;
let isSSHActive = false;
let credentialStore: CredentialStore;
let serverStore: ServerStore;

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Load the renderer HTML from dist directory
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Initialize PTY manager
  ptyManager = new PtyManager(mainWindow);

  // Initialize SSH manager
  initializeSSHManager();

  // Handle window close
  mainWindow.on('closed', () => {
    if (ptyManager) {
      ptyManager.dispose();
      ptyManager = null;
    }
    if (sshManager) {
      sshManager.disconnect();
      sshManager = null;
    }
    mainWindow = null;
  });
}

/**
 * Initialize SSH Manager
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
 * Initialize stores
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  console.log('Stores initialized');
  console.log(`Secure storage available: ${credentialStore.isAvailable()}`);
}

/**
 * Set up IPC handlers
 */
function setupIpcHandlers(): void {
  // Window controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Terminal controls
  ipcMain.on(IPC_CHANNELS.TERMINAL_INPUT, (_event, data: string) => {
    // Route to SSH if connected, otherwise to local PTY
    if (isSSHActive && sshManager?.isConnected()) {
      sshManager.write(data);
    } else if (ptyManager) {
      ptyManager.write(data);
    }
  });

  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, cols: number, rows: number) => {
    // Resize both SSH and local PTY
    if (sshManager?.isConnected()) {
      sshManager.resize(cols, rows);
    }
    if (ptyManager) {
      ptyManager.resize(cols, rows);
    }
  });

  // SSH handlers
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
    if (mainWindow) {
      ptyManager = new PtyManager(mainWindow);
    }

    return { success: true };
  });

  ipcMain.handle('ssh:status', () => {
    return {
      isConnected: sshManager?.isConnected() || false,
      status: sshManager?.getStatus() || 'disconnected',
      connectionInfo: sshManager?.getConnectionInfo()
    };
  });

  // ============== SERVER MANAGEMENT HANDLERS ==============

  // Get all servers
  ipcMain.handle(IPC_CHANNELS.SERVER_LIST, () => {
    return serverStore.getAll();
  });

  // Get single server
  ipcMain.handle(IPC_CHANNELS.SERVER_GET, (_, id: string) => {
    return serverStore.get(id);
  });

  // Create server
  ipcMain.handle(IPC_CHANNELS.SERVER_CREATE, (_, data: ServerFormData) => {
    return serverStore.create(data);
  });

  // Update server
  ipcMain.handle(IPC_CHANNELS.SERVER_UPDATE, (_, id: string, data: Partial<ServerFormData>) => {
    return serverStore.update(id, data);
  });

  // Delete server
  ipcMain.handle(IPC_CHANNELS.SERVER_DELETE, (_, id: string) => {
    return serverStore.delete(id);
  });

  // Check if server has stored password
  ipcMain.handle(IPC_CHANNELS.SERVER_HAS_PASSWORD, (_, id: string) => {
    return serverStore.hasPassword(id);
  });

  // Connect to saved server
  ipcMain.handle(IPC_CHANNELS.SERVER_CONNECT, async (_, id: string, password?: string): Promise<SSHConnectionResult> => {
    const server = serverStore.get(id);
    
    if (!server) {
      return { success: false, error: 'Server not found' };
    }

    // Get password from credential store or use provided password
    let pwd = password;
    if (!pwd) {
      pwd = serverStore.getPassword(id) || undefined;
    }

    if (!pwd) {
      return { success: false, error: 'Password required' };
    }

    // Initialize SSH manager if needed
    if (!sshManager) {
      initializeSSHManager();
    }

    // Clear terminal and show connecting message
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, '\x1b[2J\x1b[H');
      mainWindow.webContents.send(
        IPC_CHANNELS.TERMINAL_DATA,
        `\x1b[33mConnecting to ${server.name} (${server.username}@${server.host})...\x1b[0m\r\n`
      );
    }

    try {
      const success = await sshManager!.connect({
        host: server.host,
        port: server.port,
        username: server.username,
        password: pwd
      });

      if (success) {
        isSSHActive = true;
        serverStore.updateLastConnected(id);
        return { success: true, serverId: id };
      } else {
        return { success: false, error: 'Connection failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Test connection (without saving)
  ipcMain.handle(IPC_CHANNELS.SERVER_TEST_CONNECTION, async (_, config: SSHConfig): Promise<{ success: boolean; error?: string }> => {
    // Create a temporary SSH manager for testing
    let testSuccess = false;
    let testError: string | undefined;

    const testManager = new SSHManager({
      onData: () => {},  // Ignore data during test
      onStatus: (status: SSHStatus, message?: string) => {
        if (status === 'error') {
          testError = message || 'Connection failed';
        }
      }
    });

    try {
      testSuccess = await testManager.connect(config);
      
      if (!testSuccess) {
        testError = testError || 'Connection failed';
      }

      // Disconnect immediately after test
      testManager.disconnect();

      return { success: testSuccess, error: testError };
    } catch (error: any) {
      testManager.disconnect();
      return { success: false, error: error.message };
    }
  });
}

/**
 * Application initialization
 */
app.whenReady().then(() => {
  initializeStores();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handle app quit
 */
app.on('before-quit', () => {
  if (ptyManager) {
    ptyManager.dispose();
  }
});