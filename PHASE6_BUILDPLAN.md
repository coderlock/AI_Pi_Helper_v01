# Pi Assistant - Phase 6 Build Plan
## Enhanced Agent Capabilities & Safety

### Prerequisites

- Phase 5 completed (Agent Foundation with basic command execution)

### Overview

Enhance the agent system with advanced safety features, better reliability, and improved user experience. This phase builds on Phase 5 by adding sophisticated command handling, safety mechanisms, and performance improvements.

---

### What We're Building

| Feature | Description | Priority |
|---------|-------------|----------|
| Command Queue System | Queue multiple agent commands instead of rejecting | High |
| Command Validation | Pattern-based checking for dangerous commands | High |
| Read-Only Mode Toggle | Global setting to block all write operations | High |
| Terminal State Recovery | Detect and recover from terminal hangs | Medium |
| Streaming Output | Stream command output to AI as it's generated | Medium |
| Command History | Audit log of all agent-executed commands | Medium |
| Retry Logic | Automatic retry for transient command failures | Medium |
| Execution Statistics | Track command success rates and duration | Low |
| Parallel Execution | Allow read-only commands to run in parallel | Low |
| Stop All Button | Emergency stop for all agent activity | High |

---

## 1. Command Validation & Safety

### Dangerous Command Patterns

Implement a blacklist of command patterns that require special handling:

```typescript
// src/main/agent/command-validator.ts

export interface CommandValidationResult {
  isAllowed: boolean;
  isDangerous: boolean;
  reason?: string;
  suggestion?: string;
}

export class CommandValidator {
  // Patterns that are always blocked
  private readonly BLOCKED_PATTERNS = [
    /rm\s+(-rf?|--recursive)\s+\/(?!home|tmp)/i,  // rm -rf / (except /home, /tmp)
    /dd\s+if=/i,                                   // dd commands
    /\:(){ \:\|\:\& }\;: /,                        // Fork bomb
    /mkfs\./i,                                     // Format filesystem
    /fdisk|parted/i,                               // Partition managers
  ];

  // Patterns that need extra confirmation
  private readonly DANGEROUS_PATTERNS = [
    /rm\s+-rf/i,                                   // Recursive delete
    /chmod\s+-R\s+777/i,                           // Dangerous permissions
    /^sudo\s+/i,                                   // Sudo commands
    /systemctl\s+(stop|disable|mask)/i,            // Service management
    /reboot|shutdown/i,                            // System power
    /apt\s+(remove|purge)/i,                       // Package removal
    /kill\s+-9/i,                                  // Force kill
  ];

  validate(command: string, isReadOnlyMode: boolean): CommandValidationResult {
    // Block everything in read-only mode except safe commands
    if (isReadOnlyMode && !this.isReadOnlyCommand(command)) {
      return {
        isAllowed: false,
        isDangerous: false,
        reason: 'Read-only mode is enabled',
        suggestion: 'Disable read-only mode in settings to execute write commands'
      };
    }

    // Check blocked patterns
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return {
          isAllowed: false,
          isDangerous: true,
          reason: 'This command is blocked for safety reasons',
          suggestion: 'If you need to perform this operation, do it manually'
        };
      }
    }

    // Check dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          isAllowed: true,
          isDangerous: true,
          reason: 'This command is potentially dangerous'
        };
      }
    }

    return {
      isAllowed: true,
      isDangerous: false
    };
  }

  private isReadOnlyCommand(command: string): boolean {
    const readOnlyPatterns = [
      /^(ls|ll|dir)\s/i,
      /^cat\s/i,
      /^head|tail\s/i,
      /^grep\s/i,
      /^find\s/i,
      /^df\s/i,
      /^du\s/i,
      /^ps\s/i,
      /^top|htop/i,
      /^free\s/i,
      /^uptime/i,
      /^who|w\s/i,
      /^pwd/i,
      /^echo\s/i,
      /^date/i,
    ];

    return readOnlyPatterns.some(pattern => pattern.test(command));
  }
}
```

---

## 2. Command Queue System

Allow multiple commands to be queued instead of rejecting them:

