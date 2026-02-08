"use strict";
/**
 * Server Dropdown Component
 * Displays list of saved servers with quick actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerDropdown = void 0;
class ServerDropdown {
    constructor(options) {
        this.isOpen = false;
        this.servers = [];
        this.status = 'disconnected';
        this.connectedServer = null;
        this.container = options.container;
        this.options = options;
    }
    /**
     * Initialize the dropdown
     */
    initialize() {
        this.render();
        this.attachEventListeners();
        this.refreshServers();
        console.log('Server dropdown initialized');
    }
    /**
     * Render the dropdown HTML
     */
    render() {
        this.container.innerHTML = `
      <div class="server-dropdown">
        <button class="server-dropdown-button" id="server-dropdown-btn">
          <span class="status-dot disconnected"></span>
          <span class="dropdown-label">Local</span>
          <span class="dropdown-arrow">▾</span>
        </button>
        <div class="server-dropdown-menu hidden" id="server-dropdown-menu">
          <div class="menu-section">
            <div class="menu-item" data-action="local">
              <span class="status-dot local"></span>
              <span class="menu-item-label">Local Terminal</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-section" id="servers-section">
            <div class="menu-section-label">Saved Servers</div>
            <div id="servers-list">
              <div class="menu-empty">No saved servers</div>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-section">
            <div class="menu-item" data-action="quick-connect">
              <span class="menu-icon">⚡</span>
              <span class="menu-item-label">Quick Connect...</span>
            </div>
            <div class="menu-item" data-action="add-server">
              <span class="menu-icon">+</span>
              <span class="menu-item-label">Add Server...</span>
            </div>
          </div>
          
          <div class="menu-divider disconnect-section hidden"></div>
          
          <div class="menu-section disconnect-section hidden">
            <div class="menu-item disconnect" data-action="disconnect">
              <span class="menu-icon">⏏</span>
              <span class="menu-item-label">Disconnect</span>
            </div>
          </div>
        </div>
      </div>
    `;
        this.button = this.container.querySelector('#server-dropdown-btn');
        this.menu = this.container.querySelector('#server-dropdown-menu');
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Toggle dropdown on button click
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        // Handle menu item clicks
        this.menu.addEventListener('click', (e) => {
            const target = e.target;
            const menuItem = target.closest('.menu-item');
            if (!menuItem)
                return;
            const action = menuItem.dataset.action;
            const serverId = menuItem.dataset.serverId;
            if (action === 'local') {
                this.options.onLocalTerminal();
                this.close();
            }
            else if (action === 'quick-connect') {
                this.options.onQuickConnect();
                this.close();
            }
            else if (action === 'add-server') {
                this.options.onAddServer();
                this.close();
            }
            else if (action === 'disconnect') {
                this.options.onDisconnect();
                this.close();
            }
            else if (serverId) {
                // Check for edit/delete buttons
                if (target.closest('.server-edit-btn')) {
                    this.options.onEditServer(serverId);
                    this.close();
                }
                else if (target.closest('.server-delete-btn')) {
                    if (confirm('Delete this server?')) {
                        this.options.onDeleteServer(serverId);
                    }
                }
                else {
                    // Connect to server
                    this.options.onSelectServer(serverId);
                    this.close();
                }
            }
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    /**
     * Refresh server list from main process
     */
    async refreshServers() {
        try {
            this.servers = await window.electronAPI.getServers();
            this.renderServerList();
        }
        catch (error) {
            console.error('Failed to refresh servers:', error);
        }
    }
    /**
     * Render the server list in the menu
     */
    renderServerList() {
        const listContainer = this.menu.querySelector('#servers-list');
        if (this.servers.length === 0) {
            listContainer.innerHTML = '<div class="menu-empty">No saved servers</div>';
            return;
        }
        // Sort by last connected (most recent first), then by name
        const sorted = [...this.servers].sort((a, b) => {
            if (a.lastConnected && b.lastConnected) {
                return b.lastConnected - a.lastConnected;
            }
            if (a.lastConnected)
                return -1;
            if (b.lastConnected)
                return 1;
            return a.name.localeCompare(b.name);
        });
        listContainer.innerHTML = sorted.map(server => {
            const isConnected = this.connectedServer?.id === server.id;
            const hasPassword = server.hasStoredPassword;
            return `
        <div class="menu-item server-item ${isConnected ? 'active' : ''}" 
             data-server-id="${server.id}">
          <span class="status-dot ${isConnected ? 'connected' : 'disconnected'}"></span>
          <div class="server-info">
            <span class="server-name">${this.escapeHtml(server.name)}</span>
            <span class="server-host">${server.username}@${server.host}</span>
          </div>
          <div class="server-actions">
            ${!hasPassword ? '<span class="no-password-icon" title="Password not saved">🔑</span>' : ''}
            <button class="server-edit-btn" title="Edit">✏️</button>
            <button class="server-delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
      `;
        }).join('');
    }
    /**
     * Update connection status display
     */
    updateStatus(status, server) {
        this.status = status;
        this.connectedServer = server || null;
        const statusDot = this.button.querySelector('.status-dot');
        const label = this.button.querySelector('.dropdown-label');
        // Update status dot
        statusDot.className = 'status-dot ' + status;
        // Update label
        if (status === 'connected' && server) {
            label.textContent = server.name;
        }
        else if (status === 'connecting') {
            label.textContent = 'Connecting...';
        }
        else {
            label.textContent = 'Local';
        }
        // Show/hide disconnect section
        const disconnectSections = this.menu.querySelectorAll('.disconnect-section');
        disconnectSections.forEach(section => {
            section.classList.toggle('hidden', status !== 'connected');
        });
        // Re-render server list to update active state
        this.renderServerList();
    }
    /**
     * Open the dropdown menu
     */
    open() {
        this.isOpen = true;
        this.menu.classList.remove('hidden');
        this.button.classList.add('open');
        this.refreshServers(); // Refresh on open
    }
    /**
     * Close the dropdown menu
     */
    close() {
        this.isOpen = false;
        this.menu.classList.add('hidden');
        this.button.classList.remove('open');
    }
    /**
     * Toggle dropdown open/closed
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        }
        else {
            this.open();
        }
    }
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
exports.ServerDropdown = ServerDropdown;
//# sourceMappingURL=server-dropdown.js.map