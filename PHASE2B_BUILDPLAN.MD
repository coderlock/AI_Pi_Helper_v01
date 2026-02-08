Phase 2B Build Plan: Server Profiles & Secure Credential Storage

Save this as PHASE2B_BUILD_PLAN.md in your project root.

markdown

# Pi Assistant - Phase 2B Build Plan
## Server Profiles, Secure Storage & Dropdown UI

### Prerequisites

- Phase 1 completed (Electron app with xterm.js terminal)
- Phase 2A completed (minimal SSH connection working)
- Successfully tested SSH connection to Raspberry Pi

### What We're Adding

|
 Feature 
|
 Description 
|

|
---------
|
-------------
|

|
 Server Profiles 
|
 Save multiple servers with name, host, credentials 
|

|
 Secure Storage 
|
 Passwords encrypted via OS credential manager 
|

|
 Server Dropdown 
|
 Quick selection menu in terminal header 
|

|
 CRUD Operations 
|
 Add, edit, delete saved servers 
|

|
 Persistent Storage 
|
 Servers remembered after app restart 
|

|
 Quick Connect 
|
 Connect without saving (already have dialog) 
|


---

### New Dependencies

```bash
npm install electron-store uuid
npm install --save-dev @types/uuid

Note: electron-store may already be installed from Phase 1.
Updated Project Structure

text

src/
├── main/
│   ├── main.ts                    # UPDATE: Add server IPC handlers
│   ├── preload.ts                 # UPDATE: Expose server API
│   ├── pty.ts                     # KEEP: No changes
│   ├── ssh-manager.ts             # KEEP: From Phase 2A
│   └── store/
│       ├── server-store.ts        # NEW: Server profile CRUD
│       └── credential-store.ts    # NEW: Secure password storage
├── renderer/
│   ├── index.html                 # UPDATE: Add dropdown, modals
│   ├── renderer.ts                # UPDATE: Initialize components
│   ├── terminal.ts                # KEEP: No changes
│   ├── layout.ts                  # KEEP: No changes
│   ├── components/
│   │   ├── server-dropdown.ts     # NEW: Dropdown menu component
│   │   └── server-modal.ts        # NEW: Add/Edit server modal
│   └── styles/
│       ├── main.css               # KEEP
│       ├── layout.css             # UPDATE: Minor tweaks
│       ├── terminal.css           # KEEP
│       └── components.css         # NEW: Dropdown & modal styles
└── shared/
    └── types.ts                   # UPDATE: Add server types

Type Definitions
Update src/shared/types.ts

Add these types to the existing file:

typescript

// ============== SERVER TYPES ==============

/**
 * Authentication method
 */
export type AuthMethod = 'password' | 'key';

/**
 * Server profile stored in electron-store
 * Note: Password is NOT stored here - it goes in credential-store
 */
export interface ServerProfile {
  id: string;
  name: string;
  description: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  privateKeyPath?: string;        // Future: SSH key support
  saveCredentials: boolean;
  lastConnected: number | null;   // Timestamp
  createdAt: number;
  updatedAt: number;
}

/**
 * Data for creating/updating a server
 */
export interface ServerFormData {
  name: string;
  description: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  password?: string;
  privateKeyPath?: string;
  saveCredentials: boolean;
}

/**
 * Server list item for display (subset of ServerProfile)
 */
export interface ServerListItem {
  id: string;
  name: string;
  description: string;
  host: string;
  username: string;
  lastConnected: number | null;
  hasStoredPassword: boolean;
}

/**
 * Quick connect data (not saved)
 */
export interface QuickConnectData {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Result from SSH connection attempt
 */
export interface SSHConnectionResult {
  success: boolean;
  error?: string;
  serverId?: string;
}

// ============== IPC CHANNELS ==============

// Add to existing IPC_CHANNELS constant:
export const IPC_CHANNELS = {
  // ... existing channels from Phase 1 & 2A ...
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_READY: 'terminal:ready',
  
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // SSH (from Phase 2A)
  SSH_CONNECT: 'ssh:connect',
  SSH_DISCONNECT: 'ssh:disconnect',
  SSH_STATUS: 'ssh:status',

  // NEW: Server management
  SERVER_LIST: 'server:list',
  SERVER_GET: 'server:get',
  SERVER_CREATE: 'server:create',
  SERVER_UPDATE: 'server:update',
  SERVER_DELETE: 'server:delete',
  SERVER_CONNECT: 'server:connect',
  SERVER_HAS_PASSWORD: 'server:has-password',
} as const;

// ============== ELECTRON API EXTENSIONS ==============

// Add to existing ElectronAPI interface:
export interface ElectronAPI {
  // ... existing methods ...
  
  // NEW: Server management
  getServers: () => Promise<ServerListItem[]>;
  getServer: (id: string) => Promise<ServerProfile | null>;
  createServer: (data: ServerFormData) => Promise<ServerProfile>;
  updateServer: (id: string, data: Partial<ServerFormData>) => Promise<ServerProfile | null>;
  deleteServer: (id: string) => Promise<boolean>;
  connectToServer: (id: string, password?: string) => Promise<SSHConnectionResult>;
  serverHasPassword: (id: string) => Promise<boolean>;
}

Component Specifications
1. Credential Store (src/main/store/credential-store.ts)

Purpose: Securely store passwords using OS keychain via Electron's safeStorage API

typescript

/**
 * Credential Store
 * Securely stores passwords using Electron's safeStorage API
 * 
 * On Windows: Uses Windows Credential Manager
 * On macOS: Uses Keychain
 * On Linux: Uses libsecret
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';

interface CredentialData {
  [serverId: string]: string;  // Base64 encoded encrypted password
}

export class CredentialStore {
  private store: Store<{ credentials: CredentialData }>;

  constructor() {
    this.store = new Store<{ credentials: CredentialData }>({
      name: 'credentials',
      encryptionKey: 'pi-assistant-credentials', // Additional layer
      defaults: {
        credentials: {}
      }
    });
  }

  /**
   * Check if encryption is available on this system
   */
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Store a password securely
   */
  setPassword(serverId: string, password: string): boolean {
    if (!this.isAvailable()) {
      console.warn('Secure storage not available - password will not be saved');
      return false;
    }

    try {
      // Encrypt the password
      const encrypted = safeStorage.encryptString(password);
      const base64 = encrypted.toString('base64');

      // Store in electron-store
      const credentials = this.store.get('credentials', {});
      credentials[serverId] = base64;
      this.store.set('credentials', credentials);

      console.log(`Password stored for server: ${serverId}`);
      return true;
    } catch (error) {
      console.error('Failed to store password:', error);
      return false;
    }
  }

  /**
   * Retrieve a stored password
   */
  getPassword(serverId: string): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const credentials = this.store.get('credentials', {});
      const base64 = credentials[serverId];

      if (!base64) {
        return null;
      }

      // Decrypt the password
      const encrypted = Buffer.from(base64, 'base64');
      const password = safeStorage.decryptString(encrypted);

      return password;
    } catch (error) {
      console.error('Failed to retrieve password:', error);
      return null;
    }
  }

  /**
   * Check if a password exists for a server
   */
  hasPassword(serverId: string): boolean {
    const credentials = this.store.get('credentials', {});
    return serverId in credentials;
  }

  /**
   * Delete a stored password
   */
  deletePassword(serverId: string): boolean {
    try {
      const credentials = this.store.get('credentials', {});
      
      if (serverId in credentials) {
        delete credentials[serverId];
        this.store.set('credentials', credentials);
        console.log(`Password deleted for server: ${serverId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete password:', error);
      return false;
    }
  }

  /**
   * Clear all stored passwords
   */
  clearAll(): void {
    this.store.set('credentials', {});
    console.log('All passwords cleared');
  }
}

