"use strict";
/**
 * Server Store
 * Manages server profiles using electron-store
 * Does NOT store passwords - those go in CredentialStore
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerStore = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const uuid_1 = require("uuid");
class ServerStore {
    constructor(credentialStore) {
        this.credentialStore = credentialStore;
        this.store = new electron_store_1.default({
            name: 'servers',
            defaults: {
                servers: []
            }
        });
    }
    /**
     * Get all servers as list items (for dropdown display)
     */
    getAll() {
        const servers = this.store.get('servers', []);
        return servers.map(server => ({
            id: server.id,
            name: server.name,
            description: server.description,
            host: server.host,
            username: server.username,
            lastConnected: server.lastConnected,
            hasStoredPassword: this.credentialStore.hasPassword(server.id)
        }));
    }
    /**
     * Get a single server by ID
     */
    get(id) {
        const servers = this.store.get('servers', []);
        return servers.find(s => s.id === id) || null;
    }
    /**
     * Create a new server profile
     */
    create(data) {
        const now = Date.now();
        const server = {
            id: (0, uuid_1.v4)(),
            name: data.name.trim(),
            description: data.description?.trim() || '',
            host: data.host.trim(),
            port: data.port || 22,
            username: data.username.trim(),
            authMethod: data.authMethod || 'password',
            privateKeyPath: data.privateKeyPath,
            saveCredentials: data.saveCredentials,
            lastConnected: null,
            createdAt: now,
            updatedAt: now
        };
        // Save password if provided and user wants to save it
        if (data.password && data.saveCredentials) {
            this.credentialStore.setPassword(server.id, data.password);
        }
        // Add to store
        const servers = this.store.get('servers', []);
        servers.push(server);
        this.store.set('servers', servers);
        console.log(`Server created: ${server.name} (${server.id})`);
        return server;
    }
    /**
     * Update an existing server profile
     */
    update(id, data) {
        const servers = this.store.get('servers', []);
        const index = servers.findIndex(s => s.id === id);
        if (index === -1) {
            return null;
        }
        // Update fields
        const server = servers[index];
        if (data.name !== undefined)
            server.name = data.name.trim();
        if (data.description !== undefined)
            server.description = data.description.trim();
        if (data.host !== undefined)
            server.host = data.host.trim();
        if (data.port !== undefined)
            server.port = data.port;
        if (data.username !== undefined)
            server.username = data.username.trim();
        if (data.authMethod !== undefined)
            server.authMethod = data.authMethod;
        if (data.privateKeyPath !== undefined)
            server.privateKeyPath = data.privateKeyPath;
        if (data.saveCredentials !== undefined)
            server.saveCredentials = data.saveCredentials;
        server.updatedAt = Date.now();
        // Update password if provided
        if (data.password) {
            if (data.saveCredentials) {
                this.credentialStore.setPassword(id, data.password);
            }
            else {
                // User unchecked "save password" - delete stored password
                this.credentialStore.deletePassword(id);
            }
        }
        else if (data.saveCredentials === false) {
            // User unchecked "save password" without providing new password
            this.credentialStore.deletePassword(id);
        }
        // Save to store
        servers[index] = server;
        this.store.set('servers', servers);
        console.log(`Server updated: ${server.name} (${server.id})`);
        return server;
    }
    /**
     * Delete a server profile
     */
    delete(id) {
        const servers = this.store.get('servers', []);
        const index = servers.findIndex(s => s.id === id);
        if (index === -1) {
            return false;
        }
        const server = servers[index];
        // Delete stored password
        this.credentialStore.deletePassword(id);
        // Remove from store
        servers.splice(index, 1);
        this.store.set('servers', servers);
        console.log(`Server deleted: ${server.name} (${id})`);
        return true;
    }
    /**
     * Update last connected timestamp
     */
    updateLastConnected(id) {
        const servers = this.store.get('servers', []);
        const index = servers.findIndex(s => s.id === id);
        if (index !== -1) {
            servers[index].lastConnected = Date.now();
            this.store.set('servers', servers);
        }
    }
    /**
     * Get password for a server (from credential store)
     */
    getPassword(id) {
        return this.credentialStore.getPassword(id);
    }
    /**
     * Check if server has stored password
     */
    hasPassword(id) {
        return this.credentialStore.hasPassword(id);
    }
}
exports.ServerStore = ServerStore;
//# sourceMappingURL=server-store.js.map