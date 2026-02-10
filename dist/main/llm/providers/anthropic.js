"use strict";
/**
 * Anthropic (Claude) Provider
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const base_provider_1 = require("./base-provider");
class AnthropicProvider extends base_provider_1.BaseLLMProvider {
    constructor() {
        super(...arguments);
        this.provider = 'anthropic';
        this.displayName = 'Anthropic (Claude)';
        this.client = null;
    }
    /**
     * Get or create Anthropic client
     */
    getClient() {
        if (!this.client || !this.apiKey) {
            this.client = new sdk_1.default({
                apiKey: this.getAPIKey()
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
     * Stream message to Claude
     */
    async streamMessage(model, messages, options, callbacks, systemPrompt) {
        const client = this.getClient();
        // Separate system message from conversation
        const formattedMessages = this.formatMessages(messages);
        try {
            const requestOptions = {
                model,
                max_tokens: options.maxTokens || 4096,
                temperature: options.temperature ?? 0.7,
                system: systemPrompt,
                messages: formattedMessages
            };
            // Add tools if provided
            if (options.tools && options.tools.length > 0) {
                requestOptions.tools = options.tools;
            }
            const stream = await client.messages.stream(requestOptions);
            let inputTokens = 0;
            let outputTokens = 0;
            let currentToolCall = null;
            const toolCalls = [];
            // Handle abort signal
            if (options.signal) {
                options.signal.addEventListener('abort', () => {
                    stream.controller.abort();
                });
            }
            for await (const event of stream) {
                if (event.type === 'content_block_start') {
                    const block = event.content_block;
                    if (block.type === 'tool_use') {
                        currentToolCall = {
                            id: block.id,
                            name: block.name,
                            arguments: {}
                        };
                    }
                }
                else if (event.type === 'content_block_delta') {
                    const delta = event.delta;
                    if (delta.type === 'text_delta' && delta.text) {
                        callbacks.onChunk({
                            content: delta.text,
                            isComplete: false
                        });
                    }
                    else if (delta.type === 'input_json_delta' && currentToolCall) {
                        // Accumulate tool arguments (streamed as JSON)
                        // This is simplified - full implementation would parse incrementally
                    }
                }
                else if (event.type === 'content_block_stop') {
                    if (currentToolCall) {
                        toolCalls.push(currentToolCall);
                        currentToolCall = null;
                    }
                }
                else if (event.type === 'message_delta') {
                    const usage = event.usage;
                    if (usage) {
                        outputTokens = usage.output_tokens || 0;
                    }
                }
                else if (event.type === 'message_start') {
                    const message = event.message;
                    if (message?.usage) {
                        inputTokens = message.usage.input_tokens || 0;
                    }
                }
            }
            // Get final message for complete tool call arguments
            const finalMessage = await stream.finalMessage();
            inputTokens = finalMessage.usage.input_tokens;
            outputTokens = finalMessage.usage.output_tokens;
            // Extract tool calls from final message
            for (const block of finalMessage.content) {
                if (block.type === 'tool_use') {
                    const existingIndex = toolCalls.findIndex(tc => tc.id === block.id);
                    if (existingIndex >= 0) {
                        toolCalls[existingIndex].arguments = block.input;
                    }
                    else {
                        toolCalls.push({
                            id: block.id,
                            name: block.name,
                            arguments: block.input
                        });
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
            const testClient = new sdk_1.default({ apiKey });
            // Make a minimal request to test the key
            await testClient.messages.create({
                model: 'claude-haiku-4-5-20251001',
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
     * Format messages for Anthropic API
     */
    formatMessages(messages) {
        const formatted = [];
        for (const msg of messages) {
            if (msg.role === 'system')
                continue;
            if (msg.role === 'tool') {
                // Tool result message
                formatted.push({
                    role: 'user',
                    content: [{
                            type: 'tool_result',
                            tool_use_id: msg.toolCallId,
                            content: msg.content
                        }]
                });
            }
            else if (msg.toolCalls) {
                // Assistant message with tool calls
                const content = [];
                if (msg.content) {
                    content.push({ type: 'text', text: msg.content });
                }
                for (const tc of msg.toolCalls) {
                    content.push({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.name,
                        input: tc.arguments
                    });
                }
                formatted.push({ role: 'assistant', content });
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
     * Format error for user display
     */
    formatError(error) {
        if (error.status === 401) {
            return new Error('Invalid API key. Please check your Anthropic API key in settings.');
        }
        if (error.status === 429) {
            return new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.status === 500 || error.status === 503) {
            return new Error('Anthropic API is temporarily unavailable. Please try again later.');
        }
        return new Error(error.message || 'An error occurred while communicating with Claude.');
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropic.js.map