2. Server Store (src/main/store/server-store.ts)

Purpose: CRUD operations for server profiles (non-sensitive data)

typescript

/**
 * Server Store
 * Manages server profiles using electron-store
 * Does NOT store passwords - those go in CredentialStore
 */

import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { 
  ServerProfile, 
  ServerFormData, 
  ServerListItem 
} from '../../shared/types';
import { CredentialStore } from './credential-store';

interface ServerStoreData {
  servers: ServerProfile[];
}

export class ServerStore {
  private store: Store<ServerStoreData>;
  private credentialStore: CredentialStore;

  constructor(credentialStore: CredentialStore) {
    this.credentialStore = credentialStore;
    this.store = new Store<ServerStoreData>({
      name: 'servers',
      defaults: {
        servers: []
      }
    });
  }

  /**
   * Get all servers as list items (for dropdown display)
   */
  getAll(): ServerListItem[] {
    const servers = this.store.get('servers', []);
    
    return servers.map(server => ({
      id: server.id,
      name: server.name,
      description: server.description,
      host: server.host,
      username: server.username,
      lastConnected: server.lastConnected,
      hasStoredPassword: this.credentialStore.hasPassword(server.id)
    }));
  }

  /**
   * Get a single server by ID
   */
  get(id: string): ServerProfile | null {
    const servers = this.store.get('servers', []);
    return servers.find(s => s.id === id) || null;
  }

  /**
   * Create a new server profile
   */
  create(data: ServerFormData): ServerProfile {
    const now = Date.now();
    
    const server: ServerProfile = {
      id: uuidv4(),
      name: data.name.trim(),
      description: data.description?.trim() || '',
      host: data.host.trim(),
      port: data.port || 22,
      username: data.username.trim(),
      authMethod: data.authMethod || 'password',
      privateKeyPath: data.privateKeyPath,
      saveCredentials: data.saveCredentials,
      lastConnected: null,
      createdAt: now,
      updatedAt: now
    };

    // Save password if provided and user wants to save it
    if (data.password && data.saveCredentials) {
      this.credentialStore.setPassword(server.id, data.password);
    }

    // Add to store
    const servers = this.store.get('servers', []);
    servers.push(server);
    this.store.set('servers', servers);

    console.log(`Server created: ${server.name} (${server.id})`);
    return server;
  }

