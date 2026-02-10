/**
 * Settings Modal Component
 * UI for API key management and app settings
 */

import { 
  AppSettings, 
  LLMProvider, 
  ProviderConfig, 
  APIKeyStatus 
} from '../../shared/types';

export interface SettingsModalOptions {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export class SettingsModal {
  private overlay!: HTMLElement;
  private options: SettingsModalOptions;
  private settings!: AppSettings;
  private providers: ProviderConfig[] = [];
  private apiKeyStatus: APIKeyStatus[] = [];
  private isTestingKey: boolean = false;

  constructor(options: SettingsModalOptions) {
    this.options = options;
  }

  /**
   * Show the modal
   */
  async show(): Promise<void> {
    // Load current settings and provider info
    await this.loadData();
    
    // Create and show modal
    this.createModal();
    this.renderAPIKeys();
    this.renderModelSettings();
    this.attachEventListeners();
    
    // Show modal
    this.overlay.classList.remove('hidden');
  }

  /**
   * Hide the modal
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      setTimeout(() => {
        this.overlay.remove();
      }, 300);
    }
  }

  /**
   * Load settings and provider data
   */
  private async loadData(): Promise<void> {
    this.settings = await window.electronAPI.getSettings();
    this.providers = await window.electronAPI.getProviders();
    this.apiKeyStatus = await window.electronAPI.getAPIKeyStatus();
  }

