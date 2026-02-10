/**
 * Base LLM Provider
 * Abstract class with common functionality
 */

import { LLMProvider, LLMMessage, TokenUsage } from '../../../shared/types';
import { ILLMProvider, StreamOptions, StreamCallbacks } from '../types';
import { calculateCost } from '../pricing';

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly provider: LLMProvider;
  abstract readonly displayName: string;
  
  protected apiKey: string | null = null;

  /**
   * Send a message with streaming response
   */
  abstract streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string
  ): Promise<void>;

  /**
   * Test if API key is valid
   */
  abstract testConnection(apiKey: string): Promise<{ valid: boolean; error?: string }>;

  /**
   * Set the API key
   */
  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if API key is set
   */
  hasAPIKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Get the API key
   */
  protected getAPIKey(): string {
    if (!this.apiKey) {
      throw new Error(`API key not set for ${this.displayName}`);
    }
    return this.apiKey;
  }

  /**
   * Calculate token usage with cost
   */
  protected createUsage(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): TokenUsage {
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: calculateCost(model, inputTokens, outputTokens)
    };
  }

  /**
   * Format messages for provider-specific API
   * Note: systemPrompt parameter is optional as not all providers need it in formatMessages
   */
  protected abstract formatMessages(messages: LLMMessage[], systemPrompt?: string): any;
}
