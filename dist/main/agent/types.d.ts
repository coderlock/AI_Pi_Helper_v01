/**
 * Agent Types
 * Types for command execution and agent state
 */
/**
 * Command execution request
 */
export interface CommandRequest {
    id: string;
    command: string;
    timeout: number;
    isReadOnly: boolean;
    description?: string;
}
/**
 * Command execution result
 */
export interface CommandResult {
    id: string;
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    durationMs: number;
    error?: string;
}
/**
 * Agent state
 */
export type AgentState = 'idle' | 'thinking' | 'executing' | 'waiting' | 'validating';
/**
 * Agent status update (sent to renderer)
 */
export interface AgentStatusUpdate {
    state: AgentState;
    message?: string;
    command?: string;
    progress?: number;
}
/**
 * Terminal context for LLM
 */
export interface TerminalContext {
    connectionType: 'local' | 'ssh';
    connectionInfo: string;
    isConnected: boolean;
    workingDirectory?: string;
}
/**
 * Tool call from LLM
 */
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}
/**
 * Tool result to send back to LLM
 */
export interface ToolResult {
    toolCallId: string;
    success: boolean;
    result: string;
    error?: string;
}
/**
 * Command approval request (for non-read-only commands)
 */
export interface CommandApprovalRequest {
    id: string;
    command: string;
    description: string;
    isReadOnly: boolean;
}
/**
 * Command approval response
 */
export interface CommandApprovalResponse {
    id: string;
    approved: boolean;
}
//# sourceMappingURL=types.d.ts.map