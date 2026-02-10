"use strict";
/**
 * Prompt Selector Component
 * Dropdown for selecting and managing system prompts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptSelector = void 0;
class PromptSelector {
    constructor(options) {
        this.isOpen = false;
        this.prompts = [];
        this.activePromptId = '';
        this.activePromptName = '';
        this.container = options.container;
        this.options = options;
    }
    /**
     * Initialize the selector
     */
    async initialize() {
        this.render();
        this.attachEventListeners();
        await this.refresh();
        console.log('Prompt selector initialized');
    }
    /**
     * Render the dropdown HTML
     */
    render() {
        this.container.innerHTML = `
      <div class="prompt-selector">
        <button class="prompt-selector-button" id="prompt-selector-btn" title="Select AI Persona">
          <span class="prompt-icon">🎭</span>
          <span class="prompt-label">Loading...</span>
          <span class="prompt-arrow">▾</span>
        </button>
        <div class="prompt-selector-menu hidden" id="prompt-selector-menu">
          <div class="prompt-menu-header">
            <span>AI Persona</span>
          </div>
          <div class="prompt-list" id="prompt-list">
            <!-- Populated dynamically -->
          </div>
          <div class="prompt-menu-divider"></div>
          <div class="prompt-menu-actions">
            <button class="prompt-menu-action" id="edit-prompts-btn">
              <span>✏️</span>
              <span>Edit Prompts...</span>
            </button>
          </div>
        </div>
      </div>
    `;
        this.button = this.container.querySelector('#prompt-selector-btn');
        this.menu = this.container.querySelector('#prompt-selector-menu');
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Toggle dropdown
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        // Prompt selection
        this.menu.addEventListener('click', async (e) => {
            const target = e.target;
            const promptItem = target.closest('.prompt-item');
            if (promptItem) {
                const promptId = promptItem.dataset.promptId;
                if (promptId && promptId !== this.activePromptId) {
                    await this.selectPrompt(promptId);
                }
                this.close();
                return;
            }
            // Edit prompts button
            if (target.closest('#edit-prompts-btn')) {
                this.close();
                this.options.onEditPrompts();
            }
        });
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    /**
     * Refresh prompts from store
     */
    async refresh() {
        try {
            this.prompts = await window.electronAPI.getPrompts();
            const activePrompt = await window.electronAPI.getActivePrompt();
            this.activePromptId = activePrompt.id;
            this.activePromptName = activePrompt.name;
            this.updateButton();
            this.renderPromptList();
        }
        catch (error) {
            console.error('Failed to refresh prompts:', error);
        }
    }
    /**
     * Update button display
     */
    updateButton() {
        const label = this.button.querySelector('.prompt-label');
        label.textContent = this.activePromptName;
        this.button.title = `AI Persona: ${this.activePromptName}`;
    }
    /**
     * Render the prompt list
     */
    renderPromptList() {
        const listContainer = this.menu.querySelector('#prompt-list');
        // Group prompts: built-in first, then custom
        const builtIn = this.prompts.filter(p => p.isBuiltIn);
        const custom = this.prompts.filter(p => !p.isBuiltIn);
        let html = '';
        // Built-in prompts
        if (builtIn.length > 0) {
            html += '<div class="prompt-group-label">Built-in</div>';
            html += builtIn.map(p => this.renderPromptItem(p)).join('');
        }
        // Custom prompts
        if (custom.length > 0) {
            html += '<div class="prompt-group-label">Custom</div>';
            html += custom.map(p => this.renderPromptItem(p)).join('');
        }
        listContainer.innerHTML = html;
    }
    /**
     * Render a single prompt item
     */
    renderPromptItem(prompt) {
        const isActive = prompt.id === this.activePromptId;
        const isDefault = prompt.isDefault;
        return `
      <div class="prompt-item ${isActive ? 'active' : ''}" data-prompt-id="${prompt.id}">
        <span class="prompt-item-radio">${isActive ? '●' : '○'}</span>
        <div class="prompt-item-info">
          <span class="prompt-item-name">
            ${this.escapeHtml(prompt.name)}
            ${isDefault ? '<span class="default-badge">Default</span>' : ''}
          </span>
          ${prompt.description ? `<span class="prompt-item-desc">${this.escapeHtml(prompt.description)}</span>` : ''}
        </div>
      </div>
    `;
    }
    /**
     * Select a prompt
     */
    async selectPrompt(promptId) {
        const previousId = this.activePromptId;
        const previousName = this.activePromptName;
        try {
            await window.electronAPI.setActivePrompt(promptId);
            const prompt = this.prompts.find(p => p.id === promptId);
            if (prompt) {
                this.activePromptId = promptId;
                this.activePromptName = prompt.name;
                this.updateButton();
                this.renderPromptList();
                // Notify parent of change
                this.options.onPromptChange(promptId, prompt.name);
            }
        }
        catch (error) {
            console.error('Failed to select prompt:', error);
            // Revert
            this.activePromptId = previousId;
            this.activePromptName = previousName;
        }
    }
    /**
     * Open dropdown
     */
    open() {
        this.isOpen = true;
        this.menu.classList.remove('hidden');
        this.button.classList.add('open');
    }
    /**
     * Close dropdown
     */
    close() {
        this.isOpen = false;
        this.menu.classList.add('hidden');
        this.button.classList.remove('open');
    }
    /**
     * Toggle dropdown
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        }
        else {
            this.open();
        }
    }
    /**
     * Get current active prompt info
     */
    getActivePrompt() {
        return {
            id: this.activePromptId,
            name: this.activePromptName
        };
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
exports.PromptSelector = PromptSelector;
//# sourceMappingURL=prompt-selector.js.map