Phase 4A Build Plan: System Prompt Customization

**STATUS: ✅ IMPLEMENTED** (February 10, 2026)
- All components created and integrated
- Security enhancements added (8000 char limit, input sanitization)
- Build verified successfully
- Ready for testing

Save this as PHASE4A_BUILDPLAN.md in your project root.

markdown

# Pi Assistant - Phase 4A Build Plan
## System Prompt Customization

### Prerequisites

- Phase 1-3 completed (Electron app with chat UI)
- Phase 4 completed (LLM integration with multi-provider support)

### Overview

Add the ability to create, edit, and switch between custom system prompts (personas). Users can define different AI behaviors for different tasks and quickly switch between them.

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
 Prompt Selector 
|
 Dropdown in chat header to switch prompts 
|

|
 Prompt Management 
|
 Modal to create, edit, delete prompts 
|

|
 Built-in Templates 
|
 4 pre-configured prompts users can customize 
|

|
 Prompt Storage 
|
 Dedicated store for prompt persistence 
|

|
 Visual Indicators 
|
 Show when prompt changes mid-conversation 
|


---

### Design Decisions

|
 Decision 
|
 Choice 
|

|
----------
|
--------
|

|
 UI Location 
|
 Dropdown in chat header + Edit modal 
|

|
 Prompt Scope 
|
 Global (prompts work with any model) 
|

|
 Templates 
|
 4 built-in editable prompts 
|

|
 Variables 
|
 Plain text only (no dynamic variables) 
|

|
 Session Behavior 
|
 Affects future messages, visual indicator shown 
|

|
 Export/Import 
|
 Defer to later phase 
|


---

### Built-in Prompt Templates

#### 1. Pi Admin Assistant (Default)

You are a helpful AI assistant integrated into a Raspberry Pi management tool called "Pi Assistant".

Your role is to help users:

    Understand Linux/Raspberry Pi concepts
    Write and explain shell commands
    Troubleshoot system issues
    Provide guidance on system administration tasks

Be concise but thorough. When suggesting commands, explain what they do. If a task could be risky (like deleting files or changing system settings), warn the user first.

Format commands in code blocks for easy copying. When multiple steps are needed, number them clearly.

text


#### 2. Command Generator

You are a command-line expert assistant. Your primary role is to generate shell commands for Linux/Raspberry Pi systems.

Guidelines:

    Provide commands in code blocks, ready to copy and paste
    Keep explanations brief - focus on the command itself
    If multiple approaches exist, show the simplest one first
    Always warn about destructive operations (rm, dd, etc.)
    Include common flags/options when relevant
    For complex tasks, provide a step-by-step script

When asked a question, prioritize giving a working command over lengthy explanations.

text


#### 3. Troubleshooter

You are a diagnostic expert for Linux/Raspberry Pi systems. Your role is to help users identify and fix problems.

Approach:

    Ask clarifying questions to understand the issue
    Suggest diagnostic commands to gather information
    Analyze the output and identify the root cause
    Provide step-by-step solutions
    Explain what went wrong to prevent future issues

Common areas: networking, services, permissions, disk space, memory, processes, boot issues, GPIO, and peripherals.

Be systematic and methodical. Don't jump to solutions before understanding the problem.

text


#### 4. Teacher / Explainer

You are a patient and thorough teacher specializing in Linux, Raspberry Pi, and system administration concepts.

Your teaching style:

    Start with the basics, then build up complexity
    Use analogies to explain technical concepts
    Provide examples to illustrate points
    Anticipate follow-up questions
    Break complex topics into digestible pieces

When showing commands, explain each part:

    What the command does
    What each flag/option means
    When you would use it
    Common variations

Assume the user wants to understand, not just copy-paste.

text


---

### Updated Project Structure

src/
├── main/
│ ├── main.ts # UPDATE: Add prompt IPC handlers
│ ├── preload.ts # UPDATE: Expose prompt API
│ ├── llm/
│ │ ├── llm-service.ts # UPDATE: Use selected prompt
│ │ └── ...existing...
│ └── store/
│ ├── prompt-store.ts # NEW: Prompt persistence
│ └── ...existing...
├── renderer/
│ ├── index.html # UPDATE: Minor tweaks
│ ├── renderer.ts # UPDATE: Initialize prompt selector
│ ├── components/
│ │ ├── chat-container.ts # UPDATE: Handle prompt changes
│ │ ├── prompt-selector.ts # NEW: Dropdown component
│ │ ├── prompt-modal.ts # NEW: Edit/create modal
│ │ └── ...existing...
│ └── styles/
│ ├── prompts.css # NEW: Prompt-related styles
│ └── ...existing...
└── shared/
└── types.ts # UPDATE: Add prompt types

text


---

## Type Definitions

### Update `src/shared/types.ts`

Add these types:

```typescript
// ============== PROMPT TYPES ==============

/**
 * System prompt definition
 */
export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  isBuiltIn: boolean;        // True for default templates
  isDefault: boolean;        // True for the currently selected default
  createdAt: number;
  updatedAt: number;
}

/**
 * Prompt creation/update data
 */
export interface PromptFormData {
  name: string;
  content: string;
  description?: string;
}

/**
 * Prompt list item (for dropdown display)
 */
export interface PromptListItem {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  isDefault: boolean;
}

/**
 * Prompt change event (for chat display)
 */
export interface PromptChangeEvent {
  previousPromptId: string | null;
  previousPromptName: string | null;
  newPromptId: string;
  newPromptName: string;
  timestamp: number;
}

// ============== PROMPT IPC CHANNELS ==============

// Add to existing IPC_CHANNELS:
export const IPC_CHANNELS = {
  // ... existing channels ...

  // Prompts
  PROMPT_LIST: 'prompt:list',
  PROMPT_GET: 'prompt:get',
  PROMPT_GET_ACTIVE: 'prompt:get-active',
  PROMPT_CREATE: 'prompt:create',
  PROMPT_UPDATE: 'prompt:update',
  PROMPT_DELETE: 'prompt:delete',
  PROMPT_SET_ACTIVE: 'prompt:set-active',
  PROMPT_SET_DEFAULT: 'prompt:set-default',
  PROMPT_RESET_BUILT_IN: 'prompt:reset-built-in',
} as const;

// ============== ELECTRON API EXTENSIONS ==============

// Add to existing ElectronAPI interface:
export interface ElectronAPI {
  // ... existing methods ...

  // Prompts
  getPrompts: () => Promise<PromptListItem[]>;
  getPrompt: (id: string) => Promise<SystemPrompt | null>;
  getActivePrompt: () => Promise<SystemPrompt>;
  createPrompt: (data: PromptFormData) => Promise<SystemPrompt>;
  updatePrompt: (id: string, data: Partial<PromptFormData>) => Promise<SystemPrompt | null>;
  deletePrompt: (id: string) => Promise<boolean>;
  setActivePrompt: (id: string) => Promise<void>;
  setDefaultPrompt: (id: string) => Promise<void>;
  resetBuiltInPrompt: (id: string) => Promise<SystemPrompt>;
}

Prompt Store
New file: src/main/store/prompt-store.ts

typescript

/**
 * Prompt Store
 * Manages system prompt persistence
 */

import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { SystemPrompt, PromptFormData, PromptListItem } from '../../shared/types';

// Built-in prompt templates
const BUILT_IN_PROMPTS: Omit<SystemPrompt, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'builtin-pi-admin',
    name: 'Pi Admin Assistant',
    description: 'General Raspberry Pi help and guidance',
    content: `You are a helpful AI assistant integrated into a Raspberry Pi management tool called "Pi Assistant".

