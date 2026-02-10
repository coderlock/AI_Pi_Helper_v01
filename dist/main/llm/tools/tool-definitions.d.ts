/**
 * Tool Definitions
 * Defines the tools available to the LLM
 */
/**
 * Tool definition for LLM
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
            enum?: string[];
        }>;
        required: string[];
    };
}
/**
 * Execute command tool
 */
export declare const EXECUTE_COMMAND_TOOL: ToolDefinition;
/**
 * Get all available tools
 */
export declare function getAllTools(): ToolDefinition[];
/**
 * Format tools for Anthropic API
 */
export declare function formatToolsForAnthropic(): any[];
/**
 * Format tools for OpenAI API
 */
export declare function formatToolsForOpenAI(): any[];
//# sourceMappingURL=tool-definitions.d.ts.map