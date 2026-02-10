/**
 * Anthropic (Claude) Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';

const SYSTEM_PROMPT = `You are a helpful AI assistant integrated into a Raspberry Pi management tool called "Pi Assistant". 

Your role is to help users:
- Understand Linux/Raspberry Pi concepts
- Write and explain shell commands
- Troubleshoot system issues
- Provide guidance on system administration tasks

Be concise but thorough. When suggesting commands, explain what they do. If a task could be risky (like deleting files or changing system settings), warn the user first.

Note: In a future update, you'll be able to execute commands directly on the user's Pi. For now, provide commands the user can copy and run themselves.`;

export class AnthropicProvider extends BaseLLMProvider {
  readonly provider: LLMProvider = 'anthropic';
  readonly displayName = 'Anthropic (Claude)';

  private client: Anthropic | null = null;

  /**
   * Get or create Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client || !this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.getAPIKey()
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
   * Stream message to Claude
   */
  async streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const client = this.getClient();
    
    // Separate system message from conversation
    const formattedMessages = this.formatMessages(messages);

    try {
      const stream = await client.messages.stream({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        system: SYSTEM_PROMPT,
        messages: formattedMessages
      });

      let inputTokens = 0;
      let outputTokens = 0;

      // Handle abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          stream.controller.abort();
        });
      }

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string };
          if (delta.type === 'text_delta' && delta.text) {
            callbacks.onChunk({
              content: delta.text,
              isComplete: false
            });
          }
        } else if (event.type === 'message_delta') {
          // Final usage stats
          const usage = (event as any).usage;
          if (usage) {
            outputTokens = usage.output_tokens || 0;
          }
        } else if (event.type === 'message_start') {
          const message = (event as any).message;
          if (message?.usage) {
            inputTokens = message.usage.input_tokens || 0;
          }
        }
      }

      // Final message
      const finalMessage = await stream.finalMessage();
      inputTokens = finalMessage.usage.input_tokens;
      outputTokens = finalMessage.usage.output_tokens;

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
      const testClient = new Anthropic({ apiKey });
      
      // Make a minimal request to test the key
      await testClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
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
   * Format messages for Anthropic API
   */
  protected formatMessages(messages: LLMMessage[]): Anthropic.MessageParam[] {
    // Filter out system messages (handled separately)
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
  }

  /**
   * Format error for user display
   */
  private formatError(error: any): Error {
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
