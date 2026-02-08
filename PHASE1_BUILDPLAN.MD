## Environment Setup

Part 1: Development Environment Setup

Follow these steps before starting the vibe coding session:
Step 1: Install Node.js

    Go to https://nodejs.org/
    Download the LTS version (20.x or newer)
    Run the installer with default settings
    Verify installation by opening a new terminal:

    bash

    node --version
    npm --version

Step 2: Install Git

Step 3: Install VS Code Extensions

    Open VS Code and install these extensions (Ctrl+Shift+X):
    Extension	ID	Purpose
    ESLint	dbaeumer.vscode-eslint	Code linting
    Prettier	esbenp.prettier-vscode	Code formatting
    TypeScript	Built-in	Type checking
    npm Intellisense	christian-kohler.npm-intellisense	Auto-complete imports

Step 4: Create Project Directory


    # Open terminal (PowerShell or CMD)
    mkdir C:\Users\mike_\OneDrive\Documents\AI_pi_helper
    cd C:\Users\mike_\OneDrive\Documents\AI_pi_helper

    # Open in VS Code
    code .

    Step 5: Initialize the Project

    In the VS Code integrated terminal (Ctrl+`):

    bash

    # Initialize npm project
    npm init -y

    # Install Electron and build tools
    npm install electron --save-dev
    npm install typescript --save-dev
    npm install ts-node --save-dev
    npm install electron-builder --save-dev

    # Install xterm.js for terminal emulation
    npm install xterm
    npm install xterm-addon-fit
    npm install xterm-addon-web-links

    # Install additional dependencies
    npm install electron-store

    # Initialize TypeScript
    npx tsc --init

Step 6: Verify Setup

    Your package.json should now have dependencies. Check that node_modules folder exists.


## Part 2: Build Plan Markdown for Sonnet 4.5

Save the following as PHASE1_BUILD_PLAN.md in your project root, then use it as context for your vibe coding session:

markdown

# Pi Assistant - Phase 1 Build Plan
## Electron App with xterm.js Terminal

### Project Overview

Build a Windows desktop application using Electron that displays a functional terminal emulator. This is the foundation for a Raspberry Pi SSH management tool with AI assistance.

### Target Outcome

A working Electron app with:
- Split-pane layout (terminal left, placeholder chat panel right)
- Functional xterm.js terminal with local shell (PowerShell on Windows)
- Resizable panels
- Dark theme matching VS Code aesthetics
- Window controls (minimize, maximize, close)
- Proper TypeScript throughout

---

### Tech Stack

|
 Component 
|
 Technology 
|
 Version 
|

|
-----------
|
------------
|
---------
|

|
 Runtime 
|
 Electron 
|
 ^28.0.0 
|

|
 Language 
|
 TypeScript 
|
 ^5.3.0 
|

|
 Terminal 
|
 xterm.js 
|
 ^5.3.0 
|

|
 Styling 
|
 Plain CSS 
|
 - 
|

|
 Build 
|
 electron-builder 
|
 ^24.0.0 
|


---

### Project Structure

Create this exact file structure:

pi-assistant/
├── src/
│ ├── main/
│ │ ├── main.ts # Electron main process
│ │ ├── preload.ts # Preload script for IPC
│ │ └── pty.ts # Terminal process handler
│ ├── renderer/
│ │ ├── index.html # Main HTML file
│ │ ├── renderer.ts # Renderer process entry
│ │ ├── terminal.ts # xterm.js wrapper class
│ │ ├── layout.ts # Split pane layout manager
│ │ └── styles/
│ │ ├── main.css # Global styles
│ │ ├── terminal.css # Terminal-specific styles
│ │ └── layout.css # Layout/panel styles
│ └── shared/
│ └── types.ts # Shared TypeScript interfaces
├── package.json
├── tsconfig.json
├── electron-builder.json
└── README.md

text


---

### File Specifications

#### 1. package.json

```json
{
  "name": "pi-assistant",
  "version": "0.1.0",
  "description": "AI-powered Raspberry Pi SSH management tool",
  "main": "dist/main/main.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "start": "npm run build && electron .",
    "dev": "concurrently \"npm run watch\" \"electron .\"",
    "dist": "electron-builder"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "typescript": "^5.3.3",
    "concurrently": "^8.2.2",
    "@types/node": "^20.10.0"
  },
  "dependencies": {
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0",
    "node-pty": "^1.0.0",
    "electron-store": "^8.1.0"
  }
}

