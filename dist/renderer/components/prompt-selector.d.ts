/**
 * Prompt Selector Component
 * Dropdown for selecting and managing system prompts
 */
export interface PromptSelectorOptions {
    container: HTMLElement;
    onPromptChange: (promptId: string, promptName: string) => void;
    onEditPrompts: () => void;
}
export declare class PromptSelector {
    private container;
    private options;
    private button;
    private menu;
    private isOpen;
    private prompts;
    private activePromptId;
    private activePromptName;
    constructor(options: PromptSelectorOptions);
    /**
     * Initialize the selector
     */
    initialize(): Promise<void>;
    /**
     * Render the dropdown HTML
     */
    private render;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Refresh prompts from store
     */
    refresh(): Promise<void>;
    /**
     * Update button display
     */
    private updateButton;
    /**
     * Render the prompt list
     */
    private renderPromptList;
    /**
     * Render a single prompt item
     */
    private renderPromptItem;
    /**
     * Select a prompt
     */
    private selectPrompt;
    /**
     * Open dropdown
     */
    open(): void;
    /**
     * Close dropdown
     */
    close(): void;
    /**
     * Toggle dropdown
     */
    toggle(): void;
    /**
     * Get current active prompt info
     */
    getActivePrompt(): {
        id: string;
        name: string;
    };
    /**
     * Escape HTML
     */
    private escapeHtml;
}
//# sourceMappingURL=prompt-selector.d.ts.map