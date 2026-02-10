/**
 * Settings Modal Component
 * UI for API key management and app settings
 */
import { AppSettings } from '../../shared/types';
export interface SettingsModalOptions {
    onClose: () => void;
    onSettingsChange: (settings: AppSettings) => void;
}
export declare class SettingsModal {
    private overlay;
    private options;
    private settings;
    private providers;
    private apiKeyStatus;
    private isTestingKey;
    constructor(options: SettingsModalOptions);
    /**
     * Show the modal
     */
    show(): Promise<void>;
    /**
     * Hide the modal
     */
    hide(): void;
    /**
     * Load settings and provider data
     */
    private loadData;
    /**
     * Create modal HTML
     */
    private createModal;
    /**
     * Render API key inputs
     */
    private renderAPIKeys;
    /**
     * Render model selection dropdowns
     */
    private renderModelSettings;
    /**
     * Attach event listeners for API key elements only
     */
    private attachAPIKeyListeners;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Handle tab switching
     */
    private handleTabSwitch;
    /**
     * Handle test API key
     */
    private handleTestKey;
    /**
     * Handle delete API key
     */
    private handleDeleteKey;
    /**
     * Handle save
     */
    private handleSave;
    /**
     * Handle close
     */
    private handleClose;
    /**
     * Get provider icon
     */
    private getProviderIcon;
    /**
     * Get provider hint
     */
    private getProviderHint;
}
//# sourceMappingURL=settings-modal.d.ts.map