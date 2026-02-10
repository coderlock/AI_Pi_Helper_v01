/**
 * Anthropic (Claude) Provider
 */
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';
export declare class AnthropicProvider extends BaseLLMProvider {
    readonly provider: LLMProvider;
    readonly displayName = "Anthropic (Claude)";
    private client;
    /**
     * Get or create Anthropic client
     */
    private getClient;
    /**
     * Reset client when API key changes
     */
    setAPIKey(apiKey: string): void;
    /**
     * Stream message to Claude
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
     * Format messages for Anthropic API
     */
    protected formatMessages(messages: LLMMessage[]): Anthropic.MessageParam[];
    /**
     * Format error for user display
     */
    private formatError;
}
//# sourceMappingURL=anthropic.d.ts.map