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

export class ChatInput {
  private container: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private onSend: (message: string) => void;
  private _disabled: boolean = false;

  constructor(options: ChatInputOptions) {
    this.container = options.container;
    this.onSend = options.onSend;
    this._disabled = options.disabled || false;
    
    this.render(options.placeholder);
    this.attachEventListeners();
  }

  /**
   * Render the input component
   */
  private render(placeholder?: string): void {
    this.container.innerHTML = `
      <div class="chat-input-wrapper">
        <textarea 
          id="chat-message-input"
          class="chat-textarea"
          placeholder="${placeholder || 'Type a message...'}"
          rows="1"
          ${this._disabled ? 'disabled' : ''}
        ></textarea>
        <button 
          id="chat-send-btn"
          class="chat-send-btn"
          title="Send message (Enter)"
          ${this._disabled ? 'disabled' : ''}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.724 1.053a.5.5 0 0 0-.714.545l1.403 4.85a.5.5 0 0 0 .397.354l5.69.953c.268.053.268.437 0 .49l-5.69.953a.5.5 0 0 0-.397.354l-1.403 4.85a.5.5 0 0 0 .714.545l13-6.5a.5.5 0 0 0 0-.894l-13-6.5z"/>
          </svg>
        </button>
      </div>
    `;

    this.textarea = this.container.querySelector('#chat-message-input')!;
    this.sendButton = this.container.querySelector('#chat-send-btn')!;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Auto-resize textarea
    this.textarea.addEventListener('input', () => {
      this.autoResize();
    });

    // Send on Enter (Shift+Enter for newline)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Send button click
    this.sendButton.addEventListener('click', () => {
      this.handleSend();
    });
  }

  /**
   * Auto-resize textarea based on content
   */
  private autoResize(): void {
    this.textarea.style.height = 'auto';
    const maxHeight = 120; // Max 120px (about 5 lines)
    const newHeight = Math.min(this.textarea.scrollHeight, maxHeight);
    this.textarea.style.height = `${newHeight}px`;
  }

  /**
   * Handle send action
   */
  private handleSend(): void {
    if (this._disabled) return;

    const message = this.textarea.value.trim();
    if (!message) return;

    this.onSend(message);
    this.clear();
  }

  /**
   * Clear input
   */
  clear(): void {
    this.textarea.value = '';
    this.autoResize();
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.textarea.focus();
  }

  /**
   * Blur the input
   */
  blur(): void {
    this.textarea.blur();
  }

  /**
   * Get/set disabled state
   */
  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    this.textarea.disabled = value;
    this.sendButton.disabled = value;
  }

  /**
   * Set placeholder text
   */
  setPlaceholder(text: string): void {
    this.textarea.placeholder = text;
  }

  /**
   * Get current input value
   */
  getValue(): string {
    return this.textarea.value;
  }

  /**
   * Set input value
   */
  setValue(value: string): void {
    this.textarea.value = value;
    this.autoResize();
  }
}