2. tsconfig.json

json

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

Detailed Component Specifications
Main Process (src/main/main.ts)

Purpose: Electron main process - creates windows, handles system-level events

Requirements:

    Create a BrowserWindow with these settings:
        Width: 1400px, Height: 900px
        Minimum width: 800px, minimum height: 600px
        Frame: false (custom title bar)
        Background color: #1e1e1e
        webPreferences:
            preload script enabled
            nodeIntegration: false
            contextIsolation: true
    Load the renderer index.html
    Handle window control IPC events (minimize, maximize, close)
    Initialize node-pty for terminal process
    Handle IPC for terminal data (bidirectional)

IPC Channels to implement:
Channel	Direction	Purpose
terminal:data	main→renderer	Send terminal output to xterm
terminal:input	renderer→main	Send keystrokes to pty
terminal:resize	renderer→main	Handle terminal resize
window:minimize	renderer→main	Minimize window
window:maximize	renderer→main	Toggle maximize
window:close	renderer→main	Close application
Preload Script (src/main/preload.ts)

Purpose: Secure bridge between main and renderer processes

Requirements:

    Use contextBridge to expose limited API
    Expose these methods to renderer:

    typescript

    interface ElectronAPI {
      // Terminal
      sendTerminalInput: (data: string) => void;
      onTerminalData: (callback: (data: string) => void) => void;
      resizeTerminal: (cols: number, rows: number) => void;
      
      // Window controls
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      
      // Utility
      getPlatform: () => string;
    }

PTY Handler (src/main/pty.ts)

Purpose: Manage the pseudo-terminal process

Requirements:

    Create a class PtyManager that:
        Spawns PowerShell on Windows (or bash on Linux/Mac)
        Handles data events and forwards to renderer
        Handles resize events
        Properly disposes on close
    Initial terminal size: 80 cols × 24 rows
    Shell detection:

    typescript

    const shell = process.platform === 'win32' 
      ? 'powershell.exe' 
      : process.env.SHELL || '/bin/bash';

Renderer HTML (src/renderer/index.html)

Purpose: Main application HTML structure

Structure:

html

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <title>Pi Assistant</title>
    <!-- Link CSS files -->
</head>
<body>
    <!-- Custom title bar -->
    <div id="titlebar">
        <div class="titlebar-drag-region">
            <span class="title">Pi Assistant</span>
        </div>
        <div class="titlebar-controls">
            <button id="minimize-btn">─</button>
            <button id="maximize-btn">□</button>
            <button id="close-btn">✕</button>
        </div>
    </div>
    
    <!-- Main content area -->
    <div id="main-container">
        <!-- Left panel: Terminal -->
        <div id="terminal-panel" class="panel">
            <div class="panel-header">
                <span>Terminal</span>
                <span class="connection-status disconnected">Local</span>
            </div>
            <div id="terminal-container"></div>
        </div>
        
        <!-- Resize handle -->
        <div id="resize-handle"></div>
        
        <!-- Right panel: Chat (placeholder for Phase 1) -->
        <div id="chat-panel" class="panel">
            <div class="panel-header">
                <span>AI Assistant</span>
            </div>
            <div id="chat-container">
                <div class="placeholder-message">
                    AI chat will be implemented in Phase 4
                </div>
            </div>
        </div>
    </div>
    
    <!-- Load scripts -->
</body>
</html>

Terminal Wrapper (src/renderer/terminal.ts)

Purpose: Wrapper class for xterm.js with addons

Class: TerminalManager

typescript

interface TerminalConfig {
  container: HTMLElement;
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

class TerminalManager {
  // Properties
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private webLinksAddon: WebLinksAddon;
  
