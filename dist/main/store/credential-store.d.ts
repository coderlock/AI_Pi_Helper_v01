/**
 * Credential Store
 * Securely stores passwords using Electron's safeStorage API
 *
 * On Windows: Uses Windows Credential Manager
 * On macOS: Uses Keychain
 * On Linux: Uses libsecret
 */
export declare class CredentialStore {
    private store;
    constructor();
    /**
     * Check if encryption is available on this system
     */
    isAvailable(): boolean;
    /**
     * Store a password securely
     */
    setPassword(serverId: string, password: string): boolean;
    /**
     * Retrieve a stored password
     */
    getPassword(serverId: string): string | null;
    /**
     * Check if a password exists for a server
     */
    hasPassword(serverId: string): boolean;
    /**
     * Delete a stored password
     */
    deletePassword(serverId: string): boolean;
    /**
     * Clear all stored passwords
     */
    clearAll(): void;
}
//# sourceMappingURL=credential-store.d.ts.map