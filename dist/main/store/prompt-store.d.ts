/**
 * Prompt Store
 * Manages system prompt persistence
 */
import { SystemPrompt, PromptFormData, PromptListItem } from '../../shared/types';
export declare class PromptStore {
    private store;
    constructor();
    /**
     * Initialize built-in prompts if they don't exist
     */
    private initializeBuiltInPrompts;
    /**
     * Sanitize and validate prompt name
     */
    private sanitizeName;
    /**
     * Sanitize and validate prompt description
     */
    private sanitizeDescription;
    /**
     * Validate prompt content length
     */
    private validateContent;
    /**
     * Get all prompts as list items
     */
    getAll(): PromptListItem[];
    /**
     * Get a single prompt by ID
     */
    get(id: string): SystemPrompt | null;
    /**
     * Get the currently active prompt
     */
    getActive(): SystemPrompt;
    /**
     * Get active prompt ID
     */
    getActiveId(): string;
    /**
     * Set the active prompt
     */
    setActive(id: string): void;
    /**
     * Create a new prompt
     */
    create(data: PromptFormData): SystemPrompt;
    /**
     * Update an existing prompt
     */
    update(id: string, data: Partial<PromptFormData>): SystemPrompt | null;
    /**
     * Delete a prompt
     */
    delete(id: string): boolean;
    /**
     * Set a prompt as the default (used for new sessions)
     */
    setDefault(id: string): void;
    /**
     * Reset a built-in prompt to its original content
     */
    resetBuiltIn(id: string): SystemPrompt;
    /**
     * Duplicate a prompt
     */
    duplicate(id: string): SystemPrompt;
}
//# sourceMappingURL=prompt-store.d.ts.map