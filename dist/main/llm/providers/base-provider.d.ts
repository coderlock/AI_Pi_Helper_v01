/**
 * Base LLM Provider
 * Abstract class with common functionality
 */
import { LLMProvider, LLMMessage, TokenUsage } from '../../../shared/types';
import { ILLMProvider, StreamOptions, StreamCallbacks } from '../types';
export declare abstract class BaseLLMProvider implements ILLMProvider {
    abstract readonly provider: LLMProvider;
    abstract readonly displayName: string;
    protected apiKey: string | null;
    /**
     * Send a message with streaming response
     */
    abstract streamMessage(model: string, messages: LLMMessage[], options: StreamOptions, callbacks: StreamCallbacks): Promise<void>;
    /**
     * Test if API key is valid
     */
    abstract testConnection(apiKey: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Set the API key
     */
    setAPIKey(apiKey: string): void;
    /**
     * Check if API key is set
     */
    hasAPIKey(): boolean;
    /**
     * Get the API key
     */
    protected getAPIKey(): string;
    /**
     * Calculate token usage with cost
     */
    protected createUsage(model: string, inputTokens: number, outputTokens: number): TokenUsage;
    /**
     * Format messages for provider-specific API
     */
    protected abstract formatMessages(messages: LLMMessage[]): any;
}
//# sourceMappingURL=base-provider.d.ts.map