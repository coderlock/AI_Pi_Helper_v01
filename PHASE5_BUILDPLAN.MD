Phase 5 Build Plan: Agent Foundation

Save this as PHASE5_BUILDPLAN.md in your project root.

markdown

# Pi Assistant - Phase 5 Build Plan
## Agent Foundation: Terminal Command Execution

### Prerequisites

- Phase 1-3 completed (Electron app with chat UI)
- Phase 4 completed (LLM integration with multi-provider support)
- Phase 4A completed (System prompt customization)

### Overview

Enable the AI to execute commands in the terminal and capture the output. This is the foundation for autonomous agent behavior. All commands are visible to the user in the terminal for full transparency.

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
 Command Execution API 
|
 Send commands to terminal, capture output 
|

|
 Terminal Bridge 
|
 Routes commands to local PTY or SSH 
|

|
 Output Capture 
|
 Captures stdout, stderr, exit code 
|

|
 Timeout Handling 
|
 Kills commands that run too long (60s default) 
|

|
 Agent State Tracking 
|
 Shows user what the agent is doing 
|

|
 LLM Tool Integration 
|
 AI can request command execution 
|


---

### Architecture

┌─────────────────────────────────────────────────────────────────┐
│ RENDERER │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Chat UI │────►│ Agent │────►│ Terminal │ │
│ │ │◄────│ Status │ │ Display │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
│ │
├─────────────────────────────────────────────────────────────────┤
│ IPC │
├─────────────────────────────────────────────────────────────────┤
│ MAIN │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ LLM │────►│ Agent │────►│ Terminal │ │
│ │ Service │◄────│ Executor │◄────│ Bridge │ │
│ └─────────────┘ └─────────────┘ └──────┬──────┘ │
│ │ │
│ ┌──────────────────────┴────────┐ │
│ ▼ ▼ │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ Local PTY │ │ SSH Manager│ │
│ └─────────────┘ └─────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────┘

text


---

### Updated Project Structure

src/
├── main/
│ ├── main.ts # UPDATE: Add agent IPC handlers
│ ├── preload.ts # UPDATE: Expose agent API
│ ├── agent/
│ │ ├── agent-executor.ts # NEW: Orchestrates command execution
│ │ ├── terminal-bridge.ts # NEW: Interface to terminals
│ │ └── types.ts # NEW: Agent-specific types
│ ├── llm/
│ │ ├── llm-service.ts # UPDATE: Add tool calling support
│ │ ├── tools/
│ │ │ ├── tool-definitions.ts # NEW: Tool schemas for LLM
│ │ │ └── tool-handler.ts # NEW: Processes tool calls
│ │ └── ...existing...
│ └── ...existing...
├── renderer/
│ ├── renderer.ts # UPDATE: Handle agent state
│ ├── components/
│ │ ├── chat-container.ts # UPDATE: Integrate agent flow
│ │ ├── agent-status.ts # NEW: Shows agent activity
│ │ └── ...existing...
│ └── styles/
│ ├── agent.css # NEW: Agent status styles
│ └── ...existing...
└── shared/
└── types.ts # UPDATE: Add agent types

text


---

## Type Definitions

### New file: `src/main/agent/types.ts`

