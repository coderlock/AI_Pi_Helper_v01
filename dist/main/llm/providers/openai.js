"use strict";
/**
 * OpenAI (GPT) Provider
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const base_provider_1 = require("./base-provider");
const SYSTEM_PROMPT = `You are a helpful AI assistant integrated into a Raspberry Pi management tool called "Pi Assistant". 

Your role is to help users:
- Understand Linux/Raspberry Pi concepts
- Write and explain shell commands
- Troubleshoot system issues
- Provide guidance on system administration tasks

Be concise but thorough. When suggesting commands, explain what they do. If a task could be risky (like deleting files or changing system settings), warn the user first.

Note: In a future update, you'll be able to execute commands directly on the user's Pi. For now, provide commands the user can copy and run themselves.`;
class OpenAIProvider extends base_provider_1.BaseLLMProvider {
    constructor() {
        super(...arguments);
        this.provider = 'openai';
        this.displayName = 'OpenAI (GPT)';
        this.client = null;
    }
    /**
     * Get or create OpenAI client
     */
    getClient() {
        if (!this.client || !this.apiKey) {
            this.client = new openai_1.default({
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
     * Stream message to GPT
     */
    async streamMessage(model, messages, options, callbacks) {
        const client = this.getClient();
        const formattedMessages = this.formatMessages(messages);
        try {
            const stream = await client.chat.completions.create({
                model,
                max_tokens: options.maxTokens || 4096,
                temperature: options.temperature ?? 0.7,
                messages: formattedMessages,
                stream: true,
                stream_options: { include_usage: true }
            });
            let inputTokens = 0;
            let outputTokens = 0;
            // Handle abort signal
            if (options.signal) {
                options.signal.addEventListener('abort', () => {
                    stream.controller.abort();
                });
            }
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (delta?.content) {
                    callbacks.onChunk({
                        content: delta.content,
                        isComplete: false
                    });
                }
                // Get usage from final chunk
                if (chunk.usage) {
                    inputTokens = chunk.usage.prompt_tokens;
                    outputTokens = chunk.usage.completion_tokens;
                }
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
            const testClient = new openai_1.default({ apiKey });
            // Make a minimal request to test the key
            await testClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
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
     * Format messages for OpenAI API
     */
    formatMessages(messages) {
        // Add system message at the start
        const formatted = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];
        // Add conversation messages (skip any existing system messages)
        for (const msg of messages) {
            if (msg.role !== 'system') {
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
            return new Error('Invalid API key. Please check your OpenAI API key in settings.');
        }
        if (error.status === 429) {
            return new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.status === 500 || error.status === 503) {
            return new Error('OpenAI API is temporarily unavailable. Please try again later.');
        }
        if (error.code === 'insufficient_quota') {
            return new Error('OpenAI quota exceeded. Please check your billing settings.');
        }
        return new Error(error.message || 'An error occurred while communicating with GPT.');
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map