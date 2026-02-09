/**
 * Renderer Process Entry Point
 * Initializes all UI components and connects them to the main process
 */

import { TerminalManager } from './terminal';
import { LayoutManager } from './layout';
import { ServerDropdown } from './components/server-dropdown';
import { ServerModal } from './components/server-modal';
import { ChatContainer } from './components/chat-container';
import type { ServerProfile, ServerFormData } from '../shared/types';

// Import xterm.js CSS
import 'xterm/css/xterm.css';

// Global references
let terminalManager: TerminalManager | null = null;
let layoutManager: LayoutManager | null = null;
let serverDropdown: ServerDropdown | null = null;
let serverModal: ServerModal | null = null;
let chatContainer: ChatContainer | null = null;
let isSSHConnected = false;
let currentServerId: string | null = null;

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  console.log('Initializing Pi Assistant...');

  // Initialize layout
  initializeLayout();

  // Initialize terminal
  initializeTerminal();

  // Initialize window controls
  initializeWindowControls();

  // Set up global keyboard shortcuts
  setupKeyboardShortcuts();

  // Initialize server management UI
  initializeServerManagement();

  // Initialize chat UI
  await initializeChat();

  console.log('Pi Assistant initialized successfully');
}

/**
 * Initialize the split-pane layout
 */
function initializeLayout(): void {
  const leftPanel = document.getElementById('terminal-panel');
  const rightPanel = document.getElementById('chat-panel');
  const handle = document.getElementById('resize-handle');

  if (!leftPanel || !rightPanel || !handle) {
    console.error('Layout elements not found');
    return;
  }

  layoutManager = new LayoutManager({
    leftPanel,
    rightPanel,
    handle,
    minPanelWidth: 200,
    onResize: () => {
      // Refit terminal when layout changes
      if (terminalManager) {
        terminalManager.fit();
      }
    }
  });

  layoutManager.initialize();
}

/**
 * Initialize the terminal emulator
 */
function initializeTerminal(): void {
  const container = document.getElementById('terminal-container');
  
  if (!container) {
    console.error('Terminal container not found');
    return;
  }

  terminalManager = new TerminalManager({
    container,
    onData: (data: string) => {
      // Send user input to main process
      window.electronAPI.sendTerminalInput(data);
    },
    onResize: (cols: number, rows: number) => {
      // Notify main process of resize
      window.electronAPI.resizeTerminal(cols, rows);
      // Update status bar
      updateTerminalSize(cols, rows);
    }
  });

  terminalManager.initialize();

  // Listen for terminal data from main process
  window.electronAPI.onTerminalData((data: string) => {
    if (terminalManager) {
      terminalManager.write(data);
    }
  });

  // Initial resize notification
  const dims = terminalManager.getDimensions();
  window.electronAPI.resizeTerminal(dims.cols, dims.rows);
  updateTerminalSize(dims.cols, dims.rows);
}

/**
 * Update terminal size display in status bar
 */
function updateTerminalSize(cols: number, rows: number): void {
  const sizeElement = document.getElementById('terminal-size');
  if (sizeElement) {
    sizeElement.textContent = `${cols}×${rows}`;
  }
}

/**
 * Initialize window control buttons
 */
function initializeWindowControls(): void {
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');

  minimizeBtn?.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });

  maximizeBtn?.addEventListener('click', async () => {
    window.electronAPI.maximizeWindow();
    // Update maximize button icon based on state
    await updateMaximizeButton();
  });

  closeBtn?.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  // Update maximize button on window state change
  // Note: In a full implementation, you'd listen for maximize/unmaximize events
}

/**
 * Update maximize button appearance based on window state
 */
async function updateMaximizeButton(): Promise<void> {
  const maximizeBtn = document.getElementById('maximize-btn');
  if (!maximizeBtn) return;

  const isMaximized = await window.electronAPI.isMaximized();
  
  if (isMaximized) {
    // Show restore icon (two overlapping rectangles)
    maximizeBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
        <rect x="0" y="2" width="8" height="8" fill="var(--bg-primary)" stroke="currentColor" stroke-width="1"/>
      </svg>
    `;
    maximizeBtn.setAttribute('aria-label', 'Restore');
  } else {
    // Show maximize icon (single rectangle)
    maximizeBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
    `;
    maximizeBtn.setAttribute('aria-label', 'Maximize');
  }
}

/**
 * Set up global keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Ctrl+Shift+I: Open DevTools (handled by Electron, but we can add more)
    
    // Ctrl+L: Clear terminal
    if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      terminalManager?.clear();
    }

    // Ctrl+Shift+T: Focus terminal
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      terminalManager?.focus();
    }

    // F11: Toggle maximize
    if (event.key === 'F11') {
      event.preventDefault();
      window.electronAPI.maximizeWindow();
    }

    // Escape: Blur terminal (for accessibility)
    if (event.key === 'Escape') {
      terminalManager?.blur();
    }
  });
}

/**
 * Initialize server management UI
 */
