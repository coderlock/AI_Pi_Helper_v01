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
  timeout: number;         // ms, default 60000
  isReadOnly: boolean;     // Hint for UI display and auto-execution
  description?: string;    // What this command does
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
  error?: string;          // Execution error (not command error)
}

/**
 * Agent state
 */
export type AgentState = 
  | 'idle'           // Waiting for user input
  | 'thinking'       // LLM is processing
  | 'executing'      // Running a command
  | 'waiting'        // Waiting for user approval
  | 'validating';    // Checking results

/**
 * Agent status update (sent to renderer)
 */
export interface AgentStatusUpdate {
  state: AgentState;
  message?: string;
  command?: string;        // Current command being executed
  progress?: number;       // 0-100 for multi-step operations
}

/**
 * Terminal context for LLM
 */
export interface TerminalContext {
  connectionType: 'local' | 'ssh';
  connectionInfo: string;  // "localhost" or "user@host"
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
