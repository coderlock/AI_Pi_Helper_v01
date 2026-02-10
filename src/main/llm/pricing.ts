/**
 * LLM Pricing Data
 * Prices per 1 million tokens (USD)
 */

import { LLMProvider, ModelDefinition } from '../../shared/types';

export const MODELS: ModelDefinition[] = [
  // Anthropic
  {
    id: 'anthropic.claude-opus-4-6-v1',
    displayName: 'Claude Opus 4.6',
    provider: 'anthropic',
    contextWindow: 500000,
    pricing: { input: 20.00, output: 100.00 }
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    contextWindow: 500000,
    pricing: { input: 5.00, output: 25.00 }
  },
  {
    id: 'claude-haiku-4-5@20251001',
    displayName: 'Claude Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 500000,
    pricing: { input: 0.50, output: 2.50 }
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
    id: 'kimi-k2-0905-preview',
    displayName: 'Moonshot v1 8K',
    provider: 'moonshot',
    contextWindow: 8000,
    pricing: { input: 0.60, output: 2.50 }
  },
  {
    id: 'kimi-k2-turbo-preview',
    displayName: 'Moonshot v1 32K',
    provider: 'moonshot',
    contextWindow: 32000,
    pricing: { input: 0.60, output: 2.50 }
  },
  {
    id: 'kimi-k2-thinking',
    displayName: 'Moonshot v1 128K',
    provider: 'moonshot',
    contextWindow: 128000,
    pricing: { input: 0.60, output: 2.50 }
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
    anthropic: 'claude-sonnet-4-5-20250929',
    openai: 'gpt-4o',
    moonshot: 'kimi-k2-turbo-preview'
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
    apiEndpoint: 'https://api.moonshot.cn/v1'
  }
};
