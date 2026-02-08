Phase 2C Build Plan: Bug Fixes & Code Cleanup

Save this as PHASE2C_BUILDPLAN.md in your project root.

markdown

# Pi Assistant - Phase 2C Build Plan
## Bug Fixes & Code Cleanup

### Prerequisites

- Phase 1 completed (Electron app with xterm.js terminal)
- Phase 2A completed (SSH connection working)
- Phase 2B completed (Server profiles & credential storage)

### Overview

This phase addresses bugs and code quality issues discovered during the Phase 2 review. No new features—just fixes to ensure stability before Phase 3.

---

### Issues to Fix

|
 Issue 
|
 Severity 
|
 File(s) Affected 
|

|
-------
|
----------
|
------------------
|

|
 Element ID mismatches 
|
 🔴 High 
|
 renderer.ts, index.html 
|

|
 Quick Connect calls wrong API 
|
 🔴 High 
|
 renderer.ts 
|

|
 Layout dispose() doesn't work 
|
 🟡 Medium 
|
 layout.ts 
|

|
 Duplicate CSS styles 
|
 🟢 Low 
|
 layout.css, components.css 
|


---

## Fix 1: Element ID Mismatches

**Problem:** `renderer.ts` references element IDs that don't exist in `index.html`.

### File: `src/renderer/renderer.ts`

#### Update `initializeQuickConnectDialog()`

Find this function and replace the element ID references:

