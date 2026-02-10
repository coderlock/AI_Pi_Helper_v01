/**
 * LLM Service
 * Orchestrates LLM providers and manages requests
 */

import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { 
  LLMProvider, 
  LLMRequestOptions, 
  LLMMessage, 
  TokenUsage,
  ProviderConfig,
  IPC_CHANNELS
} from '../../shared/types';
import { ILLMProvider } from './types';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai';
import { MoonshotProvider } from './providers/moonshot';
import { getModelsForProvider, getDefaultModel, PROVIDER_INFO } from './pricing';
import { CredentialStore } from '../store/credential-store';

// API key storage keys
const API_KEY_PREFIX = 'api-key-';

export class LLMService {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private credentialStore: CredentialStore;
  private mainWindow: BrowserWindow | null = null;

  constructor(credentialStore: CredentialStore) {
    this.credentialStore = credentialStore;
    this.initializeProviders();
    this.loadAPIKeys();
  }

  /**
   * Set the main window for IPC events
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Initialize all providers
   */
  private initializeProviders(): void {
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('moonshot', new MoonshotProvider());
  }

  /**
   * Load API keys from credential store
   */
  private loadAPIKeys(): void {
    const providerNames: LLMProvider[] = ['anthropic', 'openai', 'moonshot'];
    
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
  getProviders(): ProviderConfig[] {
    const configs: ProviderConfig[] = [];
    
    for (const [providerKey, provider] of this.providers) {
      const info = PROVIDER_INFO[providerKey];
      const models = getModelsForProvider(providerKey);
      
      configs.push({
        provider: providerKey,
        displayName: info.displayName,
        models,
        defaultModel: getDefaultModel(providerKey),
        apiEndpoint: info.apiEndpoint,
        isConfigured: provider.hasAPIKey()
      });
    }
    
    return configs;
  }

  /**
   * Set API key for a provider
   */
  setAPIKey(provider: LLMProvider, apiKey: string): boolean {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return false;

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
  deleteAPIKey(provider: LLMProvider): boolean {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return false;

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
  hasAPIKey(provider: LLMProvider): boolean {
    return this.providers.get(provider)?.hasAPIKey() || false;
  }

  /**
   * Test API key validity
   */
  async testAPIKey(provider: LLMProvider, apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      return { valid: false, error: 'Unknown provider' };
    }

    return providerInstance.testConnection(apiKey);
  }

  /**
   * Send a message with streaming response
   */
  async sendMessage(options: LLMRequestOptions): Promise<string> {
    const provider = this.providers.get(options.provider);
    
    if (!provider) {
      throw new Error(`Unknown provider: ${options.provider}`);
    }

    if (!provider.hasAPIKey()) {
      throw new Error(`API key not configured for ${options.provider}. Please add your API key in settings.`);
    }

    // Generate request ID
    const requestId = uuidv4();

    // Create abort controller
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    // Convert chat messages to LLM format
    const llmMessages: LLMMessage[] = options.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Start streaming
    provider.streamMessage(
      options.model,
      llmMessages,
      {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        signal: abortController.signal
      },
      {
        onChunk: (chunk) => {
          this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_CHUNK, { requestId, chunk });
        },
        onComplete: (usage) => {
          this.activeRequests.delete(requestId);
          this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_END, { requestId, usage });
        },
        onError: (error) => {
          this.activeRequests.delete(requestId);
          this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, { 
            requestId, 
            error: error.message 
          });
        }
      }
    );

    return requestId;
  }

  /**
   * Cancel an active request
   */
  cancelRequest(requestId: string): void {
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
  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}
