/**
 * Anthropic (Claude) Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';

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
    callbacks: StreamCallbacks,
    systemPrompt: string
  ): Promise<void> {
    const client = this.getClient();
    
    // Separate system message from conversation
    const formattedMessages = this.formatMessages(messages);

    try {
      const requestOptions: any = {
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
      let currentToolCall: any | null = null;
      const toolCalls: any[] = [];

      // Handle abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          stream.controller.abort();
        });
      }

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = (event as any).content_block;
          if (block.type === 'tool_use') {
            currentToolCall = {
              id: block.id,
              name: block.name,
              arguments: {}
            };
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta as any;
          
          if (delta.type === 'text_delta' && delta.text) {
            callbacks.onChunk({
              content: delta.text,
              isComplete: false
            });
          } else if (delta.type === 'input_json_delta' && currentToolCall) {
            // Accumulate tool arguments (streamed as JSON)
            // This is simplified - full implementation would parse incrementally
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolCall) {
            toolCalls.push(currentToolCall);
            currentToolCall = null;
          }
        } else if (event.type === 'message_delta') {
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
          } else {
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
    const formatted: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool') {
        // Tool result message
        formatted.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId!,
            content: msg.content
          }]
        });
      } else if ((msg as any).toolCalls) {
        // Assistant message with tool calls
        const content: any[] = [];
        
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        
        for (const tc of (msg as any).toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments
          });
        }
        
        formatted.push({ role: 'assistant', content });
      } else {
        formatted.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    return formatted;
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
