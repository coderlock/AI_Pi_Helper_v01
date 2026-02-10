"use strict";
/**
 * Prompt Modal Component
 * Modal for creating, editing, and managing prompts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptModal = void 0;
class PromptModal {
    constructor(options) {
        this.currentView = 'list';
        this.editingPromptId = null;
        this.prompts = [];
        this.options = options;
        this.createModal();
        this.attachEventListeners();
    }
    /**
     * Create modal HTML
     */
    createModal() {
        const existing = document.getElementById('prompt-modal-overlay');
        if (existing)
            existing.remove();
        const modalHtml = `
      <div id="prompt-modal-overlay" class="modal-overlay hidden">
        <div class="modal prompt-modal">
          <div class="modal-header">
            <button class="modal-back hidden" id="prompt-modal-back">← Back</button>
            <h2 class="modal-title" id="prompt-modal-title">Manage Prompts</h2>
            <button class="modal-close" id="prompt-modal-close">✕</button>
          </div>
          <div class="modal-body">
            <!-- List View -->
            <div class="prompt-modal-view" id="prompt-list-view">
              <div class="prompt-modal-list" id="prompt-modal-list">
                <!-- Populated dynamically -->
              </div>
              <button class="btn btn-primary prompt-add-btn" id="prompt-add-btn">
                + Create New Prompt
              </button>
            </div>
            
            <!-- Edit View -->
            <div class="prompt-modal-view hidden" id="prompt-edit-view">
              <form id="prompt-edit-form">
                <div class="form-group">
                  <label for="prompt-edit-name">Name *</label>
                  <input type="text" id="prompt-edit-name" name="name" 
                         placeholder="My Custom Prompt" required maxlength="50">
                </div>
                
                <div class="form-group">
                  <label for="prompt-edit-description">Description</label>
                  <input type="text" id="prompt-edit-description" name="description"
                         placeholder="Brief description (optional)" maxlength="100">
                </div>
                
                <div class="form-group">
                  <label for="prompt-edit-content">System Prompt *</label>
                  <textarea id="prompt-edit-content" name="content" 
                            placeholder="You are a helpful assistant that..."
                            required rows="12" maxlength="8000"></textarea>
                  <p class="form-hint">
                    This defines how the AI behaves. Be specific about the AI's role, 
                    tone, and any guidelines it should follow. (Max: 8000 characters)
                  </p>
                </div>

                <div id="prompt-edit-status" class="form-status hidden">
                  <span class="status-message"></span>
                </div>
              </form>
            </div>
          </div>
          <div class="modal-footer">
            <!-- List View Footer -->
            <div class="prompt-footer-view" id="prompt-list-footer">
              <button type="button" class="btn btn-ghost" id="prompt-modal-cancel">
                Close
              </button>
            </div>
            
            <!-- Edit View Footer -->
            <div class="prompt-footer-view hidden" id="prompt-edit-footer">
              <button type="button" class="btn btn-ghost" id="prompt-edit-cancel">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" id="prompt-edit-save" 
                      form="prompt-edit-form">
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.overlay = document.getElementById('prompt-modal-overlay');
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        document.getElementById('prompt-modal-close').addEventListener('click', () => {
            this.hide();
        });
        // Cancel button (list view)
        document.getElementById('prompt-modal-cancel').addEventListener('click', () => {
            this.hide();
        });
        // Back button
        document.getElementById('prompt-modal-back').addEventListener('click', () => {
            this.showListView();
        });
        // Add new prompt button
        document.getElementById('prompt-add-btn').addEventListener('click', () => {
            this.showEditView(null);
        });
        // Cancel button (edit view)
        document.getElementById('prompt-edit-cancel').addEventListener('click', () => {
            this.showListView();
        });
        // Form submit
        document.getElementById('prompt-edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSave();
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
                if (this.currentView === 'edit') {
                    this.showListView();
                }
                else {
                    this.hide();
                }
            }
        });
        // List item actions (delegated)
        document.getElementById('prompt-modal-list').addEventListener('click', async (e) => {
            const target = e.target;
            const listItem = target.closest('.prompt-list-item');
            if (!listItem)
                return;
            const promptId = listItem.dataset.promptId;
            if (target.closest('.prompt-action-edit')) {
                this.showEditView(promptId);
            }
            else if (target.closest('.prompt-action-duplicate')) {
                await this.duplicatePrompt(promptId);
            }
            else if (target.closest('.prompt-action-delete')) {
                await this.deletePrompt(promptId);
            }
            else if (target.closest('.prompt-action-reset')) {
                await this.resetPrompt(promptId);
            }
            else if (target.closest('.prompt-action-default')) {
                await this.setDefaultPrompt(promptId);
            }
        });
    }
    /**
     * Show the modal
     */
    async show() {
        await this.loadPrompts();
        this.showListView();
        this.overlay.classList.remove('hidden');
    }
    /**
     * Hide the modal
     */
    hide() {
        this.overlay.classList.add('hidden');
        this.options.onClose();
    }
    /**
     * Load prompts from store
     */
    async loadPrompts() {
        try {
            this.prompts = await window.electronAPI.getPrompts();
            this.renderPromptList();
        }
        catch (error) {
            console.error('Failed to load prompts:', error);
        }
    }
    /**
     * Render the prompt list
     */
    renderPromptList() {
        const listContainer = document.getElementById('prompt-modal-list');
        if (this.prompts.length === 0) {
            listContainer.innerHTML = '<div class="prompt-list-empty">No prompts found</div>';
            return;
        }
        // Group by built-in vs custom
        const builtIn = this.prompts.filter(p => p.isBuiltIn);
        const custom = this.prompts.filter(p => !p.isBuiltIn);
        let html = '';
        if (builtIn.length > 0) {
            html += '<div class="prompt-list-group-label">Built-in Prompts</div>';
            html += builtIn.map(p => this.renderPromptListItem(p)).join('');
        }
        if (custom.length > 0) {
            html += '<div class="prompt-list-group-label">Custom Prompts</div>';
            html += custom.map(p => this.renderPromptListItem(p)).join('');
        }
        listContainer.innerHTML = html;
    }
    /**
     * Render a prompt list item
     */
    renderPromptListItem(prompt) {
        const actions = prompt.isBuiltIn
            ? `
        <button class="prompt-action-btn prompt-action-edit" title="Edit">✏️</button>
        <button class="prompt-action-btn prompt-action-duplicate" title="Duplicate">📋</button>
        <button class="prompt-action-btn prompt-action-reset" title="Reset to default">🔄</button>
        ${!prompt.isDefault ? `<button class="prompt-action-btn prompt-action-default" title="Set as default">⭐</button>` : ''}
      `
            : `
        <button class="prompt-action-btn prompt-action-edit" title="Edit">✏️</button>
        <button class="prompt-action-btn prompt-action-duplicate" title="Duplicate">📋</button>
        ${!prompt.isDefault ? `<button class="prompt-action-btn prompt-action-default" title="Set as default">⭐</button>` : ''}
        <button class="prompt-action-btn prompt-action-delete" title="Delete">🗑️</button>
      `;
        return `
      <div class="prompt-list-item" data-prompt-id="${prompt.id}">
        <div class="prompt-list-item-info">
          <span class="prompt-list-item-name">
            ${this.escapeHtml(prompt.name)}
            ${prompt.isDefault ? '<span class="default-badge">Default</span>' : ''}
            ${prompt.isBuiltIn ? '<span class="builtin-badge">Built-in</span>' : ''}
          </span>
          ${prompt.description ? `<span class="prompt-list-item-desc">${this.escapeHtml(prompt.description)}</span>` : ''}
        </div>
        <div class="prompt-list-item-actions">
          ${actions}
        </div>
      </div>
    `;
    }
    /**
     * Show list view
     */
    showListView() {
        this.currentView = 'list';
        this.editingPromptId = null;
        document.getElementById('prompt-modal-title').textContent = 'Manage Prompts';
        document.getElementById('prompt-modal-back').classList.add('hidden');
        document.getElementById('prompt-list-view').classList.remove('hidden');
        document.getElementById('prompt-edit-view').classList.add('hidden');
        document.getElementById('prompt-list-footer').classList.remove('hidden');
        document.getElementById('prompt-edit-footer').classList.add('hidden');
        this.loadPrompts();
    }
    /**
     * Show edit view
     */
    async showEditView(promptId) {
        this.currentView = 'edit';
        this.editingPromptId = promptId;
        const isNew = promptId === null;
        document.getElementById('prompt-modal-title').textContent = isNew ? 'Create Prompt' : 'Edit Prompt';
        document.getElementById('prompt-modal-back').classList.remove('hidden');
        document.getElementById('prompt-list-view').classList.add('hidden');
        document.getElementById('prompt-edit-view').classList.remove('hidden');
        document.getElementById('prompt-list-footer').classList.add('hidden');
        document.getElementById('prompt-edit-footer').classList.remove('hidden');
        // Clear or populate form
        const nameInput = document.getElementById('prompt-edit-name');
        const descInput = document.getElementById('prompt-edit-description');
        const contentInput = document.getElementById('prompt-edit-content');
        const statusDiv = document.getElementById('prompt-edit-status');
        statusDiv.classList.add('hidden');
        if (isNew) {
            nameInput.value = '';
            descInput.value = '';
            contentInput.value = '';
            document.getElementById('prompt-edit-save').textContent = 'Create Prompt';
        }
        else {
            const prompt = await window.electronAPI.getPrompt(promptId);
            if (prompt) {
                nameInput.value = prompt.name;
                descInput.value = prompt.description || '';
                contentInput.value = prompt.content;
            }
            document.getElementById('prompt-edit-save').textContent = 'Save Changes';
        }
        // Focus name input
        setTimeout(() => nameInput.focus(), 100);
    }
    /**
     * Handle save
     */
    async handleSave() {
        const nameInput = document.getElementById('prompt-edit-name');
        const descInput = document.getElementById('prompt-edit-description');
        const contentInput = document.getElementById('prompt-edit-content');
        const saveBtn = document.getElementById('prompt-edit-save');
        const statusDiv = document.getElementById('prompt-edit-status');
        const data = {
            name: nameInput.value.trim(),
            content: contentInput.value,
            description: descInput.value.trim() || undefined
        };
        // Validate
        if (!data.name || !data.content) {
            statusDiv.classList.remove('hidden', 'success');
            statusDiv.classList.add('error');
            statusDiv.querySelector('.status-message').textContent = 'Name and content are required';
            return;
        }
        if (data.content.length > 8000) {
            statusDiv.classList.remove('hidden', 'success');
            statusDiv.classList.add('error');
            statusDiv.querySelector('.status-message').textContent = 'Content exceeds maximum length of 8000 characters';
            return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        try {
            if (this.editingPromptId) {
                await window.electronAPI.updatePrompt(this.editingPromptId, data);
            }
            else {
                await window.electronAPI.createPrompt(data);
            }
            this.options.onSave();
            this.showListView();
        }
        catch (error) {
            statusDiv.classList.remove('hidden', 'success');
            statusDiv.classList.add('error');
            statusDiv.querySelector('.status-message').textContent = error.message || 'Failed to save';
        }
        finally {
            saveBtn.disabled = false;
            saveBtn.textContent = this.editingPromptId ? 'Save Changes' : 'Create Prompt';
        }
    }
    /**
     * Duplicate a prompt
     */
    async duplicatePrompt(promptId) {
        try {
            const original = await window.electronAPI.getPrompt(promptId);
            if (original) {
                await window.electronAPI.createPrompt({
                    name: `${original.name} (Copy)`,
                    content: original.content,
                    description: original.description
                });
                await this.loadPrompts();
                this.options.onSave();
            }
        }
        catch (error) {
            console.error('Failed to duplicate prompt:', error);
        }
    }
    /**
     * Delete a prompt
     */
    async deletePrompt(promptId) {
        const prompt = this.prompts.find(p => p.id === promptId);
        if (!prompt)
            return;
        if (!confirm(`Delete "${prompt.name}"? This cannot be undone.`)) {
            return;
        }
        try {
            await window.electronAPI.deletePrompt(promptId);
            await this.loadPrompts();
            this.options.onSave();
        }
        catch (error) {
            alert(error.message || 'Failed to delete prompt');
        }
    }
    /**
     * Reset a built-in prompt
     */
    async resetPrompt(promptId) {
        if (!confirm('Reset this prompt to its original content?')) {
            return;
        }
        try {
            await window.electronAPI.resetBuiltInPrompt(promptId);
            await this.loadPrompts();
            this.options.onSave();
        }
        catch (error) {
            alert(error.message || 'Failed to reset prompt');
        }
    }
    /**
     * Set a prompt as default
     */
    async setDefaultPrompt(promptId) {
        try {
            await window.electronAPI.setDefaultPrompt(promptId);
            await this.loadPrompts();
            this.options.onSave();
        }
        catch (error) {
            alert(error.message || 'Failed to set default');
        }
    }
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
exports.PromptModal = PromptModal;
//# sourceMappingURL=prompt-modal.js.map