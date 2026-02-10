/**
 * OpenAI (GPT) Provider
 */
import OpenAI from 'openai';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';
export declare class OpenAIProvider extends BaseLLMProvider {
    readonly provider: LLMProvider;
    readonly displayName = "OpenAI (GPT)";
    private client;
    /**
     * Get or create OpenAI client
     */
    private getClient;
    /**
     * Reset client when API key changes
     */
    setAPIKey(apiKey: string): void;
    /**
     * Stream message to GPT
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
     * Format messages for OpenAI API
     */
    protected formatMessages(messages: LLMMessage[]): OpenAI.ChatCompletionMessageParam[];
    /**
     * Format error for user display
     */
    private formatError;
}
//# sourceMappingURL=openai.d.ts.map