```typescript
/**
 * Initialize quick connect dialog
 */
function initializeQuickConnectDialog(): void {
  const dialog = document.getElementById('quick-connect-dialog');
  const form = document.getElementById('quick-connect-form') as HTMLFormElement;
  const closeBtn = document.getElementById('quick-connect-close');  // ✅ Correct
  const cancelBtn = document.getElementById('qc-cancel');           // 🔧 FIXED: was 'btn-qc-cancel'

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

  // Handle form submit - see Fix 2 for the updated implementation
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleQuickConnectSubmit(closeDialog);
  });
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

Update initializePasswordPromptDialog()

typescript

/**
 * Initialize password prompt dialog
 */
function initializePasswordPromptDialog(): void {
  const dialog = document.getElementById('password-prompt-dialog');
  const form = document.getElementById('password-prompt-form') as HTMLFormElement;
  const closeBtn = document.getElementById('password-prompt-close');     // ✅ Correct
  const cancelBtn = document.getElementById('password-prompt-cancel');   // 🔧 FIXED: was 'btn-pp-cancel'

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
    const password = (document.getElementById('prompt-password') as HTMLInputElement).value;  // 🔧 FIXED: was 'pp-password'
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
 * Show password prompt for a server
 */
function showPasswordPrompt(server: ServerProfile): void {
  const dialog = document.getElementById('password-prompt-dialog');
  const messageElement = document.getElementById('password-prompt-message');  // 🔧 FIXED: was 'pp-server-label'
  
  if (!dialog) return;

  // Set server info
  dialog.setAttribute('data-server-id', server.id);
  if (messageElement) {
    messageElement.textContent = `Enter password for ${server.name || server.host}`;
  }

  // Show dialog
  dialog.classList.remove('hidden');
  
  // Focus password input
  const passwordInput = document.getElementById('prompt-password') as HTMLInputElement;  // 🔧 FIXED
  passwordInput?.focus();
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

Fix 2: Quick Connect Flow

Problem: Quick connect creates a temporary server object and calls connectToServer() which tries to look up the server by ID in the backend. This fails because the temp ID doesn't exist in the store.

Solution: Quick connect should call sshConnect() directly.
File: src/renderer/renderer.ts

Add this new function and update the form handler:

typescript

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

Fix 3: Layout Manager Dispose

Problem: The dispose() method creates new bound function references instead of removing the original listeners.
File: src/renderer/layout.ts

Replace the entire file with this fixed version:

typescript

/**
 * Layout Manager
 * Handles the split-pane layout with draggable resize handle
 */

export interface LayoutManagerConfig {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  handle: HTMLElement;
  minPanelWidth: number;
  onResize?: () => void;
}

const STORAGE_KEY = 'pi-assistant-layout';
const DEFAULT_LEFT_WIDTH_PERCENT = 60;

export class LayoutManager {
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private handle: HTMLElement;
  private minPanelWidth: number;
  private onResize?: () => void;

  private isDragging = false;
  private startX = 0;
  private startLeftWidth = 0;

  // 🔧 FIX: Store bound method references for proper cleanup
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundWindowResize: () => void;

  constructor(config: LayoutManagerConfig) {
    this.leftPanel = config.leftPanel;
    this.rightPanel = config.rightPanel;
    this.handle = config.handle;
    this.minPanelWidth = config.minPanelWidth;
    this.onResize = config.onResize;

    // 🔧 FIX: Bind methods once in constructor
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWindowResize = this.onWindowResize.bind(this);
  }

  /**
   * Initialize the layout manager
   */
  initialize(): void {
    this.restoreLayout();
    this.setupEventListeners();
    console.log('Layout manager initialized');
  }

  /**
   * Set up mouse event listeners for drag handling
   */
  private setupEventListeners(): void {
    // Mouse down on handle starts drag
    this.handle.addEventListener('mousedown', this.onMouseDown.bind(this));

    // 🔧 FIX: Use stored bound references
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('resize', this.boundWindowResize);

    // Double-click to reset to default
    this.handle.addEventListener('dblclick', this.resetLayout.bind(this));
  }

  /**
   * Handle mouse down on resize handle
   */
  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.startX = event.clientX;
    this.startLeftWidth = this.leftPanel.offsetWidth;

    // Add dragging class for visual feedback
    this.handle.classList.add('dragging');
    document.body.classList.add('resize-dragging');
  }

  /**
   * Handle mouse move during drag
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    event.preventDefault();

    const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
    const deltaX = event.clientX - this.startX;
    let newLeftWidth = this.startLeftWidth + deltaX;

    // Enforce minimum widths
    const maxLeftWidth = containerWidth - this.minPanelWidth - this.handle.offsetWidth;
    newLeftWidth = Math.max(this.minPanelWidth, Math.min(newLeftWidth, maxLeftWidth));

    // Apply new width
    this.setLeftPanelWidth(newLeftWidth);

    // Notify listeners
    if (this.onResize) {
      this.onResize();
    }
  }

  /**
   * Handle mouse up to end drag
   */
  private onMouseUp(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.handle.classList.remove('dragging');
    document.body.classList.remove('resize-dragging');

    // Save layout
    this.saveLayout();

    // Final resize notification
    if (this.onResize) {
      this.onResize();
    }
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    // Ensure panels stay within bounds on window resize
    const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
    const currentLeftWidth = this.leftPanel.offsetWidth;
    const maxLeftWidth = containerWidth - this.minPanelWidth - this.handle.offsetWidth;

    if (currentLeftWidth > maxLeftWidth) {
      this.setLeftPanelWidth(maxLeftWidth);
    }

    if (this.onResize) {
      this.onResize();
    }
  }

  /**
   * Set the left panel width in pixels
   */
  private setLeftPanelWidth(width: number): void {
    this.leftPanel.style.width = `${width}px`;
    this.leftPanel.style.flexGrow = '0';
    this.leftPanel.style.flexShrink = '0';
  }

  /**
   * Reset layout to default
   */
  resetLayout(): void {
    const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
    const defaultWidth = (containerWidth * DEFAULT_LEFT_WIDTH_PERCENT) / 100;
    this.setLeftPanelWidth(defaultWidth);
    this.saveLayout();

    if (this.onResize) {
      this.onResize();
    }

    console.log('Layout reset to default');
  }

  /**
   * Save current layout to localStorage
   */
  saveLayout(): void {
    try {
      const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
      const leftWidthPercent = (this.leftPanel.offsetWidth / containerWidth) * 100;
      
      const layoutData = {
        leftWidthPercent,
        timestamp: Date.now()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutData));
      console.log(`Layout saved: ${leftWidthPercent.toFixed(1)}%`);
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }

  /**
   * Restore layout from localStorage
   */
  restoreLayout(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const layoutData = JSON.parse(stored);
        const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
        const leftWidth = (containerWidth * layoutData.leftWidthPercent) / 100;
        
        // Validate width is reasonable
        if (leftWidth >= this.minPanelWidth && leftWidth <= containerWidth - this.minPanelWidth) {
          this.setLeftPanelWidth(leftWidth);
          console.log(`Layout restored: ${layoutData.leftWidthPercent.toFixed(1)}%`);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to restore layout:', error);
    }

    // Use default if restore fails
    this.resetLayout();
  }

  /**
   * Get current layout state
   */
  getLayoutState(): { leftWidthPercent: number } {
    const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
    return {
      leftWidthPercent: (this.leftPanel.offsetWidth / containerWidth) * 100
    };
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    // 🔧 FIX: Use stored bound references for removal
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('resize', this.boundWindowResize);
    console.log('Layout manager disposed');
  }
}

Fix 4: CSS Consolidation

Problem: Modal, form, and button styles are duplicated in both layout.css and components.css.

Solution: Keep styles in components.css only, remove duplicates from layout.css.
File: src/renderer/styles/layout.css

Remove these sections (they exist in components.css):

css

/* REMOVE: These are duplicated in components.css */

/* ==================== Modal ==================== */
/* DELETE entire modal section */

/* ==================== Form Styles ==================== */
/* DELETE entire form styles section */

/* ==================== Modal Buttons ==================== */
/* DELETE entire buttons section */

Keep only these sections in layout.css:

    Titlebar
    Main Container
    Panels
    Resize Handle
    Terminal Container
    Chat Container (placeholder styles)
    Status Bar
    Header Buttons
    Connection Badge Updates

Updated src/renderer/styles/layout.css

css

/**
 * Layout Styles
 * Titlebar, main container, panels, and resize handle
 */

/* ==================== Titlebar ==================== */
#titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--titlebar-height);
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-secondary);
  -webkit-app-region: drag;
  user-select: none;
}

.titlebar-drag-region {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
  flex: 1;
}

.titlebar-icon {
  font-size: 16px;
  -webkit-app-region: no-drag;
}

.titlebar-title {
  font-size: 12px;
  color: var(--text-secondary);
}

.titlebar-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.titlebar-button {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background-color var(--transition-fast);
}

.titlebar-button:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.titlebar-button.close-button:hover {
  background-color: #e81123;
  color: white;
}

.titlebar-button svg {
  width: 10px;
  height: 10px;
}

/* ==================== Main Container ==================== */
#main-container {
  display: flex;
  height: calc(100vh - var(--titlebar-height) - var(--statusbar-height));
  overflow: hidden;
}

/* ==================== Panels ==================== */
.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: var(--bg-primary);
}

#terminal-panel {
  flex: 1 1 60%;
}

#chat-panel {
  flex: 1 1 40%;
  border-left: 1px solid var(--border-primary);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--panel-header-height);
  padding: 0 12px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.panel-header-left,
.panel-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

/* Model Badge */
.model-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  background-color: var(--accent-primary);
  color: white;
}

/* ==================== Resize Handle ==================== */
#resize-handle {
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  position: relative;
  flex-shrink: 0;
  transition: background-color var(--transition-fast);
}

#resize-handle:hover,
#resize-handle.dragging {
  background-color: var(--accent-primary);
}

.resize-handle-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background-color: var(--border-primary);
  transform: translateX(-50%);
}

#resize-handle:hover .resize-handle-line,
#resize-handle.dragging .resize-handle-line {
  background-color: transparent;
}

/* ==================== Terminal Container ==================== */
#terminal-container {
  flex: 1;
  padding: 4px;
  overflow: hidden;
}

/* ==================== Chat Container (Placeholder) ==================== */
#chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
}

.chat-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-secondary);
}

.chat-placeholder .placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.chat-placeholder h2 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.chat-placeholder p {
  font-size: 13px;
  max-width: 280px;
  line-height: 1.5;
}

.chat-placeholder .placeholder-hint {
  margin-top: 16px;
  font-size: 12px;
  opacity: 0.7;
}

/* Chat Input (Placeholder) */
#chat-input-container {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
}

#chat-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  resize: none;
  min-height: 36px;
  max-height: 120px;
}

#chat-input:focus {
  border-color: var(--accent-primary);
}

#chat-input::placeholder {
  color: var(--text-disabled);
}

.send-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: var(--accent-primary);
  color: white;
  transition: background-color var(--transition-fast);
}

.send-button:hover:not(:disabled) {
  background-color: var(--accent-secondary);
}

.send-button:disabled {
  background-color: var(--bg-tertiary);
  color: var(--text-disabled);
}

/* ==================== Status Bar ==================== */
#statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--statusbar-height);
  padding: 0 10px;
  background-color: var(--accent-primary);
  color: white;
  font-size: 12px;
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

#statusbar span {
  opacity: 0.9;
}

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

/* ==================== Connection Badge ==================== */
.connection-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  background-color: var(--bg-tertiary);
}

.connection-badge .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.connection-badge.local .status-dot {
  background-color: var(--accent-success);
}

.connection-badge.connected .status-dot {
  background-color: var(--accent-success);
  animation: pulse 2s infinite;
}

.connection-badge.connecting .status-dot {
  background-color: var(--accent-warning);
  animation: pulse 1s infinite;
}

.connection-badge.disconnected .status-dot {
  background-color: var(--text-secondary);
}

.connection-badge.error .status-dot {
  background-color: var(--accent-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

Verification Checklist

After applying all fixes, verify:

    Quick Connect dialog opens and closes properly
    Quick Connect successfully connects to SSH (bypasses server store)
    Password prompt dialog opens for servers without saved passwords
    Password prompt correctly references input fields
    Layout resize handle works
    Closing/reopening app doesn't cause memory leaks (check DevTools)
    No duplicate CSS rules (inspect element in DevTools)
    All console errors resolved

Build & Test

powershell

# Rebuild
npm run build

# Test
npm start

Test Cases

    Quick Connect Flow:
        Click dropdown → Quick Connect
        Enter valid Pi credentials
        Should connect directly without "Server not found" error

    Password Prompt Flow:
        Add a server without saving password
        Select that server from dropdown
        Password prompt should appear
        Enter password → should connect

    Layout Resize:
        Drag resize handle
        Close app
        Reopen app
        Layout should restore to previous position

    Memory Check:
        Open DevTools → Memory tab
        Resize panels multiple times
        Take heap snapshot
        Verify no listener leaks
