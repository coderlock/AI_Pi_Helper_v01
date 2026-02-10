/**
 * Tool Handler
 * Processes tool calls from the LLM
 */
import { AgentExecutor } from '../../agent/agent-executor';
import { ToolCall, ToolResult } from '../../agent/types';
export declare class ToolHandler {
    private agentExecutor;
    constructor(agentExecutor: AgentExecutor);
    /**
     * Handle a tool call from the LLM
     */
    handleToolCall(toolCall: ToolCall): Promise<ToolResult>;
    /**
     * Handle execute_command tool
     */
    private handleExecuteCommand;
}
//# sourceMappingURL=tool-handler.d.ts.map