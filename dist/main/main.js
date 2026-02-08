"use strict";
/**
 * Main Process
 * Electron application entry point
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const pty_1 = require("./pty");
const types_1 = require("../shared/types");
const ssh_manager_1 = require("./ssh-manager");
const credential_store_1 = require("./store/credential-store");
const server_store_1 = require("./store/server-store");
let mainWindow = null;
let ptyManager = null;
let sshManager = null;
let isSSHActive = false;
let credentialStore;
let serverStore;
/**
 * Create the main application window
 */
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    ptyManager = new pty_1.PtyManager(mainWindow);
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
function initializeSSHManager() {
    sshManager = new ssh_manager_1.SSHManager({
        onData: (data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, data);
            }
        },
        onStatus: (status, message) => {
            console.log(`SSH Status: ${status}${message ? ` - ${message}` : ''}`);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ssh:status', { status, message });
            }
            // If disconnected or error, flag SSH as inactive
            if (status === 'disconnected' || status === 'error') {
                isSSHActive = false;
            }
            else if (status === 'connected') {
                isSSHActive = true;
            }
        }
    });
}
/**
 * Initialize stores
 */
function initializeStores() {
    credentialStore = new credential_store_1.CredentialStore();
    serverStore = new server_store_1.ServerStore(credentialStore);
    console.log('Stores initialized');
    console.log(`Secure storage available: ${credentialStore.isAvailable()}`);
}
/**
 * Set up IPC handlers
 */
function setupIpcHandlers() {
    // Window controls
    electron_1.ipcMain.on(types_1.IPC_CHANNELS.WINDOW_MINIMIZE, () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });
    electron_1.ipcMain.on(types_1.IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            }
            else {
                mainWindow.maximize();
            }
        }
    });
    electron_1.ipcMain.on(types_1.IPC_CHANNELS.WINDOW_CLOSE, () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
        return mainWindow ? mainWindow.isMaximized() : false;
    });
    // Terminal controls
    electron_1.ipcMain.on(types_1.IPC_CHANNELS.TERMINAL_INPUT, (_event, data) => {
        // Route to SSH if connected, otherwise to local PTY
        if (isSSHActive && sshManager?.isConnected()) {
            sshManager.write(data);
        }
        else if (ptyManager) {
            ptyManager.write(data);
        }
    });
    electron_1.ipcMain.on(types_1.IPC_CHANNELS.TERMINAL_RESIZE, (_event, cols, rows) => {
        // Resize both SSH and local PTY
        if (sshManager?.isConnected()) {
            sshManager.resize(cols, rows);
        }
        if (ptyManager) {
            ptyManager.resize(cols, rows);
        }
    });
    // SSH handlers
    electron_1.ipcMain.handle('ssh:connect', async (_event, config) => {
        if (!sshManager) {
            initializeSSHManager();
        }
        try {
            // Clear the terminal before connecting
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, '\x1b[2J\x1b[H');
                mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, `\x1b[33mConnecting to ${config.username}@${config.host}:${config.port}...\x1b[0m\r\n`);
            }
            const success = await sshManager.connect(config);
            if (success) {
                isSSHActive = true;
                return { success: true };
            }
            else {
                return { success: false, error: 'Connection failed' };
            }
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle('ssh:disconnect', async () => {
        if (sshManager) {
            sshManager.disconnect();
        }
        isSSHActive = false;
        // Clear terminal and show message
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, '\x1b[2J\x1b[H');
            mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, '\x1b[33mDisconnected from SSH. Returning to local terminal...\x1b[0m\r\n\r\n');
        }
        // Reinitialize local PTY
        if (ptyManager) {
            ptyManager.dispose();
        }
        if (mainWindow) {
            ptyManager = new pty_1.PtyManager(mainWindow);
        }
        return { success: true };
    });
    electron_1.ipcMain.handle('ssh:status', () => {
        return {
            isConnected: sshManager?.isConnected() || false,
            status: sshManager?.getStatus() || 'disconnected',
            connectionInfo: sshManager?.getConnectionInfo()
        };
    });
    // ============== SERVER MANAGEMENT HANDLERS ==============
    // Get all servers
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_LIST, () => {
        return serverStore.getAll();
    });
    // Get single server
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_GET, (_, id) => {
        return serverStore.get(id);
    });
    // Create server
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_CREATE, (_, data) => {
        return serverStore.create(data);
    });
    // Update server
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_UPDATE, (_, id, data) => {
        return serverStore.update(id, data);
    });
    // Delete server
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_DELETE, (_, id) => {
        return serverStore.delete(id);
    });
    // Check if server has stored password
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_HAS_PASSWORD, (_, id) => {
        return serverStore.hasPassword(id);
    });
    // Connect to saved server
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_CONNECT, async (_, id, password) => {
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
            mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, '\x1b[2J\x1b[H');
            mainWindow.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, `\x1b[33mConnecting to ${server.name} (${server.username}@${server.host})...\x1b[0m\r\n`);
        }
        try {
            const success = await sshManager.connect({
                host: server.host,
                port: server.port,
                username: server.username,
                password: pwd
            });
            if (success) {
                isSSHActive = true;
                serverStore.updateLastConnected(id);
                return { success: true, serverId: id };
            }
            else {
                return { success: false, error: 'Connection failed' };
            }
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Test connection (without saving)
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SERVER_TEST_CONNECTION, async (_, config) => {
        // Create a temporary SSH manager for testing
        let testSuccess = false;
        let testError;
        const testManager = new ssh_manager_1.SSHManager({
            onData: () => { }, // Ignore data during test
            onStatus: (status, message) => {
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
        }
        catch (error) {
            testManager.disconnect();
            return { success: false, error: error.message };
        }
    });
}
/**
 * Application initialization
 */
electron_1.app.whenReady().then(() => {
    initializeStores();
    setupIpcHandlers();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
/**
 * Quit when all windows are closed (except on macOS)
 */
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
/**
 * Handle app quit
 */
electron_1.app.on('before-quit', () => {
    if (ptyManager) {
        ptyManager.dispose();
    }
});
//# sourceMappingURL=main.js.map