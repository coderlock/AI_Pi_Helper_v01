/**
 * Chat Message Component
 * Renders a single chat message bubble
 */
import { ChatMessage } from '../../shared/types';
export interface ChatMessageOptions {
    message: ChatMessage;
    onCopy?: (content: string) => void;
}
export declare class ChatMessageComponent {
    private element;
    private message;
    constructor(options: ChatMessageOptions);
    /**
     * Render the message element
     */
    private render;
    /**
     * Get avatar icon based on role
     */
    private getAvatarIcon;
    /**
     * Get display label for role
     */
    private getRoleLabel;
    /**
     * Get provider label for assistant messages
     */
    private getProviderLabel;
    /**
     * Format timestamp for display
     */
    private formatTimestamp;
    /**
     * Get the DOM element
     */
    getElement(): HTMLElement;
    /**
     * Update message content (for streaming responses in Phase 4)
     */
    updateContent(content: string): void;
}
//# sourceMappingURL=chat-message.d.ts.map