Your role is to help users:
- Understand Linux/Raspberry Pi concepts
- Write and explain shell commands
- Troubleshoot system issues
- Provide guidance on system administration tasks

Be concise but thorough. When suggesting commands, explain what they do. If a task could be risky (like deleting files or changing system settings), warn the user first.

Format commands in code blocks for easy copying. When multiple steps are needed, number them clearly.`,
    isBuiltIn: true,
    isDefault: true
  },
  {
    id: 'builtin-command-gen',
    name: 'Command Generator',
    description: 'Focused on generating ready-to-use shell commands',
    content: `You are a command-line expert assistant. Your primary role is to generate shell commands for Linux/Raspberry Pi systems.

Guidelines:
- Provide commands in code blocks, ready to copy and paste
- Keep explanations brief - focus on the command itself
- If multiple approaches exist, show the simplest one first
- Always warn about destructive operations (rm, dd, etc.)
- Include common flags/options when relevant
- For complex tasks, provide a step-by-step script

When asked a question, prioritize giving a working command over lengthy explanations.`,
    isBuiltIn: true,
    isDefault: false
  },
  {
    id: 'builtin-troubleshooter',
    name: 'Troubleshooter',
    description: 'Diagnostic and problem-solving focus',
    content: `You are a diagnostic expert for Linux/Raspberry Pi systems. Your role is to help users identify and fix problems.

Approach:
1. Ask clarifying questions to understand the issue
2. Suggest diagnostic commands to gather information
3. Analyze the output and identify the root cause
4. Provide step-by-step solutions
5. Explain what went wrong to prevent future issues

Common areas: networking, services, permissions, disk space, memory, processes, boot issues, GPIO, and peripherals.

Be systematic and methodical. Don't jump to solutions before understanding the problem.`,
    isBuiltIn: true,
    isDefault: false
  },
  {
    id: 'builtin-teacher',
    name: 'Teacher / Explainer',
    description: 'Detailed explanations for learning',
    content: `You are a patient and thorough teacher specializing in Linux, Raspberry Pi, and system administration concepts.

Your teaching style:
- Start with the basics, then build up complexity
- Use analogies to explain technical concepts
- Provide examples to illustrate points
- Anticipate follow-up questions
- Break complex topics into digestible pieces

When showing commands, explain each part:
- What the command does
- What each flag/option means
- When you would use it
- Common variations

Assume the user wants to understand, not just copy-paste.`,
    isBuiltIn: true,
    isDefault: false
  }
];

interface PromptStoreData {
  prompts: SystemPrompt[];
  activePromptId: string;
}

export class PromptStore {
  private store: Store<PromptStoreData>;

  constructor() {
    this.store = new Store<PromptStoreData>({
      name: 'prompts',
      defaults: {
        prompts: [],
        activePromptId: 'builtin-pi-admin'
      }
    });

    // Initialize built-in prompts on first run
    this.initializeBuiltInPrompts();
  }

  /**
   * Initialize built-in prompts if they don't exist
   */
  private initializeBuiltInPrompts(): void {
    const prompts = this.store.get('prompts', []);
    const now = Date.now();

    let needsSave = false;

    for (const template of BUILT_IN_PROMPTS) {
      const exists = prompts.some(p => p.id === template.id);
      
      if (!exists) {
        prompts.push({
          ...template,
          createdAt: now,
          updatedAt: now
        });
        needsSave = true;
      }
    }

    if (needsSave) {
      this.store.set('prompts', prompts);
      console.log('Built-in prompts initialized');
    }
  }

  /**
   * Get all prompts as list items
   */
  getAll(): PromptListItem[] {
    const prompts = this.store.get('prompts', []);
    
    return prompts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isBuiltIn: p.isBuiltIn,
      isDefault: p.isDefault
    }));
  }

  /**
   * Get a single prompt by ID
   */
  get(id: string): SystemPrompt | null {
    const prompts = this.store.get('prompts', []);
    return prompts.find(p => p.id === id) || null;
  }

  /**
   * Get the currently active prompt
   */
  getActive(): SystemPrompt {
    const activeId = this.store.get('activePromptId');
    const prompt = this.get(activeId);
    
    // Fallback to first built-in if active not found
    if (!prompt) {
      const prompts = this.store.get('prompts', []);
      const fallback = prompts.find(p => p.isBuiltIn) || prompts[0];
      
      if (fallback) {
        this.store.set('activePromptId', fallback.id);
        return fallback;
      }
      
      // Should never happen, but just in case
      throw new Error('No prompts available');
    }
    
    return prompt;
  }

  /**
   * Get active prompt ID
   */
  getActiveId(): string {
    return this.store.get('activePromptId');
  }

  /**
   * Set the active prompt
   */
  setActive(id: string): void {
    const prompt = this.get(id);
    if (!prompt) {
      throw new Error('Prompt not found');
    }
    
    this.store.set('activePromptId', id);
    console.log(`Active prompt set to: ${prompt.name}`);
  }

  /**
   * Create a new prompt
   */
  create(data: PromptFormData): SystemPrompt {
    const now = Date.now();
    
    const prompt: SystemPrompt = {
      id: uuidv4(),
      name: data.name.trim(),
      content: data.content,
      description: data.description?.trim() || undefined,
      isBuiltIn: false,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };

    const prompts = this.store.get('prompts', []);
    prompts.push(prompt);
    this.store.set('prompts', prompts);

    console.log(`Prompt created: ${prompt.name} (${prompt.id})`);
    return prompt;
  }

  /**
   * Update an existing prompt
   */
  update(id: string, data: Partial<PromptFormData>): SystemPrompt | null {
    const prompts = this.store.get('prompts', []);
    const index = prompts.findIndex(p => p.id === id);

    if (index === -1) {
      return null;
    }

    const prompt = prompts[index];

    // Update fields
    if (data.name !== undefined) prompt.name = data.name.trim();
    if (data.content !== undefined) prompt.content = data.content;
    if (data.description !== undefined) prompt.description = data.description?.trim() || undefined;
    
    prompt.updatedAt = Date.now();

    prompts[index] = prompt;
    this.store.set('prompts', prompts);

    console.log(`Prompt updated: ${prompt.name} (${prompt.id})`);
    return prompt;
  }

  /**
   * Delete a prompt
   */
  delete(id: string): boolean {
    const prompts = this.store.get('prompts', []);
    const prompt = prompts.find(p => p.id === id);

    if (!prompt) {
      return false;
    }

    // Prevent deleting the last prompt
    if (prompts.length === 1) {
      throw new Error('Cannot delete the only remaining prompt');
    }

    // If deleting the active prompt, switch to default or first available
    const activeId = this.store.get('activePromptId');
    if (activeId === id) {
      const defaultPrompt = prompts.find(p => p.isDefault && p.id !== id);
      const fallback = defaultPrompt || prompts.find(p => p.id !== id);
      
      if (fallback) {
        this.store.set('activePromptId', fallback.id);
      }
    }

    // Remove from store
    const filtered = prompts.filter(p => p.id !== id);
    this.store.set('prompts', filtered);

    console.log(`Prompt deleted: ${prompt.name} (${id})`);
    return true;
  }

  /**
   * Set a prompt as the default (used for new sessions)
   */
  setDefault(id: string): void {
    const prompts = this.store.get('prompts', []);
    
    // Clear existing default
    prompts.forEach(p => {
      p.isDefault = p.id === id;
    });
    
    this.store.set('prompts', prompts);
    console.log(`Default prompt set: ${id}`);
  }

  /**
   * Reset a built-in prompt to its original content
   */
  resetBuiltIn(id: string): SystemPrompt {
    const template = BUILT_IN_PROMPTS.find(t => t.id === id);
    
    if (!template) {
      throw new Error('Not a built-in prompt');
    }

    const prompts = this.store.get('prompts', []);
    const index = prompts.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Prompt not found');
    }

    // Reset to original content
    prompts[index] = {
      ...template,
      isDefault: prompts[index].isDefault,  // Preserve default status
      createdAt: prompts[index].createdAt,
      updatedAt: Date.now()
    };

    this.store.set('prompts', prompts);

    console.log(`Built-in prompt reset: ${template.name}`);
    return prompts[index];
  }

  /**
   * Duplicate a prompt
   */
  duplicate(id: string): SystemPrompt {
    const original = this.get(id);
    
    if (!original) {
      throw new Error('Prompt not found');
    }

    return this.create({
      name: `${original.name} (Copy)`,
      content: original.content,
      description: original.description
    });
  }
}

