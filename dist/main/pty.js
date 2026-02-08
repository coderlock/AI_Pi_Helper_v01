"use strict";
/**
 * PTY Manager
 * Manages the pseudo-terminal process for local shell
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PtyManager = void 0;
const pty = __importStar(require("node-pty"));
const types_1 = require("../shared/types");
const os = __importStar(require("os"));
class PtyManager {
    constructor(window) {
        this.ptyProcess = null;
        this.window = window;
        this.initialize();
    }
    /**
     * Initialize the PTY process
     */
    initialize() {
        // Detect the shell based on the platform
        const shell = this.getDefaultShell();
        const initialCols = 80;
        const initialRows = 24;
        try {
            // Spawn the PTY process
            this.ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols: initialCols,
                rows: initialRows,
                cwd: os.homedir(),
                env: process.env
            });
            // Listen for data from the PTY
            this.ptyProcess.onData((data) => {
                this.window.webContents.send(types_1.IPC_CHANNELS.TERMINAL_DATA, data);
            });
            // Listen for PTY exit
            this.ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`PTY process exited with code ${exitCode} and signal ${signal}`);
                this.ptyProcess = null;
            });
            console.log(`PTY spawned with PID: ${this.ptyProcess.pid}`);
        }
        catch (error) {
            console.error('Failed to spawn PTY:', error);
        }
    }
    /**
     * Get the default shell for the current platform
     */
    getDefaultShell() {
        if (process.platform === 'win32') {
            return 'powershell.exe';
        }
        else {
            return process.env.SHELL || '/bin/bash';
        }
    }
    /**
     * Write data to the PTY process
     */
    write(data) {
        if (this.ptyProcess) {
            this.ptyProcess.write(data);
        }
    }
    /**
     * Resize the PTY process
     */
    resize(cols, rows) {
        if (this.ptyProcess) {
            try {
                this.ptyProcess.resize(cols, rows);
            }
            catch (error) {
                console.error('Failed to resize PTY:', error);
            }
        }
    }
    /**
     * Clean up and dispose the PTY process
     */
    dispose() {
        if (this.ptyProcess) {
            try {
                this.ptyProcess.kill();
            }
            catch (error) {
                console.error('Failed to kill PTY process:', error);
            }
            this.ptyProcess = null;
        }
    }
}
exports.PtyManager = PtyManager;
//# sourceMappingURL=pty.js.map