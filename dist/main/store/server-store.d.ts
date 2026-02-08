/**
 * Server Store
 * Manages server profiles using electron-store
 * Does NOT store passwords - those go in CredentialStore
 */
import { ServerProfile, ServerFormData, ServerListItem } from '../../shared/types';
import { CredentialStore } from './credential-store';
export declare class ServerStore {
    private store;
    private credentialStore;
    constructor(credentialStore: CredentialStore);
    /**
     * Get all servers as list items (for dropdown display)
     */
    getAll(): ServerListItem[];
    /**
     * Get a single server by ID
     */
    get(id: string): ServerProfile | null;
    /**
     * Create a new server profile
     */
    create(data: ServerFormData): ServerProfile;
    /**
     * Update an existing server profile
     */
    update(id: string, data: Partial<ServerFormData>): ServerProfile | null;
    /**
     * Delete a server profile
     */
    delete(id: string): boolean;
    /**
     * Update last connected timestamp
     */
    updateLastConnected(id: string): void;
    /**
     * Get password for a server (from credential store)
     */
    getPassword(id: string): string | null;
    /**
     * Check if server has stored password
     */
    hasPassword(id: string): boolean;
}
//# sourceMappingURL=server-store.d.ts.map