/**
 * Prompt Modal Component
 * Modal for creating, editing, and managing prompts
 */
export interface PromptModalOptions {
    onSave: () => void;
    onClose: () => void;
}
export declare class PromptModal {
    private overlay;
    private options;
    private currentView;
    private editingPromptId;
    private prompts;
    constructor(options: PromptModalOptions);
    /**
     * Create modal HTML
     */
    private createModal;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Show the modal
     */
    show(): Promise<void>;
    /**
     * Hide the modal
     */
    hide(): void;
    /**
     * Load prompts from store
     */
    private loadPrompts;
    /**
     * Render the prompt list
     */
    private renderPromptList;
    /**
     * Render a prompt list item
     */
    private renderPromptListItem;
    /**
     * Show list view
     */
    private showListView;
    /**
     * Show edit view
     */
    private showEditView;
    /**
     * Handle save
     */
    private handleSave;
    /**
     * Duplicate a prompt
     */
    private duplicatePrompt;
    /**
     * Delete a prompt
     */
    private deletePrompt;
    /**
     * Reset a built-in prompt
     */
    private resetPrompt;
    /**
     * Set a prompt as default
     */
    private setDefaultPrompt;
    /**
     * Escape HTML
     */
    private escapeHtml;
}
//# sourceMappingURL=prompt-modal.d.ts.map