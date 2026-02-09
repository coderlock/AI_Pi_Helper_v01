/**
 * Chat Input Component
 * Textarea with send button and keyboard handling
 */
export interface ChatInputOptions {
    container: HTMLElement;
    onSend: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
}
export declare class ChatInput {
    private container;
    private textarea;
    private sendButton;
    private onSend;
    private _disabled;
    constructor(options: ChatInputOptions);
    /**
     * Render the input component
     */
    private render;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Auto-resize textarea based on content
     */
    private autoResize;
    /**
     * Handle send action
     */
    private handleSend;
    /**
     * Clear input
     */
    clear(): void;
    /**
     * Focus the input
     */
    focus(): void;
    /**
     * Blur the input
     */
    blur(): void;
    /**
     * Get/set disabled state
     */
    get disabled(): boolean;
    set disabled(value: boolean);
    /**
     * Set placeholder text
     */
    setPlaceholder(text: string): void;
    /**
     * Get current input value
     */
    getValue(): string;
    /**
     * Set input value
     */
    setValue(value: string): void;
}
//# sourceMappingURL=chat-input.d.ts.map