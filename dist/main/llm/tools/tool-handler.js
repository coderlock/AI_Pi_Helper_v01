"use strict";
/**
 * Tool Handler
 * Processes tool calls from the LLM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolHandler = void 0;
class ToolHandler {
    constructor(agentExecutor) {
        this.agentExecutor = agentExecutor;
    }
    /**
     * Handle a tool call from the LLM
     */
    async handleToolCall(toolCall) {
        console.log(`Handling tool call: ${toolCall.name}`, toolCall.arguments);
        switch (toolCall.name) {
            case 'execute_command':
                return this.handleExecuteCommand(toolCall);
            default:
                return {
                    toolCallId: toolCall.id,
                    success: false,
                    result: '',
                    error: `Unknown tool: ${toolCall.name}`
                };
        }
    }
    /**
     * Handle execute_command tool
     */
    async handleExecuteCommand(toolCall) {
        const { command, description, is_read_only } = toolCall.arguments;
        if (!command) {
            return {
                toolCallId: toolCall.id,
                success: false,
                result: '',
                error: 'Command is required'
            };
        }
        try {
            const result = await this.agentExecutor.executeCommand({
                command,
                description,
                isReadOnly: is_read_only ?? false
            });
            if (result.error) {
                return {
                    toolCallId: toolCall.id,
                    success: false,
                    result: result.stdout || '',
                    error: result.error
                };
            }
            if (result.timedOut) {
                return {
                    toolCallId: toolCall.id,
                    success: false,
                    result: result.stdout || '',
                    error: 'Command timed out after 60 seconds'
                };
            }
            // Format result for LLM
            let resultText = '';
            if (result.stdout) {
                resultText += result.stdout;
            }
            if (result.stderr) {
                resultText += `\n\nSTDERR:\n${result.stderr}`;
            }
            resultText += `\n\n[Exit code: ${result.exitCode ?? 'unknown'}]`;
            return {
                toolCallId: toolCall.id,
                success: result.exitCode === 0,
                result: resultText
            };
        }
        catch (error) {
            return {
                toolCallId: toolCall.id,
                success: false,
                result: '',
                error: error.message
            };
        }
    }
}
exports.ToolHandler = ToolHandler;
//# sourceMappingURL=tool-handler.js.map