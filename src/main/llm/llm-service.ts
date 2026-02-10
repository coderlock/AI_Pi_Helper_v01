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
import { PromptStore } from '../store/prompt-store';
import { ToolHandler } from './tools/tool-handler';
import { formatToolsForAnthropic, formatToolsForOpenAI } from './tools/tool-definitions';
import { AgentExecutor } from '../agent/agent-executor';
import { ToolCall, ToolResult, TerminalContext } from '../agent/types';

// API key storage keys
const API_KEY_PREFIX = 'api-key-';

export class LLMService {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private credentialStore: CredentialStore;
  private promptStore: PromptStore;
  private mainWindow: BrowserWindow | null = null;
  private toolHandler: ToolHandler | null = null;
  private agentExecutor: AgentExecutor | null = null;

  constructor(credentialStore: CredentialStore, promptStore: PromptStore) {
    this.credentialStore = credentialStore;
    this.promptStore = promptStore;
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
   * Set the agent executor for tool handling
   */
  setAgentExecutor(executor: AgentExecutor): void {
    this.agentExecutor = executor;
    this.toolHandler = new ToolHandler(executor);
  }

  /**
   * Get terminal context for system prompt enhancement
   */
  getTerminalContext(): TerminalContext | null {
    return this.agentExecutor?.getTerminalContext() || null;
  }

  /**
   * Get the current system prompt
   */
  getSystemPrompt(): string {
    const activePrompt = this.promptStore.getActive();
    return activePrompt.content;
  }

  /**
   * Get tools formatted for the current provider
   */
  private getToolsForProvider(provider: LLMProvider): any[] {
    switch (provider) {
      case 'anthropic':
        return formatToolsForAnthropic();
      case 'openai':
      case 'moonshot':
        return formatToolsForOpenAI();
      default:
        return [];
    }
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

    // Get current system prompt
    const systemPrompt = this.getSystemPrompt();

    // Get tools
    const tools = this.getToolsForProvider(options.provider);

    // Convert chat messages to LLM format
    const llmMessages: LLMMessage[] = options.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Start streaming with tools
    this.streamWithTools(
      provider,
      options,
      llmMessages,
      systemPrompt,
      tools,
      requestId,
      abortController
    );

    return requestId;
  }

  /**
   * Stream response with tool call handling
   */
  private async streamWithTools(
    provider: ILLMProvider,
    options: LLMRequestOptions,
    messages: LLMMessage[],
    systemPrompt: string,
    tools: any[],
    requestId: string,
    abortController: AbortController
  ): Promise<void> {
    let fullContent = '';
    let pendingToolCalls: ToolCall[] = [];

    try {
      await provider.streamMessage(
        options.model,
        messages,
        {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          signal: abortController.signal,
          tools: tools.length > 0 ? tools : undefined
        },
        {
          onChunk: (chunk) => {
            if (chunk.content) {
              fullContent += chunk.content;
              this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_CHUNK, { requestId, chunk });
            }
            
            // Check for tool calls in chunk (provider-specific)
            if (chunk.toolCalls) {
              pendingToolCalls.push(...chunk.toolCalls);
            }
          },
          onComplete: async (usage) => {
            // Handle any tool calls
            if (pendingToolCalls.length > 0 && this.toolHandler) {
              await this.handleToolCalls(
                provider,
                options,
                messages,
                systemPrompt,
                tools,
                requestId,
                abortController,
                fullContent,
                pendingToolCalls,
                usage
              );
            } else {
              // No tool calls - complete normally
              this.activeRequests.delete(requestId);
              this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_END, { requestId, usage });
            }
          },
          onError: (error) => {
            this.activeRequests.delete(requestId);
            this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, { 
              requestId, 
              error: error.message 
            });
          }
        },
        systemPrompt
      );
    } catch (error: any) {
      this.activeRequests.delete(requestId);
      this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, { 
        requestId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle tool calls and continue conversation
   */
  private async handleToolCalls(
    provider: ILLMProvider,
    options: LLMRequestOptions,
    messages: LLMMessage[],
    systemPrompt: string,
    tools: any[],
    requestId: string,
    abortController: AbortController,
    assistantContent: string,
    toolCalls: ToolCall[],
    initialUsage: TokenUsage
  ): Promise<void> {
    if (!this.toolHandler) {
      this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, {
        requestId,
        error: 'Tool handler not available'
      });
      return;
    }

    // Execute each tool call
    const toolResults: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      // Check if cancelled
      if (abortController.signal.aborted) {
        return;
      }

      try {
        const result = await this.toolHandler.handleToolCall(toolCall);
        toolResults.push(result);

        // Notify renderer of tool execution
        this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_CHUNK, {
          requestId,
          chunk: {
            content: `\n\n[Executed: ${toolCall.arguments.description || toolCall.arguments.command}]\n`,
            isComplete: false,
            isToolResult: true
          }
        });

      } catch (error: any) {
        toolResults.push({
          toolCallId: toolCall.id,
          success: false,
          result: '',
          error: error.message
        });
      }
    }

    // Build updated messages with tool results
    const updatedMessages: LLMMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: assistantContent,
        toolCalls: toolCalls  // Provider-specific handling needed
      } as any,
      ...toolResults.map(result => ({
        role: 'tool' as const,
        content: result.error || result.result,
        toolCallId: result.toolCallId
      } as any))
    ];

    // Continue the conversation with tool results
    await this.streamWithTools(
      provider,
      options,
      updatedMessages,
      systemPrompt,
      tools,
      requestId,
      abortController
    );
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
