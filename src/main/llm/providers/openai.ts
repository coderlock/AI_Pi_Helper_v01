/**
 * OpenAI (GPT) Provider
 */

import OpenAI from 'openai';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  readonly provider: LLMProvider = 'openai';
  readonly displayName = 'OpenAI (GPT)';

  private client: OpenAI | null = null;

  /**
   * Get or create OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client || !this.apiKey) {
      this.client = new OpenAI({
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
   * Stream message to GPT
   */
  async streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string
  ): Promise<void> {
    const client = this.getClient();
    
    const formattedMessages = this.formatMessages(messages, systemPrompt);

    try {
      const requestOptions: any = {
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        messages: formattedMessages,
        stream: true,
        stream_options: { include_usage: true }
      };

      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        requestOptions.tools = options.tools;
      }

      const stream = await client.chat.completions.create(requestOptions) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> & { controller: AbortController };

      let inputTokens = 0;
      let outputTokens = 0;
      const toolCalls: any[] = [];
      let currentToolCallIndex = -1;

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

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (tc.index > currentToolCallIndex) {
                // New tool call
                currentToolCallIndex = tc.index;
                toolCalls.push({
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: {}
                });
              }
              
              // Accumulate arguments
              if (tc.function?.arguments) {
                const current = toolCalls[currentToolCallIndex];
                if (typeof current.arguments === 'string') {
                  current.arguments += tc.function.arguments;
                } else {
                  current.arguments = tc.function.arguments;
                }
              }
            }
          }
        }

        // Get usage from final chunk
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }

      // Parse tool call arguments
      for (const tc of toolCalls) {
        if (typeof tc.arguments === 'string') {
          try {
            tc.arguments = JSON.parse(tc.arguments);
          } catch {
            tc.arguments = { raw: tc.arguments };
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
      const testClient = new OpenAI({ apiKey });
      
      // Make a minimal request to test the key
      await testClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
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
   * Format messages for OpenAI API
   */
  protected formatMessages(
    messages: LLMMessage[], 
    systemPrompt: string
  ): OpenAI.ChatCompletionMessageParam[] {
    const formatted: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool') {
        // Tool result message
        formatted.push({
          role: 'tool',
          tool_call_id: msg.toolCallId!,
          content: msg.content
        });
      } else if ((msg as any).toolCalls) {
        // Assistant message with tool calls
        formatted.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: (msg as any).toolCalls.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        });
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
