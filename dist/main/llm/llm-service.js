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
const tool_handler_1 = require("./tools/tool-handler");
const tool_definitions_1 = require("./tools/tool-definitions");
// API key storage keys
const API_KEY_PREFIX = 'api-key-';
class LLMService {
    constructor(credentialStore, promptStore) {
        this.providers = new Map();
        this.activeRequests = new Map();
        this.mainWindow = null;
        this.toolHandler = null;
        this.agentExecutor = null;
        this.credentialStore = credentialStore;
        this.promptStore = promptStore;
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
     * Set the agent executor for tool handling
     */
    setAgentExecutor(executor) {
        this.agentExecutor = executor;
        this.toolHandler = new tool_handler_1.ToolHandler(executor);
    }
    /**
     * Get terminal context for system prompt enhancement
     */
    getTerminalContext() {
        return this.agentExecutor?.getTerminalContext() || null;
    }
    /**
     * Get the current system prompt
     */
    getSystemPrompt() {
        const activePrompt = this.promptStore.getActive();
        return activePrompt.content;
    }
    /**
     * Get tools formatted for the current provider
     */
    getToolsForProvider(provider) {
        switch (provider) {
            case 'anthropic':
                return (0, tool_definitions_1.formatToolsForAnthropic)();
            case 'openai':
            case 'moonshot':
                return (0, tool_definitions_1.formatToolsForOpenAI)();
            default:
                return [];
        }
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
        // Get current system prompt
        const systemPrompt = this.getSystemPrompt();
        // Get tools
        const tools = this.getToolsForProvider(options.provider);
        // Convert chat messages to LLM format
        const llmMessages = options.messages.map(m => ({
            role: m.role,
            content: m.content
        }));
        // Start streaming with tools
        this.streamWithTools(provider, options, llmMessages, systemPrompt, tools, requestId, abortController);
        return requestId;
    }
    /**
     * Stream response with tool call handling
     */
    async streamWithTools(provider, options, messages, systemPrompt, tools, requestId, abortController) {
        let fullContent = '';
        let pendingToolCalls = [];
        try {
            await provider.streamMessage(options.model, messages, {
                maxTokens: options.maxTokens,
                temperature: options.temperature,
                signal: abortController.signal,
                tools: tools.length > 0 ? tools : undefined
            }, {
                onChunk: (chunk) => {
                    if (chunk.content) {
                        fullContent += chunk.content;
                        this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_CHUNK, { requestId, chunk });
                    }
                    // Check for tool calls in chunk (provider-specific)
                    if (chunk.toolCalls) {
                        pendingToolCalls.push(...chunk.toolCalls);
                    }
                },
                onComplete: async (usage) => {
                    // Handle any tool calls
                    if (pendingToolCalls.length > 0 && this.toolHandler) {
                        await this.handleToolCalls(provider, options, messages, systemPrompt, tools, requestId, abortController, fullContent, pendingToolCalls, usage);
                    }
                    else {
                        // No tool calls - complete normally
                        this.activeRequests.delete(requestId);
                        this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_END, { requestId, usage });
                    }
                },
                onError: (error) => {
                    this.activeRequests.delete(requestId);
                    this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_ERROR, {
                        requestId,
                        error: error.message
                    });
                }
            }, systemPrompt);
        }
        catch (error) {
            this.activeRequests.delete(requestId);
            this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_ERROR, {
                requestId,
                error: error.message
            });
        }
    }
    /**
     * Handle tool calls and continue conversation
     */
    async handleToolCalls(provider, options, messages, systemPrompt, tools, requestId, abortController, assistantContent, toolCalls, initialUsage) {
        if (!this.toolHandler) {
            this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_ERROR, {
                requestId,
                error: 'Tool handler not available'
            });
            return;
        }
        // Execute each tool call
        const toolResults = [];
        for (const toolCall of toolCalls) {
            // Check if cancelled
            if (abortController.signal.aborted) {
                return;
            }
            try {
                const result = await this.toolHandler.handleToolCall(toolCall);
                toolResults.push(result);
                // Notify renderer of tool execution
                this.sendToRenderer(types_1.IPC_CHANNELS.LLM_STREAM_CHUNK, {
                    requestId,
                    chunk: {
                        content: `\n\n[Executed: ${toolCall.arguments.description || toolCall.arguments.command}]\n`,
                        isComplete: false,
                        isToolResult: true
                    }
                });
            }
            catch (error) {
                toolResults.push({
                    toolCallId: toolCall.id,
                    success: false,
                    result: '',
                    error: error.message
                });
            }
        }
        // Build updated messages with tool results
        const updatedMessages = [
            ...messages,
            {
                role: 'assistant',
                content: assistantContent,
                toolCalls: toolCalls // Provider-specific handling needed
            },
            ...toolResults.map(result => ({
                role: 'tool',
                content: result.error || result.result,
                toolCallId: result.toolCallId
            }))
        ];
        // Continue the conversation with tool results
        await this.streamWithTools(provider, options, updatedMessages, systemPrompt, tools, requestId, abortController);
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