  /**
   * Create modal HTML
   */
  private createModal(): void {
    const existing = document.getElementById('settings-modal-overlay');
    if (existing) existing.remove();

    const modalHtml = `
      <div id="settings-modal-overlay" class="modal-overlay hidden">
        <div class="modal settings-modal">
          <div class="modal-header">
            <h2 class="modal-title">Settings</h2>
            <button class="modal-close" id="settings-modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="settings-tabs">
              <button class="settings-tab active" data-tab="api-keys">API Keys</button>
              <button class="settings-tab" data-tab="models">Models</button>
              <button class="settings-tab" data-tab="display">Display</button>
            </div>
            
            <div class="settings-content">
              <!-- API Keys Tab -->
              <div class="settings-panel active" id="panel-api-keys">
                <div class="settings-section">
                  <h3>API Keys</h3>
                  <p class="settings-description">
                    Enter your API keys to enable AI chat. Keys are stored securely in your system's credential manager.
                  </p>
                  
                  <div class="api-key-list" id="api-key-list">
                    <!-- Populated dynamically -->
                  </div>
                </div>
              </div>
              
              <!-- Models Tab -->
              <div class="settings-panel" id="panel-models">
                <div class="settings-section">
                  <h3>Default Provider</h3>
                  <p class="settings-description">
                    Choose which AI provider to use by default.
                  </p>
                  
                  <div class="settings-row">
                    <label>Selected Provider</label>
                    <select id="setting-provider" class="settings-select">
                      <!-- Populated dynamically -->
                    </select>
                  </div>
                </div>
                
                <div class="settings-section">
                  <h3>Model Selection</h3>
                  <p class="settings-description">
                    Choose which model to use for each provider.
                  </p>
                  
                  <div class="model-settings" id="model-settings">
                    <!-- Populated dynamically -->
                  </div>
                </div>
                
                <div class="settings-section">
                  <h3>Generation Settings</h3>
                  
                  <div class="settings-row">
                    <label for="setting-temperature">Temperature</label>
                    <div class="settings-input-group">
                      <input type="range" id="setting-temperature" 
                             min="0" max="1" step="0.1" value="0.7">
                      <span id="temperature-value">0.7</span>
                    </div>
                    <p class="settings-hint">Higher = more creative, Lower = more focused</p>
                  </div>
                  
                  <div class="settings-row">
                    <label for="setting-max-tokens">Max Response Tokens</label>
                    <input type="number" id="setting-max-tokens" class="settings-input"
                           min="256" max="16384" value="4096">
                    <p class="settings-hint">Maximum length of AI responses</p>
                  </div>
                </div>
              </div>
              
              <!-- Display Tab -->
              <div class="settings-panel" id="panel-display">
                <div class="settings-section">
                  <h3>Chat Display</h3>
                  
                  <div class="settings-row checkbox">
                    <label>
                      <input type="checkbox" id="setting-auto-scroll" checked>
                      <span>Auto-scroll to new messages</span>
                    </label>
                  </div>
                  
                  <div class="settings-row checkbox">
                    <label>
                      <input type="checkbox" id="setting-show-tokens" checked>
                      <span>Show token counts on messages</span>
                    </label>
                  </div>
                  
                  <div class="settings-row checkbox">
                    <label>
                      <input type="checkbox" id="setting-show-costs" checked>
                      <span>Show cost estimates</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="settings-cancel">Cancel</button>
            <button class="btn btn-primary" id="settings-save">Save Settings</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.overlay = document.getElementById('settings-modal-overlay')!;
  }

  /**
   * Render API key inputs
   */
  private renderAPIKeys(): void {
    const container = document.getElementById('api-key-list')!;
    container.innerHTML = '';

    for (const provider of this.providers) {
      const status = this.apiKeyStatus.find(s => s.provider === provider.provider);
      const isSet = status?.isSet || false;

      const keyHtml = `
        <div class="api-key-item">
          <div class="api-key-header">
            <div class="api-key-title">
              <span class="provider-icon">${this.getProviderIcon(provider.provider)}</span>
              <div>
                <h4>${provider.displayName}</h4>
                <p class="api-key-hint">${this.getProviderHint(provider.provider)}</p>
              </div>
            </div>
            <span class="api-key-status ${isSet ? 'configured' : 'not-configured'}">
              ${isSet ? '● Configured' : '○ Not Set'}
            </span>
          </div>
          
          <div class="api-key-input-group">
            <input 
              type="password" 
              class="api-key-input" 
              id="api-key-${provider.provider}"
              placeholder="${isSet ? '••••••••••••••••' : 'Enter API key'}"
              data-provider="${provider.provider}"
            >
            <button type="button" class="btn-icon" title="Toggle visibility" 
                    data-provider="${provider.provider}">
              👁️
            </button>
            <button type="button" class="btn btn-small btn-test-key" 
                    data-provider="${provider.provider}"
                    ${!isSet ? 'disabled' : ''}>
              Test
            </button>
            ${isSet ? `
              <button type="button" class="btn btn-small btn-danger btn-delete-key" 
                      data-provider="${provider.provider}">
                Delete
              </button>
            ` : ''}
          </div>
          <div class="api-key-test-result" id="test-result-${provider.provider}"></div>
        </div>
      `;

      container.insertAdjacentHTML('beforeend', keyHtml);
    }
  }

  /**
   * Render model selection dropdowns
   */
  private renderModelSettings(): void {
    // Populate provider dropdown
    const providerSelect = document.getElementById('setting-provider') as HTMLSelectElement;
    providerSelect.innerHTML = '';
    
    for (const provider of this.providers) {
      const option = document.createElement('option');
      option.value = provider.provider;
      option.textContent = provider.displayName;
      option.selected = provider.provider === this.settings.llm.selectedProvider;
      providerSelect.appendChild(option);
    }

    // Populate model dropdowns for each provider
    const modelContainer = document.getElementById('model-settings')!;
    modelContainer.innerHTML = '';

    for (const provider of this.providers) {
      const modelHtml = `
        <div class="settings-row">
          <label for="model-${provider.provider}">${provider.displayName}</label>
          <select id="model-${provider.provider}" class="settings-select" data-provider="${provider.provider}">
            ${provider.models.map(model => `
              <option value="${model.id}" 
                      ${model.id === this.settings.llm.selectedModels[provider.provider] ? 'selected' : ''}>
                ${model.displayName}
              </option>
            `).join('')}
          </select>
          <p class="settings-hint">
            Context: ${provider.models.find(m => m.id === this.settings.llm.selectedModels[provider.provider])?.contextWindow.toLocaleString()} tokens
          </p>
        </div>
      `;

      modelContainer.insertAdjacentHTML('beforeend', modelHtml);
    }

    // Set temperature value
    const tempSlider = document.getElementById('setting-temperature') as HTMLInputElement;
    const tempValue = document.getElementById('temperature-value')!;
    tempSlider.value = this.settings.llm.temperature.toString();
    tempValue.textContent = this.settings.llm.temperature.toString();

    // Set max tokens
    const maxTokensInput = document.getElementById('setting-max-tokens') as HTMLInputElement;
    maxTokensInput.value = this.settings.llm.maxTokens.toString();

    // Set UI checkboxes
    (document.getElementById('setting-auto-scroll') as HTMLInputElement).checked = this.settings.ui.autoScroll;
    (document.getElementById('setting-show-tokens') as HTMLInputElement).checked = this.settings.ui.showTokenCounts;
    (document.getElementById('setting-show-costs') as HTMLInputElement).checked = this.settings.ui.showCostEstimates;
  }

  /**
   * Attach event listeners for API key elements only
   */
  private attachAPIKeyListeners(): void {
    // API key inputs - enable test button when typing
    this.overlay.querySelectorAll('.api-key-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const provider = (e.target as HTMLElement).dataset.provider!;
        const testBtn = this.overlay.querySelector(`[data-provider="${provider}"].btn-test-key`) as HTMLButtonElement;
        const value = (e.target as HTMLInputElement).value;
        if (testBtn) {
          testBtn.disabled = !value;
        }
      });
    });

    // Test API key buttons
    this.overlay.querySelectorAll('.btn-test-key').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleTestKey(e.currentTarget as HTMLElement));
    });

    // Delete API key buttons
    this.overlay.querySelectorAll('.btn-delete-key').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDeleteKey(e.currentTarget as HTMLElement));
    });

    // Toggle API key visibility buttons
    this.overlay.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling as HTMLInputElement;
        if (input && input.classList.contains('api-key-input')) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Close buttons
    this.overlay.querySelector('#settings-modal-close')?.addEventListener('click', () => this.handleClose());
    this.overlay.querySelector('#settings-cancel')?.addEventListener('click', () => this.handleClose());
    
    // Save button
    this.overlay.querySelector('#settings-save')?.addEventListener('click', () => this.handleSave());

    // Tab switching
    this.overlay.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.handleTabSwitch(e.target as HTMLElement));
    });

    // Temperature slider
    const tempSlider = document.getElementById('setting-temperature') as HTMLInputElement;
    tempSlider?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      document.getElementById('temperature-value')!.textContent = value;
    });

    // Click outside to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.handleClose();
      }
    });

    // Attach API key specific listeners
    this.attachAPIKeyListeners();
  }

  /**
   * Handle tab switching
   */
  private handleTabSwitch(tab: HTMLElement): void {
    const tabName = tab.dataset.tab;
    if (!tabName) return;

    // Update tab active state
    this.overlay.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update panel active state
    this.overlay.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    this.overlay.querySelector(`#panel-${tabName}`)?.classList.add('active');
  }

