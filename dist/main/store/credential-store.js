"use strict";
/**
 * Credential Store
 * Securely stores passwords using Electron's safeStorage API
 *
 * On Windows: Uses Windows Credential Manager
 * On macOS: Uses Keychain
 * On Linux: Uses libsecret
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialStore = void 0;
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
class CredentialStore {
    constructor() {
        this.store = new electron_store_1.default({
            name: 'credentials',
            encryptionKey: 'pi-assistant-credentials', // Additional layer
            defaults: {
                credentials: {}
            }
        });
    }
    /**
     * Check if encryption is available on this system
     */
    isAvailable() {
        return electron_1.safeStorage.isEncryptionAvailable();
    }
    /**
     * Store a password securely
     */
    setPassword(serverId, password) {
        if (!this.isAvailable()) {
            console.warn('Secure storage not available - password will not be saved');
            return false;
        }
        try {
            // Encrypt the password
            const encrypted = electron_1.safeStorage.encryptString(password);
            const base64 = encrypted.toString('base64');
            // Store in electron-store
            const credentials = this.store.get('credentials', {});
            credentials[serverId] = base64;
            this.store.set('credentials', credentials);
            console.log(`Password stored for server: ${serverId}`);
            return true;
        }
        catch (error) {
            console.error('Failed to store password:', error);
            return false;
        }
    }
    /**
     * Retrieve a stored password
     */
    getPassword(serverId) {
        if (!this.isAvailable()) {
            return null;
        }
        try {
            const credentials = this.store.get('credentials', {});
            const base64 = credentials[serverId];
            if (!base64) {
                return null;
            }
            // Decrypt the password
            const encrypted = Buffer.from(base64, 'base64');
            const password = electron_1.safeStorage.decryptString(encrypted);
            return password;
        }
        catch (error) {
            console.error('Failed to retrieve password:', error);
            return null;
        }
    }
    /**
     * Check if a password exists for a server
     */
    hasPassword(serverId) {
        const credentials = this.store.get('credentials', {});
        return serverId in credentials;
    }
    /**
     * Delete a stored password
     */
    deletePassword(serverId) {
        try {
            const credentials = this.store.get('credentials', {});
            if (serverId in credentials) {
                delete credentials[serverId];
                this.store.set('credentials', credentials);
                console.log(`Password deleted for server: ${serverId}`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Failed to delete password:', error);
            return false;
        }
    }
    /**
     * Clear all stored passwords
     */
    clearAll() {
        this.store.set('credentials', {});
        console.log('All passwords cleared');
    }
}
exports.CredentialStore = CredentialStore;
//# sourceMappingURL=credential-store.js.map