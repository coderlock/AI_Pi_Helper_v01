Phase 4 Build Plan: LLM Integration

Save this as PHASE4_BUILDPLAN.md in your project root.

markdown

# Pi Assistant - Phase 4 Build Plan
## LLM Integration with Multi-Provider Support

### Prerequisites

- Phase 1 completed (Electron app with xterm.js terminal)
- Phase 2A/2B completed (SSH connection & server profiles)
- Phase 2C completed (Bug fixes applied)
- Phase 3 completed (Basic chat UI panel)

### Overview

Replace placeholder chat responses with actual LLM API calls. Support multiple providers (Anthropic, OpenAI, Moonshot) with secure API key storage, model selection, and streaming responses.

---

### What We're Building

|
 Feature 
|
 Description 
|

|
---------
|
-------------
|

|
 Multi-Provider Support 
|
 Anthropic (Claude), OpenAI (GPT), Moonshot (Kimi) 
|

|
 API Key Management 
|
 Secure storage via OS keychain (CredentialStore) 
|

|
 Settings Modal 
|
 UI for API keys and model selection 
|

|
 Model Selection 
|
 Provider + Model dropdowns 
|

|
 Streaming Responses 
|
 Real-time token streaming 
|

|
 Token/Cost Tracking 
|
 Per-message and session totals with cost estimates 
|

|
 Error Handling 
|
 User-friendly error messages 
|


---

### New Dependencies

