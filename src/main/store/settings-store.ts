/**
 * Settings Store
 * Manages application settings persistence
 */

import Store from 'electron-store';
import { AppSettings, LLMProvider } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    selectedProvider: 'moonshot',
    selectedModels: {
      anthropic: 'claude-sonnet-4-20260120',
      openai: 'gpt-4o',
      moonshot: 'kimi-k2-turbo-preview'
    },
    temperature: 0.7,
    maxTokens: 4096
  },
  ui: {
    autoScroll: true,
    showTokenCounts: true,
    showCostEstimates: true
  }
};

export class SettingsStore {
  private store: Store<{ settings: AppSettings }>;

  constructor() {
    this.store = new Store<{ settings: AppSettings }>({
      name: 'settings',
      defaults: {
        settings: DEFAULT_SETTINGS
      }
    });
  }

  /**
   * Get all settings
   */
  get(): AppSettings {
    return this.store.get('settings', DEFAULT_SETTINGS);
  }

  /**
   * Update settings (partial update)
   */
  update(updates: Partial<AppSettings>): AppSettings {
    const current = this.get();
    
    // Deep merge
    const updated: AppSettings = {
      llm: {
        ...current.llm,
        ...(updates.llm || {}),
        selectedModels: {
          ...current.llm.selectedModels,
          ...(updates.llm?.selectedModels || {})
        }
      },
      ui: {
        ...current.ui,
        ...(updates.ui || {})
      }
    };

    this.store.set('settings', updated);
    return updated;
  }

  /**
   * Reset to defaults
   */
  reset(): AppSettings {
    this.store.set('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /**
   * Get selected provider
   */
  getSelectedProvider(): LLMProvider {
    return this.get().llm.selectedProvider;
  }

  /**
   * Get selected model for a provider
   */
  getSelectedModel(provider: LLMProvider): string {
    return this.get().llm.selectedModels[provider];
  }
}
