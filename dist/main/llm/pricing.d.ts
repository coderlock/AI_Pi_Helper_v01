/**
 * LLM Pricing Data
 * Prices per 1 million tokens (USD)
 */
import { LLMProvider, ModelDefinition } from '../../shared/types';
export declare const MODELS: ModelDefinition[];
/**
 * Get models for a specific provider
 */
export declare function getModelsForProvider(provider: LLMProvider): ModelDefinition[];
/**
 * Get a specific model definition
 */
export declare function getModel(modelId: string): ModelDefinition | undefined;
/**
 * Get default model for a provider
 */
export declare function getDefaultModel(provider: LLMProvider): string;
/**
 * Calculate cost from token usage
 */
export declare function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number;
/**
 * Provider display info
 */
export declare const PROVIDER_INFO: Record<LLMProvider, {
    displayName: string;
    apiEndpoint: string;
}>;
//# sourceMappingURL=pricing.d.ts.map