Update Main Process
Update src/main/main.ts

Add prompt IPC handlers:

typescript

/**
 * Add import
 */
import { PromptStore } from './store/prompt-store';
import { PromptFormData } from '../shared/types';

/**
 * Add variable
 */
let promptStore: PromptStore;

/**
 * Update initializeStores()
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  chatStore = new ChatStore();
  settingsStore = new SettingsStore();
  promptStore = new PromptStore();  // ADD THIS
  llmService = new LLMService(credentialStore);
  
  console.log('Stores initialized');
}

/**
 * Add these IPC handlers in setupIpcHandlers()
 */

// ============== PROMPT HANDLERS ==============

// Get all prompts
ipcMain.handle(IPC_CHANNELS.PROMPT_LIST, () => {
  return promptStore.getAll();
});

// Get single prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_GET, (_, id: string) => {
  return promptStore.get(id);
});

// Get active prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_GET_ACTIVE, () => {
  return promptStore.getActive();
});

// Create prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_CREATE, (_, data: PromptFormData) => {
  return promptStore.create(data);
});

// Update prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_UPDATE, (_, id: string, data: Partial<PromptFormData>) => {
  return promptStore.update(id, data);
});

// Delete prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_DELETE, (_, id: string) => {
  return promptStore.delete(id);
});

// Set active prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_SET_ACTIVE, (_, id: string) => {
  promptStore.setActive(id);
});

// Set default prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_SET_DEFAULT, (_, id: string) => {
  promptStore.setDefault(id);
});

// Reset built-in prompt
ipcMain.handle(IPC_CHANNELS.PROMPT_RESET_BUILT_IN, (_, id: string) => {
  return promptStore.resetBuiltIn(id);
});

Update Preload Script
Update src/main/preload.ts

Add prompt methods:

typescript

/**
 * Add to the electronAPI object
 */

// Prompts
getPrompts: () =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_LIST),

getPrompt: (id: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_GET, id),

getActivePrompt: () =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_GET_ACTIVE),

createPrompt: (data: PromptFormData) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_CREATE, data),

updatePrompt: (id: string, data: Partial<PromptFormData>) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_UPDATE, id, data),

deletePrompt: (id: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_DELETE, id),

setActivePrompt: (id: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_SET_ACTIVE, id),

setDefaultPrompt: (id: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_SET_DEFAULT, id),

resetBuiltInPrompt: (id: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.PROMPT_RESET_BUILT_IN, id),

Update LLM Service
Update src/main/llm/llm-service.ts

Modify to use prompts from prompt store:

typescript

/**
 * Add import
 */
import { PromptStore } from '../store/prompt-store';

/**
 * Update constructor
 */
export class LLMService {
  // ... existing properties ...
  private promptStore: PromptStore;

  constructor(credentialStore: CredentialStore, promptStore: PromptStore) {
    this.credentialStore = credentialStore;
    this.promptStore = promptStore;
    this.initializeProviders();
    this.loadAPIKeys();
  }

  /**
   * Get the current system prompt
   */
  getSystemPrompt(): string {
    const activePrompt = this.promptStore.getActive();
    return activePrompt.content;
  }

  // ... rest of existing methods ...
}

Update provider files to use dynamic system prompt

Update src/main/llm/providers/anthropic.ts, openai.ts, and moonshot.ts:

typescript

/**
 * Update streamMessage to accept system prompt as parameter
 */
async streamMessage(
  model: string,
  messages: LLMMessage[],
  options: StreamOptions,
  callbacks: StreamCallbacks,
  systemPrompt: string  // ADD THIS PARAMETER
): Promise<void> {
  // ... existing code, but use systemPrompt instead of SYSTEM_PROMPT constant ...
}

Update src/main/llm/llm-service.ts to pass the system prompt:

typescript

/**
 * Update sendMessage to include system prompt
 */
async sendMessage(options: LLMRequestOptions): Promise<string> {
  // ... existing validation ...

  // Get current system prompt
  const systemPrompt = this.getSystemPrompt();

  // Start streaming with system prompt
  provider.streamMessage(
    options.model,
    llmMessages,
    {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      signal: abortController.signal
    },
    {
      onChunk: (chunk) => { /* ... */ },
      onComplete: (usage) => { /* ... */ },
      onError: (error) => { /* ... */ }
    },
    systemPrompt  // ADD THIS
  );

  return requestId;
}

Prompt Selector Component
New file: src/renderer/components/prompt-selector.ts

typescript

/**
 * Prompt Selector Component
 * Dropdown for selecting and managing system prompts
 */

import { PromptListItem, SystemPrompt } from '../../shared/types';

export interface PromptSelectorOptions {
  container: HTMLElement;
  onPromptChange: (promptId: string, promptName: string) => void;
  onEditPrompts: () => void;
}

export class PromptSelector {
  private container: HTMLElement;
  private options: PromptSelectorOptions;
  private button!: HTMLElement;
  private menu!: HTMLElement;
  private isOpen: boolean = false;
  private prompts: PromptListItem[] = [];
  private activePromptId: string = '';
  private activePromptName: string = '';

