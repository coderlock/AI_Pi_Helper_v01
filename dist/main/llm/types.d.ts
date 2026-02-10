/**
 * Internal LLM types (main process only)
 */
import { LLMProvider, LLMMessage, TokenUsage, LLMStreamChunk } from '../../shared/types';
/**
 * Provider interface - all providers must implement this
 */
export interface ILLMProvider {
    readonly provider: LLMProvider;
    readonly displayName: string;
    /**
     * Send a message and get streaming response
     */
    streamMessage(model: string, messages: LLMMessage[], options: StreamOptions, callbacks: StreamCallbacks): Promise<void>;
    /**
     * Test if API key is valid
     */
    testConnection(apiKey: string): Promise<{
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
}
/**
 * Stream options
 */
export interface StreamOptions {
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
}
/**
 * Stream callbacks
 */
export interface StreamCallbacks {
    onChunk: (chunk: LLMStreamChunk) => void;
    onComplete: (usage: TokenUsage) => void;
    onError: (error: Error) => void;
}
//# sourceMappingURL=types.d.ts.map