/**
 * Server Dropdown Component
 * Displays list of saved servers with quick actions
 */
import { ServerListItem } from '../../shared/types';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface ServerDropdownOptions {
    container: HTMLElement;
    onSelectServer: (serverId: string) => void;
    onQuickConnect: () => void;
    onAddServer: () => void;
    onEditServer: (serverId: string) => void;
    onDeleteServer: (serverId: string) => void;
    onDisconnect: () => void;
    onLocalTerminal: () => void;
}
export declare class ServerDropdown {
    private container;
    private options;
    private button;
    private menu;
    private isOpen;
    private servers;
    private status;
    private connectedServer;
    constructor(options: ServerDropdownOptions);
    /**
     * Initialize the dropdown
     */
    initialize(): void;
    /**
     * Render the dropdown HTML
     */
    private render;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Refresh server list from main process
     */
    refreshServers(): Promise<void>;
    /**
     * Render the server list in the menu
     */
    private renderServerList;
    /**
     * Update connection status display
     */
    updateStatus(status: ConnectionStatus, server?: ServerListItem | null): void;
    /**
     * Open the dropdown menu
     */
    open(): void;
    /**
     * Close the dropdown menu
     */
    close(): void;
    /**
     * Toggle dropdown open/closed
     */
    toggle(): void;
    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml;
}
export {};
//# sourceMappingURL=server-dropdown.d.ts.map