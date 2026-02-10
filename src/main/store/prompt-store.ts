/**
 * Prompt Store
 * Manages system prompt persistence
 */

import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { SystemPrompt, PromptFormData, PromptListItem } from '../../shared/types';

// Constants
const MAX_PROMPT_CONTENT_LENGTH = 8000;
const MAX_PROMPT_NAME_LENGTH = 50;
const MAX_PROMPT_DESCRIPTION_LENGTH = 100;

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
   * Sanitize and validate prompt name
   */
  private sanitizeName(name: string): string {
    return name.trim().substring(0, MAX_PROMPT_NAME_LENGTH);
  }

  /**
   * Sanitize and validate prompt description
   */
  private sanitizeDescription(description?: string): string | undefined {
    if (!description) return undefined;
    const trimmed = description.trim();
    if (!trimmed) return undefined;
    return trimmed.substring(0, MAX_PROMPT_DESCRIPTION_LENGTH);
  }

  /**
   * Validate prompt content length
   */
  private validateContent(content: string): void {
    if (content.length > MAX_PROMPT_CONTENT_LENGTH) {
      throw new Error(`Prompt content exceeds maximum length of ${MAX_PROMPT_CONTENT_LENGTH} characters`);
    }
    if (content.trim().length === 0) {
      throw new Error('Prompt content cannot be empty');
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
    // Validate and sanitize
    const name = this.sanitizeName(data.name);
    if (!name) {
      throw new Error('Prompt name is required');
    }

    this.validateContent(data.content);

    const now = Date.now();
    
    const prompt: SystemPrompt = {
      id: uuidv4(),
      name,
      content: data.content,
      description: this.sanitizeDescription(data.description),
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

    // Update fields with validation
    if (data.name !== undefined) {
      const sanitizedName = this.sanitizeName(data.name);
      if (!sanitizedName) {
        throw new Error('Prompt name cannot be empty');
      }
      prompt.name = sanitizedName;
    }

    if (data.content !== undefined) {
      this.validateContent(data.content);
      prompt.content = data.content;
    }

    if (data.description !== undefined) {
      prompt.description = this.sanitizeDescription(data.description);
    }
    
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

    // Prevent deleting built-in prompts
    if (prompt.isBuiltIn) {
      throw new Error('Cannot delete built-in prompts. Use reset instead.');
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
    
    // Verify prompt exists
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) {
      throw new Error('Prompt not found');
    }
    
    // Clear existing default and set new one
    prompts.forEach(p => {
      p.isDefault = p.id === id;
    });
    
    this.store.set('prompts', prompts);
    console.log(`Default prompt set: ${prompt.name}`);
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
