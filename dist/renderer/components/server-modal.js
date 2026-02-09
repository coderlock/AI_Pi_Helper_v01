"use strict";
/**
 * Server Modal Component
 * Modal dialog for adding and editing server profiles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerModal = void 0;
class ServerModal {
    constructor(options) {
        this.mode = 'add';
        this.editingId = null;
        this.listenersAttached = false;
        this.options = options;
        this.createModal();
        this.attachEventListeners();
    }
    /**
     * Create modal HTML
     */
    createModal() {
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
        this.overlay = document.getElementById('server-modal-overlay');
        this.form = document.getElementById('server-modal-form');
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Prevent duplicate attachment
        if (this.listenersAttached)
            return;
        this.listenersAttached = true;
        // Close button
        document.getElementById('server-modal-close').addEventListener('click', () => {
            this.hide();
        });
        // Cancel button
        document.getElementById('server-modal-cancel').addEventListener('click', () => {
            this.hide();
        });
        // Test connection button
        document.getElementById('server-modal-test').addEventListener('click', async () => {
            await this.handleTestConnection();
        });
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        // Close on Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.hide();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        // Toggle password visibility
        document.getElementById('toggle-password').addEventListener('click', () => {
            const input = document.getElementById('server-password');
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
    async handleTestConnection() {
        const testBtn = document.getElementById('server-modal-test');
        const statusDiv = document.getElementById('server-modal-status');
        const statusMsg = statusDiv.querySelector('.status-message');
        // Validate required fields
        const host = document.getElementById('server-host').value.trim();
        const port = parseInt(document.getElementById('server-port').value, 10);
        const username = document.getElementById('server-username').value.trim();
        const password = document.getElementById('server-password').value;
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
            }
            else {
                statusDiv.classList.add('error');
                statusMsg.textContent = `✗ Connection failed: ${result.error || 'Unknown error'}`;
            }
        }
        catch (error) {
            statusDiv.classList.add('error');
            statusMsg.textContent = `✗ Connection failed: ${error.message || 'Unknown error'}`;
        }
        finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
        }
    }
    /**
     * Handle form submission
     */
    async handleSubmit() {
        const saveBtn = document.getElementById('server-modal-save');
        const statusDiv = document.getElementById('server-modal-status');
        const statusMsg = statusDiv.querySelector('.status-message');
        // Disable save button
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        statusDiv.classList.add('hidden');
        try {
            const formData = this.getFormData();
            await this.options.onSave(formData, this.editingId || undefined);
            this.hide();
        }
        catch (error) {
            // Show error
            statusDiv.classList.remove('hidden', 'success');
            statusDiv.classList.add('error');
            statusMsg.textContent = error.message || 'Failed to save server';
        }
        finally {
            saveBtn.disabled = false;
            saveBtn.textContent = this.mode === 'edit' ? 'Update Server' : 'Save Server';
        }
    }
    /**
     * Get form data
     */
    getFormData() {
        return {
            name: document.getElementById('server-name').value,
            description: document.getElementById('server-description').value,
            host: document.getElementById('server-host').value,
            port: parseInt(document.getElementById('server-port').value, 10),
            username: document.getElementById('server-username').value,
            password: document.getElementById('server-password').value || undefined,
            authMethod: 'password',
            saveCredentials: document.getElementById('server-save-credentials').checked
        };
    }
    /**
     * Show modal for adding new server
     */
    showAdd() {
        this.mode = 'add';
        this.editingId = null;
        // Reset form
        this.form.reset();
        // Ensure overlay and form are fully enabled
        this.overlay.style.pointerEvents = 'auto';
        this.overlay.classList.remove('disabled');
        this.form.disabled = false;
        this.form.style.pointerEvents = 'auto';
        this.form.classList.remove('disabled');
        // Get all input elements
        const nameInput = document.getElementById('server-name');
        const descInput = document.getElementById('server-description');
        const hostInput = document.getElementById('server-host');
        const portInput = document.getElementById('server-port');
        const userInput = document.getElementById('server-username');
        const passInput = document.getElementById('server-password');
        const saveCredsInput = document.getElementById('server-save-credentials');
        // Reset values
        portInput.value = '22';
        saveCredsInput.checked = true;
        // Explicitly enable and remove any blocking attributes and classes
        [nameInput, descInput, hostInput, portInput, userInput, passInput, saveCredsInput].forEach(input => {
            if (input) {
                input.disabled = false;
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
                input.classList.remove('disabled');
                input.style.pointerEvents = 'auto';
                input.style.opacity = '1';
            }
        });
        // Update title and buttons
        document.getElementById('server-modal-title').textContent = 'Add Server';
        const saveBtn = document.getElementById('server-modal-save');
        saveBtn.textContent = 'Save Server';
        saveBtn.disabled = false;
        saveBtn.removeAttribute('disabled');
        saveBtn.classList.remove('disabled');
        saveBtn.style.pointerEvents = 'auto';
        const testBtn = document.getElementById('server-modal-test');
        testBtn.disabled = false;
        testBtn.removeAttribute('disabled');
        testBtn.classList.remove('disabled');
        testBtn.style.pointerEvents = 'auto';
        testBtn.textContent = 'Test Connection';
        // Clear status
        document.getElementById('server-modal-status').classList.add('hidden');
        // Show modal
        this.overlay.classList.remove('hidden');
        // Focus first input with delay to ensure modal is fully rendered
        setTimeout(() => {
            nameInput?.focus();
        }, 100);
    }
    /**
     * Show modal for editing existing server
     */
    async showEdit(serverId) {
        this.mode = 'edit';
        this.editingId = serverId;
        // Load server data
        const server = await window.electronAPI.getServer(serverId);
        if (!server) {
            console.error('Server not found:', serverId);
            return;
        }
        // Ensure overlay and form are fully enabled
        this.overlay.style.pointerEvents = 'auto';
        this.overlay.classList.remove('disabled');
        this.form.disabled = false;
        this.form.style.pointerEvents = 'auto';
        this.form.classList.remove('disabled');
        // Get all input elements
        const nameInput = document.getElementById('server-name');
        const descInput = document.getElementById('server-description');
        const hostInput = document.getElementById('server-host');
        const portInput = document.getElementById('server-port');
        const userInput = document.getElementById('server-username');
        const passInput = document.getElementById('server-password');
        const saveCredsInput = document.getElementById('server-save-credentials');
        // Populate form
        nameInput.value = server.name;
        descInput.value = server.description;
        hostInput.value = server.host;
        portInput.value = server.port.toString();
        userInput.value = server.username;
        passInput.value = ''; // Don't show stored password
        saveCredsInput.checked = server.saveCredentials;
        // Explicitly enable and remove any blocking attributes and classes
        [nameInput, descInput, hostInput, portInput, userInput, passInput, saveCredsInput].forEach(input => {
            if (input) {
                input.disabled = false;
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
                input.classList.remove('disabled');
                input.style.pointerEvents = 'auto';
                input.style.opacity = '1';
            }
        });
        // Update title and buttons
        document.getElementById('server-modal-title').textContent = 'Edit Server';
        const saveBtn = document.getElementById('server-modal-save');
        saveBtn.textContent = 'Update Server';
        saveBtn.disabled = false;
        saveBtn.removeAttribute('disabled');
        saveBtn.classList.remove('disabled');
        saveBtn.style.pointerEvents = 'auto';
        const testBtn = document.getElementById('server-modal-test');
        testBtn.disabled = false;
        testBtn.removeAttribute('disabled');
        testBtn.classList.remove('disabled');
        testBtn.style.pointerEvents = 'auto';
        testBtn.textContent = 'Test Connection';
        // Clear status
        document.getElementById('server-modal-status').classList.add('hidden');
        // Show modal
        this.overlay.classList.remove('hidden');
        // Focus first input with delay to ensure modal is fully rendered
        setTimeout(() => {
            nameInput?.focus();
        }, 100);
    }
    /**
     * Hide the modal
     */
    hide() {
        this.overlay.classList.add('hidden');
        this.options.onClose();
    }
}
exports.ServerModal = ServerModal;
//# sourceMappingURL=server-modal.js.map