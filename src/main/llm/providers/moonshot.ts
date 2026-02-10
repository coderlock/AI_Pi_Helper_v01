/**
 * Moonshot (Kimi) Provider
 * Uses OpenAI-compatible API
 */

import OpenAI from 'openai';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';

const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

const SYSTEM_PROMPT = `You are a helpful AI assistant integrated into a Raspberry Pi management tool called "Pi Assistant". 

Your role is to help users:
- Understand Linux/Raspberry Pi concepts
- Write and explain shell commands
- Troubleshoot system issues
- Provide guidance on system administration tasks

Be concise but thorough. When suggesting commands, explain what they do. If a task could be risky (like deleting files or changing system settings), warn the user first.

Note: In a future update, you'll be able to execute commands directly on the user's Pi. For now, provide commands the user can copy and run themselves.`;

export class MoonshotProvider extends BaseLLMProvider {
  readonly provider: LLMProvider = 'moonshot';
  readonly displayName = 'Moonshot (Kimi)';

  private client: OpenAI | null = null;

  /**
   * Get or create Moonshot client (OpenAI-compatible)
   */
  private getClient(): OpenAI {
    if (!this.client || !this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.getAPIKey(),
        baseURL: MOONSHOT_BASE_URL
      });
    }
    return this.client;
  }

  /**
   * Reset client when API key changes
   */
  setAPIKey(apiKey: string): void {
    super.setAPIKey(apiKey);
    this.client = null;
  }

  /**
   * Stream message to Kimi
   */
  async streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const client = this.getClient();
    
    const formattedMessages = this.formatMessages(messages);

    try {
      const stream = await client.chat.completions.create({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        messages: formattedMessages,
        stream: true
      });

      let inputTokens = 0;
      let outputTokens = 0;
      let totalContent = '';

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

        // Get usage from final chunk if available
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }

      // Estimate tokens if not provided (Moonshot may not always return usage in stream)
      if (inputTokens === 0) {
        inputTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
      }
      if (outputTokens === 0) {
        outputTokens = this.estimateTokens(totalContent);
      }

      callbacks.onComplete(this.createUsage(model, inputTokens, outputTokens));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        callbacks.onError(new Error('Request cancelled'));
      } else {
        callbacks.onError(this.formatError(error));
      }
    }
  }

  /**
   * Test API key validity
   */
  async testConnection(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const testClient = new OpenAI({ 
        apiKey,
        baseURL: MOONSHOT_BASE_URL
      });
      
      // Make a minimal request to test the key
      await testClient.chat.completions.create({
        model: 'kimi-k2-0905-preview',  // Use smallest model for faster test
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });

      return { valid: true };
    } catch (error: any) {
      return { 
        valid: false, 
        error: this.formatError(error).message 
      };
    }
  }

  /**
   * Format messages for Moonshot API (OpenAI-compatible)
   */
  protected formatMessages(messages: LLMMessage[]): OpenAI.ChatCompletionMessageParam[] {
    // Add system message at the start
    const formatted: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add conversation messages (skip any existing system messages)
    for (const msg of messages) {
      if (msg.role !== 'system') {
        formatted.push({
          role: msg.role as 'user' | 'assistant',
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
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Format error for user display
   */
  private formatError(error: any): Error {
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