  /**
   * Update an existing server profile
   */
  update(id: string, data: Partial<ServerFormData>): ServerProfile | null {
    const servers = this.store.get('servers', []);
    const index = servers.findIndex(s => s.id === id);

    if (index === -1) {
      return null;
    }

    // Update fields
    const server = servers[index];
    
    if (data.name !== undefined) server.name = data.name.trim();
    if (data.description !== undefined) server.description = data.description.trim();
    if (data.host !== undefined) server.host = data.host.trim();
    if (data.port !== undefined) server.port = data.port;
    if (data.username !== undefined) server.username = data.username.trim();
    if (data.authMethod !== undefined) server.authMethod = data.authMethod;
    if (data.privateKeyPath !== undefined) server.privateKeyPath = data.privateKeyPath;
    if (data.saveCredentials !== undefined) server.saveCredentials = data.saveCredentials;
    
    server.updatedAt = Date.now();

    // Update password if provided
    if (data.password) {
      if (data.saveCredentials) {
        this.credentialStore.setPassword(id, data.password);
      } else {
        // User unchecked "save password" - delete stored password
        this.credentialStore.deletePassword(id);
      }
    } else if (data.saveCredentials === false) {
      // User unchecked "save password" without providing new password
      this.credentialStore.deletePassword(id);
    }

    // Save to store
    servers[index] = server;
    this.store.set('servers', servers);

    console.log(`Server updated: ${server.name} (${server.id})`);
    return server;
  }

  /**
   * Delete a server profile
   */
  delete(id: string): boolean {
    const servers = this.store.get('servers', []);
    const index = servers.findIndex(s => s.id === id);

    if (index === -1) {
      return false;
    }

    const server = servers[index];

    // Delete stored password
    this.credentialStore.deletePassword(id);

    // Remove from store
    servers.splice(index, 1);
    this.store.set('servers', servers);

    console.log(`Server deleted: ${server.name} (${id})`);
    return true;
  }

  /**
   * Update last connected timestamp
   */
  updateLastConnected(id: string): void {
    const servers = this.store.get('servers', []);
    const index = servers.findIndex(s => s.id === id);

    if (index !== -1) {
      servers[index].lastConnected = Date.now();
      this.store.set('servers', servers);
    }
  }

  /**
   * Get password for a server (from credential store)
   */
  getPassword(id: string): string | null {
    return this.credentialStore.getPassword(id);
  }

  /**
   * Check if server has stored password
   */
  hasPassword(id: string): boolean {
    return this.credentialStore.hasPassword(id);
  }
}

3. Update Main Process (src/main/main.ts)

Add server management IPC handlers:

typescript

/**
 * Add these imports at the top
 */
import { CredentialStore } from './store/credential-store';
import { ServerStore } from './store/server-store';
import { ServerFormData } from '../shared/types';

/**
 * Add these after existing variable declarations
 */
let credentialStore: CredentialStore;
let serverStore: ServerStore;

/**
 * Initialize stores - call this early in app.whenReady()
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  console.log('Stores initialized');
  console.log(`Secure storage available: ${credentialStore.isAvailable()}`);
}

/**
 * Add these IPC handlers in setupIpcHandlers()
 */

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
ipcMain.handle(IPC_CHANNELS.SERVER_CONNECT, async (_, id: string, password?: string) => {
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

/**
 * Update app.whenReady() to initialize stores
 */
app.whenReady().then(() => {
  initializeStores();  // ADD THIS LINE
  setupIpcHandlers();
  createWindow();
  // ... rest of existing code
});

4. Update Preload Script (src/main/preload.ts)

Add server management methods:

typescript

/**
 * Add to the electronAPI object
 */

// Server management
getServers: () => ipcRenderer.invoke(IPC_CHANNELS.SERVER_LIST),

getServer: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_GET, id),

createServer: (data: ServerFormData) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_CREATE, data),

updateServer: (id: string, data: Partial<ServerFormData>) => 
  ipcRenderer.invoke(IPC_CHANNELS.SERVER_UPDATE, id, data),

deleteServer: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_DELETE, id),

connectToServer: (id: string, password?: string) => 
  ipcRenderer.invoke(IPC_CHANNELS.SERVER_CONNECT, id, password),

serverHasPassword: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_HAS_PASSWORD, id),

5. Server Dropdown Component (src/renderer/components/server-dropdown.ts)

Purpose: Dropdown menu for selecting servers in terminal header

typescript

