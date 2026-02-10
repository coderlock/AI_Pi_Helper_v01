"use strict";
/**
 * Base LLM Provider
 * Abstract class with common functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMProvider = void 0;
const pricing_1 = require("../pricing");
class BaseLLMProvider {
    constructor() {
        this.apiKey = null;
    }
    /**
     * Set the API key
     */
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Check if API key is set
     */
    hasAPIKey() {
        return this.apiKey !== null && this.apiKey.length > 0;
    }
    /**
     * Get the API key
     */
    getAPIKey() {
        if (!this.apiKey) {
            throw new Error(`API key not set for ${this.displayName}`);
        }
        return this.apiKey;
    }
    /**
     * Calculate token usage with cost
     */
    createUsage(model, inputTokens, outputTokens) {
        return {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            estimatedCost: (0, pricing_1.calculateCost)(model, inputTokens, outputTokens)
        };
    }
}
exports.BaseLLMProvider = BaseLLMProvider;
//# sourceMappingURL=base-provider.js.map