  constructor(options: PromptSelectorOptions) {
    this.container = options.container;
    this.options = options;
  }

  /**
   * Initialize the selector
   */
  async initialize(): Promise<void> {
    this.render();
    this.attachEventListeners();
    await this.refresh();
    console.log('Prompt selector initialized');
  }

  /**
   * Render the dropdown HTML
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="prompt-selector">
        <button class="prompt-selector-button" id="prompt-selector-btn" title="Select AI Persona">
          <span class="prompt-icon">🎭</span>
          <span class="prompt-label">Loading...</span>
          <span class="prompt-arrow">▾</span>
        </button>
        <div class="prompt-selector-menu hidden" id="prompt-selector-menu">
          <div class="prompt-menu-header">
            <span>AI Persona</span>
          </div>
          <div class="prompt-list" id="prompt-list">
            <!-- Populated dynamically -->
          </div>
          <div class="prompt-menu-divider"></div>
          <div class="prompt-menu-actions">
            <button class="prompt-menu-action" id="edit-prompts-btn">
              <span>✏️</span>
              <span>Edit Prompts...</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.button = this.container.querySelector('#prompt-selector-btn')!;
    this.menu = this.container.querySelector('#prompt-selector-menu')!;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Toggle dropdown
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Prompt selection
    this.menu.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const promptItem = target.closest('.prompt-item') as HTMLElement;
      
      if (promptItem) {
        const promptId = promptItem.dataset.promptId;
        if (promptId && promptId !== this.activePromptId) {
          await this.selectPrompt(promptId);
        }
        this.close();
        return;
      }

      // Edit prompts button
      if (target.closest('#edit-prompts-btn')) {
        this.close();
        this.options.onEditPrompts();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Refresh prompts from store
   */
  async refresh(): Promise<void> {
    try {
      this.prompts = await window.electronAPI.getPrompts();
      const activePrompt = await window.electronAPI.getActivePrompt();
      
      this.activePromptId = activePrompt.id;
      this.activePromptName = activePrompt.name;
      
      this.updateButton();
      this.renderPromptList();
    } catch (error) {
      console.error('Failed to refresh prompts:', error);
    }
  }

  /**
   * Update button display
   */
  private updateButton(): void {
    const label = this.button.querySelector('.prompt-label')!;
    label.textContent = this.activePromptName;
    this.button.title = `AI Persona: ${this.activePromptName}`;
  }

  /**
   * Render the prompt list
   */
  private renderPromptList(): void {
    const listContainer = this.menu.querySelector('#prompt-list')!;

    // Group prompts: built-in first, then custom
    const builtIn = this.prompts.filter(p => p.isBuiltIn);
    const custom = this.prompts.filter(p => !p.isBuiltIn);

    let html = '';

    // Built-in prompts
    if (builtIn.length > 0) {
      html += '<div class="prompt-group-label">Built-in</div>';
      html += builtIn.map(p => this.renderPromptItem(p)).join('');
    }

    // Custom prompts
    if (custom.length > 0) {
      html += '<div class="prompt-group-label">Custom</div>';
      html += custom.map(p => this.renderPromptItem(p)).join('');
    }

    listContainer.innerHTML = html;
  }

