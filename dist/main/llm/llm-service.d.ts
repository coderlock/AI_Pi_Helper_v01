/**
 * LLM Service
 * Orchestrates LLM providers and manages requests
 */
import { BrowserWindow } from 'electron';
import { LLMProvider, LLMRequestOptions, ProviderConfig } from '../../shared/types';
import { CredentialStore } from '../store/credential-store';
export declare class LLMService {
    private providers;
    private activeRequests;
    private credentialStore;
    private mainWindow;
    constructor(credentialStore: CredentialStore);
    /**
     * Set the main window for IPC events
     */
    setMainWindow(window: BrowserWindow): void;
    /**
     * Initialize all providers
     */
    private initializeProviders;
    /**
     * Load API keys from credential store
     */
    private loadAPIKeys;
    /**
     * Get provider configuration for UI
     */
    getProviders(): ProviderConfig[];
    /**
     * Set API key for a provider
     */
    setAPIKey(provider: LLMProvider, apiKey: string): boolean;
    /**
     * Delete API key for a provider
     */
    deleteAPIKey(provider: LLMProvider): boolean;
    /**
     * Check if API key is set for a provider
     */
    hasAPIKey(provider: LLMProvider): boolean;
    /**
     * Test API key validity
     */
    testAPIKey(provider: LLMProvider, apiKey: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Send a message with streaming response
     */
    sendMessage(options: LLMRequestOptions): Promise<string>;
    /**
     * Cancel an active request
     */
    cancelRequest(requestId: string): void;
    /**
     * Send IPC message to renderer
     */
    private sendToRenderer;
}
//# sourceMappingURL=llm-service.d.ts.map