```typescript
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
  isReadOnly: boolean;     // Hint for UI display
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

Update src/shared/types.ts

Add agent-related types and IPC channels:

typescript

// ============== AGENT TYPES (shared) ==============

import type { 
  AgentState, 
  AgentStatusUpdate, 
  CommandRequest, 
  CommandResult,
  TerminalContext 
} from '../main/agent/types';

// Re-export for renderer use
export type { 
  AgentState, 
  AgentStatusUpdate, 
  CommandRequest, 
  CommandResult,
  TerminalContext 
};

// ============== AGENT IPC CHANNELS ==============

// Add to existing IPC_CHANNELS:
export const IPC_CHANNELS = {
  // ... existing channels ...

  // Agent
  AGENT_EXECUTE_COMMAND: 'agent:execute-command',
  AGENT_CANCEL_COMMAND: 'agent:cancel-command',
  AGENT_GET_CONTEXT: 'agent:get-context',
  AGENT_STATUS_UPDATE: 'agent:status-update',
} as const;

// ============== ELECTRON API EXTENSIONS ==============

// Add to existing ElectronAPI interface:
export interface ElectronAPI {
  // ... existing methods ...

  // Agent
  executeCommand: (request: CommandRequest) => Promise<CommandResult>;
  cancelCommand: (commandId: string) => void;
  getTerminalContext: () => Promise<TerminalContext>;
  onAgentStatusUpdate: (callback: (status: AgentStatusUpdate) => void) => void;
}

Terminal Bridge
New file: src/main/agent/terminal-bridge.ts

typescript

/**
 * Terminal Bridge
 * Routes command execution to the appropriate terminal (local PTY or SSH)
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CommandRequest, CommandResult, TerminalContext } from './types';
import { SSHManager } from '../ssh-manager';
import { PtyManager } from '../pty';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';

// Markers for output capture
const START_MARKER = '<<<PIASSIST_START_';
const END_MARKER = '<<<PIASSIST_END_';
const EXIT_MARKER = '<<<PIASSIST_EXIT_';

export class TerminalBridge extends EventEmitter {
  private sshManager: SSHManager | null = null;
  private ptyManager: PtyManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isSSHActive: boolean = false;
  
  // Active command tracking
  private activeCommand: {
    id: string;
    command: string;
    buffer: string;
    startTime: number;
    timeout: NodeJS.Timeout | null;
    resolve: (result: CommandResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  // Output capture state
  private isCapturing: boolean = false;
  private captureBuffer: string = '';

  constructor() {
    super();
  }

  /**
   * Set the SSH manager reference
   */
  setSSHManager(manager: SSHManager | null, isActive: boolean): void {
    this.sshManager = manager;
    this.isSSHActive = isActive;
  }

  /**
   * Set the PTY manager reference
   */
  setPtyManager(manager: PtyManager | null): void {
    this.ptyManager = manager;
  }

  /**
   * Set main window for IPC
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Update SSH active state
   */
  setSSHActive(isActive: boolean): void {
    this.isSSHActive = isActive;
  }

  /**
   * Get current terminal context
   */
  getContext(): TerminalContext {
    if (this.isSSHActive && this.sshManager?.isConnected()) {
      const info = this.sshManager.getConnectionInfo();
      return {
        connectionType: 'ssh',
        connectionInfo: info ? `${info.username}@${info.host}` : 'unknown',
        isConnected: true
      };
    }

    return {
      connectionType: 'local',
      connectionInfo: 'localhost',
      isConnected: this.ptyManager !== null
    };
  }

  /**
   * Execute a command and capture output
   */
  async executeCommand(request: CommandRequest): Promise<CommandResult> {
    // Check if another command is running
    if (this.activeCommand) {
      throw new Error('Another command is already running');
    }

    // Check terminal availability
    if (this.isSSHActive) {
      if (!this.sshManager?.isConnected()) {
        throw new Error('SSH not connected');
      }
    } else {
      if (!this.ptyManager) {
        throw new Error('Local terminal not available');
      }
    }

    const commandId = request.id || uuidv4();
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Set up command tracking
      this.activeCommand = {
        id: commandId,
        command: request.command,
        buffer: '',
        startTime,
        timeout: null,
        resolve,
        reject
      };

      // Set up timeout
      this.activeCommand.timeout = setTimeout(() => {
        this.handleTimeout(commandId);
      }, request.timeout);

      // Start capturing
      this.isCapturing = true;
      this.captureBuffer = '';

      // Build wrapped command with markers
      const wrappedCommand = this.buildWrappedCommand(commandId, request.command);

      // Send to appropriate terminal
      this.sendToTerminal(wrappedCommand);
    });
  }

  /**
   * Build command with output markers
   */
  private buildWrappedCommand(commandId: string, command: string): string {
    // The command sequence:
    // 1. Print start marker
    // 2. Run the actual command
    // 3. Capture exit code
    // 4. Print exit code marker
    // 5. Print end marker
    
    const startMarker = `${START_MARKER}${commandId}>>>`;
    const endMarker = `${END_MARKER}${commandId}>>>`;
    const exitMarker = `${EXIT_MARKER}${commandId}_`;

    // Works for both bash and sh
    return `echo "${startMarker}" && ${command}; __exit_code=$?; echo "${exitMarker}\${__exit_code}>>>"; echo "${endMarker}"\n`;
  }

  /**
   * Send command to the active terminal
   */
  private sendToTerminal(command: string): void {
    if (this.isSSHActive && this.sshManager?.isConnected()) {
      this.sshManager.write(command);
    } else if (this.ptyManager) {
      this.ptyManager.write(command);
    }
  }

  /**
   * Process incoming terminal data
   * Call this from the terminal data handler
   */
  processTerminalData(data: string): void {
    if (!this.isCapturing || !this.activeCommand) {
      return;
    }

    this.captureBuffer += data;

    // Check for end marker
    const endMarkerFull = `${END_MARKER}${this.activeCommand.id}>>>`;
    const endIndex = this.captureBuffer.indexOf(endMarkerFull);

    if (endIndex !== -1) {
      this.completeCapture();
    }
  }

  /**
   * Complete the output capture and resolve the promise
   */
  private completeCapture(): void {
    if (!this.activeCommand) return;

    const { id, command, startTime, timeout, resolve } = this.activeCommand;

    // Clear timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Parse the captured output
    const result = this.parseOutput(id, command, this.captureBuffer, startTime);

    // Clean up
    this.isCapturing = false;
    this.captureBuffer = '';
    this.activeCommand = null;

    resolve(result);
  }

  /**
   * Parse captured output to extract stdout, stderr, and exit code
   */
  private parseOutput(
    commandId: string, 
    command: string, 
    buffer: string,
    startTime: number
  ): CommandResult {
    const startMarker = `${START_MARKER}${commandId}>>>`;
    const endMarker = `${END_MARKER}${commandId}>>>`;
    const exitMarkerPrefix = `${EXIT_MARKER}${commandId}_`;

    let stdout = '';
    let stderr = '';
    let exitCode: number | null = null;

    // Find start marker
    const startIndex = buffer.indexOf(startMarker);
    if (startIndex === -1) {
      // Marker not found - return raw buffer
      stdout = buffer;
    } else {
      // Extract content after start marker
      let content = buffer.substring(startIndex + startMarker.length);

      // Find and extract exit code
      const exitMatch = content.match(new RegExp(`${exitMarkerPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)>>>`));
      if (exitMatch) {
        exitCode = parseInt(exitMatch[1], 10);
        // Remove exit code line from content
        content = content.replace(exitMatch[0], '');
      }

      // Find end marker and truncate
      const endIndex = content.indexOf(endMarker);
      if (endIndex !== -1) {
        content = content.substring(0, endIndex);
      }

      // Clean up the content
      stdout = content
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/^\n+/, '')      // Remove leading newlines
        .replace(/\n+$/, '');     // Remove trailing newlines

      // Note: stderr is captured in stdout for interactive shells
      // For proper stderr separation, we'd need exec mode (future enhancement)
    }

    return {
      id: commandId,
      command,
      stdout,
      stderr,
      exitCode,
      timedOut: false,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Handle command timeout
   */
  private handleTimeout(commandId: string): void {
    if (!this.activeCommand || this.activeCommand.id !== commandId) {
      return;
    }

    const { command, startTime, resolve } = this.activeCommand;

    // Send Ctrl+C to kill the command
    this.sendToTerminal('\x03');

    // Clean up
    this.isCapturing = false;
    this.captureBuffer = '';
    this.activeCommand = null;

    resolve({
      id: commandId,
      command,
      stdout: this.captureBuffer,
      stderr: '',
      exitCode: null,
      timedOut: true,
      durationMs: Date.now() - startTime,
      error: 'Command timed out'
    });
  }

  /**
   * Cancel the currently running command
   */
  cancelCommand(commandId: string): boolean {
    if (!this.activeCommand || this.activeCommand.id !== commandId) {
      return false;
    }

    const { command, startTime, timeout, resolve } = this.activeCommand;

    // Clear timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Send Ctrl+C to kill the command
    this.sendToTerminal('\x03');

    // Clean up
    this.isCapturing = false;
    const partialOutput = this.captureBuffer;
    this.captureBuffer = '';
    this.activeCommand = null;

    resolve({
      id: commandId,
      command,
      stdout: partialOutput,
      stderr: '',
      exitCode: null,
      timedOut: false,
      durationMs: Date.now() - startTime,
      error: 'Command cancelled by user'
    });

    return true;
  }

  /**
   * Check if a command is currently running
   */
  isCommandRunning(): boolean {
    return this.activeCommand !== null;
  }

  /**
   * Get the ID of the currently running command
   */
  getActiveCommandId(): string | null {
    return this.activeCommand?.id || null;
  }
}

Agent Executor
New file: src/main/agent/agent-executor.ts

typescript

/**
 * Agent Executor
 * Orchestrates command execution and manages agent state
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { 
  CommandRequest, 
  CommandResult, 
  AgentState, 
  AgentStatusUpdate,
  TerminalContext 
} from './types';
import { TerminalBridge } from './terminal-bridge';
import { IPC_CHANNELS } from '../../shared/types';

const DEFAULT_TIMEOUT = 60000; // 60 seconds

export class AgentExecutor extends EventEmitter {
  private terminalBridge: TerminalBridge;
  private mainWindow: BrowserWindow | null = null;
  private state: AgentState = 'idle';

  constructor(terminalBridge: TerminalBridge) {
    super();
    this.terminalBridge = terminalBridge;
  }

  /**
   * Set main window for IPC events
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
    this.terminalBridge.setMainWindow(window);
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Set agent state and notify renderer
   */
  setState(state: AgentState, message?: string, command?: string): void {
    this.state = state;
    this.sendStatusUpdate({ state, message, command });
  }

  /**
   * Send status update to renderer
   */
  private sendStatusUpdate(status: AgentStatusUpdate): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.AGENT_STATUS_UPDATE, status);
    }
    this.emit('statusUpdate', status);
  }

  /**
   * Execute a command
   */
  async executeCommand(request: Partial<CommandRequest>): Promise<CommandResult> {
    // Build full request with defaults
    const fullRequest: CommandRequest = {
      id: request.id || uuidv4(),
      command: request.command || '',
      timeout: request.timeout || DEFAULT_TIMEOUT,
      isReadOnly: request.isReadOnly ?? false,
      description: request.description
    };

    if (!fullRequest.command) {
      throw new Error('Command is required');
    }

    // Update state
    this.setState('executing', request.description || 'Running command...', fullRequest.command);

    try {
      const result = await this.terminalBridge.executeCommand(fullRequest);

      // Log result
      console.log(`Command completed: ${fullRequest.command}`);
      console.log(`Exit code: ${result.exitCode}, Duration: ${result.durationMs}ms`);

      // Update state
      this.setState('idle');

      return result;
    } catch (error: any) {
      console.error(`Command failed: ${fullRequest.command}`, error);
      
      // Update state
      this.setState('idle');

      return {
        id: fullRequest.id,
        command: fullRequest.command,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        durationMs: 0,
        error: error.message
      };
    }
  }

  /**
   * Cancel the currently running command
   */
  cancelCommand(commandId: string): boolean {
    const cancelled = this.terminalBridge.cancelCommand(commandId);
    if (cancelled) {
      this.setState('idle', 'Command cancelled');
    }
    return cancelled;
  }

  /**
   * Get terminal context for LLM
   */
  getTerminalContext(): TerminalContext {
    return this.terminalBridge.getContext();
  }

  /**
   * Check if a command is currently running
   */
  isExecuting(): boolean {
    return this.terminalBridge.isCommandRunning();
  }

  /**
   * Process terminal data (delegate to bridge)
   */
  processTerminalData(data: string): void {
    this.terminalBridge.processTerminalData(data);
  }
}

LLM Tool Definitions
New file: src/main/llm/tools/tool-definitions.ts

typescript

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
export const EXECUTE_COMMAND_TOOL: ToolDefinition = {
  name: 'execute_command',
  description: `Execute a shell command in the user's terminal and return the output. 