  /**
   * Handle test API key
   */
  private async handleTestKey(button: HTMLElement): Promise<void> {
    const provider = button.dataset.provider as LLMProvider;
    const input = document.getElementById(`api-key-${provider}`) as HTMLInputElement;
    const resultDiv = document.getElementById(`test-result-${provider}`)!;
    const apiKey = input.value.trim();

    if (!apiKey) return;

    button.textContent = 'Testing...';
    button.setAttribute('disabled', 'true');
    resultDiv.textContent = '';

    try {
      const result = await window.electronAPI.testAPIKey(provider, apiKey);
      
      if (result.valid) {
        resultDiv.innerHTML = '<span class="test-success">✓ API key is valid</span>';
      } else {
        resultDiv.innerHTML = `<span class="test-error">✗ ${result.error || 'Invalid API key'}</span>`;
      }
    } catch (error: any) {
      resultDiv.innerHTML = `<span class="test-error">✗ ${error.message}</span>`;
    } finally {
      button.textContent = 'Test';
      button.removeAttribute('disabled');
    }
  }

  /**
   * Handle delete API key
   */
  private async handleDeleteKey(button: HTMLElement): Promise<void> {
    const provider = button.dataset.provider as LLMProvider;
    
    if (!confirm(`Delete API key for ${provider}?`)) {
      return;
    }

    try {
      await window.electronAPI.deleteAPIKey(provider);
      
      // Reload data and re-render
      await this.loadData();
      this.renderAPIKeys();
      this.attachAPIKeyListeners();
    } catch (error: any) {
      alert(`Error deleting API key: ${error.message}`);
    }
  }

  /**
   * Handle save
   */
  private async handleSave(): Promise<void> {
    try {
      // Save any changed API keys
      const apiKeyInputs = this.overlay.querySelectorAll('.api-key-input') as NodeListOf<HTMLInputElement>;
      apiKeyInputs.forEach((input) => {
        const value = input.value.trim();
        if (value && value !== input.placeholder) {
          const provider = input.dataset.provider as LLMProvider;
          window.electronAPI.setAPIKey(provider, value);
        }
      });

      // Build settings object
      const updatedSettings: Partial<AppSettings> = {
        llm: {
          selectedProvider: (document.getElementById('setting-provider') as HTMLSelectElement).value as LLMProvider,
          selectedModels: {
            anthropic: (document.getElementById('model-anthropic') as HTMLSelectElement).value,
            openai: (document.getElementById('model-openai') as HTMLSelectElement).value,
            moonshot: (document.getElementById('model-moonshot') as HTMLSelectElement).value
          },
          temperature: parseFloat((document.getElementById('setting-temperature') as HTMLInputElement).value),
          maxTokens: parseInt((document.getElementById('setting-max-tokens') as HTMLInputElement).value)
        },
        ui: {
          autoScroll: (document.getElementById('setting-auto-scroll') as HTMLInputElement).checked,
          showTokenCounts: (document.getElementById('setting-show-tokens') as HTMLInputElement).checked,
          showCostEstimates: (document.getElementById('setting-show-costs') as HTMLInputElement).checked
        }
      };

      // Save settings
      const savedSettings = await window.electronAPI.updateSettings(updatedSettings);
      
      // Notify parent
      this.options.onSettingsChange(savedSettings);
      
      // Close modal
      this.hide();
    } catch (error: any) {
      alert(`Error saving settings: ${error.message}`);
    }
  }

  /**
   * Handle close
   */
  private handleClose(): void {
    this.hide();
    this.options.onClose();
  }

  /**
   * Get provider icon
   */
  private getProviderIcon(provider: LLMProvider): string {
    const icons: Record<LLMProvider, string> = {
      anthropic: '🤖',
      openai: '✨',
      moonshot: '🌙'
    };
    return icons[provider] || '🔑';
  }

  /**
   * Get provider hint
   */
  private getProviderHint(provider: LLMProvider): string {
    const hints: Record<LLMProvider, string> = {
      anthropic: 'Get your API key from console.anthropic.com',
      openai: 'Get your API key from platform.openai.com',
      moonshot: 'Get your API key from platform.moonshot.cn'
    };
    return hints[provider] || '';
  }
}