```typescript
// src/main/agent/command-queue.ts

export interface QueuedCommand {
  id: string;
  request: CommandRequest;
  resolve: (result: CommandResult) => void;
  reject: (error: Error) => void;
  addedAt: number;
}

export class CommandQueue {
  private queue: QueuedCommand[] = [];
  private isProcessing: boolean = false;
  private maxQueueSize: number = 10;

  async enqueue(request: CommandRequest): Promise<CommandResult> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Command queue is full (max ${this.maxQueueSize})`);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        id: request.id,
        request,
        resolve,
        reject,
        addedAt: Date.now()
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const queued = this.queue.shift()!;
      
      try {
        // Execute command through agent executor
        const result = await this.executeCommand(queued.request);
        queued.resolve(result);
      } catch (error: any) {
        queued.reject(error);
      }
    }

    this.isProcessing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    const cleared = [...this.queue];
    this.queue = [];
    
    // Reject all cleared commands
    for (const queued of cleared) {
      queued.reject(new Error('Command queue cleared'));
    }
  }
}
```

---

## 3. Terminal State Recovery

Detect and recover from terminal hangs or bad states:

```typescript
// src/main/agent/terminal-health.ts

export class TerminalHealthMonitor {
  private lastDataTimestamp: number = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private HEALTH_CHECK_INTERVAL = 5000;  // 5 seconds
  private HANG_THRESHOLD = 30000;         // 30 seconds

  start(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  updateActivity(): void {
    this.lastDataTimestamp = Date.now();
  }

  private checkHealth(): void {
    const inactiveDuration = Date.now() - this.lastDataTimestamp;
    
    if (inactiveDuration > this.HANG_THRESHOLD) {
      console.warn('Terminal appears to be hung');
      this.emit('terminal-hang', { inactiveDuration });
    }
  }

  // Recovery strategies
  async recover(): Promise<boolean> {
    // Try sending Ctrl+C
    this.sendInterrupt();
    await this.wait(1000);

    if (this.isResponsive()) {
      return true;
    }

    // Try sending Ctrl+Z then kill %1
    this.sendSuspend();
    await this.wait(500);
    this.sendCommand('kill %1\n');
    await this.wait(1000);

    if (this.isResponsive()) {
      return true;
    }

    // Last resort: restart PTY
    this.emit('recovery-failed');
    return false;
  }
}
```

---

## 4. Streaming Output to AI

Stream command output to the AI as it's being generated for better real-time interaction:

```typescript
// Modify terminal-bridge.ts to support streaming callbacks

export interface StreamingExecutionOptions extends CommandRequest {
  onChunk?: (chunk: string) => void;  // Called for each output chunk
  onProgress?: (progress: number) => void;  // 0-100
}

// In TerminalBridge.processTerminalData():
if (this.isCapturing && this.streamCallback) {
  // Extract new content since last chunk
  const newContent = this.extractNewContent();
  if (newContent) {
    this.streamCallback(newContent);
    
    // Send to LLM for real-time processing
    this.sendChunkToLLM(newContent);
  }
}
```

---

## 5. Command History & Audit Log

Track all commands executed by the agent for security auditing:

```typescript
// src/main/agent/command-history.ts

export interface CommandHistoryEntry {
  id: string;
  command: string;
  description: string;
  isReadOnly: boolean;
  approved: boolean;
  executedAt: number;
  completedAt: number;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  error?: string;
  outputLength: number;
}

export class CommandHistory {
  private history: CommandHistoryEntry[] = [];
  private maxEntries: number = 1000;

  add(entry: Omit<CommandHistoryEntry, 'executedAt'>): void {
    this.history.push({
      ...entry,
      executedAt: Date.now()
    });

    // Trim history if too large
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(-this.maxEntries);
    }

    // Save to disk
    this.persist();
  }

  getRecent(count: number = 50): CommandHistoryEntry[] {
    return this.history.slice(-count);
  }

  getStatistics(): {
    totalCommands: number;
    successRate: number;
    averageDuration: number;
    mostUsedCommands: Map<string, number>;
  } {
    // Calculate statistics from history
    // ...
  }

  exportToFile(filePath: string): void {
    // Export as JSON or CSV
  }
}
```

---

## 6. Settings Integration

Add agent settings to the settings store:

```typescript
// src/main/store/settings-store.ts

export interface AgentSettings {
  isReadOnlyMode: boolean;
  requireApprovalForWrite: boolean;
  requireApprovalForSudo: boolean;
  commandTimeout: number;
  maxQueueSize: number;
  enableCommandHistory: boolean;
  enableDangerousCommandWarnings: boolean;
}

