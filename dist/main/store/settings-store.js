"use strict";
/**
 * Settings Store
 * Manages application settings persistence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsStore = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const DEFAULT_SETTINGS = {
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
class SettingsStore {
    constructor() {
        this.store = new electron_store_1.default({
            name: 'settings',
            defaults: {
                settings: DEFAULT_SETTINGS
            }
        });
    }
    /**
     * Get all settings
     */
    get() {
        return this.store.get('settings', DEFAULT_SETTINGS);
    }
    /**
     * Update settings (partial update)
     */
    update(updates) {
        const current = this.get();
        // Deep merge
        const updated = {
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
    reset() {
        this.store.set('settings', DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
    }
    /**
     * Get selected provider
     */
    getSelectedProvider() {
        return this.get().llm.selectedProvider;
    }
    /**
     * Get selected model for a provider
     */
    getSelectedModel(provider) {
        return this.get().llm.selectedModels[provider];
    }
}
exports.SettingsStore = SettingsStore;
//# sourceMappingURL=settings-store.js.map