function initializeServerManagement(): void {
  // Initialize server dropdown
  const dropdownContainer = document.getElementById('server-dropdown-container');
  if (dropdownContainer) {
    serverDropdown = new ServerDropdown({
      container: dropdownContainer,
      onSelectServer: handleServerSelect,
      onAddServer: handleAddServer,
      onEditServer: handleEditServer,
      onDeleteServer: handleDeleteServer,
      onQuickConnect: handleQuickConnect,
      onDisconnect: handleDisconnect,
      onLocalTerminal: handleLocalTerminal
    });
    serverDropdown.initialize();
  } else {
    console.error('Server dropdown container not found');
  }

  // Initialize server modal
  serverModal = new ServerModal({
    onSave: handleServerSave,
    onClose: () => {}
  });

  // Initialize quick connect dialog
  initializeQuickConnectDialog();

  // Initialize password prompt dialog
  initializePasswordPromptDialog();

  // Listen for SSH status changes from main process
  window.electronAPI.onSSHStatus((data) => {
    console.log('SSH status changed:', data);
    if (data.status === 'disconnected' && isSSHConnected) {
      // Connection was lost
      handleConnectionLost();
    }
  });

  console.log('Server management UI initialized');
}

/**
 * Handle server selection from dropdown
 */
async function handleServerSelect(serverId: string): Promise<void> {
  try {
    const server = await window.electronAPI.getServer(serverId);
    if (!server) {
      showError('Server not found');
      return;
    }

    // Check if server has saved password
    const hasPassword = await window.electronAPI.serverHasPassword(serverId);
    
    if (hasPassword) {
      // Connect directly with saved credentials
      await connectToServer(server);
    } else {
      // Prompt for password
      showPasswordPrompt(server);
    }
  } catch (err: any) {
    showError(`Failed to select server: ${err.message}`);
  }
}

/**
 * Connect to a server
 */
async function connectToServer(server: ServerProfile, password?: string): Promise<void> {
  updateConnectionStatus('connecting');
  serverDropdown?.updateStatus('connecting');

  try {
    const result = await window.electronAPI.connectToServer(server.id, password);
    
    if (result.success) {
      isSSHConnected = true;
      currentServerId = server.id;
      updateConnectionStatus('connected', `${server.username}@${server.host}`);
      serverDropdown?.updateStatus('connected');
      
      // Focus terminal
      terminalManager?.focus();
    } else {
      updateConnectionStatus('error');
      serverDropdown?.updateStatus('disconnected');
      showModalError('Connection Failed', result.error || 'Unknown error occurred');
    }
  } catch (err: any) {
    updateConnectionStatus('error');
    serverDropdown?.updateStatus('disconnected');
    showModalError('Connection Failed', err.message || 'Failed to connect to server');
  }
}

/**
 * Handle disconnect
 */
async function handleDisconnect(): Promise<void> {
  serverDropdown?.updateStatus('connecting');
  
  try {
    await window.electronAPI.sshDisconnect();
    isSSHConnected = false;
    currentServerId = null;
    updateConnectionStatus('local');
    serverDropdown?.updateStatus('disconnected');
    
    // Focus terminal
    terminalManager?.focus();
  } catch (err: any) {
    console.error('Disconnect error:', err);
    showError(`Failed to disconnect: ${err.message}`);
    serverDropdown?.updateStatus('disconnected');
  }
}

/**
 * Handle local terminal button
 */
async function handleLocalTerminal(): Promise<void> {
  if (isSSHConnected) {
    await handleDisconnect();
  }
}

/**
 * Handle connection lost
 */
function handleConnectionLost(): void {
  isSSHConnected = false;
  currentServerId = null;
  updateConnectionStatus('local');
  serverDropdown?.updateStatus('disconnected');
  showError('SSH connection was lost');
}

/**
 * Handle add server button
 */
function handleAddServer(): void {
  serverModal?.showAdd();
}

/**
 * Handle edit server button
 */
function handleEditServer(serverId: string): void {
  serverModal?.showEdit(serverId);
}

/**
 * Handle delete server button
 */
async function handleDeleteServer(serverId: string): Promise<void> {
  // Show confirmation dialog
  const confirmed = confirm('Are you sure you want to delete this server?');
  if (!confirmed) return;

  try {
    await window.electronAPI.deleteServer(serverId);
    
    // If we were connected to this server, disconnect
    if (currentServerId === serverId) {
      await handleDisconnect();
    }
    
    // Refresh server list
    await serverDropdown?.refreshServers();
  } catch (err: any) {
    showError(`Failed to delete server: ${err.message}`);
  }
}