```bash
npm install @anthropic-ai/sdk openai
npm install --save-dev @types/node

Note: Moonshot uses OpenAI-compatible API, so we'll use the openai package with a custom base URL.
Supported Models
Anthropic (Claude)
Model ID	Display Name	Context	Notes
claude-3-5-sonnet-20241022	Claude 3.5 Sonnet	200K	Recommended
claude-3-opus-20240229	Claude 3 Opus	200K	Most capable
claude-3-haiku-20240307	Claude 3 Haiku	200K	Fastest
OpenAI
Model ID	Display Name	Context	Notes
gpt-4-turbo	GPT-4 Turbo	128K	Latest GPT-4
gpt-4o	GPT-4o	128K	Optimized
gpt-4o-mini	GPT-4o Mini	128K	Faster/cheaper
gpt-3.5-turbo	GPT-3.5 Turbo	16K	Budget option
Moonshot (Kimi)
Model ID	Display Name	Context	Notes
kimi-k2.5	Kimi K2.5	256K	Latest multimodal
kimi-k2-0905-preview	Kimi K2 (0905)	256K	Enhanced agentic
kimi-k2-thinking	Kimi K2 Thinking	256K	Deep reasoning
kimi-k2-turbo-preview	Kimi K2 Turbo	128K	Faster
Pricing Reference (for cost tracking)

typescript

// Approximate pricing per 1M tokens (as of build date)
const PRICING = {
  anthropic: {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  },
  openai: {
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  },
  moonshot: {
    'kimi-k2.5': { input: 0.60, output: 2.50 },
    'kimi-k2-0905-preview': { input: 0.60, output: 2.50 },
    'kimi-k2-thinking': { input: 0.60, output: 2.50 },
    'kimi-k2-turbo-preview': { input: 0.40, output: 1.50 },
  }
};

Updated Project Structure

text

src/
├── main/
│   ├── main.ts                    # UPDATE: Add LLM & settings IPC handlers
│   ├── preload.ts                 # UPDATE: Expose LLM API
│   ├── llm/
│   │   ├── llm-service.ts         # NEW: Main LLM service orchestrator
│   │   ├── providers/
│   │   │   ├── base-provider.ts   # NEW: Abstract provider interface
│   │   │   ├── anthropic.ts       # NEW: Claude implementation
│   │   │   ├── openai.ts          # NEW: GPT implementation
│   │   │   └── moonshot.ts        # NEW: Kimi implementation
│   │   ├── pricing.ts             # NEW: Pricing data & calculations
│   │   └── types.ts               # NEW: LLM-specific types
│   └── store/
│       ├── credential-store.ts    # UPDATE: Add API key methods
│       ├── server-store.ts        # KEEP
│       ├── chat-store.ts          # UPDATE: Add token tracking
│       └── settings-store.ts      # NEW: App settings persistence
├── renderer/
│   ├── index.html                 # UPDATE: Add settings modal
│   ├── renderer.ts                # UPDATE: Initialize settings
│   ├── components/
│   │   ├── chat-container.ts      # UPDATE: Real LLM calls
│   │   ├── chat-message.ts        # UPDATE: Token display
│   │   ├── chat-input.ts          # KEEP
│   │   ├── settings-modal.ts      # NEW: Settings UI
│   │   └── ...existing...
│   └── styles/
│       ├── settings.css           # NEW: Settings modal styles
│       └── ...existing...
└── shared/
    └── types.ts                   # UPDATE: Add LLM types

Type Definitions
Update src/shared/types.ts

Add these types:

typescript

// ============== LLM TYPES ==============

/**
 * Supported LLM providers
 */
export type LLMProvider = 'anthropic' | 'openai' | 'moonshot';

/**
 * Model definition
 */
export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: LLMProvider;
  contextWindow: number;
  pricing: {
    input: number;   // per 1M tokens
    output: number;  // per 1M tokens
  };
  capabilities?: {
    vision?: boolean;
    thinking?: boolean;
  };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: LLMProvider;
  displayName: string;
  models: ModelDefinition[];
  defaultModel: string;
  apiEndpoint: string;
  isConfigured: boolean;  // Has API key
}

/**
 * LLM request options
 */
export interface LLMRequestOptions {
  provider: LLMProvider;
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * LLM message format (for API calls)
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;  // in USD
}

/**
 * LLM response (non-streaming)
 */
export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: LLMProvider;
  finishReason: 'stop' | 'length' | 'error';
}

/**
 * Streaming chunk
 */
export interface LLMStreamChunk {
  content: string;
  isComplete: boolean;
  usage?: TokenUsage;  // Only on final chunk
}

/**
 * Session usage statistics
 */
export interface SessionUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  messageCount: number;
}

/**
 * App settings
 */
export interface AppSettings {
  llm: {
    selectedProvider: LLMProvider;
    selectedModels: {
      anthropic: string;
      openai: string;
      moonshot: string;
    };
    temperature: number;
    maxTokens: number;
  };
  ui: {
    autoScroll: boolean;
    showTokenCounts: boolean;
    showCostEstimates: boolean;
  };
}

/**
 * API key status for a provider
 */
export interface APIKeyStatus {
  provider: LLMProvider;
  isSet: boolean;
  isValid?: boolean;  // Only known after test
  lastTested?: number;
}

// ============== LLM IPC CHANNELS ==============

// Add to existing IPC_CHANNELS:
export const IPC_CHANNELS = {
  // ... existing channels ...

  // LLM
  LLM_SEND_MESSAGE: 'llm:send-message',
  LLM_STREAM_CHUNK: 'llm:stream-chunk',
  LLM_STREAM_END: 'llm:stream-end',
  LLM_STREAM_ERROR: 'llm:stream-error',
  LLM_CANCEL: 'llm:cancel',
  LLM_GET_PROVIDERS: 'llm:get-providers',
  LLM_TEST_API_KEY: 'llm:test-api-key',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_GET_API_KEY_STATUS: 'settings:get-api-key-status',
  SETTINGS_SET_API_KEY: 'settings:set-api-key',
  SETTINGS_DELETE_API_KEY: 'settings:delete-api-key',
} as const;

// ============== ELECTRON API EXTENSIONS ==============

// Add to existing ElectronAPI interface:
export interface ElectronAPI {
  // ... existing methods ...

  // LLM
  sendLLMMessage: (options: LLMRequestOptions) => Promise<string>;  // Returns request ID
  onLLMStreamChunk: (callback: (data: { requestId: string; chunk: LLMStreamChunk }) => void) => void;
  onLLMStreamEnd: (callback: (data: { requestId: string; usage: TokenUsage }) => void) => void;
  onLLMStreamError: (callback: (data: { requestId: string; error: string }) => void) => void;
  cancelLLMRequest: (requestId: string) => void;
  getProviders: () => Promise<ProviderConfig[]>;
  testAPIKey: (provider: LLMProvider, apiKey: string) => Promise<{ valid: boolean; error?: string }>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getAPIKeyStatus: () => Promise<APIKeyStatus[]>;
  setAPIKey: (provider: LLMProvider, apiKey: string) => Promise<boolean>;
  deleteAPIKey: (provider: LLMProvider) => Promise<boolean>;
}

LLM Service Layer
New file: src/main/llm/types.ts

typescript

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
  streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks
  ): Promise<void>;

  /**
   * Test if API key is valid
   */
  testConnection(apiKey: string): Promise<{ valid: boolean; error?: string }>;

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

New file: src/main/llm/pricing.ts

typescript

/**
 * LLM Pricing Data
 * Prices per 1 million tokens (USD)
 */

import { LLMProvider, ModelDefinition } from '../../shared/types';

export const MODELS: ModelDefinition[] = [
  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 3.00, output: 15.00 }
  },
  {
    id: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 15.00, output: 75.00 }
  },
  {
    id: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 0.25, output: 1.25 }
  },

  // OpenAI
  {
    id: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 10.00, output: 30.00 }
  },
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 5.00, output: 15.00 }
  },
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.60 }
  },
  {
    id: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16000,
    pricing: { input: 0.50, output: 1.50 }
  },

  // Moonshot
  {
    id: 'kimi-k2.5',
    displayName: 'Kimi K2.5',
    provider: 'moonshot',
    contextWindow: 256000,
    pricing: { input: 0.60, output: 2.50 },
    capabilities: { vision: true }
  },
  {
    id: 'kimi-k2-0905-preview',
    displayName: 'Kimi K2 (0905)',
    provider: 'moonshot',
    contextWindow: 256000,
    pricing: { input: 0.60, output: 2.50 }
  },
  {
    id: 'kimi-k2-thinking',
    displayName: 'Kimi K2 Thinking',
    provider: 'moonshot',
    contextWindow: 256000,
    pricing: { input: 0.60, output: 2.50 },
    capabilities: { thinking: true }
  },
  {
    id: 'kimi-k2-turbo-preview',
    displayName: 'Kimi K2 Turbo',
    provider: 'moonshot',
    contextWindow: 128000,
    pricing: { input: 0.40, output: 1.50 }
  }
];

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: LLMProvider): ModelDefinition[] {
  return MODELS.filter(m => m.provider === provider);
}

/**
 * Get a specific model definition
 */
export function getModel(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId);
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  const defaults: Record<LLMProvider, string> = {
    anthropic: 'claude-3-5-sonnet-20241022',
    openai: 'gpt-4o',
    moonshot: 'kimi-k2.5'
  };
  return defaults[provider];
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModel(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output;

  return inputCost + outputCost;
}

/**
 * Provider display info
 */
export const PROVIDER_INFO: Record<LLMProvider, { displayName: string; apiEndpoint: string }> = {
  anthropic: {
    displayName: 'Anthropic (Claude)',
    apiEndpoint: 'https://api.anthropic.com'
  },
  openai: {
    displayName: 'OpenAI (GPT)',
    apiEndpoint: 'https://api.openai.com/v1'
  },
  moonshot: {
    displayName: 'Moonshot (Kimi)',
    apiEndpoint: 'https://api.moonshot.ai/v1'
  }
};

New file: src/main/llm/providers/base-provider.ts

typescript

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
    callbacks: StreamCallbacks
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
   */
  protected abstract formatMessages(messages: LLMMessage[]): any;
}

New file: src/main/llm/providers/anthropic.ts

typescript

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
        model: 'claude-3-haiku-20240307',
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

New file: src/main/llm/providers/openai.ts

typescript

/**
 * OpenAI (GPT) Provider
 */

import OpenAI from 'openai';
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
        stream: true,
        stream_options: { include_usage: true }
      });

      let inputTokens = 0;
      let outputTokens = 0;

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

        // Get usage from final chunk
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
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

New file: src/main/llm/providers/moonshot.ts

typescript

/**
 * Moonshot (Kimi) Provider
 * Uses OpenAI-compatible API
 */

import OpenAI from 'openai';
import { LLMProvider, LLMMessage } from '../../../shared/types';
import { BaseLLMProvider } from './base-provider';
import { StreamOptions, StreamCallbacks } from '../types';

const MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1';

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
        model: 'kimi-k2-turbo-preview',  // Use turbo for faster test
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

New file: src/main/llm/llm-service.ts

typescript

/**
 * LLM Service
 * Orchestrates LLM providers and manages requests
 */

import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { 
  LLMProvider, 
  LLMRequestOptions, 
  LLMMessage, 
  TokenUsage,
  ProviderConfig,
  IPC_CHANNELS
} from '../../shared/types';
import { ILLMProvider } from './types';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai';
import { MoonshotProvider } from './providers/moonshot';
import { getModelsForProvider, getDefaultModel, PROVIDER_INFO } from './pricing';
import { CredentialStore } from '../store/credential-store';

// API key storage keys
const API_KEY_PREFIX = 'api-key-';

export class LLMService {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private credentialStore: CredentialStore;
  private mainWindow: BrowserWindow | null = null;

  constructor(credentialStore: CredentialStore) {
    this.credentialStore = credentialStore;
    this.initializeProviders();
    this.loadAPIKeys();
  }

  /**
   * Set the main window for IPC events
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Initialize all providers
   */
  private initializeProviders(): void {
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('moonshot', new MoonshotProvider());
  }

  /**
   * Load API keys from credential store
   */
  private loadAPIKeys(): void {
    const providerNames: LLMProvider[] = ['anthropic', 'openai', 'moonshot'];
    
    for (const provider of providerNames) {
      const apiKey = this.credentialStore.getPassword(`${API_KEY_PREFIX}${provider}`);
      if (apiKey) {
        this.providers.get(provider)?.setAPIKey(apiKey);
        console.log(`Loaded API key for ${provider}`);
      }
    }
  }

  /**
   * Get provider configuration for UI
   */
  getProviders(): ProviderConfig[] {
    const configs: ProviderConfig[] = [];
    
    for (const [providerKey, provider] of this.providers) {
      const info = PROVIDER_INFO[providerKey];
      const models = getModelsForProvider(providerKey);
      
      configs.push({
        provider: providerKey,
        displayName: info.displayName,
        models,
        defaultModel: getDefaultModel(providerKey),
        apiEndpoint: info.apiEndpoint,
        isConfigured: provider.hasAPIKey()
      });
    }
    
    return configs;
  }

  /**
   * Set API key for a provider
   */
  setAPIKey(provider: LLMProvider, apiKey: string): boolean {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return false;

    // Store in credential store
    const stored = this.credentialStore.setPassword(`${API_KEY_PREFIX}${provider}`, apiKey);
    
    if (stored) {
      // Update provider
      providerInstance.setAPIKey(apiKey);
      console.log(`API key set for ${provider}`);
    }
    
    return stored;
  }

  /**
   * Delete API key for a provider
   */
  deleteAPIKey(provider: LLMProvider): boolean {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return false;

    // Remove from credential store
    this.credentialStore.deletePassword(`${API_KEY_PREFIX}${provider}`);
    
    // Clear from provider
    providerInstance.setAPIKey('');
    
    console.log(`API key deleted for ${provider}`);
    return true;
  }

  /**
   * Check if API key is set for a provider
   */
  hasAPIKey(provider: LLMProvider): boolean {
    return this.providers.get(provider)?.hasAPIKey() || false;
  }

  /**
   * Test API key validity
   */
  async testAPIKey(provider: LLMProvider, apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      return { valid: false, error: 'Unknown provider' };
    }

    return providerInstance.testConnection(apiKey);
  }

  /**
   * Send a message with streaming response
   */
  async sendMessage(options: LLMRequestOptions): Promise<string> {
    const provider = this.providers.get(options.provider);
    
    if (!provider) {
      throw new Error(`Unknown provider: ${options.provider}`);
    }

    if (!provider.hasAPIKey()) {
      throw new Error(`API key not configured for ${options.provider}. Please add your API key in settings.`);
    }

    // Generate request ID
    const requestId = uuidv4();

    // Create abort controller
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    // Convert chat messages to LLM format
    const llmMessages: LLMMessage[] = options.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Start streaming
    provider.streamMessage(
      options.model,
      llmMessages,
      {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        signal: abortController.signal
      },
      {
        onChunk: (chunk) => {
          this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_CHUNK, { requestId, chunk });
        },
        onComplete: (usage) => {
          this.activeRequests.delete(requestId);
          this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_END, { requestId, usage });
        },
        onError: (error) => {
          this.activeRequests.delete(requestId);
          this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, { 
            requestId, 
            error: error.message 
          });
        }
      }
    );

    return requestId;
  }

  /**
   * Cancel an active request
   */
  cancelRequest(requestId: string): void {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      console.log(`Request ${requestId} cancelled`);
    }
  }

  /**
   * Send IPC message to renderer
   */
  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

Settings Store
New file: src/main/store/settings-store.ts

typescript

/**
 * Settings Store
 * Manages application settings persistence
 */

import Store from 'electron-store';
import { AppSettings, LLMProvider } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    selectedProvider: 'anthropic',
    selectedModels: {
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4o',
      moonshot: 'kimi-k2.5'
    },
    temperature: 0.7,
    maxTokens: 4096
  },
  ui: {
    autoScroll: true,
    showTokenCounts: true,
    showCostEstimates: true
  }
};

export class SettingsStore {
  private store: Store<{ settings: AppSettings }>;

  constructor() {
    this.store = new Store<{ settings: AppSettings }>({
      name: 'settings',
      defaults: {
        settings: DEFAULT_SETTINGS
      }
    });
  }

  /**
   * Get all settings
   */
  get(): AppSettings {
    return this.store.get('settings', DEFAULT_SETTINGS);
  }

  /**
   * Update settings (partial update)
   */
  update(updates: Partial<AppSettings>): AppSettings {
    const current = this.get();
    
    // Deep merge
    const updated: AppSettings = {
      llm: {
        ...current.llm,
        ...(updates.llm || {}),
        selectedModels: {
          ...current.llm.selectedModels,
          ...(updates.llm?.selectedModels || {})
        }
      },
      ui: {
        ...current.ui,
        ...(updates.ui || {})
      }
    };

    this.store.set('settings', updated);
    return updated;
  }

  /**
   * Reset to defaults
   */
  reset(): AppSettings {
    this.store.set('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /**
   * Get selected provider
   */
  getSelectedProvider(): LLMProvider {
    return this.get().llm.selectedProvider;
  }

  /**
   * Get selected model for a provider
   */
  getSelectedModel(provider: LLMProvider): string {
    return this.get().llm.selectedModels[provider];
  }
}

Update Chat Store
Update src/main/store/chat-store.ts

Add token tracking to messages:

typescript

/**
 * Update the ChatMessage additions to include token tracking
 */

// In addMessage method, update to handle token usage:

/**
 * Add a message to a session
 */
addMessage(
  message: Omit<ChatMessage, 'id' | 'timestamp'>,
  sessionId?: string
): ChatMessage {
  const id = sessionId || this.getActiveSessionId();
  const sessions = this.store.get('sessions', []);
  const sessionIndex = sessions.findIndex(s => s.id === id);

  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const newMessage: ChatMessage = {
    ...message,
    id: uuidv4(),
    timestamp: Date.now()
  };

  sessions[sessionIndex].messages.push(newMessage);
  sessions[sessionIndex].updatedAt = Date.now();

  // Update session usage stats if this message has token info
  if (message.metadata?.tokens) {
    this.updateSessionUsage(sessions[sessionIndex], message);
  }

  // Update title based on first user message
  if (
    message.role === 'user' &&
    sessions[sessionIndex].messages.filter(m => m.role === 'user').length === 1
  ) {
    sessions[sessionIndex].title = this.generateTitle(message.content);
  }

  // Enforce max messages limit
  const settings = this.getSettings();
  if (sessions[sessionIndex].messages.length > settings.maxHistoryMessages) {
    sessions[sessionIndex].messages = sessions[sessionIndex].messages.slice(
      -settings.maxHistoryMessages
    );
  }

  this.store.set('sessions', sessions);
  
  return newMessage;
}

/**
 * Update session usage statistics
 */
private updateSessionUsage(session: ChatSession, message: any): void {
  if (!session.usageStats) {
    session.usageStats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      messageCount: 0
    };
  }

  if (message.metadata?.inputTokens) {
    session.usageStats.totalInputTokens += message.metadata.inputTokens;
  }
  if (message.metadata?.outputTokens) {
    session.usageStats.totalOutputTokens += message.metadata.outputTokens;
  }
  if (message.metadata?.cost) {
    session.usageStats.totalCost += message.metadata.cost;
  }
  session.usageStats.messageCount++;
}

/**
 * Get session usage stats
 */
getSessionUsage(sessionId?: string): SessionUsageStats | null {
  const id = sessionId || this.getActiveSessionId();
  const session = this.getSession(id);
  return session?.usageStats || null;
}

Also update the ChatMessage interface in types.ts to include token metadata:

typescript

// Update ChatMessage interface
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  provider?: LLMProvider;
  isError?: boolean;
  metadata?: {
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number;
  };
}

// Update ChatSession interface
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider: LLMProvider;
  createdAt: number;
  updatedAt: number;
  usageStats?: SessionUsageStats;
}

Update Main Process
Update src/main/main.ts

Add LLM and settings IPC handlers:

typescript

/**
 * Add imports
 */
import { LLMService } from './llm/llm-service';
import { SettingsStore } from './store/settings-store';
import { 
  LLMProvider, 
  LLMRequestOptions, 
  AppSettings 
} from '../shared/types';

/**
 * Add variables
 */
let llmService: LLMService;
let settingsStore: SettingsStore;

/**
 * Update initializeStores()
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  chatStore = new ChatStore();
  settingsStore = new SettingsStore();
  llmService = new LLMService(credentialStore);
  
  console.log('Stores initialized');
  console.log(`Secure storage available: ${credentialStore.isAvailable()}`);
}

/**
 * Update createWindow() to set LLM service window
 */
function createWindow(): void {
  // ... existing window creation code ...

  // Set main window for LLM service
  llmService.setMainWindow(mainWindow);

  // ... rest of existing code ...
}

/**
 * Add these IPC handlers in setupIpcHandlers()
 */

// ============== LLM HANDLERS ==============

// Send message (returns request ID for streaming)
ipcMain.handle(IPC_CHANNELS.LLM_SEND_MESSAGE, async (_, options: LLMRequestOptions) => {
  try {
    return await llmService.sendMessage(options);
  } catch (error: any) {
    throw new Error(error.message);
  }
});

// Cancel request
ipcMain.on(IPC_CHANNELS.LLM_CANCEL, (_, requestId: string) => {
  llmService.cancelRequest(requestId);
});

// Get providers
ipcMain.handle(IPC_CHANNELS.LLM_GET_PROVIDERS, () => {
  return llmService.getProviders();
});

// Test API key
ipcMain.handle(IPC_CHANNELS.LLM_TEST_API_KEY, async (_, provider: LLMProvider, apiKey: string) => {
  return llmService.testAPIKey(provider, apiKey);
});

// ============== SETTINGS HANDLERS ==============

// Get settings
ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
  return settingsStore.get();
});

// Update settings
ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_, settings: Partial<AppSettings>) => {
  return settingsStore.update(settings);
});

// Get API key status for all providers
ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_API_KEY_STATUS, () => {
  const providers: LLMProvider[] = ['anthropic', 'openai', 'moonshot'];
  return providers.map(provider => ({
    provider,
    isSet: llmService.hasAPIKey(provider)
  }));
});

// Set API key
ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_API_KEY, (_, provider: LLMProvider, apiKey: string) => {
  return llmService.setAPIKey(provider, apiKey);
});

// Delete API key
ipcMain.handle(IPC_CHANNELS.SETTINGS_DELETE_API_KEY, (_, provider: LLMProvider) => {
  return llmService.deleteAPIKey(provider);
});

Update Preload Script
Update src/main/preload.ts

Add LLM and settings methods:

typescript

/**
 * Add to the electronAPI object
 */

// LLM
sendLLMMessage: (options: LLMRequestOptions) => 
  ipcRenderer.invoke(IPC_CHANNELS.LLM_SEND_MESSAGE, options),

onLLMStreamChunk: (callback: (data: { requestId: string; chunk: LLMStreamChunk }) => void) => {
  const wrappedCallback = (_event: Electron.IpcRendererEvent, data: any) => {
    callback(data);
  };
  registerCallback(IPC_CHANNELS.LLM_STREAM_CHUNK, wrappedCallback);
  ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_CHUNK, wrappedCallback);
},

onLLMStreamEnd: (callback: (data: { requestId: string; usage: TokenUsage }) => void) => {
  const wrappedCallback = (_event: Electron.IpcRendererEvent, data: any) => {
    callback(data);
  };
  registerCallback(IPC_CHANNELS.LLM_STREAM_END, wrappedCallback);
  ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_END, wrappedCallback);
},

onLLMStreamError: (callback: (data: { requestId: string; error: string }) => void) => {
  const wrappedCallback = (_event: Electron.IpcRendererEvent, data: any) => {
    callback(data);
  };
  registerCallback(IPC_CHANNELS.LLM_STREAM_ERROR, wrappedCallback);
  ipcRenderer.on(IPC_CHANNELS.LLM_STREAM_ERROR, wrappedCallback);
},

cancelLLMRequest: (requestId: string) => {
  ipcRenderer.send(IPC_CHANNELS.LLM_CANCEL, requestId);
},

getProviders: () => 
  ipcRenderer.invoke(IPC_CHANNELS.LLM_GET_PROVIDERS),

testAPIKey: (provider: LLMProvider, apiKey: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST_API_KEY, provider, apiKey),

// Settings
getSettings: () =>
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

updateSettings: (settings: Partial<AppSettings>) =>
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

getAPIKeyStatus: () =>
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_API_KEY_STATUS),

setAPIKey: (provider: LLMProvider, apiKey: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_API_KEY, provider, apiKey),

deleteAPIKey: (provider: LLMProvider) =>
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_DELETE_API_KEY, provider),

Settings Modal Component
New file: src/renderer/components/settings-modal.ts

typescript

/**
 * Settings Modal Component
 * UI for API key management and app settings
 */

import { 
  AppSettings, 
  LLMProvider, 
  ProviderConfig, 
  APIKeyStatus 
} from '../../shared/types';

export interface SettingsModalOptions {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export class SettingsModal {
  private overlay!: HTMLElement;
  private options: SettingsModalOptions;
  private settings!: AppSettings;
  private providers: ProviderConfig[] = [];
  private apiKeyStatus: APIKeyStatus[] = [];
  private isTestingKey: boolean = false;

  constructor(options: SettingsModalOptions) {
    this.options = options;
    this.createModal();
  }

  /**
   * Create modal HTML
   */
  private createModal(): void {
    const existing = document.getElementById('settings-modal-overlay');
    if (existing) existing.remove();

    const modalHtml = `
      <div id="settings-modal-overlay" class="modal-overlay hidden">
        <div class="modal settings-modal">
          <div class="modal-header">
            <h2 class="modal-title">Settings</h2>
            <button class="modal-close" id="settings-modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="settings-tabs">
              <button class="settings-tab active" data-tab="api-keys">API Keys</button>
              <button class="settings-tab" data-tab="models">Models</button>
              <button class="settings-tab" data-tab="display">Display</button>
            </div>
            
            <div class="settings-content">
              <!-- API Keys Tab -->
              <div class="settings-panel active" id="panel-api-keys">
                <div class="settings-section">
                  <h3>API Keys</h3>
                  <p class="settings-description">
                    Enter your API keys to enable AI chat. Keys are stored securely in your system's credential manager.
                  </p>
                  
                  <div class="api-key-list" id="api-key-list">
                    <!-- Populated dynamically -->
                  </div>
                </div>
              </div>
              
              <!-- Models Tab -->
              <div class="settings-panel" id="panel-models">
                <div class="settings-section">
                  <h3>Model Selection</h3>
                  <p class="settings-description">
                    Choose which model to use for each provider.
                  </p>
                  
                  <div class="model-settings" id="model-settings">
                    <!-- Populated dynamically -->
                  </div>
                </div>
                
                <div class="settings-section">
                  <h3>Generation Settings</h3>
                  
                  <div class="settings-row">
                    <label for="setting-temperature">Temperature</label>
                    <div class="settings-input-group">
                      <input type="range" id="setting-temperature" 
                             min="0" max="1" step="0.1" value="0.7">
                      <span id="temperature-value">0.7</span>
                    </div>
                    <p class="settings-hint">Higher = more creative, Lower = more focused</p>
                  </div>
                  
                  <div class="settings-row">
                    <label for="setting-max-tokens">Max Response Tokens</label>
                    <input type="number" id="setting-max-tokens" 
                           min="256" max="16384" value="4096">
                    <p class="settings-hint">Maximum length of AI responses</p>
                  </div>
                </div>
              </div>
              
              <!-- Display Tab -->
              <div class="settings-panel" id="panel-display">
                <div class="settings-section">
                  <h3>Chat Display</h3>
                  
                  <div class="settings-row checkbox">
                    <label>
                      <input type="checkbox" id="setting-auto-scroll" checked>
                      <span>Auto-scroll to new messages</span>
                    </label>
                  </div>
                  
                  <div class="settings-row checkbox">
                    <label>
                      <input type="checkbox" id="setting-show-tokens" checked>
                      <span>Show token counts on messages</span>
                    </label>
                  </div>
                  
                  <div class="settings-row checkbox">
                    <label>
                      <input type="checkbox" id="setting-show-costs" checked>
                      <span>Show cost estimates</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div