  /**
   * Render a single prompt item
   */
  private renderPromptItem(prompt: PromptListItem): string {
    const isActive = prompt.id === this.activePromptId;
    const isDefault = prompt.isDefault;

    return `
      <div class="prompt-item ${isActive ? 'active' : ''}" data-prompt-id="${prompt.id}">
        <span class="prompt-item-radio">${isActive ? '●' : '○'}</span>
        <div class="prompt-item-info">
          <span class="prompt-item-name">
            ${this.escapeHtml(prompt.name)}
            ${isDefault ? '<span class="default-badge">Default</span>' : ''}
          </span>
          ${prompt.description ? `<span class="prompt-item-desc">${this.escapeHtml(prompt.description)}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Select a prompt
   */
  private async selectPrompt(promptId: string): Promise<void> {
    const previousId = this.activePromptId;
    const previousName = this.activePromptName;

    try {
      await window.electronAPI.setActivePrompt(promptId);
      
      const prompt = this.prompts.find(p => p.id === promptId);
      if (prompt) {
        this.activePromptId = promptId;
        this.activePromptName = prompt.name;
        this.updateButton();
        this.renderPromptList();
        
        // Notify parent of change
        this.options.onPromptChange(promptId, prompt.name);
      }
    } catch (error) {
      console.error('Failed to select prompt:', error);
      // Revert
      this.activePromptId = previousId;
      this.activePromptName = previousName;
    }
  }

  /**
   * Open dropdown
   */
  open(): void {
    this.isOpen = true;
    this.menu.classList.remove('hidden');
    this.button.classList.add('open');
  }

  /**
   * Close dropdown
   */
  close(): void {
    this.isOpen = false;
    this.menu.classList.add('hidden');
    this.button.classList.remove('open');
  }

  /**
   * Toggle dropdown
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Get current active prompt info
   */
  getActivePrompt(): { id: string; name: string } {
    return {
      id: this.activePromptId,
      name: this.activePromptName
    };
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

Prompt Modal Component
New file: src/renderer/components/prompt-modal.ts

typescript

/**
 * Prompt Modal Component
 * Modal for creating, editing, and managing prompts
 */

import { SystemPrompt, PromptFormData, PromptListItem } from '../../shared/types';

export interface PromptModalOptions {
  onSave: () => void;
  onClose: () => void;
}

type ModalView = 'list' | 'edit';

export class PromptModal {
  private overlay!: HTMLElement;
  private options: PromptModalOptions;
  private currentView: ModalView = 'list';
  private editingPromptId: string | null = null;
  private prompts: PromptListItem[] = [];

  constructor(options: PromptModalOptions) {
    this.options = options;
    this.createModal();
    this.attachEventListeners();
  }

  /**
   * Create modal HTML
   */
  private createModal(): void {
    const existing = document.getElementById('prompt-modal-overlay');
    if (existing) existing.remove();

    const modalHtml = `
      <div id="prompt-modal-overlay" class="modal-overlay hidden">
        <div class="modal prompt-modal">
          <div class="modal-header">
            <button class="modal-back hidden" id="prompt-modal-back">← Back</button>
            <h2 class="modal-title" id="prompt-modal-title">Manage Prompts</h2>
            <button class="modal-close" id="prompt-modal-close">✕</button>
          </div>
          <div class="modal-body">
            <!-- List View -->
            <div class="prompt-modal-view" id="prompt-list-view">
              <div class="prompt-modal-list" id="prompt-modal-list">
                <!-- Populated dynamically -->
              </div>
              <button class="btn btn-primary prompt-add-btn" id="prompt-add-btn">
                + Create New Prompt
              </button>
            </div>
            
            <!-- Edit View -->
            <div class="prompt-modal-view hidden" id="prompt-edit-view">
              <form id="prompt-edit-form">
                <div class="form-group">
                  <label for="prompt-edit-name">Name *</label>
                  <input type="text" id="prompt-edit-name" name="name" 
                         placeholder="My Custom Prompt" required maxlength="50">
                </div>
                
                <div class="form-group">
                  <label for="prompt-edit-description">Description</label>
                  <input type="text" id="prompt-edit-description" name="description"
                         placeholder="Brief description (optional)" maxlength="100">
                </div>
                
                <div class="form-group">
                  <label for="prompt-edit-content">System Prompt *</label>
                  <textarea id="prompt-edit-content" name="content" 
                            placeholder="You are a helpful assistant that..."
                            required rows="12"></textarea>
                  <p class="form-hint">
                    This defines how the AI behaves. Be specific about the AI's role, 
                    tone, and any guidelines it should follow.
                  </p>
                </div>

                <div id="prompt-edit-status" class="form-status hidden">
                  <span class="status-message"></span>
                </div>
              </form>
            </div>
          </div>
          <div class="modal-footer">
            <!-- List View Footer -->
            <div class="prompt-footer-view" id="prompt-list-footer">
              <button type="button" class="btn btn-ghost" id="prompt-modal-cancel">
                Close
              </button>
            </div>
            
            <!-- Edit View Footer -->
            <div class="prompt-footer-view hidden" id="prompt-edit-footer">
              <button type="button" class="btn btn-ghost" id="prompt-edit-cancel">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" id="prompt-edit-save" 
                      form="prompt-edit-form">
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.overlay = document.getElementById('prompt-modal-overlay')!;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Close button
    document.getElementById('prompt-modal-close')!.addEventListener('click', () => {
      this.hide();
    });

    // Cancel button (list view)
    document.getElementById('prompt-modal-cancel')!.addEventListener('click', () => {
      this.hide();
    });

    // Back button
    document.getElementById('prompt-modal-back')!.addEventListener('click', () => {
      this.showListView();
    });

    // Add new prompt button
    document.getElementById('prompt-add-btn')!.addEventListener('click', () => {
      this.showEditView(null);
    });

    // Cancel button (edit view)
    document.getElementById('prompt-edit-cancel')!.addEventListener('click', () => {
      this.showListView();
    });

    // Form submit
    document.getElementById('prompt-edit-form')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSave();
    });

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
        if (this.currentView === 'edit') {
          this.showListView();
        } else {
          this.hide();
        }
      }
    });

    // List item actions (delegated)
    document.getElementById('prompt-modal-list')!.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const listItem = target.closest('.prompt-list-item') as HTMLElement;
      
      if (!listItem) return;
      
      const promptId = listItem.dataset.promptId!;

      if (target.closest('.prompt-action-edit')) {
        this.showEditView(promptId);
      } else if (target.closest('.prompt-action-duplicate')) {
        await this.duplicatePrompt(promptId);
      } else if (target.closest('.prompt-action-delete')) {
        await this.deletePrompt(promptId);
      } else if (target.closest('.prompt-action-reset')) {
        await this.resetPrompt(promptId);
      } else if (target.closest('.prompt-action-default')) {
        await this.setDefaultPrompt(promptId);
      }
    });
  }

  /**
   * Show the modal
   */
  async show(): Promise<void> {
    await this.loadPrompts();
    this.showListView();
    this.overlay.classList.remove('hidden');
  }

  /**
   * Hide the modal
   */
  hide(): void {
    this.overlay.classList.add('hidden');
    this.options.onClose();
  }

  /**
   * Load prompts from store
   */
  private async loadPrompts(): Promise<void> {
    try {
      this.prompts = await window.electronAPI.getPrompts();
      this.renderPromptList();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  /**
   * Render the prompt list
   */
  private renderPromptList(): void {
    const listContainer = document.getElementById('prompt-modal-list')!;

    if (this.prompts.length === 0) {
      listContainer.innerHTML = '<div class="prompt-list-empty">No prompts found</div>';
      return;
    }

    // Group by built-in vs custom
    const builtIn = this.prompts.filter(p => p.isBuiltIn);
    const custom = this.prompts.filter(p => !p.isBuiltIn);

    let html = '';

    if (builtIn.length > 0) {
      html += '<div class="prompt-list-group-label">Built-in Prompts</div>';
      html += builtIn.map(p => this.renderPromptListItem(p)).join('');
    }

    if (custom.length > 0) {
      html += '<div class="prompt-list-group-label">Custom Prompts</div>';
      html += custom.map(p => this.renderPromptListItem(p)).join('');
    }

    listContainer.innerHTML = html;
  }

  /**
   * Render a prompt list item
   */
  private renderPromptListItem(prompt: PromptListItem): string {
    const actions = prompt.isBuiltIn
      ? `
        <button class="prompt-action-btn prompt-action-edit" title="Edit">✏️</button>
        <button class="prompt-action-btn prompt-action-duplicate" title="Duplicate">📋</button>
        <button class="prompt-action-btn prompt-action-reset" title="Reset to default">🔄</button>
        ${!prompt.isDefault ? `<button class="prompt-action-btn prompt-action-default" title="Set as default">⭐</button>` : ''}
      `
      : `
        <button class="prompt-action-btn prompt-action-edit" title="Edit">✏️</button>
        <button class="prompt-action-btn prompt-action-duplicate" title="Duplicate">📋</button>
        ${!prompt.isDefault ? `<button class="prompt-action-btn prompt-action-default" title="Set as default">⭐</button>` : ''}
        <button class="prompt-action-btn prompt-action-delete" title="Delete">🗑️</button>
      `;

    return `
      <div class="prompt-list-item" data-prompt-id="${prompt.id}">
        <div class="prompt-list-item-info">
          <span class="prompt-list-item-name">
            ${this.escapeHtml(prompt.name)}
            ${prompt.isDefault ? '<span class="default-badge">Default</span>' : ''}
            ${prompt.isBuiltIn ? '<span class="builtin-badge">Built-in</span>' : ''}
          </span>
          ${prompt.description ? `<span class="prompt-list-item-desc">${this.escapeHtml(prompt.description)}</span>` : ''}
        </div>
        <div class="prompt-list-item-actions">
          ${actions}
        </div>
      </div>
    `;
  }

  /**
   * Show list view
   */
  private showListView(): void {
    this.currentView = 'list';
    this.editingPromptId = null;

    document.getElementById('prompt-modal-title')!.textContent = 'Manage Prompts';
    document.getElementById('prompt-modal-back')!.classList.add('hidden');
    
    document.getElementById('prompt-list-view')!.classList.remove('hidden');
    document.getElementById('prompt-edit-view')!.classList.add('hidden');
    
    document.getElementById('prompt-list-footer')!.classList.remove('hidden');
    document.getElementById('prompt-edit-footer')!.classList.add('hidden');

    this.loadPrompts();
  }

  /**
   * Show edit view
   */
  private async showEditView(promptId: string | null): Promise<void> {
    this.currentView = 'edit';
    this.editingPromptId = promptId;

    const isNew = promptId === null;
    
    document.getElementById('prompt-modal-title')!.textContent = isNew ? 'Create Prompt' : 'Edit Prompt';
    document.getElementById('prompt-modal-back')!.classList.remove('hidden');
    
    document.getElementById('prompt-list-view')!.classList.add('hidden');
    document.getElementById('prompt-edit-view')!.classList.remove('hidden');
    
    document.getElementById('prompt-list-footer')!.classList.add('hidden');
    document.getElementById('prompt-edit-footer')!.classList.remove('hidden');

    // Clear or populate form
    const nameInput = document.getElementById('prompt-edit-name') as HTMLInputElement;
    const descInput = document.getElementById('prompt-edit-description') as HTMLInputElement;
    const contentInput = document.getElementById('prompt-edit-content') as HTMLTextAreaElement;
    const statusDiv = document.getElementById('prompt-edit-status')!;

    statusDiv.classList.add('hidden');

    if (isNew) {
      nameInput.value = '';
      descInput.value = '';
      contentInput.value = '';
      document.getElementById('prompt-edit-save')!.textContent = 'Create Prompt';
    } else {
      const prompt = await window.electronAPI.getPrompt(promptId!);
      if (prompt) {
        nameInput.value = prompt.name;
        descInput.value = prompt.description || '';
        contentInput.value = prompt.content;
      }
      document.getElementById('prompt-edit-save')!.textContent = 'Save Changes';
    }

    // Focus name input
    setTimeout(() => nameInput.focus(), 100);
  }

  /**
   * Handle save
   */
  private async handleSave(): Promise<void> {
    const nameInput = document.getElementById('prompt-edit-name') as HTMLInputElement;
    const descInput = document.getElementById('prompt-edit-description') as HTMLInputElement;
    const contentInput = document.getElementById('prompt-edit-content') as HTMLTextAreaElement;
    const saveBtn = document.getElementById('prompt-edit-save') as HTMLButtonElement;
    const statusDiv = document.getElementById('prompt-edit-status')!;

    const data: PromptFormData = {
      name: nameInput.value.trim(),
      content: contentInput.value,
      description: descInput.value.trim() || undefined
    };

    // Validate
    if (!data.name || !data.content) {
      statusDiv.classList.remove('hidden', 'success');
      statusDiv.classList.add('error');
      statusDiv.querySelector('.status-message')!.textContent = 'Name and content are required';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      if (this.editingPromptId) {
        await window.electronAPI.updatePrompt(this.editingPromptId, data);
      } else {
        await window.electronAPI.createPrompt(data);
      }

      this.options.onSave();
      this.showListView();
    } catch (error: any) {
      statusDiv.classList.remove('hidden', 'success');
      statusDiv.classList.add('error');
      statusDiv.querySelector('.status-message')!.textContent = error.message || 'Failed to save';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = this.editingPromptId ? 'Save Changes' : 'Create Prompt';
    }
  }

  /**
   * Duplicate a prompt
   */
  private async duplicatePrompt(promptId: string): Promise<void> {
    try {
      const original = await window.electronAPI.getPrompt(promptId);
      if (original) {
        await window.electronAPI.createPrompt({
          name: `${original.name} (Copy)`,
          content: original.content,
          description: original.description
        });
        await this.loadPrompts();
        this.options.onSave();
      }
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
    }
  }

  /**
   * Delete a prompt
   */
  private async deletePrompt(promptId: string): Promise<void> {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    if (!confirm(`Delete "${prompt.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await window.electronAPI.deletePrompt(promptId);
      await this.loadPrompts();
      this.options.onSave();
    } catch (error: any) {
      alert(error.message || 'Failed to delete prompt');
    }
  }

  /**
   * Reset a built-in prompt
   */
  private async resetPrompt(promptId: string): Promise<void> {
    if (!confirm('Reset this prompt to its original content?')) {
      return;
    }

    try {
      await window.electronAPI.resetBuiltInPrompt(promptId);
      await this.loadPrompts();
      this.options.onSave();
    } catch (error: any) {
      alert(error.message || 'Failed to reset prompt');
    }
  }

  /**
   * Set a prompt as default
   */
  private async setDefaultPrompt(promptId: string): Promise<void> {
    try {
      await window.electronAPI.setDefaultPrompt(promptId);
      await this.loadPrompts();
      this.options.onSave();
    } catch (error: any) {
      alert(error.message || 'Failed to set default');
    }
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

Update Chat Container
Update src/renderer/components/chat-container.ts

Add prompt change indicator and integration:

typescript

/**
 * Add import
 */
import { PromptChangeEvent } from '../../shared/types';

/**
 * Add property
 */
private lastPromptId: string = '';
private lastPromptName: string = '';

/**
 * Add method to handle prompt changes
 */
handlePromptChange(promptId: string, promptName: string): void {
  // Skip if same prompt
  if (promptId === this.lastPromptId) return;

  // Add visual indicator in chat
  if (this.messages.length > 0 && this.lastPromptId) {
    this.addPromptChangeIndicator(this.lastPromptName, promptName);
  }

  this.lastPromptId = promptId;
  this.lastPromptName = promptName;
}

/**
 * Add prompt change indicator to chat
 */
private addPromptChangeIndicator(fromName: string, toName: string): void {
  const indicator = document.createElement('div');
  indicator.className = 'prompt-change-indicator';
  indicator.innerHTML = `
    <span class="prompt-change-line"></span>
    <span class="prompt-change-text">Switched to "${this.escapeHtml(toName)}"</span>
    <span class="prompt-change-line"></span>
  `;
  
  this.messagesContainer.appendChild(indicator);
  this.scrollToBottom();
}

/**
 * Update initialize to load current prompt
 */
async initialize(): Promise<void> {
  // ... existing code ...

  // Load current prompt info
  const activePrompt = await window.electronAPI.getActivePrompt();
  this.lastPromptId = activePrompt.id;
  this.lastPromptName = activePrompt.name;

  // ... rest of existing code ...
}

Prompt Styles
New file: src/renderer/styles/prompts.css

css

/**
 * Prompt Styles
 * Styles for prompt selector and modal
 */

/* ==================== PROMPT SELECTOR ==================== */

.prompt-selector {
  position: relative;
}

.prompt-selector-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  max-width: 180px;
}

.prompt-selector-button:hover,
.prompt-selector-button.open {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.prompt-icon {
  font-size: 14px;
}

.prompt-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: left;
}

.prompt-arrow {
  font-size: 10px;
  opacity: 0.6;
  transition: transform var(--transition-fast);
}

.prompt-selector-button.open .prompt-arrow {
  transform: rotate(180deg);
}

/* Prompt Dropdown Menu */
.prompt-selector-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 260px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
}

.prompt-selector-menu.hidden {
  display: none;
}

.prompt-menu-header {
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.prompt-list {
  max-height: 300px;
  overflow-y: auto;
}

.prompt-group-label {
  padding: 8px 12px 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prompt-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.prompt-item:hover {
  background: var(--bg-hover);
}

.prompt-item.active {
  background: var(--bg-active);
}

.prompt-item-radio {
  color: var(--accent-primary);
  font-size: 12px;
  margin-top: 2px;
}

.prompt-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.prompt-item-name {
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.prompt-item-desc {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.default-badge {
  font-size: 9px;
  padding: 1px 4px;
  background: var(--accent-primary);
  color: white;
  border-radius: 3px;
  text-transform: uppercase;
}

.builtin-badge {
  font-size: 9px;
  padding: 1px 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 3px;
  text-transform: uppercase;
}

.prompt-menu-divider {
  height: 1px;
  background: var(--border-primary);
  margin: 4px 0;
}

.prompt-menu-actions {
  padding: 4px 0;
}

.prompt-menu-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--transition-fast);
}

.prompt-menu-action:hover {
  background: var(--bg-hover);
}

/* ==================== PROMPT MODAL ==================== */

.prompt-modal {
  width: 560px;
  max-height: 80vh;
}

.prompt-modal .modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prompt-modal .modal-back {
  padding: 4px 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
}

.prompt-modal .modal-back:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.prompt-modal .modal-back.hidden {
  display: none;
}

.prompt-modal .modal-title {
  flex: 1;
}

.prompt-modal-view.hidden {
  display: none;
}

.prompt-footer-view.hidden {
  display: none;
}

/* Prompt List in Modal */
.prompt-modal-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.prompt-list-group-label {
  padding: 8px 0 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-secondary);
  margin-bottom: 4px;
}

.prompt-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color var(--transition-fast);
}

.prompt-list-item:hover {
  background: var(--bg-tertiary);
}

.prompt-list-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.prompt-list-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-list-item-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.prompt-list-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.prompt-list-item:hover .prompt-list-item-actions {
  opacity: 1;
}

.prompt-action-btn {
  padding: 4px 6px;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.7;
  transition: all var(--transition-fast);
}

.prompt-action-btn:hover {
  opacity: 1;
  background: var(--bg-hover);
}

.prompt-add-btn {
  width: 100%;
}

/* Prompt Edit Form */
#prompt-edit-content {
  min-height: 200px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
}

/* ==================== PROMPT CHANGE INDICATOR ==================== */

.prompt-change-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: var(--text-secondary);
  font-size: 11px;
}