/**
 * Handle quick connect button
 */
function handleQuickConnect(): void {
  const dialog = document.getElementById('quick-connect-dialog');
  if (dialog) {
    dialog.classList.remove('hidden');
    const hostInput = document.getElementById('qc-host') as HTMLInputElement;
    hostInput?.focus();
  }
}

/**
 * Handle server save from modal
 */
async function handleServerSave(data: ServerFormData, id?: string): Promise<void> {
  try {
    if (id) {
      // Update existing server
      await window.electronAPI.updateServer(id, data);
      console.log('Server updated:', id);
    } else {
      // Create new server
      const newServer = await window.electronAPI.createServer(data);
      console.log('Server created:', newServer.id);
    }
    
    // Refresh server list
    await serverDropdown?.refreshServers();
  } catch (err: any) {
    console.error('Failed to save server:', err);
    throw new Error(`Failed to save server: ${err.message}`);
  }
}

/**
 * Initialize quick connect dialog
 */
function initializeQuickConnectDialog(): void {
  const dialog = document.getElementById('quick-connect-dialog');
  const form = document.getElementById('quick-connect-form') as HTMLFormElement;
  const closeBtn = document.getElementById('quick-connect-close');
  const cancelBtn = document.getElementById('qc-cancel');

  if (!dialog || !form) {
    console.error('Quick connect dialog elements not found');
    return;
  }

  // Close dialog
  const closeDialog = () => {
    dialog.classList.add('hidden');
    form.reset();
    hideQuickConnectError();
  };

  closeBtn?.addEventListener('click', closeDialog);
  cancelBtn?.addEventListener('click', closeDialog);

  // Close on overlay click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Handle form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleQuickConnectSubmit(closeDialog);
  });
}

/**
 * Handle quick connect form submission
 */
async function handleQuickConnectSubmit(closeDialog: () => void): Promise<void> {
  const host = (document.getElementById('qc-host') as HTMLInputElement).value.trim();
  const port = parseInt((document.getElementById('qc-port') as HTMLInputElement).value, 10);
  const username = (document.getElementById('qc-username') as HTMLInputElement).value.trim();
  const password = (document.getElementById('qc-password') as HTMLInputElement).value;

  // Validate
  if (!host || !username || !password) {
    showQuickConnectError('Please fill in all fields');
    return;
  }

  // Update UI state
  updateConnectionStatus('connecting');
  serverDropdown?.updateStatus('connecting');

  // Get submit button for loading state
  const submitBtn = document.getElementById('qc-submit') as HTMLButtonElement;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connecting...';
  }

  try {
    // Call sshConnect directly - NOT connectToServer
    const result = await window.electronAPI.sshConnect({ host, port, username, password });
    
    if (result.success) {
      closeDialog();
      isSSHConnected = true;
      currentServerId = null;  // Quick connect is not a saved server
      
      updateConnectionStatus('connected', `${username}@${host}`);
      serverDropdown?.updateStatus('connected');
      
      // Focus terminal
      terminalManager?.focus();
    } else {
      showQuickConnectError(result.error || 'Connection failed');
      updateConnectionStatus('error');
      serverDropdown?.updateStatus('disconnected');
    }
  } catch (err: any) {
    showQuickConnectError(err.message || 'Connection failed');
    updateConnectionStatus('error');
    serverDropdown?.updateStatus('disconnected');
  } finally {
    // Reset submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Connect';
    }
  }
}

/**
 * Show error in quick connect dialog
 */
function showQuickConnectError(message: string): void {
  const errorDiv = document.getElementById('qc-error');
  if (errorDiv) {
    errorDiv.classList.remove('hidden');
    const msgSpan = errorDiv.querySelector('.status-message');
    if (msgSpan) {
      msgSpan.textContent = message;
    }
  }
}

/**
 * Hide error in quick connect dialog
 */
function hideQuickConnectError(): void {
  const errorDiv = document.getElementById('qc-error');
  errorDiv?.classList.add('hidden');
}

/**
 * Initialize password prompt dialog
 */