/**
 * Server Dropdown Component
 * Displays list of saved servers with quick actions
 */

import { ServerListItem } from '../../shared/types';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ServerDropdownOptions {
  container: HTMLElement;
  onSelectServer: (serverId: string) => void;
  onQuickConnect: () => void;
  onAddServer: () => void;
  onEditServer: (serverId: string) => void;
  onDeleteServer: (serverId: string) => void;
  onDisconnect: () => void;
  onLocalTerminal: () => void;
}

export class ServerDropdown {
  private container: HTMLElement;
  private options: ServerDropdownOptions;
  private button!: HTMLElement;
  private menu!: HTMLElement;
  private isOpen: boolean = false;
  private servers: ServerListItem[] = [];
  private status: ConnectionStatus = 'disconnected';
  private connectedServer: ServerListItem | null = null;

  constructor(options: ServerDropdownOptions) {
    this.container = options.container;
    this.options = options;
  }

  /**
   * Initialize the dropdown
   */
  initialize(): void {
    this.render();
    this.attachEventListeners();
    this.refreshServers();
    console.log('Server dropdown initialized');
  }

  /**
   * Render the dropdown HTML
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="server-dropdown">
        <button class="server-dropdown-button" id="server-dropdown-btn">
          <span class="status-dot disconnected"></span>
          <span class="dropdown-label">Local</span>
          <span class="dropdown-arrow">▾</span>
        </button>
        <div class="server-dropdown-menu hidden" id="server-dropdown-menu">
          <div class="menu-section">
            <div class="menu-item" data-action="local">
              <span class="status-dot local"></span>
              <span class="menu-item-label">Local Terminal</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-section" id="servers-section">
            <div class="menu-section-label">Saved Servers</div>
            <div id="servers-list">
              <div class="menu-empty">No saved servers</div>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-section">
            <div class="menu-item" data-action="quick-connect">
              <span class="menu-icon">⚡</span>
              <span class="menu-item-label">Quick Connect...</span>
            </div>
            <div class="menu-item" data-action="add-server">
              <span class="menu-icon">+</span>
              <span class="menu-item-label">Add Server...</span>
            </div>
          </div>
          
          <div class="menu-divider disconnect-section hidden"></div>
          
          <div class="menu-section disconnect-section hidden">
            <div class="menu-item disconnect" data-action="disconnect">
              <span class="menu-icon">⏏</span>
              <span class="menu-item-label">Disconnect</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.button = this.container.querySelector('#server-dropdown-btn')!;
    this.menu = this.container.querySelector('#server-dropdown-menu')!;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Toggle dropdown on button click
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Handle menu item clicks
    this.menu.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const menuItem = target.closest('.menu-item') as HTMLElement;
      
      if (!menuItem) return;

      const action = menuItem.dataset.action;
      const serverId = menuItem.dataset.serverId;

      if (action === 'local') {
        this.options.onLocalTerminal();
        this.close();
      } else if (action === 'quick-connect') {
        this.options.onQuickConnect();
        this.close();
      } else if (action === 'add-server') {
        this.options.onAddServer();
        this.close();
      } else if (action === 'disconnect') {
        this.options.onDisconnect();
        this.close();
      } else if (serverId) {
        // Check for edit/delete buttons
        if (target.closest('.server-edit-btn')) {
          this.options.onEditServer(serverId);
          this.close();
        } else if (target.closest('.server-delete-btn')) {
          if (confirm('Delete this server?')) {
            this.options.onDeleteServer(serverId);
          }
        } else {
          // Connect to server
          this.options.onSelectServer(serverId);
          this.close();
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Refresh server list from main process
   */
  async refreshServers(): Promise<void> {
    try {
      this.servers = await window.electronAPI.getServers();
      this.renderServerList();
    } catch (error) {
      console.error('Failed to refresh servers:', error);
    }
  }