.prompt-change-line {
  flex: 1;
  height: 1px;
  background: var(--border-primary);
}

.prompt-change-text {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  white-space: nowrap;
}

Update Renderer
Update src/renderer/renderer.ts

Initialize prompt components:

typescript

/**
 * Add imports
 */
import { PromptSelector } from './components/prompt-selector';
import { PromptModal } from './components/prompt-modal';

/**
 * Add variables
 */
let promptSelector: PromptSelector | null = null;
let promptModal: PromptModal | null = null;

/**
 * Add initialization function
 */
async function initializePrompts(): Promise<void> {
  const selectorContainer = document.getElementById('prompt-selector-container');
  
  if (!selectorContainer) {
    console.error('Prompt selector container not found');
    return;
  }

  // Initialize modal first
  promptModal = new PromptModal({
    onSave: () => {
      promptSelector?.refresh();
    },
    onClose: () => {
      chatContainer?.focus();
    }
  });

  // Initialize selector
  promptSelector = new PromptSelector({
    container: selectorContainer,
    onPromptChange: (promptId, promptName) => {
      chatContainer?.handlePromptChange(promptId, promptName);
    },
    onEditPrompts: () => {
      promptModal?.show();
      }
  });

  await promptSelector.initialize();

  console.log('Prompts initialized');
}