The command runs on the connected system (either local machine or remote Raspberry Pi via SSH).
Use this to gather information, diagnose issues, or perform system operations.
The user will see the command and its output in their terminal.`,
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
        description: 'Whether this command only reads data (true) or makes changes (false)'
      }
    },
    required: ['command', 'description']
  }
};

/**
 * Get all available tools
 */
export function getAllTools(): ToolDefinition[] {
  return [
    EXECUTE_COMMAND_TOOL
  ];
}

/**
 * Format tools for Anthropic API
 */
export function formatToolsForAnthropic(): any[] {
  return getAllTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

/**
 * Format tools for OpenAI API
 */
export function formatToolsForOpenAI(): any[] {
  return getAllTools().map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

New file: src/main/llm/tools/tool-handler.ts

typescript

/**
 * Tool Handler
 * Processes tool calls from the LLM
 */

import { AgentExecutor } from '../../agent/agent-executor';
import { ToolCall, ToolResult } from '../../agent/types';
import { CommandResult } from '../../agent/types';

export class ToolHandler {
  private agentExecutor: AgentExecutor;

  constructor(agentExecutor: AgentExecutor) {
    this.agentExecutor = agentExecutor;
  }

  /**
   * Handle a tool call from the LLM
   */
  async handleToolCall(toolCall: ToolCall): Promise<ToolResult> {
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
  private async handleExecuteCommand(toolCall: ToolCall): Promise<ToolResult> {
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
      const result: CommandResult = await this.agentExecutor.executeCommand({
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

    } catch (error: any) {
      return {
        toolCallId: toolCall.id,
        success: false,
        result: '',
        error: error.message
      };
    }
  }
}

Update LLM Service
Update src/main/llm/llm-service.ts

Add tool calling support:

typescript

/**
 * Add imports
 */
import { ToolHandler } from './tools/tool-handler';
import { formatToolsForAnthropic, formatToolsForOpenAI } from './tools/tool-definitions';
import { AgentExecutor } from '../agent/agent-executor';
import { ToolCall, ToolResult, TerminalContext } from '../agent/types';

/**
 * Update LLMService class
 */
export class LLMService {
  // ... existing properties ...
  private toolHandler: ToolHandler | null = null;
  private agentExecutor: AgentExecutor | null = null;

  constructor(credentialStore: CredentialStore, promptStore: PromptStore) {
    // ... existing initialization ...
  }

  /**
   * Set the agent executor for tool handling
   */
  setAgentExecutor(executor: AgentExecutor): void {
    this.agentExecutor = executor;
    this.toolHandler = new ToolHandler(executor);
  }

  /**
   * Get terminal context for system prompt enhancement
   */
  getTerminalContext(): TerminalContext | null {
    return this.agentExecutor?.getTerminalContext() || null;
  }

  /**
   * Get tools formatted for the current provider
   */
  private getToolsForProvider(provider: LLMProvider): any[] {
    switch (provider) {
      case 'anthropic':
        return formatToolsForAnthropic();
      case 'openai':
      case 'moonshot':
        return formatToolsForOpenAI();
      default:
        return [];
    }
  }

  /**
   * Update sendMessage to support tools
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

    // Get current system prompt
    const systemPrompt = this.getSystemPrompt();

    // Get tools
    const tools = this.getToolsForProvider(options.provider);

    // Convert chat messages to LLM format
    const llmMessages: LLMMessage[] = options.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Start streaming with tools
    this.streamWithTools(
      provider,
      options,
      llmMessages,
      systemPrompt,
      tools,
      requestId,
      abortController
    );

    return requestId;
  }

  /**
   * Stream response with tool call handling
   */
  private async streamWithTools(
    provider: ILLMProvider,
    options: LLMRequestOptions,
    messages: LLMMessage[],
    systemPrompt: string,
    tools: any[],
    requestId: string,
    abortController: AbortController
  ): Promise<void> {
    let fullContent = '';
    let pendingToolCalls: ToolCall[] = [];

    try {
      await provider.streamMessage(
        options.model,
        messages,
        {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          signal: abortController.signal,
          tools: tools.length > 0 ? tools : undefined
        },
        {
          onChunk: (chunk) => {
            if (chunk.content) {
              fullContent += chunk.content;
              this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_CHUNK, { requestId, chunk });
            }
            
            // Check for tool calls in chunk (provider-specific)
            if (chunk.toolCalls) {
              pendingToolCalls.push(...chunk.toolCalls);
            }
          },
          onComplete: async (usage) => {
            // Handle any tool calls
            if (pendingToolCalls.length > 0 && this.toolHandler) {
              await this.handleToolCalls(
                provider,
                options,
                messages,
                systemPrompt,
                tools,
                requestId,
                abortController,
                fullContent,
                pendingToolCalls,
                usage
              );
            } else {
              // No tool calls - complete normally
              this.activeRequests.delete(requestId);
              this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_END, { requestId, usage });
            }
          },
          onError: (error) => {
            this.activeRequests.delete(requestId);
            this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, { 
              requestId, 
              error: error.message 
            });
          }
        },
        systemPrompt
      );
    } catch (error: any) {
      this.activeRequests.delete(requestId);
      this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, { 
        requestId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle tool calls and continue conversation
   */
  private async handleToolCalls(
    provider: ILLMProvider,
    options: LLMRequestOptions,
    messages: LLMMessage[],
    systemPrompt: string,
    tools: any[],
    requestId: string,
    abortController: AbortController,
    assistantContent: string,
    toolCalls: ToolCall[],
    initialUsage: TokenUsage
  ): Promise<void> {
    if (!this.toolHandler) {
      this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_ERROR, {
        requestId,
        error: 'Tool handler not available'
      });
      return;
    }

    // Execute each tool call
    const toolResults: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      // Check if cancelled
      if (abortController.signal.aborted) {
        return;
      }

      try {
        const result = await this.toolHandler.handleToolCall(toolCall);
        toolResults.push(result);

        // Notify renderer of tool execution
        this.sendToRenderer(IPC_CHANNELS.LLM_STREAM_CHUNK, {
          requestId,
          chunk: {
            content: `\n\n[Executed: ${toolCall.arguments.description || toolCall.arguments.command}]\n`,
            isComplete: false,
            isToolResult: true
          }
        });

      } catch (error: any) {
        toolResults.push({
          toolCallId: toolCall.id,
          success: false,
          result: '',
          error: error.message
        });
      }
    }

    // Build updated messages with tool results
    const updatedMessages: LLMMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: assistantContent,
        toolCalls: toolCalls  // Provider-specific handling needed
      },
      ...toolResults.map(result => ({
        role: 'tool' as const,
        content: result.error || result.result,
        toolCallId: result.toolCallId
      }))
    ];

    // Continue the conversation with tool results
    await this.streamWithTools(
      provider,
      options,
      updatedMessages,
      systemPrompt,
      tools,
      requestId,
      abortController
    );
  }

  // ... rest of existing methods ...
}

Update Providers for Tool Support
Update src/main/llm/types.ts

Add tools to StreamOptions:

typescript

/**
 * Stream options
 */
export interface StreamOptions {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  tools?: any[];  // ADD THIS
}

/**
 * Update LLMStreamChunk
 */
export interface LLMStreamChunk {
  content: string;
  isComplete: boolean;
  usage?: TokenUsage;
  toolCalls?: ToolCall[];  // ADD THIS
  isToolResult?: boolean;  // ADD THIS
}

Update src/main/llm/providers/anthropic.ts

Add tool support to Anthropic provider:

typescript

/**
 * Stream message to Claude with tool support
 */
async streamMessage(
  model: string,
  messages: LLMMessage[],
  options: StreamOptions,
  callbacks: StreamCallbacks,
  systemPrompt: string
): Promise<void> {
  const client = this.getClient();
  
  const formattedMessages = this.formatMessages(messages);

  try {
    const requestOptions: any = {
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      system: systemPrompt,
      messages: formattedMessages
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestOptions.tools = options.tools;
    }

    const stream = await client.messages.stream(requestOptions);

    let inputTokens = 0;
    let outputTokens = 0;
    let currentToolCall: ToolCall | null = null;
    const toolCalls: ToolCall[] = [];

    // Handle abort signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        stream.controller.abort();
      });
    }

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = (event as any).content_block;
        if (block.type === 'tool_use') {
          currentToolCall = {
            id: block.id,
            name: block.name,
            arguments: {}
          };
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta as any;
        
        if (delta.type === 'text_delta' && delta.text) {
          callbacks.onChunk({
            content: delta.text,
            isComplete: false
          });
        } else if (delta.type === 'input_json_delta' && currentToolCall) {
          // Accumulate tool arguments (streamed as JSON)
          // This is simplified - full implementation would parse incrementally
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolCall) {
          toolCalls.push(currentToolCall);
          currentToolCall = null;
        }
      } else if (event.type === 'message_delta') {
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

    // Get final message for complete tool call arguments
    const finalMessage = await stream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;

    // Extract tool calls from final message
    for (const block of finalMessage.content) {
      if (block.type === 'tool_use') {
        const existingIndex = toolCalls.findIndex(tc => tc.id === block.id);
        if (existingIndex >= 0) {
          toolCalls[existingIndex].arguments = block.input;
        } else {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input
          });
        }
      }
    }

    // Send final chunk with tool calls if any
    if (toolCalls.length > 0) {
      callbacks.onChunk({
        content: '',
        isComplete: true,
        toolCalls
      });
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
 * Format messages including tool results
 */
protected formatMessages(messages: LLMMessage[]): Anthropic.MessageParam[] {
  const formatted: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    if (msg.role === 'tool') {
      // Tool result message
      formatted.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: (msg as any).toolCallId,
          content: msg.content
        }]
      });
    } else if ((msg as any).toolCalls) {
      // Assistant message with tool calls
      const content: any[] = [];
      
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      
      for (const tc of (msg as any).toolCalls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments
        });
      }
      
      formatted.push({ role: 'assistant', content });
    } else {
      formatted.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }
  }

  return formatted;
}

Update src/main/llm/providers/openai.ts and moonshot.ts

Similar updates for OpenAI-style tool calling (both use the same format):

typescript

/**
 * Stream message with tool support
 */
async streamMessage(
  model: string,
  messages: LLMMessage[],
  options: StreamOptions,
  callbacks: StreamCallbacks,
  systemPrompt: string
): Promise<void> {
  const client = this.getClient();
  
  const formattedMessages = this.formatMessages(messages, systemPrompt);

  try {
    const requestOptions: any = {
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      messages: formattedMessages,
      stream: true
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestOptions.tools = options.tools;
    }

    const stream = await client.chat.completions.create(requestOptions);

    let inputTokens = 0;
    let outputTokens = 0;
    const toolCalls: ToolCall[] = [];
    let currentToolCallIndex = -1;

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

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index !== undefined) {
            if (tc.index > currentToolCallIndex) {
              // New tool call
              currentToolCallIndex = tc.index;
              toolCalls.push({
                id: tc.id || '',
                name: tc.function?.name || '',
                arguments: {}
              });
            }
            
            // Accumulate arguments
            if (tc.function?.arguments) {
              const current = toolCalls[currentToolCallIndex];
              if (typeof current.arguments === 'string') {
                current.arguments += tc.function.arguments;
              } else {
                current.arguments = tc.function.arguments;
              }
            }
          }
        }
      }

      // Get usage from final chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }

    // Parse tool call arguments
    for (const tc of toolCalls) {
      if (typeof tc.arguments === 'string') {
        try {
          tc.arguments = JSON.parse(tc.arguments);
        } catch {
          tc.arguments = { raw: tc.arguments };
        }
      }
    }

    // Send final chunk with tool calls if any
    if (toolCalls.length > 0) {
      callbacks.onChunk({
        content: '',
        isComplete: true,
        toolCalls
      });
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
 * Format messages including tool results
 */
protected formatMessages(
  messages: LLMMessage[], 
  systemPrompt: string
): OpenAI.ChatCompletionMessageParam[] {
  const formatted: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt }
  ];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    if (msg.role === 'tool') {
      // Tool result message
      formatted.push({
        role: 'tool',
        tool_call_id: (msg as any).toolCallId,
        content: msg.content
      });
    } else if ((msg as any).toolCalls) {
      // Assistant message with tool calls
      formatted.push({
        role: 'assistant',
        content: msg.content || null,
        tool_calls: (msg as any).toolCalls.map((tc: ToolCall) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }))
      });
    } else {
      formatted.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }
  }

  return formatted;
}

Update Main Process
Update src/main/main.ts

Integrate agent components:

typescript

/**
 * Add imports
 */
import { TerminalBridge } from './agent/terminal-bridge';
import { AgentExecutor } from './agent/agent-executor';
import { CommandRequest, AgentStatusUpdate } from './agent/types';

/**
 * Add variables
 */
let terminalBridge: TerminalBridge;
let agentExecutor: AgentExecutor;

/**
 * Update initializeStores() - add agent initialization
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  chatStore = new ChatStore();
  settingsStore = new SettingsStore();
  promptStore = new PromptStore();
  
  // Initialize agent components
  terminalBridge = new TerminalBridge();
  agentExecutor = new AgentExecutor(terminalBridge);
  
  // Initialize LLM service with agent
  llmService = new LLMService(credentialStore, promptStore);
  llmService.setAgentExecutor(agentExecutor);
  
  console.log('Stores and agent initialized');
}

/**
 * Update createWindow() to set up agent
 */
function createWindow(): void {
  // ... existing window creation code ...

  // Set main window for agent
  agentExecutor.setMainWindow(mainWindow);
  
  // Set PTY manager for terminal bridge
  terminalBridge.setPtyManager(ptyManager);

  // ... rest of existing code ...
}

/**
 * Update SSH connection handler to update terminal bridge
 */
// In the ssh:connect handler:
if (success) {
  isSSHActive = true;
  terminalBridge.setSSHManager(sshManager, true);
  return { success: true };
}

// In the ssh:disconnect handler:
isSSHActive = false;
terminalBridge.setSSHActive(false);

/**
 * Update terminal data handler to process agent captures
 */
// Update the terminal data forwarding:
sshManager = new SSHManager({
  onData: (data: string) => {
    // Forward to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, data);
    }
    // Process for agent capture
    agentExecutor.processTerminalData(data);
  },
  // ... rest of options
});

// Similarly for PTY manager - update onData callback

/**
 * Add agent IPC handlers
 */

// Execute command
ipcMain.handle(IPC_CHANNELS.AGENT_EXECUTE_COMMAND, async (_, request: CommandRequest) => {
  return agentExecutor.executeCommand(request);
});

// Cancel command
ipcMain.on(IPC_CHANNELS.AGENT_CANCEL_COMMAND, (_, commandId: string) => {
  agentExecutor.cancelCommand(commandId);
});

// Get terminal context
ipcMain.handle(IPC_CHANNELS.AGENT_GET_CONTEXT, () => {
  return agentExecutor.getTerminalContext();
});

Update Preload Script
Update src/main/preload.ts

Add agent methods:

typescript

/**
 * Add to the electronAPI object
 */

// Agent
executeCommand: (request: CommandRequest) =>
  ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTE_COMMAND, request),

cancelCommand: (commandId: string) => {
  ipcRenderer.send(IPC_CHANNELS.AGENT_CANCEL_COMMAND, commandId);
},

getTerminalContext: () =>
  ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_CONTEXT),

onAgentStatusUpdate: (callback: (status: AgentStatusUpdate) => void) => {
  const wrappedCallback = (_event: Electron.IpcRendererEvent, status: AgentStatusUpdate) => {
    callback(status);
  };
  registerCallback(IPC_CHANNELS.AGENT_STATUS_UPDATE, wrappedCallback);
  ipcRenderer.on(IPC_CHANNELS.AGENT_STATUS_UPDATE, wrappedCallback);
},

Agent Status Component
New file: src/renderer/components/agent-status.ts

typescript

/**
 * Agent Status Component
 * Shows what the agent is currently doing
 */

import { AgentState, AgentStatusUpdate } from '../../shared/types';

export interface AgentStatusOptions {
  container: HTMLElement;
}

export class AgentStatus {
  private container: HTMLElement;
  private statusElement!: HTMLElement;
  private currentState: AgentState = 'idle';

  constructor(options: AgentStatusOptions) {
    this.container = options.container;
    this.render();
    this.attachListeners();
  }

  /**
   * Render the status element
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="agent-status hidden" id="agent-status">
        <div class="agent-status-indicator">
          <span class="agent-spinner"></span>
          <span class="agent-status-text">Thinking...</span>
        </div>
        <button class="agent-cancel-btn" id="agent-cancel-btn" title="Cancel">
          ✕
        </button>
      </div>
    `;
    
    this.statusElement = this.container.querySelector('#agent-status')!;
  }

  /**
   * Attach event listeners
   */
  private attachListeners(): void {
    // Listen for status updates from main process
    window.electronAPI.onAgentStatusUpdate((status) => {
      this.updateStatus(status);
    });

    // Cancel button
    const cancelBtn = this.container.querySelector('#agent-cancel-btn');
    cancelBtn?.addEventListener('click', () => {
      // Cancel current operation
      // This will be connected to the active command cancellation
      this.emit('cancel');
    });
  }

  /**
   * Update the status display
   */
  updateStatus(status: AgentStatusUpdate): void {
    this.currentState = status.state;

    const textElement = this.statusElement.querySelector('.agent-status-text')!;
    
    if (status.state === 'idle') {
      this.statusElement.classList.add('hidden');
      return;
    }

    this.statusElement.classList.remove('hidden');
    
    // Update text based on state
    switch (status.state) {
      case 'thinking':
        textElement.textContent = status.message || 'Thinking...';
        this.statusElement.classList.remove('executing');
        this.statusElement.classList.add('thinking');
        break;
      
      case 'executing':
        textElement.textContent = status.message || 'Running command...';
        if (status.command) {
          textElement.textContent += `: ${this.truncateCommand(status.command)}`;
        }
        this.statusElement.classList.remove('thinking');
        this.statusElement.classList.add('executing');
        break;
      
      case 'waiting':
        textElement.textContent = status.message || 'Waiting for approval...';
        this.statusElement.classList.remove('thinking', 'executing');
        break;
      
      case 'validating':
        textElement.textContent = status.message || 'Validating results...';
        this.statusElement.classList.remove('executing');
        this.statusElement.classList.add('thinking');
        break;
    }
  }

  /**
   * Truncate long commands for display
   */
  private truncateCommand(command: string): string {
    if (command.length <= 40) return command;
    return command.substring(0, 37) + '...';
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.currentState;
  }

  /**
   * Emit event (simple event emitter)
   */
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(...args));
  }
}

