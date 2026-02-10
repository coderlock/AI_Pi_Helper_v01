/**
 * Prompt Selector Component
 * Dropdown for selecting and managing system prompts
 */

import { PromptListItem, SystemPrompt } from '../../shared/types';

export interface PromptSelectorOptions {
  container: HTMLElement;
  onPromptChange: (promptId: string, promptName: string) => void;
  onEditPrompts: () => void;
}

export class PromptSelector {
  private container: HTMLElement;
  private options: PromptSelectorOptions;
  private button!: HTMLElement;
  private menu!: HTMLElement;
  private isOpen: boolean = false;
  private prompts: PromptListItem[] = [];
  private activePromptId: string = '';
  private activePromptName: string = '';

  constructor(options: PromptSelectorOptions) {
    this.container = options.container;
    this.options = options;
  }

  /**
   * Initialize the selector
   */
  async initialize(): Promise<void> {
    this.render();
    this.attachEventListeners();
    await this.refresh();
    console.log('Prompt selector initialized');
  }

  /**
   * Render the dropdown HTML
   */
  private render(): void {
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

    this.button = this.container.querySelector('#prompt-selector-btn')!;
    this.menu = this.container.querySelector('#prompt-selector-menu')!;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Toggle dropdown
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Prompt selection
    this.menu.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const promptItem = target.closest('.prompt-item') as HTMLElement;
      
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
      if (!this.container.contains(e.target as Node)) {
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
  async refresh(): Promise<void> {
    try {
      this.prompts = await window.electronAPI.getPrompts();
      const activePrompt = await window.electronAPI.getActivePrompt();
      
      this.activePromptId = activePrompt.id;
      this.activePromptName = activePrompt.name;
      
      this.updateButton();
      this.renderPromptList();
    } catch (error) {
      console.error('Failed to refresh prompts:', error);
    }
  }

  /**
   * Update button display
   */
  private updateButton(): void {
    const label = this.button.querySelector('.prompt-label')!;
    label.textContent = this.activePromptName;
    this.button.title = `AI Persona: ${this.activePromptName}`;
  }

  /**
   * Render the prompt list
   */
  private renderPromptList(): void {
    const listContainer = this.menu.querySelector('#prompt-list')!;

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
  private renderPromptItem(prompt: PromptListItem): string {
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
  private async selectPrompt(promptId: string): Promise<void> {
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
    } catch (error) {
      console.error('Failed to select prompt:', error);
      // Revert
      this.activePromptId = previousId;
      this.activePromptName = previousName;
    }
  }

  /**
   * Open dropdown
   */
  open(): void {
    this.isOpen = true;
    this.menu.classList.remove('hidden');
    this.button.classList.add('open');
  }

  /**
   * Close dropdown
   */
  close(): void {
    this.isOpen = false;
    this.menu.classList.add('hidden');
    this.button.classList.remove('open');
  }

  /**
   * Toggle dropdown
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Get current active prompt info
   */
  getActivePrompt(): { id: string; name: string } {
    return {
      id: this.activePromptId,
      name: this.activePromptName
    };
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