/**
 * Update initializeApp() to include prompts
 */
async function initializeApp(): Promise<void> {
  console.log('Initializing Pi Assistant...');

  initializeLayout();
  initializeTerminal();
  initializeWindowControls();
  setupKeyboardShortcuts();
  initializeServerManagement();
  
  await initializeChat();
  await initializePrompts();  // ADD THIS

  console.log('Pi Assistant initialized successfully');
}

Update HTML
Update src/renderer/index.html

Add prompt selector container in the chat panel header:

html

<!-- Right Panel: AI Chat -->
<section id="chat-panel" class="panel">
  <div class="panel-header">
    <div class="panel-header-left">
      <span class="panel-title">AI Assistant</span>
    </div>
    <div class="panel-header-right">
      <!-- Prompt Selector -->
      <div id="prompt-selector-container"></div>
      <!-- Provider/Model Badge -->
      <span id="model-badge" class="model-badge">Claude</span>
      <!-- Settings Button -->
      <button id="chat-settings-btn" class="header-icon-btn" title="Settings">
        ⚙️
      </button>
    </div>
  </div>
  <!-- Chat container will be populated by JavaScript -->
  <div id="chat-container" class="chat-panel-content"></div>
</section>

Add the stylesheet in the <head>:

html

<head>
    <!-- ... existing stylesheets ... -->
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/layout.css">
    <link rel="stylesheet" href="styles/terminal.css">
    <link rel="stylesheet" href="styles/components.css">
    <link rel="stylesheet" href="styles/chat.css">
    <link rel="stylesheet" href="styles/settings.css">
    <link rel="stylesheet" href="styles/prompts.css">  <!-- ADD THIS -->
</head>

Update Main Process Initialization
Update src/main/main.ts

Update LLMService initialization to include promptStore:

typescript

/**
 * Update initializeStores()
 */
function initializeStores(): void {
  credentialStore = new CredentialStore();
  serverStore = new ServerStore(credentialStore);
  chatStore = new ChatStore();
  settingsStore = new SettingsStore();
  promptStore = new PromptStore();
  
  // Pass promptStore to LLMService
  llmService = new LLMService(credentialStore, promptStore);
  
  console.log('Stores initialized');
  console.log(`Secure storage available: ${credentialStore.isAvailable()}`);
}

Update LLM Providers
Update src/main/llm/providers/anthropic.ts

Update to accept dynamic system prompt:

typescript

/**
 * Remove the static SYSTEM_PROMPT constant and update streamMessage
 */

export class AnthropicProvider extends BaseLLMProvider {
  // ... existing code ...

  /**
   * Stream message to Claude
   */
  async streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string  // Dynamic system prompt
  ): Promise<void> {
    const client = this.getClient();
    
    const formattedMessages = this.formatMessages(messages);

    try {
      const stream = await client.messages.stream({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        system: systemPrompt,  // Use dynamic prompt
        messages: formattedMessages
      });

      // ... rest of existing streaming code ...
    } catch (error: any) {
      // ... existing error handling ...
    }
  }

  // ... rest of existing methods ...
}

Update src/main/llm/providers/openai.ts

typescript

/**
 * Remove the static SYSTEM_PROMPT constant and update streamMessage
 */

export class OpenAIProvider extends BaseLLMProvider {
  // ... existing code ...

