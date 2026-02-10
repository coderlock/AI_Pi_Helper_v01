/**
 * Moonshot (Kimi) Provider
 * Uses OpenAI-compatible API
 */
import OpenAI from 'openai';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';
export declare class MoonshotProvider extends BaseLLMProvider {
    readonly provider: LLMProvider;
    readonly displayName = "Moonshot (Kimi)";
    private client;
    /**
     * Get or create Moonshot client (OpenAI-compatible)
     */
    private getClient;
    /**
     * Reset client when API key changes
     */
    setAPIKey(apiKey: string): void;
    /**
     * Stream message to Kimi
     */
    streamMessage(model: string, messages: LLMMessage[], options: StreamOptions, callbacks: StreamCallbacks): Promise<void>;
    /**
     * Test API key validity
     */
    testConnection(apiKey: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Format messages for Moonshot API (OpenAI-compatible)
     */
    protected formatMessages(messages: LLMMessage[]): OpenAI.ChatCompletionMessageParam[];
    /**
     * Rough token estimation (for when API doesn't return usage)
     * ~4 characters per token for English text
     */
    private estimateTokens;
    /**
     * Format error for user display
     */
    private formatError;
}
//# sourceMappingURL=moonshot.d.ts.map