// Default settings
const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  isReadOnlyMode: false,
  requireApprovalForWrite: true,
  requireApprovalForSudo: true,
  commandTimeout: 60000,
  maxQueueSize: 10,
  enableCommandHistory: true,
  enableDangerousCommandWarnings: true
};
```

---

## 7. UI Enhancements

### Settings Tab for Agent

Add agent configuration to the settings modal:

```html
<!-- Agent Settings Tab -->
<div class="settings-section" id="agent-settings">
  <h3>Agent Settings</h3>
  
  <div class="setting-item">
    <label class="setting-label">
      <input type="checkbox" id="agent-readonly-mode">
      <span>Read-Only Mode</span>
    </label>
    <p class="setting-description">
      Block all commands that modify the system. Only allow information-gathering commands.
    </p>
  </div>
  
  <div class="setting-item">
    <label class="setting-label">
      <input type="checkbox" id="agent-require-approval" checked>
      <span>Require Approval for Write Commands</span>
    </label>
    <p class="setting-description">
      Show approval dialog before executing commands that modify the system.
    </p>
  </div>
  
  <div class="setting-item">
    <label class="setting-label">
      <input type="checkbox" id="agent-command-history" checked>
      <span>Enable Command History</span>
    </label>
    <p class="setting-description">
      Keep a log of all commands executed by the agent for security auditing.
    </p>
  </div>
  
  <div class="setting-item">
    <label class="setting-label">
      Command Timeout (seconds)
      <input type="number" id="agent-timeout" value="60" min="10" max="300">
    </label>
    <p class="setting-description">
      Maximum time to wait for a command to complete before timing out.
    </p>
  </div>
</div>
```

### Command History Viewer

Add a command history viewer accessible from the menu:

```typescript
// Show recent command history
function showCommandHistory(): void {
  const history = await window.electronAPI.getCommandHistory();
  
  // Display in a modal with:
  // - Command text
  // - Description
  // - Timestamp
  // - Duration
  // - Exit code
  // - Approved/Auto-executed indicator
}
```

### Stop All Button

Add an emergency stop button to the agent status bar:

```html
<div class="agent-status">
  <!-- ... existing status ... -->
  <button class="agent-stop-all-btn" title="Stop All Agent Activity">
    🛑 Stop All
  </button>
</div>
```

---

## Priority Implementation Order

1. **High Priority (Phase 6A)**
   - Command validation with dangerous pattern detection
   - Read-only mode toggle in settings
   - Stop all button for emergency stops
   - Command queue system

2. **Medium Priority (Phase 6B)**
   - Command history and audit log
   - Terminal state recovery
   - Retry logic for failed commands
   - Streaming output to AI

3. **Low Priority (Phase 6C)**
   - Execution statistics dashboard
   - Parallel execution for read-only commands
   - Advanced command history viewer with filtering
   - Export command history

---

## Testing Scenarios

1. **Safety Testing**
   - Try executing `rm -rf /` (should be blocked)
   - Try `sudo rm -rf /home/user/important` (should require approval)
   - Enable read-only mode and try any write command (should be blocked)

2. **Queue Testing**
   - Queue 5 commands rapidly (should execute sequentially)
   - Queue 15 commands (should reject after 10)
   - Cancel queued commands before execution

3. **Recovery Testing**
   - Run `sleep 300` then test timeout
   - Run command that hangs terminal, test recovery
   - Test Ctrl+C cancellation

4. **History Testing**
   - Execute 10 commands, verify all logged
   - Export history to file
   - View statistics (success rate, avg duration)

---

## Security Considerations

- **Command validation runs in main process** (renderer can't bypass)
- **All approvals stored in history** (audit trail)
- **Read-only mode enforced server-side** (not just UI)
- **Blocked commands never reach terminal** (defense in depth)
- **Command queue has size limits** (prevent DOS)
- **History excludes sensitive data** (no passwords logged)

---

## Future Enhancements (Phase 7+)

- AI learning from command failures
- Suggested fixes for common errors
- Command templates and macros
- Multi-step workflow automation
- Integration with system monitoring
- Natural language to command translation improvements
- Context-aware command suggestions
- Collaborative mode (multi-user agent approval)

---

## Files to Create/Modify

### New Files
- `src/main/agent/command-validator.ts`
- `src/main/agent/command-queue.ts`
- `src/main/agent/command-history.ts`
- `src/main/agent/terminal-health.ts`
- `src/renderer/components/command-history.ts`

### Modified Files
- `src/main/agent/agent-executor.ts` (integrate validation, queue, history)
- `src/main/store/settings-store.ts` (add agent settings)
- `src/renderer/components/settings-modal.ts` (add agent settings tab)
- `src/renderer/components/agent-status.ts` (add stop all button)
- `src/shared/types.ts` (add new agent types)

---

This phase significantly improves the safety, reliability, and user control of the agent system while maintaining the autonomous capabilities introduced in Phase 5.