  /**
   * Render the server list in the menu
   */
  private renderServerList(): void {
    const listContainer = this.menu.querySelector('#servers-list')!;

    if (this.servers.length === 0) {
      listContainer.innerHTML = '<div class="menu-empty">No saved servers</div>';
      return;
    }

    // Sort by last connected (most recent first), then by name
    const sorted = [...this.servers].sort((a, b) => {
      if (a.lastConnected && b.lastConnected) {
        return b.lastConnected - a.lastConnected;
      }
      if (a.lastConnected) return -1;
      if (b.lastConnected) return 1;
      return a.name.localeCompare(b.name);
    });

    listContainer.innerHTML = sorted.map(server => {
      const isConnected = this.connectedServer?.id === server.id;
      const hasPassword = server.hasStoredPassword;
      
      return `
        <div class="menu-item server-item ${isConnected ? 'active' : ''}" 
             data-server-id="${server.id}">
          <span class="status-dot ${isConnected ? 'connected' : 'disconnected'}"></span>
          <div class="server-info">
            <span class="server-name">${this.escapeHtml(server.name)}</span>
            <span class="server-host">${server.username}@${server.host}</span>
          </div>
          <div class="server-actions">
            ${!hasPassword ? '<span class="no-password-icon" title="Password not saved">🔑</span>' : ''}
            <button class="server-edit-btn" title="Edit">✏️</button>
            <button class="server-delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Update connection status display
   */
  updateStatus(status: ConnectionStatus, server?: ServerListItem | null): void {
    this.status = status;
    this.connectedServer = server || null;

    const statusDot = this.button.querySelector('.status-dot')!;
    const label = this.button.querySelector('.dropdown-label')!;

    // Update status dot
    statusDot.className = 'status-dot ' + status;

    // Update label
    if (status === 'connected' && server) {
      label.textContent = server.name;
    } else if (status === 'connecting') {
      label.textContent = 'Connecting...';
    } else {
      label.textContent = 'Local';
    }

    // Show/hide disconnect section
    const disconnectSections = this.menu.querySelectorAll('.disconnect-section');
    disconnectSections.forEach(section => {
      section.classList.toggle('hidden', status !== 'connected');
    });

    // Re-render server list to update active state
    this.renderServerList();
  }

  /**
   * Open the dropdown menu
   */
  open(): void {
    this.isOpen = true;
    this.menu.classList.remove('hidden');
    this.button.classList.add('open');
    this.refreshServers(); // Refresh on open
  }

  /**
   * Close the dropdown menu
   */
  close(): void {
    this.isOpen = false;
    this.menu.classList.add('hidden');
    this.button.classList.remove('open');
  }

  /**
   * Toggle dropdown open/closed
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

6. Server Modal Component (src/renderer/components/server-modal.ts)

Purpose: Modal for adding/editing server profiles

typescript

/**
 * Server Modal Component
 * Modal dialog for adding and editing server profiles
 */

import { ServerProfile, ServerFormData } from '../../shared/types';

type ModalMode = 'add' | 'edit';

export interface ServerModalOptions {
  onSave: (data: ServerFormData, id?: string) => Promise<void>;
  onClose: () => void;
}

export class ServerModal {
  private overlay!: HTMLElement;
  private form!: HTMLFormElement;
  private options: ServerModalOptions;
  private mode: ModalMode = 'add';
  private editingId: string | null = null;

  constructor(options: ServerModalOptions) {
    this.options = options;
    this.createModal();
    this.attachEventListeners();
  }

  /**
   * Create modal HTML
   */
  private createModal(): void {
    const modalHtml = `
      <div id="server-modal-overlay" class="modal-overlay hidden">
        <div class="modal server-modal">
          <div class="modal-header">
            <h2 class="modal-title" id="server-modal-title">Add Server</h2>
            <button class="modal-close" id="server-modal-close">✕</button>
          </div>
          <div class="modal-body">
            <form id="server-modal-form">
              <div class="form-section">
                <div class="form-group">
                  <label for="server-name">Display Name *</label>
                  <input type="text" id="server-name" name="name" 
                         placeholder="Pi - Living Room" required>
                </div>
                <div class="form-group">
                  <label for="server-description">Description</label>
                  <input type="text" id="server-description" name="description"
                         placeholder="Raspberry Pi 4 (optional)">
                </div>
              </div>

              <div class="form-section">
                <div class="form-section-title">Connection</div>
                <div class="form-row">
                  <div class="form-group flex-grow">
                    <label for="server-host">Host *</label>
                    <input type="text" id="server-host" name="host"
                           placeholder="192.168.1.100" required>
                  </div>
                  <div class="form-group port-field">
                    <label for="server-port">Port *</label>
                    <input type="number" id="server-port" name="port"
                           value="22" min="1" max="65535" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="server-username">Username *</label>
                  <input type="text" id="server-username" name="username"
                         placeholder="pi" required>
                </div>
              </div>

              <div class="form-section">
                <div class="form-section-title">Authentication</div>
                <div class="form-group">
                  <label for="server-password">Password</label>
                  <div class="password-input-wrapper">
                    <input type="password" id="server-password" name="password"
                           placeholder="Enter password">
                    <button type="button" class="toggle-password" id="toggle-password">
                      👁
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="server-save-credentials" 
                           name="saveCredentials" checked>
                    <span>Save password securely</span>
                  </label>
                  <p class="form-hint">
                    Password will be encrypted and stored in your system's credential manager
                  </p>
                </div>
              </div>

              <div id="server-modal-error" class="form-status error hidden">
                <span class="status-message"></span>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="server-modal-cancel">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" id="server-modal-save" 
                    form="server-modal-form">
              Save Server
            </button>
          </div>
        </div>
      </div>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    this.overlay = document.getElementById('server-modal-overlay')!;
    this.form = document.getElementById('server-modal-form') as HTMLFormElement;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Close button
    document.getElementById('server-modal-close')!.addEventListener('click', () => {
      this.hide();
    });

    // Cancel button
    document.getElementById('server-modal-cancel')!.addEventListener('click', () => {
      this.hide();
    });

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
        this.hide();
      }
    });

