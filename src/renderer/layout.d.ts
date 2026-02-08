/**
 * Layout Manager
 * Handles the split-pane layout with draggable resize handle
 */
export interface LayoutManagerConfig {
    leftPanel: HTMLElement;
    rightPanel: HTMLElement;
    handle: HTMLElement;
    minPanelWidth: number;
    onResize?: () => void;
}
export declare class LayoutManager {
    private leftPanel;
    private rightPanel;
    private handle;
    private minPanelWidth;
    private onResize?;
    private isDragging;
    private startX;
    private startLeftWidth;
    constructor(config: LayoutManagerConfig);
    /**
     * Initialize the layout manager
     */
    initialize(): void;
    /**
     * Set up mouse event listeners for drag handling
     */
    private setupEventListeners;
    /**
     * Handle mouse down on resize handle
     */
    private onMouseDown;
    /**
     * Handle mouse move during drag
     */
    private onMouseMove;
    /**
     * Handle mouse up to end drag
     */
    private onMouseUp;
    /**
     * Handle window resize
     */
    private onWindowResize;
    /**
     * Set the left panel width in pixels
     */
    private setLeftPanelWidth;
    /**
     * Reset layout to default
     */
    resetLayout(): void;
    /**
     * Save current layout to localStorage
     */
    saveLayout(): void;
    /**
     * Restore layout from localStorage
     */
    restoreLayout(): void;
    /**
     * Get current layout state
     */
    getLayoutState(): {
        leftWidthPercent: number;
    };
    /**
     * Cleanup event listeners
     */
    dispose(): void;
}
//# sourceMappingURL=layout.d.ts.map