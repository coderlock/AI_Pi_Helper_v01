"use strict";
/**
 * Moonshot (Kimi) Provider
 * Uses OpenAI-compatible API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoonshotProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const base_provider_1 = require("./base-provider");
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';
class MoonshotProvider extends base_provider_1.BaseLLMProvider {
    constructor() {
        super(...arguments);
        this.provider = 'moonshot';
        this.displayName = 'Moonshot (Kimi)';
        this.client = null;
    }
    /**
     * Get or create Moonshot client (OpenAI-compatible)
     */
    getClient() {
        if (!this.client || !this.apiKey) {
            this.client = new openai_1.default({
                apiKey: this.getAPIKey(),
                baseURL: MOONSHOT_BASE_URL
            });
        }
        return this.client;
    }
    /**
     * Reset client when API key changes
     */
    setAPIKey(apiKey) {
        super.setAPIKey(apiKey);
        this.client = null;
    }
    /**
     * Stream message to Kimi
     */
    async streamMessage(model, messages, options, callbacks, systemPrompt) {
        const client = this.getClient();
        const formattedMessages = this.formatMessages(messages, systemPrompt);
        try {
            const requestOptions = {
                model,
                max_tokens: options.maxTokens || 4096,
                temperature: options.temperature ?? 0.7,
                messages: formattedMessages,
                stream: true
            };
            // Add tools if provided
            if (options.tools && options.tools.length > 0) {
                requestOptions.tools = options.tools;
            }
            const stream = await client.chat.completions.create(requestOptions);
            let inputTokens = 0;
            let outputTokens = 0;
            let totalContent = '';
            const toolCalls = [];
            let currentToolCallIndex = -1;
            // Handle abort signal
            if (options.signal) {
                options.signal.addEventListener('abort', () => {
                    stream.controller.abort();
                });
            }
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (delta?.content) {
                    totalContent += delta.content;
                    callbacks.onChunk({
                        content: delta.content,
                        isComplete: false
                    });
                }
                // Handle tool calls
                if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        if (tc.index !== undefined) {
                            if (tc.index > currentToolCallIndex) {
                                // New tool call
                                currentToolCallIndex = tc.index;
                                toolCalls.push({
                                    id: tc.id || '',
                                    name: tc.function?.name || '',
                                    arguments: {}
                                });
                            }
                            // Accumulate arguments
                            if (tc.function?.arguments) {
                                const current = toolCalls[currentToolCallIndex];
                                if (typeof current.arguments === 'string') {
                                    current.arguments += tc.function.arguments;
                                }
                                else {
                                    current.arguments = tc.function.arguments;
                                }
                            }
                        }
                    }
                }
                // Get usage from final chunk if available
                if (chunk.usage) {
                    inputTokens = chunk.usage.prompt_tokens;
                    outputTokens = chunk.usage.completion_tokens;
                }
            }
            // Parse tool call arguments
            for (const tc of toolCalls) {
                if (typeof tc.arguments === 'string') {
                    try {
                        tc.arguments = JSON.parse(tc.arguments);
                    }
                    catch {
                        tc.arguments = { raw: tc.arguments };
                    }
                }
            }
            // Send final chunk with tool calls if any
            if (toolCalls.length > 0) {
                callbacks.onChunk({
                    content: '',
                    isComplete: true,
                    toolCalls
                });
            }
            // Estimate tokens if not provided (Moonshot may not always return usage in stream)
            if (inputTokens === 0) {
                inputTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
            }
            if (outputTokens === 0) {
                outputTokens = this.estimateTokens(totalContent);
            }
            callbacks.onComplete(this.createUsage(model, inputTokens, outputTokens));
        }
        catch (error) {
            if (error.name === 'AbortError') {
                callbacks.onError(new Error('Request cancelled'));
            }
            else {
                callbacks.onError(this.formatError(error));
            }
        }
    }
    /**
     * Test API key validity
     */
    async testConnection(apiKey) {
        try {
            const testClient = new openai_1.default({
                apiKey,
                baseURL: MOONSHOT_BASE_URL
            });
            // Make a minimal request to test the key
            await testClient.chat.completions.create({
                model: 'kimi-k2-0905-preview', // Use smallest model for faster test
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }]
            });
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: this.formatError(error).message
            };
        }
    }
    /**
     * Format messages for Moonshot API (OpenAI-compatible)
     */
    formatMessages(messages, systemPrompt) {
        const formatted = [
            { role: 'system', content: systemPrompt }
        ];
        for (const msg of messages) {
            if (msg.role === 'system')
                continue;
            if (msg.role === 'tool') {
                // Tool result message
                formatted.push({
                    role: 'tool',
                    tool_call_id: msg.toolCallId,
                    content: msg.content
                });
            }
            else if (msg.toolCalls) {
                // Assistant message with tool calls
                formatted.push({
                    role: 'assistant',
                    content: msg.content || null,
                    tool_calls: msg.toolCalls.map((tc) => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments)
                        }
                    }))
                });
            }
            else {
                formatted.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }
        return formatted;
    }
    /**
     * Rough token estimation (for when API doesn't return usage)
     * ~4 characters per token for English text
     */
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    /**
     * Format error for user display
     */
    formatError(error) {
        if (error.status === 401) {
            return new Error('Invalid API key. Please check your Moonshot API key in settings.');
        }
        if (error.status === 429) {
            return new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.status === 500 || error.status === 503) {
            return new Error('Moonshot API is temporarily unavailable. Please try again later.');
        }
        if (error.message?.includes('insufficient_balance')) {
            return new Error('Insufficient Moonshot balance. Please top up your account.');
        }
        return new Error(error.message || 'An error occurred while communicating with Kimi.');
    }
}
exports.MoonshotProvider = MoonshotProvider;
//# sourceMappingURL=moonshot.js.map