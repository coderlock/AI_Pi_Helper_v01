/**
 * Server Modal Component
 * Modal dialog for adding and editing server profiles
 */
import { ServerFormData } from '../../shared/types';
export interface ServerModalOptions {
    onSave: (data: ServerFormData, id?: string) => Promise<void>;
    onClose: () => void;
}
export declare class ServerModal {
    private overlay;
    private form;
    private options;
    private mode;
    private editingId;
    private listenersAttached;
    constructor(options: ServerModalOptions);
    /**
     * Create modal HTML
     */
    private createModal;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Handle test connection
     */
    private handleTestConnection;
    /**
     * Handle form submission
     */
    private handleSubmit;
    /**
     * Get form data
     */
    private getFormData;
    /**
     * Show modal for adding new server
     */
    showAdd(): void;
    /**
     * Show modal for editing existing server
     */
    showEdit(serverId: string): Promise<void>;
    /**
     * Hide the modal
     */
    hide(): void;
}
//# sourceMappingURL=server-modal.d.ts.map