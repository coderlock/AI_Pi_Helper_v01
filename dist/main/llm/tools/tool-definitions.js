"use strict";
/**
 * Tool Definitions
 * Defines the tools available to the LLM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXECUTE_COMMAND_TOOL = void 0;
exports.getAllTools = getAllTools;
exports.formatToolsForAnthropic = formatToolsForAnthropic;
exports.formatToolsForOpenAI = formatToolsForOpenAI;
/**
 * Execute command tool
 */
exports.EXECUTE_COMMAND_TOOL = {
    name: 'execute_command',
    description: `Execute a shell command in the user's terminal and return the output. 
The command runs on the connected system (either local machine or remote Raspberry Pi via SSH).
Use this to gather information, diagnose issues, or perform system operations.
The user will see the command and its output in their terminal.

IMPORTANT: Set is_read_only=true for commands that only read data (like ls, cat, df, ps, grep, etc.).
Set is_read_only=false for commands that modify the system (like rm, mv, apt, systemctl, etc.).
Read-only commands execute immediately. Write commands require user approval.`,
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The shell command to execute'
            },
            description: {
                type: 'string',
                description: 'Brief description of what this command does (shown to user)'
            },
            is_read_only: {
                type: 'boolean',
                description: 'Whether this command only reads data (true) or makes changes (false). Read-only commands execute immediately without approval.'
            }
        },
        required: ['command', 'description', 'is_read_only']
    }
};
/**
 * Get all available tools
 */
function getAllTools() {
    return [
        exports.EXECUTE_COMMAND_TOOL
    ];
}
/**
 * Format tools for Anthropic API
 */
function formatToolsForAnthropic() {
    return getAllTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters
    }));
}
/**
 * Format tools for OpenAI API
 */
function formatToolsForOpenAI() {
    return getAllTools().map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}
//# sourceMappingURL=tool-definitions.js.map