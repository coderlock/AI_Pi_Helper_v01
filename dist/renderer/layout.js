"use strict";
/**
 * Layout Manager
 * Handles the split-pane layout with draggable resize handle
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutManager = void 0;
const STORAGE_KEY = 'pi-assistant-layout';
const DEFAULT_LEFT_WIDTH_PERCENT = 60;
class LayoutManager {
    constructor(config) {
        this.isDragging = false;
        this.startX = 0;
        this.startLeftWidth = 0;
        this.leftPanel = config.leftPanel;
        this.rightPanel = config.rightPanel;
        this.handle = config.handle;
        this.minPanelWidth = config.minPanelWidth;
        this.onResize = config.onResize;
        // Bind methods once in constructor
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        this.boundWindowResize = this.onWindowResize.bind(this);
    }
    /**
     * Initialize the layout manager
     */
    initialize() {
        this.restoreLayout();
        this.setupEventListeners();
        console.log('Layout manager initialized');
    }
    /**
     * Set up mouse event listeners for drag handling
     */
    setupEventListeners() {
        // Use stored bound references
        this.handle.addEventListener('mousedown', this.boundMouseDown);
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        window.addEventListener('resize', this.boundWindowResize);
        // Double-click to reset to default
        this.handle.addEventListener('dblclick', this.resetLayout.bind(this));
    }
    /**
     * Handle mouse down on resize handle
     */
    onMouseDown(event) {
        event.preventDefault();
        this.isDragging = true;
        this.startX = event.clientX;
        this.startLeftWidth = this.leftPanel.offsetWidth;
        // Add dragging class for visual feedback
        this.handle.classList.add('dragging');
        document.body.classList.add('resize-dragging');
    }
    /**
     * Handle mouse move during drag
     */
    onMouseMove(event) {
        if (!this.isDragging)
            return;
        event.preventDefault();
        const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
        const deltaX = event.clientX - this.startX;
        let newLeftWidth = this.startLeftWidth + deltaX;
        // Enforce minimum widths
        const maxLeftWidth = containerWidth - this.minPanelWidth - this.handle.offsetWidth;
        newLeftWidth = Math.max(this.minPanelWidth, Math.min(newLeftWidth, maxLeftWidth));
        // Apply new width
        this.setLeftPanelWidth(newLeftWidth);
        // Notify listeners
        if (this.onResize) {
            this.onResize();
        }
    }
    /**
     * Handle mouse up to end drag
     */
    onMouseUp() {
        if (!this.isDragging)
            return;
        this.isDragging = false;
        this.handle.classList.remove('dragging');
        document.body.classList.remove('resize-dragging');
        // Save layout
        this.saveLayout();
        // Final resize notification
        if (this.onResize) {
            this.onResize();
        }
    }
    /**
     * Handle window resize
     */
    onWindowResize() {
        // Ensure panels stay within bounds on window resize
        const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
        const currentLeftWidth = this.leftPanel.offsetWidth;
        const maxLeftWidth = containerWidth - this.minPanelWidth - this.handle.offsetWidth;
        if (currentLeftWidth > maxLeftWidth) {
            this.setLeftPanelWidth(maxLeftWidth);
        }
        if (this.onResize) {
            this.onResize();
        }
    }
    /**
     * Set the left panel width in pixels
     */
    setLeftPanelWidth(width) {
        // Use flex shorthand to override all flex properties including flex-basis
        this.leftPanel.style.flex = `0 0 ${width}px`;
    }
    /**
     * Reset layout to default
     */
    resetLayout() {
        const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
        const defaultWidth = (containerWidth * DEFAULT_LEFT_WIDTH_PERCENT) / 100;
        this.setLeftPanelWidth(defaultWidth);
        this.saveLayout();
        if (this.onResize) {
            this.onResize();
        }
        console.log('Layout reset to default');
    }
    /**
     * Save current layout to localStorage
     */
    saveLayout() {
        try {
            const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
            const leftWidthPercent = (this.leftPanel.offsetWidth / containerWidth) * 100;
            const layoutData = {
                leftWidthPercent,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutData));
            console.log(`Layout saved: ${leftWidthPercent.toFixed(1)}%`);
        }
        catch (error) {
            console.error('Failed to save layout:', error);
        }
    }
    /**
     * Restore layout from localStorage
     */
    restoreLayout() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const layoutData = JSON.parse(stored);
                const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
                const leftWidth = (containerWidth * layoutData.leftWidthPercent) / 100;
                // Validate width is reasonable
                if (leftWidth >= this.minPanelWidth && leftWidth <= containerWidth - this.minPanelWidth) {
                    this.setLeftPanelWidth(leftWidth);
                    console.log(`Layout restored: ${layoutData.leftWidthPercent.toFixed(1)}%`);
                    return;
                }
            }
        }
        catch (error) {
            console.error('Failed to restore layout:', error);
        }
        // Use default if restore fails
        this.resetLayout();
    }
    /**
     * Get current layout state
     */
    getLayoutState() {
        const containerWidth = this.leftPanel.parentElement?.offsetWidth || window.innerWidth;
        return {
            leftWidthPercent: (this.leftPanel.offsetWidth / containerWidth) * 100
        };
    }
    /**
     * Cleanup event listeners
     */
    dispose() {
        // Use stored bound references for removal
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('resize', this.boundWindowResize);
        console.log('Layout manager disposed');
    }
}
exports.LayoutManager = LayoutManager;
//# sourceMappingURL=layout.js.map