  // Methods
  constructor(config: TerminalConfig);
  initialize(): void;           // Create and open terminal
  fit(): void;                  // Fit terminal to container
  write(data: string): void;    // Write data to terminal
  focus(): void;                // Focus the terminal
  dispose(): void;              // Clean up
}

Terminal Theme (VS Code Dark inspired):

typescript

const terminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e',
  selection: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff'
};

Terminal Options:

typescript

const terminalOptions = {
  theme: terminalTheme,
  fontFamily: 'Consolas, "Courier New", monospace',
  fontSize: 14,
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 10000,
  tabStopWidth: 4
};

Layout Manager (src/renderer/layout.ts)

Purpose: Handle split-pane resizing

Requirements:

    Make the resize handle draggable
    Minimum panel width: 200px
    Save panel sizes to localStorage
    Restore sizes on load
    Handle window resize events (refit terminal)

Class: LayoutManager

typescript

class LayoutManager {
  constructor(
    leftPanel: HTMLElement,
    rightPanel: HTMLElement,
    handle: HTMLElement
  );
  
  initialize(): void;
  saveLayout(): void;
  restoreLayout(): void;
}

Renderer Entry (src/renderer/renderer.ts)

Purpose: Initialize all renderer components

Flow:

    Wait for DOMContentLoaded
    Initialize LayoutManager
    Initialize TerminalManager
    Connect terminal events to Electron IPC
    Set up window control button handlers
    Handle window resize → terminal fit

CSS Specifications
main.css

css

/* Variables */
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --text-primary: #d4d4d4;
  --text-secondary: #858585;
  --accent: #007acc;
  --border: #3c3c3c;
  --titlebar-height: 32px;
}

/* Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
}

Titlebar Styles

    Height: 32px
    Draggable region for window movement
    Buttons: 46px width, hover states
    Close button: red hover (#e81123)

Panel Styles

    Panel headers: 35px height, border-bottom
    Smooth resize transitions
    Proper scrolling behavior

Acceptance Criteria

Phase 1 is complete when:

    App launches without errors
    Window has custom titlebar with working controls
    Terminal displays and accepts input
    PowerShell commands execute and show output
    Panels can be resized by dragging the handle
    Panel sizes persist after restart
    Terminal refits properly on window resize
    No console errors in DevTools
    All TypeScript compiles without errors

Testing Commands

After build, test these in the terminal:

powershell

# Test basic output
echo "Hello, Pi Assistant!"

# Test colors
Write-Host "Red" -ForegroundColor Red
Write-Host "Green" -ForegroundColor Green

# Test scrollback
Get-Process

# Test interactive
Read-Host "Enter your name"

Known Issues to Handle

    node-pty native module: May need rebuilding for Electron

    bash

    npm install electron-rebuild --save-dev
    npx electron-rebuild

    Windows path with spaces: Ensure shell path is quoted

    Terminal resize race condition: Debounce resize events

Next Phase Preview

Phase 2 will add:

    SSH connection dialog
    SSH key management
    Connection to Raspberry Pi
    Multiple terminal sessions

This context helps Sonnet understand the project trajectory.

text


---

## Part 3: Starting the Vibe Coding Session

### In VS Code:

1. **Open the Copilot/Claude chat panel** (or your AI coding extension)

2. **Provide initial context:**

I'm building a desktop app called Pi Assistant. Please read the
PHASE1_BUILD_PLAN.md file in my project root for full specifications.

Let's start by creating the main Electron entry point (src/main/main.ts).
Follow the specs exactly.

text


3. **Work through files systematically:**
- main.ts → preload.ts → pty.ts
- Then renderer files
- CSS last

4. **After each file, test:**
```bash
npm run build
npm start

Quick Commands Reference
Command	Purpose
npm run build	Compile TypeScript
npm start	Build and launch app
npm run dev	Watch mode (auto-rebuild)
Ctrl+Shift+I	Open DevTools in Electron
Ctrl+R	Reload Electron window