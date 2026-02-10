/**
 * Settings Store
 * Manages application settings persistence
 */
import { AppSettings, LLMProvider } from '../../shared/types';
export declare class SettingsStore {
    private store;
    constructor();
    /**
     * Get all settings
     */
    get(): AppSettings;
    /**
     * Update settings (partial update)
     */
    update(updates: Partial<AppSettings>): AppSettings;
    /**
     * Reset to defaults
     */
    reset(): AppSettings;
    /**
     * Get selected provider
     */
    getSelectedProvider(): LLMProvider;
    /**
     * Get selected model for a provider
     */
    getSelectedModel(provider: LLMProvider): string;
}
//# sourceMappingURL=settings-store.d.ts.map