  /**
   * Stream message to GPT
   */
  async streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string  // Dynamic system prompt
  ): Promise<void> {
    const client = this.getClient();
    
    const formattedMessages = this.formatMessages(messages, systemPrompt);

    try {
      const stream = await client.chat.completions.create({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        messages: formattedMessages,
        stream: true,
        stream_options: { include_usage: true }
      });

      // ... rest of existing streaming code ...
    } catch (error: any) {
      // ... existing error handling ...
    }
  }

  /**
   * Format messages for OpenAI API
   */
  protected formatMessages(
    messages: LLMMessage[], 
    systemPrompt: string
  ): OpenAI.ChatCompletionMessageParam[] {
    // Add system message at the start
    const formatted: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation messages (skip any existing system messages)
    for (const msg of messages) {
      if (msg.role !== 'system') {
        formatted.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    return formatted;
  }

  // ... rest of existing methods ...
}

Update src/main/llm/providers/moonshot.ts

typescript

/**
 * Remove the static SYSTEM_PROMPT constant and update streamMessage
 */

export class MoonshotProvider extends BaseLLMProvider {
  // ... existing code ...

  /**
   * Stream message to Kimi
   */
  async streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string  // Dynamic system prompt
  ): Promise<void> {
    const client = this.getClient();
    
    const formattedMessages = this.formatMessages(messages, systemPrompt);

    try {
      const stream = await client.chat.completions.create({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        messages: formattedMessages,
        stream: true
      });

      // ... rest of existing streaming code ...
    } catch (error: any) {
      // ... existing error handling ...
    }
  }

  /**
   * Format messages for Moonshot API (OpenAI-compatible)
   */
  protected formatMessages(
    messages: LLMMessage[],
    systemPrompt: string
  ): OpenAI.ChatCompletionMessageParam[] {
    // Add system message at the start
    const formatted: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation messages (skip any existing system messages)
    for (const msg of messages) {
      if (msg.role !== 'system') {
        formatted.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    return formatted;
  }

  // ... rest of existing methods ...
}

Update src/main/llm/types.ts

Update the interface to include system prompt parameter:

typescript

/**
 * Provider interface - all providers must implement this
 */
export interface ILLMProvider {
  readonly provider: LLMProvider;
  readonly displayName: string;

  /**
   * Send a message and get streaming response
   */
  streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string  // ADD THIS
  ): Promise<void>;

  /**
   * Test if API key is valid
   */
  testConnection(apiKey: string): Promise<{ valid: boolean; error?: string }>;

  /**
   * Set the API key
   */
  setAPIKey(apiKey: string): void;

  /**
   * Check if API key is set
   */
  hasAPIKey(): boolean;
}

Update src/main/llm/providers/base-provider.ts

Update abstract method signature:

typescript

export abstract class BaseLLMProvider implements ILLMProvider {
  // ... existing properties ...

  /**
   * Send a message with streaming response
   */
  abstract streamMessage(
    model: string,
    messages: LLMMessage[],
    options: StreamOptions,
    callbacks: StreamCallbacks,
    systemPrompt: string  // ADD THIS
  ): Promise<void>;

  // ... rest of existing methods ...
}

Verification Checklist

After implementing Phase 4A, verify:
Prompt Selector

    Dropdown appears in chat header
    Shows current prompt name
    Lists all prompts (built-in grouped separately)
    Clicking a prompt switches to it
    "Edit Prompts..." button opens modal
    Dropdown closes on outside click or Escape

Prompt Modal - List View

    Shows all prompts with badges (Default, Built-in)
    Built-in and custom prompts grouped separately
    Edit button opens edit view
    Duplicate creates a copy
    Delete removes custom prompts (with confirmation)
    Reset restores built-in prompts to original
    Set as default marks prompt with star
    "Create New Prompt" button works

Prompt Modal - Edit View

    Back button returns to list
    Form shows name, description, content fields
    Validation requires name and content
    Save creates/updates prompt
    Cancel returns to list without saving
    Built-in prompts can be edited

Chat Integration

    Switching prompts shows visual indicator in chat
    LLM uses the selected prompt for responses
    Prompt persists after app restart

Persistence

    Prompts saved to electron-store
    Active prompt ID remembered
    Default prompt setting persists
    Custom prompts survive app restart

Build & Test

powershell

# Rebuild
npm run build

# Test
npm start

Test Scenarios

    First Run:
        Should see 4 built-in prompts
        "Pi Admin Assistant" should be selected and default

    Switch Prompts:
        Select "Command Generator" from dropdown
        Send a message asking "How do I check disk space?"
        Response should be more command-focused

    Create Custom Prompt:
        Click "Edit Prompts..." → "Create New Prompt"
        Enter name: "Friendly Helper"
        Enter content: "You are a friendly, casual assistant. Use simple language and emoji occasionally. Be encouraging!"
        Save and select it
        Send a message - response should match the persona

    Edit Built-in:
        Edit "Pi Admin Assistant"
        Add "Always end responses with a helpful tip."
        Save and test
        Reset to original and verify it's restored

    Visual Indicator:
        Send a few messages with one prompt
        Switch to a different prompt
        Should see "Switched to [prompt name]" indicator in chat

    Persistence:
        Create a custom prompt
        Set it as default
        Close and reopen app
        Custom prompt should still exist and be default

Files Created/Modified Summary
File	Action
src/shared/types.ts	UPDATE - Add prompt types
src/main/store/prompt-store.ts	NEW
src/main/main.ts	UPDATE - Add prompt IPC handlers
src/main/preload.ts	UPDATE - Expose prompt API
src/main/llm/llm-service.ts	UPDATE - Use dynamic prompts
src/main/llm/types.ts	UPDATE - Add systemPrompt parameter
src/main/llm/providers/base-provider.ts	UPDATE - Add systemPrompt parameter
src/main/llm/providers/anthropic.ts	UPDATE - Use dynamic prompt
src/main/llm/providers/openai.ts	UPDATE - Use dynamic prompt
src/main/llm/providers/moonshot.ts	UPDATE - Use dynamic prompt
src/renderer/components/prompt-selector.ts	NEW
src/renderer/components/prompt-modal.ts	NEW
src/renderer/components/chat-container.ts	UPDATE - Handle prompt changes
src/renderer/styles/prompts.css	NEW
src/renderer/index.html	UPDATE - Add prompt selector container
src/renderer/renderer.ts	UPDATE - Initialize prompt components
Next Phase Preview

Phase 5 (Terminal Integration) could include:

    AI can read terminal output
    AI can suggest commands to execute
    AI can execute commands with user approval
    Context variables in prompts (connection info, working directory)
    Terminal history access for troubleshooting

Phase 4B (Enhanced Chat) could include:

    Markdown rendering in messages
    Code syntax highlighting
    Copy code button
    Message editing/regeneration
    Conversation export

text


---

That completes the **Phase 4A Build Plan** for System Prompt Customization. 

**Summary:**
- Dropdown selector in chat header for quick prompt switching
- Full modal for creating, editing, duplicating, and managing prompts
- 4 built-in templates that users can customize or reset
- Visual indicator when switching prompts mid-conversation
- All prompts work with any LLM provider
- Dedicated prompt store for persistence
