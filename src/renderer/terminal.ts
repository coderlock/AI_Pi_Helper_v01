/**
 * Terminal Manager
 * Wrapper class for xterm.js with addons and configuration
 */

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

// VS Code Dark+ inspired theme
const TERMINAL_THEME = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: '#3a3d41',
  
  // ANSI Colors
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  
  // Bright ANSI Colors
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff'
};

// Terminal configuration
const TERMINAL_OPTIONS = {
  theme: TERMINAL_THEME,
  fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
  fontSize: 14,
  fontWeight: '400' as const, 
  fontWeightBold: '600' as const,
  lineHeight: 1.2,
  letterSpacing: 0,
  cursorBlink: true,
  cursorStyle: 'block' as const,
  cursorWidth: 1,
  scrollback: 10000,
  tabStopWidth: 4,
  bellStyle: 'none' as const,
  allowProposedApi: true,
  allowTransparency: false,
  convertEol: true,
  scrollOnUserInput: true,
  screenReaderMode: false,
  macOptionIsMeta: false,
  macOptionClickForcesSelection: false,
  minimumContrastRatio: 1,
  drawBoldTextInBrightColors: true
};

export interface TerminalManagerConfig {
  container: HTMLElement;
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

export class TerminalManager {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private webLinksAddon: WebLinksAddon;
  private container: HTMLElement;
  private config: TerminalManagerConfig;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: NodeJS.Timeout | null = null;

  constructor(config: TerminalManagerConfig) {
    this.config = config;
    this.container = config.container;

    // Initialize terminal with options
    this.terminal = new Terminal(TERMINAL_OPTIONS);

    // Initialize addons
    this.fitAddon = new FitAddon();
    this.webLinksAddon = new WebLinksAddon();

    // Load addons
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.webLinksAddon);
  }

  /**
   * Initialize and open the terminal
   */
  initialize(): void {
    // Open terminal in container
    this.terminal.open(this.container);

    // Set up data handler (user input)
    this.terminal.onData((data: string) => {
      this.config.onData(data);
    });

    // Set up resize handler
    this.terminal.onResize(({ cols, rows }) => {
      this.config.onResize(cols, rows);
    });

    // Initial fit
    this.fit();

    // Set up resize observer for container
    this.setupResizeObserver();

    // Focus terminal
    this.focus();

    console.log('Terminal initialized');
  }

  /**
   * Set up ResizeObserver to handle container size changes
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.debouncedFit();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * Debounced fit to prevent excessive resize calls
   */
  private debouncedFit(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.fit();
    }, 50);
  }

  /**
   * Fit terminal to container size
   */
  fit(): void {
    try {
      this.fitAddon.fit();
      const dimensions = this.getDimensions();
      console.log(`Terminal fit to ${dimensions.cols}x${dimensions.rows}`);
    } catch (error) {
      console.error('Failed to fit terminal:', error);
    }
  }

  /**
   * Get current terminal dimensions
   */
  getDimensions(): { cols: number; rows: number } {
    return {
      cols: this.terminal.cols,
      rows: this.terminal.rows
    };
  }

  /**
   * Write data to terminal display
   */
  write(data: string): void {
    this.terminal.write(data);
  }

  /**
   * Write a line to terminal (adds newline)
   */
  writeLine(data: string): void {
    this.terminal.writeln(data);
  }

  /**
   * Clear the terminal
   */
  clear(): void {
    this.terminal.clear();
  }

  /**
   * Focus the terminal
   */
  focus(): void {
    this.terminal.focus();
  }

  /**
   * Blur the terminal
   */
  blur(): void {
    this.terminal.blur();
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    this.terminal.scrollToBottom();
  }

  /**
   * Select all text in terminal
   */
  selectAll(): void {
    this.terminal.selectAll();
  }

  /**
   * Get selected text
   */
  getSelection(): string {
    return this.terminal.getSelection();
  }

  /**
   * Check if terminal has focus
   */
  hasFocus(): boolean {
    return document.activeElement === this.terminal.textarea;
  }

  /**
   * Dispose of terminal and cleanup
   */
  dispose(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.terminal.dispose();
    console.log('Terminal disposed');
  }
}