function initializePasswordPromptDialog(): void {
  const dialog = document.getElementById('password-prompt-dialog');
  const form = document.getElementById('password-prompt-form') as HTMLFormElement;
  const closeBtn = document.getElementById('password-prompt-close');
  const cancelBtn = document.getElementById('password-prompt-cancel');

  if (!dialog || !form) {
    console.error('Password prompt dialog elements not found');
    return;
  }

  // Close dialog
  const closeDialog = () => {
    dialog.classList.add('hidden');
    form.reset();
    dialog.removeAttribute('data-server-id');
    hidePasswordPromptError();
  };

  closeBtn?.addEventListener('click', closeDialog);
  cancelBtn?.addEventListener('click', closeDialog);

  // Close on overlay click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Handle form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serverId = dialog.getAttribute('data-server-id');
    const password = (document.getElementById('prompt-password') as HTMLInputElement).value;
    const savePassword = (document.getElementById('prompt-save-password') as HTMLInputElement).checked;

    if (!serverId) return;

    try {
      const server = await window.electronAPI.getServer(serverId);
      if (!server) {
        showPasswordPromptError('Server not found');
        return;
      }

      closeDialog();
      
      // Optionally save the password if user checked the box
      if (savePassword && password) {
        await window.electronAPI.updateServer(serverId, { 
          password, 
          saveCredentials: true 
        });
      }
      
      // Connect with provided password
      await connectToServer(server, password);
    } catch (err: any) {
      showPasswordPromptError(`Failed to connect: ${err.message}`);
    }
  });
}

/**
 * Show error in password prompt dialog
 */
function showPasswordPromptError(message: string): void {
  const errorDiv = document.getElementById('password-prompt-error');
  if (errorDiv) {
    errorDiv.classList.remove('hidden');
    const msgSpan = errorDiv.querySelector('.status-message');
    if (msgSpan) {
      msgSpan.textContent = message;
    }
  }
}

/**
 * Hide error in password prompt dialog
 */
function hidePasswordPromptError(): void {
  const errorDiv = document.getElementById('password-prompt-error');
  errorDiv?.classList.add('hidden');
}

/**
 * Show password prompt for a server
 */
function showPasswordPrompt(server: ServerProfile): void {
  const dialog = document.getElementById('password-prompt-dialog');
  const messageElement = document.getElementById('password-prompt-message');
  
  if (!dialog) return;

  // Set server info
  dialog.setAttribute('data-server-id', server.id);
  if (messageElement) {
    messageElement.textContent = `Enter password for ${server.name || server.host}`;
  }

  // Show dialog
  dialog.classList.remove('hidden');
  
  // Focus password input
  const passwordInput = document.getElementById('prompt-password') as HTMLInputElement;
  passwordInput?.focus();
}

/**
 * Show modal error dialog
 */
function showModalError(title: string, message: string): void {
  // Create a simple modal error overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.style.cssText = 'background: var(--bg-secondary); border-radius: 8px; padding: 24px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
  
  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = 'margin: 0 0 12px 0; color: var(--text-primary); font-size: 18px;';
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.cssText = 'margin: 0 0 20px 0; color: var(--text-secondary); font-size: 14px; line-height: 1.5;';
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.className = 'btn btn-primary';
  okBtn.style.cssText = 'width: 100%; padding: 8px; background: var(--accent-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
  okBtn.onclick = () => overlay.remove();
  
  dialog.appendChild(titleEl);
  dialog.appendChild(messageEl);
  dialog.appendChild(okBtn);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // Focus OK button
  okBtn.focus();
}

/**
 * Show error message (simple alert fallback)
 */
function showError(message: string): void {
  showModalError('Error', message);
}

/**
 * Helper function to update connection status badge
 */
function updateConnectionStatus(status: string, label?: string): void {
  const connectionBadge = document.getElementById('connection-badge');
  const connectionLabel = document.getElementById('connection-label');
  
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

/**
 * Handle page unload for cleanup
 */
function cleanup(): void {
  terminalManager?.dispose();
  layoutManager?.dispose();
  window.electronAPI.removeAllListeners('terminal:data');
  // Chat doesn't need explicit cleanup - messages are persisted
}

/**
 * Initialize chat UI
 */
async function initializeChat(): Promise<void> {
  const container = document.getElementById('chat-container');
  
  if (!container) {
    console.error('Chat container not found');
    return;
  }

  chatContainer = new ChatContainer({
    container,
    onSendMessage: (message) => {
      console.log('Message sent:', message);
      // Phase 4 will handle actual LLM calls
    }
  });

  await chatContainer.initialize();
  
  // Update model badge when provider changes
  updateModelBadge();

  console.log('Chat initialized');
}

/**
 * Update model badge display
 */
function updateModelBadge(): void {
  const badge = document.getElementById('model-badge');
  if (!badge || !chatContainer) return;

  const provider = chatContainer.getSelectedProvider();
  
  switch (provider) {
    case 'claude':
      badge.textContent = 'Claude';
      badge.style.backgroundColor = 'var(--accent-primary)';
      break;
    case 'openai':
      badge.textContent = 'GPT-4';
      badge.style.backgroundColor = '#10a37f';
      break;
    case 'moonshot':
      badge.textContent = 'Moonshot';
      badge.style.backgroundColor = '#6366f1';
      break;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp().catch(err => {
    console.error('Failed to initialize app:', err);
  });
});

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);