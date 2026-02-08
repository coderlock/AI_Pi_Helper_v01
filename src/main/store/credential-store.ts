/**
 * Credential Store
 * Securely stores passwords using Electron's safeStorage API
 * 
 * On Windows: Uses Windows Credential Manager
 * On macOS: Uses Keychain
 * On Linux: Uses libsecret
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';

interface CredentialData {
  [serverId: string]: string;  // Base64 encoded encrypted password
}

export class CredentialStore {
  private store: Store<{ credentials: CredentialData }>;

  constructor() {
    this.store = new Store<{ credentials: CredentialData }>({
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
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Store a password securely
   */
  setPassword(serverId: string, password: string): boolean {
    if (!this.isAvailable()) {
      console.warn('Secure storage not available - password will not be saved');
      return false;
    }

    try {
      // Encrypt the password
      const encrypted = safeStorage.encryptString(password);
      const base64 = encrypted.toString('base64');

      // Store in electron-store
      const credentials = this.store.get('credentials', {});
      credentials[serverId] = base64;
      this.store.set('credentials', credentials);

      console.log(`Password stored for server: ${serverId}`);
      return true;
    } catch (error) {
      console.error('Failed to store password:', error);
      return false;
    }
  }

  /**
   * Retrieve a stored password
   */
  getPassword(serverId: string): string | null {
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
      const password = safeStorage.decryptString(encrypted);

      return password;
    } catch (error) {
      console.error('Failed to retrieve password:', error);
      return null;
    }
  }

  /**
   * Check if a password exists for a server
   */
  hasPassword(serverId: string): boolean {
    const credentials = this.store.get('credentials', {});
    return serverId in credentials;
  }

  /**
   * Delete a stored password
   */
  deletePassword(serverId: string): boolean {
    try {
      const credentials = this.store.get('credentials', {});
      
      if (serverId in credentials) {
        delete credentials[serverId];
        this.store.set('credentials', credentials);
        console.log(`Password deleted for server: ${serverId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete password:', error);
      return false;
    }
  }

  /**
   * Clear all stored passwords
   */
  clearAll(): void {
    this.store.set('credentials', {});
    console.log('All passwords cleared');
  }
}
