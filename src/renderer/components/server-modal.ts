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
  private listenersAttached: boolean = false;

  constructor(options: ServerModalOptions) {
    this.options = options;
    this.createModal();
    this.attachEventListeners();
  }

  /**
   * Create modal HTML
   */
  private createModal(): void {
    // Remove existing modal if present (ensures clean state)
    const existing = document.getElementById('server-modal-overlay');
    if (existing) {
      existing.remove();
      this.listenersAttached = false;
    }

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

              <div id="server-modal-status" class="form-status hidden">
                <span class="status-message"></span>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="server-modal-test">
              Test Connection
            </button>
            <div style="flex: 1"></div>
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
    // Prevent duplicate attachment
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    // Close button
    document.getElementById('server-modal-close')!.addEventListener('click', () => {
      this.hide();
    });

    // Cancel button
    document.getElementById('server-modal-cancel')!.addEventListener('click', () => {
      this.hide();
    });

    // Test connection button
    document.getElementById('server-modal-test')!.addEventListener('click', async () => {
      await this.handleTestConnection();
    });

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Close on Escape
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
        this.hide();
      }
    };
    document.addEventListener('keydown', escapeHandler);

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
   * Handle test connection
   */
  private async handleTestConnection(): Promise<void> {
    const testBtn = document.getElementById('server-modal-test') as HTMLButtonElement;
    const statusDiv = document.getElementById('server-modal-status')!;
    const statusMsg = statusDiv.querySelector('.status-message')!;

    // Validate required fields
    const host = (document.getElementById('server-host') as HTMLInputElement).value.trim();
    const port = parseInt((document.getElementById('server-port') as HTMLInputElement).value, 10);
    const username = (document.getElementById('server-username') as HTMLInputElement).value.trim();
    const password = (document.getElementById('server-password') as HTMLInputElement).value;

    if (!host || !username || !password) {
      statusDiv.classList.remove('hidden', 'success');
      statusDiv.classList.add('error');
      statusMsg.textContent = 'Please fill in host, username, and password to test';
      return;
    }

    // Disable test button
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    statusDiv.classList.remove('hidden', 'error', 'success');
    statusMsg.textContent = 'Testing connection...';

    try {
      const result = await window.electronAPI.testConnection({ host, port, username, password });
      
      if (result.success) {
        statusDiv.classList.add('success');
        statusMsg.textContent = '✓ Connection successful!';
      } else {
        statusDiv.classList.add('error');
        statusMsg.textContent = `✗ Connection failed: ${result.error || 'Unknown error'}`;
      }
    } catch (error: any) {
      statusDiv.classList.add('error');
      statusMsg.textContent = `✗ Connection failed: ${error.message || 'Unknown error'}`;
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(): Promise<void> {
    const saveBtn = document.getElementById('server-modal-save') as HTMLButtonElement;
    const statusDiv = document.getElementById('server-modal-status')!;
    const statusMsg = statusDiv.querySelector('.status-message')!;
    
    // Disable save button
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    statusDiv.classList.add('hidden');

    try {
      const formData = this.getFormData();
      await this.options.onSave(formData, this.editingId || undefined);
      this.hide();
    } catch (error: any) {
      // Show error
      statusDiv.classList.remove('hidden', 'success');
      statusDiv.classList.add('error');
      statusMsg.textContent = error.message || 'Failed to save server';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = this.mode === 'edit' ? 'Update Server' : 'Save Server';
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
    
    // Get all input elements
    const nameInput = document.getElementById('server-name') as HTMLInputElement;
    const descInput = document.getElementById('server-description') as HTMLInputElement;
    const hostInput = document.getElementById('server-host') as HTMLInputElement;
    const portInput = document.getElementById('server-port') as HTMLInputElement;
    const userInput = document.getElementById('server-username') as HTMLInputElement;
    const passInput = document.getElementById('server-password') as HTMLInputElement;
    const saveCredsInput = document.getElementById('server-save-credentials') as HTMLInputElement;
    
    // Reset values
    portInput.value = '22';
    saveCredsInput.checked = true;
    
    // Explicitly enable and remove any blocking attributes
    [nameInput, descInput, hostInput, portInput, userInput, passInput, saveCredsInput].forEach(input => {
      if (input) {
        input.disabled = false;
        input.removeAttribute('readonly');
        input.style.pointerEvents = 'auto';
      }
    });
    
    // Update title and buttons
    document.getElementById('server-modal-title')!.textContent = 'Add Server';
    const saveBtn = document.getElementById('server-modal-save') as HTMLButtonElement;
    saveBtn.textContent = 'Save Server';
    saveBtn.disabled = false;
    
    const testBtn = document.getElementById('server-modal-test') as HTMLButtonElement;
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    
    // Clear status
    document.getElementById('server-modal-status')!.classList.add('hidden');
    
    // Show modal
    this.overlay.classList.remove('hidden');
    this.overlay.style.pointerEvents = 'auto';
    
    // Focus first input
    setTimeout(() => {
      nameInput?.focus();
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

    // Get all input elements
    const nameInput = document.getElementById('server-name') as HTMLInputElement;
    const descInput = document.getElementById('server-description') as HTMLInputElement;
    const hostInput = document.getElementById('server-host') as HTMLInputElement;
    const portInput = document.getElementById('server-port') as HTMLInputElement;
    const userInput = document.getElementById('server-username') as HTMLInputElement;
    const passInput = document.getElementById('server-password') as HTMLInputElement;
    const saveCredsInput = document.getElementById('server-save-credentials') as HTMLInputElement;

    // Populate form
    nameInput.value = server.name;
    descInput.value = server.description;
    hostInput.value = server.host;
    portInput.value = server.port.toString();
    userInput.value = server.username;
    passInput.value = '';  // Don't show stored password
    saveCredsInput.checked = server.saveCredentials;

    // Explicitly enable and remove any blocking attributes
    [nameInput, descInput, hostInput, portInput, userInput, passInput, saveCredsInput].forEach(input => {
      if (input) {
        input.disabled = false;
        input.removeAttribute('readonly');
        input.style.pointerEvents = 'auto';
      }
    });

    // Update title and buttons
    document.getElementById('server-modal-title')!.textContent = 'Edit Server';
    const saveBtn = document.getElementById('server-modal-save') as HTMLButtonElement;
    saveBtn.textContent = 'Update Server';
    saveBtn.disabled = false;
    
    const testBtn = document.getElementById('server-modal-test') as HTMLButtonElement;
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';

    // Clear status
    document.getElementById('server-modal-status')!.classList.add('hidden');

    // Show modal
    this.overlay.classList.remove('hidden');
    this.overlay.style.pointerEvents = 'auto';

    // Focus first input
    setTimeout(() => {
      nameInput?.focus();
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
