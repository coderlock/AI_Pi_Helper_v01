"use strict";
/**
 * LLM Service
 * Orchestrates LLM providers and manages requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../../shared/types");
const anthropic_1 = require("./providers/anthropic");
const openai_1 = require("./providers/openai");
const moonshot_1 = require("./providers/moonshot");
const pricing_1 = require("./pricing");
// API key storage keys
const API_KEY_PREFIX = 'api-key-';
class LLMService {
    constructor(credentialStore) {
        this.providers = new Map();
        this.activeRequests = new Map();
        this.mainWindow = null;
        this.credentialStore = credentialStore;
        this.initializeProviders();
        this.loadAPIKeys();
    }
    /**
     * Set the main window for IPC events
     */
    setMainWindow(window) {
        this.mainWindow = window;
    }
    /**
     * Initialize all providers
     */
    initializeProviders() {
        this.providers.set('anthropic', new anthropic_1.AnthropicProvider());
        this.providers.set('openai', new openai_1.OpenAIProvider());
        this.providers.set('moonshot', new moonshot_1.MoonshotProvider());
    }
    /**
     * Load API keys from credential store
     */
    loadAPIKeys() {
        const providerNames = ['anthropic', 'openai', 'moonshot'];
        for (const provider of providerNames) {
            const apiKey = this.credentialStore.getPassword(`${API_KEY_PREFIX}${provider}`);
            if (apiKey) {
                this.providers.get(provider)?.setAPIKey(apiKey);
                console.log(`Loaded API key for ${provider}`);
            }
        }
    }
    /**
     * Get provider configuration for UI
     */
    getProviders() {
        const configs = [];
        for (const [providerKey, provider] of this.providers) {
            const info = pricing_1.PROVIDER_INFO[providerKey];
            const models = (0, pricing_1.getModelsForProvider)(providerKey);
            configs.push({
                provider: providerKey,
                displayName: info.displayName,
                models,
                defaultModel: (0, pricing_1.getDefaultModel)(providerKey),
                apiEndpoint: info.apiEndpoint,
                isConfigured: provider.hasAPIKey()
            });
        }
        return configs;
    }
    /**
     * Set API key for a provider
     */
    setAPIKey(provider, apiKey) {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance)
            return false;
        // Store in credential store
        const stored = this.credentialStore.setPassword(`${API_KEY_PREFIX}${provider}`, apiKey);
        if (stored) {
            // Update provider
            providerInstance.setAPIKey(apiKey);
            console.log(`API key set for ${provider}`);
        }
        return stored;
    }
    /**
     * Delete API key for a provider
     */
    deleteAPIKey(provider) {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance)
            return false;
        // Remove from credential store
        this.credentialStore.deletePassword(`${API_KEY_PREFIX}${provider}`);
        // Clear from provider
        providerInstance.setAPIKey('');
        console.log(`API key deleted for ${provider}`);
        return true;
    }
    /**
     * Check if API key is set for a provider
     */
    hasAPIKey(provider) {
        return this.providers.get(provider)?.hasAPIKey() || false;
    }
    /**
     * Test API key validity
     */
    async testAPIKey(provider, apiKey) {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance) {
            return { valid: false, error: 'Unknown provider' };
        }
        return providerInstance.testConnection(apiKey);
    }
    /**
     * Send a message with streaming response
     */
    async sendMessage(options) {
        const provider = this.providers.get(options.provider);
        if (!provider) {
            throw new Error(`Unknown provider: ${options.provider}`);
        }
        if (!provider.hasAPIKey()) {
            throw new Error(`API key not configured for ${options.provider}. Please add your API key in settings.`);
        }
        // Generate request ID
        const requestId = (0, uuid_1.v4)();
        // Create abort controller
        const abortController = new AbortController();
        this.activeRequests.set(requestId, abortController);
        // Convert chat messages to LLM format
        const llmMessages = options.messages.map(m => ({
            role: m.role,
            content: m.content
        }));
        // Start streaming
        provider.streamMessage(options.model, llmMessages, {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            signal: abortController.signal
        }, {
            onChunk: (chunk) => {
                this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_CHUNK, { requestId, chunk });
            },
            onComplete: (usage) => {
                this.activeRequests.delete(requestId);
                this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_END, { requestId, usage });
            },
            onError: (error) => {
                this.activeRequests.delete(requestId);
                this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_ERROR, {
                    requestId,
                    error: error.message
                });
            }
        });
        return requestId;
    }
    /**
     * Cancel an active request
     */
    cancelRequest(requestId) {
        const controller = this.activeRequests.get(requestId);
        if (controller) {
            controller.abort();
            this.activeRequests.delete(requestId);
            console.log(`Request ${requestId} cancelled`);
        }
    }
    /**
     * Send IPC message to renderer
     */
    sendToRenderer(channel, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        }
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=llm-service.js.map