    // Toggle password visibility
    document.getElementById('toggle-password')!.addEventListener('click', () => {
      const input = document.getElementById('server-password') as HTMLInputElement;
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Form submit
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(): Promise<void> {
    const saveBtn = document.getElementById('server-modal-save') as HTMLButtonElement;
    const errorDiv = document.getElementById('server-modal-error')!;
    
    // Disable save button
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    errorDiv.classList.add('hidden');

    try {
      const formData = this.getFormData();
      await this.options.onSave(formData, this.editingId || undefined);
      this.hide();
    } catch (error: any) {
      // Show error
      errorDiv.classList.remove('hidden');
      errorDiv.querySelector('.status-message')!.textContent = 
        error.message || 'Failed to save server';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Server';
    }
  }

  /**
   * Get form data
   */
  private getFormData(): ServerFormData {
    return {
      name: (document.getElementById('server-name') as HTMLInputElement).value,
      description: (document.getElementById('server-description') as HTMLInputElement).value,
      host: (document.getElementById('server-host') as HTMLInputElement).value,
      port: parseInt((document.getElementById('server-port') as HTMLInputElement).value, 10),
      username: (document.getElementById('server-username') as HTMLInputElement).value,
      password: (document.getElementById('server-password') as HTMLInputElement).value || undefined,
      authMethod: 'password',
      saveCredentials: (document.getElementById('server-save-credentials') as HTMLInputElement).checked
    };
  }

  /**
   * Show modal for adding new server
   */
  showAdd(): void {
    this.mode = 'add';
    this.editingId = null;
    
    // Reset form
    this.form.reset();
    (document.getElementById('server-port') as HTMLInputElement).value = '22';
    (document.getElementById('server-save-credentials') as HTMLInputElement).checked = true;
    
    // Update title
    document.getElementById('server-modal-title')!.textContent = 'Add Server';
    document.getElementById('server-modal-save')!.textContent = 'Save Server';
    
    // Clear errors
    document.getElementById('server-modal-error')!.classList.add('hidden');
    
    // Show modal
    this.overlay.classList.remove('hidden');
    
    // Focus first input
    setTimeout(() => {
      (document.getElementById('server-name') as HTMLInputElement).focus();
    }, 100);
  }

  /**
   * Show modal for editing existing server
   */
  async showEdit(serverId: string): Promise<void> {
    this.mode = 'edit';
    this.editingId = serverId;

    // Load server data
    const server = await window.electronAPI.getServer(serverId);
    if (!server) {
      console.error('Server not found:', serverId);
      return;
    }

    // Populate form
    (document.getElementById('server-name') as HTMLInputElement).value = server.name;
    (document.getElementById('server-description') as HTMLInputElement).value = server.description;
    (document.getElementById('server-host') as HTMLInputElement).value = server.host;
    (document.getElementById('server-port') as HTMLInputElement).value = server.port.toString();
    (document.getElementById('server-username') as HTMLInputElement).value = server.username;
    (document.getElementById('server-password') as HTMLInputElement).value = '';  // Don't show stored password
    (document.getElementById('server-save-credentials') as HTMLInputElement).checked = server.saveCredentials;

    // Update title
    document.getElementById('server-modal-title')!.textContent = 'Edit Server';
    document.getElementById('server-modal-save')!.textContent = 'Update Server';

    // Clear errors
    document.getElementById('server-modal-error')!.classList.add('hidden');

    // Show modal
    this.overlay.classList.remove('hidden');

    // Focus first input
    setTimeout(() => {
      (document.getElementById('server-name') as HTMLInputElement).focus();
    }, 100);
  }

  /**
   * Hide the modal
   */
  hide(): void {
    this.overlay.classList.add('hidden');
    this.options.onClose();
  }
}

7. Update HTML (src/renderer/index.html)

Replace the terminal panel header section:

html

<!-- Left Panel: Terminal -->
<section id="terminal-panel" class="panel">
  <div class="panel-header">
    <div class="panel-header-left">
      <span class="panel-title">Terminal</span>
      <!-- Server Dropdown Container -->
      <div id="server-dropdown-container"></div>
    </div>
    <div class="panel-header-right">
      <!-- Empty for now - actions are in dropdown -->
    </div>
  </div>
  <div id="terminal-container"></div>
</section>

Remove the old ssh-dialog if present (from Phase 2A) - we'll keep using it for Quick Connect but manage it differently.

Keep the Quick Connect dialog (from Phase 2A) but update the ID:

html

<!-- Quick Connect Dialog (keep from Phase 2A, just ensure it exists) -->
<div id="quick-connect-dialog" class="modal-overlay hidden">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Quick Connect</h2>
      <button class="modal-close" id="quick-connect-close">✕</button>
    </div>
    <div class="modal-body">
      <form id="quick-connect-form">
        <div class="form-group">
          <label for="qc-host">Host</label>
          <input type="text" id="qc-host" name="host" 
                 placeholder="192.168.1.100" required>
        </div>
        <div class="form-group">
          <label for="qc-port">Port</label>
          <input type="number" id="qc-port" name="port" 
                 value="22" min="1" max="65535" required>
        </div>
        <div class="form-group">
          <label for="qc-username">Username</label>
          <input type="text" id="qc-username" name="username" 
                 placeholder="pi" required>
        </div>
        <div class="form-group">
          <label for="qc-password">Password</label>
          <input type="password" id="qc-password" name="password" 
                 placeholder="Enter password" required>
        </div>
        <div id="qc-error" class="form-status error hidden">
          <span class="status-message"></span>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-ghost" id="qc-cancel">Cancel</button>
      <button type="submit" class="btn btn-primary" id="qc-submit" form="quick-connect-form">
        Connect
      </button>
    </div>
  </div>
</div>

<!-- Password Prompt Dialog (for servers without stored password) -->
<div id="password-prompt-dialog" class="modal-overlay hidden">
  <div class="modal modal-small">
    <div class="modal-header">
      <h2 class="modal-title">Enter Password</h2>
      <button class="modal-close" id="password-prompt-close">✕</button>
    </div>
    <div class="modal-body">
      <form id="password-prompt-form">
        <p id="password-prompt-message" class="form-hint" style="margin-bottom: 12px;">
          Enter password for server
        </p>
        <div class="form-group">
          <label for="prompt-password">Password</label>
          <input type="password" id="prompt-password" name="password" required>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="prompt-save-password">
            <span>Save password for future connections</span>
          </label>
        </div>
        <div id="password-prompt-error" class="form-status error hidden">
          <span class="status-message"></span>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-ghost" id="password-prompt-cancel">Cancel</button>
      <button type="submit" class="btn btn-primary" id="password-prompt-submit" 
              form="password-prompt-form">
        Connect
      </button>
    </div>
  </div>
</div>

Add stylesheet link in <head>:

html

<link rel="stylesheet" href="styles/components.css">

8. New CSS File (src/renderer/styles/components.css)

css

/**
 * Component Styles
 * Dropdown, modals, and related components
 */

/* ==================== SERVER DROPDOWN ==================== */

.server-dropdown {
  position: relative;
  margin-left: 12px;
}

.server-dropdown-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  max-width: 180px;
  min-width: 100px;
}

.server-dropdown-button:hover,
.server-dropdown-button.open {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.disconnected,
.status-dot.local {
  background-color: var(--text-secondary);
}

.status-dot.connecting {
  background-color: var(--accent-warning);
  animation: pulse 1s infinite;
}

.status-dot.connected {
  background-color: var(--accent-success);
  box-shadow: 0 0 6px var(--accent-success);
}

.status-dot.error {
  background-color: var(--accent-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.dropdown-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: left;
}

.dropdown-arrow {
  font-size: 10px;
  opacity: 0.6;
  transition: transform var(--transition-fast);
}

.server-dropdown-button.open .dropdown-arrow {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.server-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 280px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
}

.server-dropdown-menu.hidden {
  display: none;
}

.menu-section {
  padding: 4px 0;
}

.menu-section-label {
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item.active {
  background: var(--bg-active);
}

.menu-item .menu-icon {
  width: 16px;
  text-align: center;
  font-size: 12px;
}

.menu-item .menu-item-label {
  flex: 1;
}

.menu-item.disconnect {
  color: var(--accent-error);
}

.menu-item.disconnect:hover {
  background: rgba(241, 76, 76, 0.1);
}

.menu-divider {
  height: 1px;
  background: var(--border-primary);
  margin: 4px 0;
}

.menu-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  font-style: italic;
}

/* Server Item in Menu */
.server-item {
  position: relative;
}

.server-item .server-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.server-item .server-name {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-item .server-host {
  font-size: 11px;
  color: var(--text-secondary);
}

.server-item .server-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.server-item:hover .server-actions {
  opacity: 1;
}

.server-item .server-actions button {
  padding: 2px 4px;
  font-size: 10px;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.server-item .server-actions button:hover {
  opacity: 1;
}

.server-item .no-password-icon {
  font-size: 10px;
  opacity: 0.5;
}

/* ==================== MODALS ==================== */

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
  backdrop-filter: blur(2px);
}

.modal-overlay.hidden {
  display: none;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.2s ease;
}

.modal.modal-small {
  width: 340px;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-primary);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
}

/* ==================== FORMS ==================== */

.form-section {
  margin-bottom: 16px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-secondary);
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  transition: border-color var(--transition-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group input::placeholder {
  color: var(--text-disabled);
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-row .flex-grow {
  flex: 1;
}

.form-row .port-field {
  width: 80px;
}

.form-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Password Input */
.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  padding-right: 36px;
}

.toggle-password {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  font-size: 12px;
  opacity: 0.6;
  cursor: pointer;
  background: none;
  border: none;
}

.toggle-password:hover {
  opacity: 1;
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label input {
  accent-color: var(--accent-primary);
}

/* Form Status */
.form-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 12px;
}

.form-status.hidden {
  display: none;
}

.form-status.error {
  background: rgba(241, 76, 76, 0.1);
  border: 1px solid var(--accent-error);
  color: var(--accent-error);
}

.form-status.success {
  background: rgba(13, 188, 121, 0.1);
  border: 1px solid var(--accent-success);
  color: var(--accent-success);
}

/* ==================== BUTTONS ==================== */

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-secondary);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-danger {
  background: var(--accent-error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #ff6b6b;
}

/* ==================== HIDDEN ELEMENTS ==================== */

.hidden {
  display: none !important;
}

.disconnect-section.hidden {
  display: none;
}

9. Update Renderer (src/renderer/renderer.ts)

Replace SSH initialization with full server management:

typescript

/**
 * Add imports at the top
 */
import { ServerDropdown } from './components/server-dropdown';
import { ServerModal } from './components/server-modal';
import { ServerListItem, ServerFormData } from '../shared/types';

/**
 * Add variables after existing ones
 */
let serverDropdown: ServerDropdown | null = null;
let serverModal: ServerModal | null = null;
let connectedServerId: string | null = null;

/**
 * Replace the old initializeSSH() function with this
 */
function initializeServerManagement(): void {
  const dropdownContainer = document.getElementById('server-dropdown-container');
  
  if (!dropdownContainer) {
    console.error('Server dropdown container not found');
    return;
  }

  // Initialize server modal
  serverModal = new ServerModal({
    onSave: async (data: ServerFormData, id?: string) => {
      if (id) {
        await window.electronAPI.updateServer(id, data);
      } else {
        await window.electronAPI.createServer(data);
      }
      serverDropdown?.refreshServers();
    },
    onClose: () => {
      terminalManager?.focus();
    }
  });

  // Initialize server dropdown
  serverDropdown = new ServerDropdown({
    container: dropdownContainer,
    onSelectServer: handleServerSelect,
    onQuickConnect: showQuickConnectDialog,
    onAddServer: () => serverModal?.showAdd(),
    onEditServer: (id) => serverModal?.showEdit(id),
    onDeleteServer: handleDeleteServer,
    onDisconnect: handleDisconnect,
    onLocalTerminal: handleDisconnect
  });

  serverDropdown.initialize();

  // Initialize quick connect dialog
  initializeQuickConnectDialog();

  // Initialize password prompt dialog
  initializePasswordPromptDialog();

  // Listen for SSH status changes
  window.electronAPI.onSSHStatus((data) => {
    if (data.status === 'disconnected' || data.status === 'error') {
      connectedServerId = null;
      serverDropdown?.updateStatus('disconnected');
    }
  });

  console.log('Server management initialized');
}

/**
 * Handle server selection from dropdown
 */
async function handleServerSelect(serverId: string): Promise<void> {
  // Check if server has stored password
  const hasPassword = await window.electronAPI.serverHasPassword(serverId);
  
  if (hasPassword) {
    // Connect directly
    await connectToServer(serverId);
  } else {
    // Show password prompt
    showPasswordPrompt(serverId);
  }
}

/**
 * Connect to a server
 */
async function connectToServer(serverId: string, password?: string): Promise<void> {
  serverDropdown?.updateStatus('connecting');

  try {
    const result = await window.electronAPI.connectToServer(serverId, password);
    
    if (result.success) {
      connectedServerId = serverId;
      const servers = await window.electronAPI.getServers();
      const server = servers.find(s => s.id === serverId);
      serverDropdown?.updateStatus('connected', server || null);
      terminalManager?.focus();
    } else {
      serverDropdown?.updateStatus('error');
      alert(`Connection failed: ${result.error}`);
      serverDropdown?.updateStatus('disconnected');
    }
  } catch (error: any) {
    serverDropdown?.updateStatus('error');
    alert(`Connection failed: ${error.message}`);
    serverDropdown?.updateStatus('disconnected');
  }
}

/**
 * Handle disconnect
 */
async function handleDisconnect(): Promise<void> {
  try {
    await window.electronAPI.sshDisconnect();
    connectedServerId = null;
    serverDropdown?.updateStatus('disconnected');
    terminalManager?.focus();
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}

/**
 * Handle server deletion
 */
async function handleDeleteServer(serverId: string): Promise<void> {
  try {
    // Disconnect if connected to this server
    if (connectedServerId === serverId) {
      await handleDisconnect();