Agent Styles
New file: src/renderer/styles/agent.css

css

/**
 * Agent Styles
 * Styles for agent status and activity indicators
 */

/* ==================== AGENT STATUS ==================== */

.agent-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  animation: slideDown 0.2s ease;
}

.agent-status.hidden {
  display: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.agent-status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.agent-status.executing .agent-spinner {
  border-top-color: var(--accent-success);
}

.agent-status-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.agent-status.executing .agent-status-text {
  color: var(--accent-success);
}

.agent-cancel-btn {
  padding: 4px 8px;
  background: none;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.agent-cancel-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-error);
  color: var(--accent-error);
}

/* ==================== COMMAND DISPLAY IN CHAT ==================== */

.chat-message .command-block {
  margin: 8px 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  overflow: hidden;
}

.command-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 11px;
  color: var(--text-secondary);
}

.command-block-content {
  padding: 10px 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.command-block-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.command-block-status.running {
  color: var(--accent-warning);
}

.command-block-status.success {
  color: var(--accent-success);
}

.command-block-status.error {
  color: var(--accent-error);
}

/* ==================== TOOL RESULT INDICATOR ==================== */

.tool-result-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 8px 0;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tool-result-indicator .tool-icon {
  font-size: 14px;
}

.tool-result-indicator.success .tool-icon {
  color: var(--accent-success);
}

.tool-result-indicator.error .tool-icon {
  color: var(--accent-error);
}

Update HTML
Update src/renderer/index.html

Add agent status container and stylesheet:

html

<head>
    <!-- ... existing stylesheets ... -->
    <link rel="stylesheet" href="styles/agent.css">
</head>

<!-- Update chat panel to include agent status -->
<section id="chat-panel" class="panel">
  <div class="panel-header">
    <!-- ... existing header content ... -->
  </div>
  
  <!-- Agent Status (appears when agent is active) -->
  <div id="agent-status-container"></div>
  
  <!-- Chat container -->
  <div id="chat-container" class="chat-panel-content"></div>
</section>

Update Renderer
Update src/renderer/renderer.ts

Initialize agent status:

typescript

/**
 * Add imports
 */
import { AgentStatus } from './components/agent-status';

/**
 * Add variable
 */
let agentStatus: AgentStatus | null = null;

/**
 * Add initialization function
 */
function initializeAgentStatus(): void {
  const container = document.getElementById('agent-status-container');
  
  if (!container) {
    console.error('Agent status container not found');
    return;
  }

  agentStatus = new AgentStatus({ container });
  
  // Handle cancel from status component
  agentStatus.on('cancel', () => {
    // TODO: Get active command ID and cancel it
    console.log('Cancel requested from agent status');
  });

  console.log('Agent status initialized');
}

/**
 * Update initializeApp()
 */
async function initializeApp(): Promise<void> {
  console.log('Initializing Pi Assistant...');

  initializeLayout();
  initializeTerminal();
  initializeWindowControls();
  setupKeyboardShortcuts();
  initializeServerManagement();
  
  await initializeChat();
  await initializePrompts();
  initializeAgentStatus();  // ADD THIS

  console.log('Pi Assistant initialized successfully');
}

Verification Checklist

After implementing Phase 5, verify:
Terminal Bridge

    Commands execute in local terminal
    Commands execute in SSH terminal
    Output is captured correctly
    Exit code is captured
    Timeout works (wait 60s for long command)
    Cancel kills running command

Agent Executor

    State transitions correctly (idle → executing → idle)
    Status updates sent to renderer
    Multiple commands can run sequentially (not simultaneously)

LLM Integration

    Tools are sent to LLM
    LLM can request command execution
    Tool results are sent back to LLM
    Conversation continues after tool use

UI

    Agent status shows when executing
    Spinner animates during execution
    Cancel button works
    Command output visible in terminal

Build & Test

powershell

# Rebuild
npm run build

# Test
npm start

Test Scenarios

    Basic Command Execution:
        Ask: "What's my disk usage?"
        AI should call df -h tool
        Command visible in terminal
        Output returned to AI
        AI summarizes the result

    Multiple Commands:
        Ask: "Check my memory and CPU usage"
        AI should run free -h then top -bn1 | head -10
        Both commands visible in terminal
        AI summarizes both results

    Timeout Handling:
        Ask: "Run a command that takes a long time" (e.g., sleep 120)
        Should timeout after 60 seconds
        AI should acknowledge the timeout

    Cancel:
        Start a command
        Click cancel button
        Command should stop
        AI should acknowledge cancellation

    SSH vs Local:
        Test with local terminal
        Connect to SSH
        Test commands run on remote
        Disconnect - commands run locally again

Files Created/Modified Summary
File	Action
src/main/agent/types.ts	NEW