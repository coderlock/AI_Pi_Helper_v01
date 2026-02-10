/**
 * LLM Service
 * Orchestrates LLM providers and manages requests
 */
import { BrowserWindow } from 'electron';
import { LLMProvider, LLMRequestOptions, ProviderConfig } from '../../shared/types';
import { CredentialStore } from '../store/credential-store';
import { PromptStore } from '../store/prompt-store';
import { AgentExecutor } from '../agent/agent-executor';
import { TerminalContext } from '../agent/types';
export declare class LLMService {
    private providers;
    private activeRequests;
    private credentialStore;
    private promptStore;
    private mainWindow;
    private toolHandler;
    private agentExecutor;
    constructor(credentialStore: CredentialStore, promptStore: PromptStore);
    /**
     * Set the main window for IPC events
     */
    setMainWindow(window: BrowserWindow): void;
    /**
     * Set the agent executor for tool handling
     */
    setAgentExecutor(executor: AgentExecutor): void;
    /**
     * Get terminal context for system prompt enhancement
     */
    getTerminalContext(): TerminalContext | null;
    /**
     * Get the current system prompt
     */
    getSystemPrompt(): string;
    /**
     * Get tools formatted for the current provider
     */
    private getToolsForProvider;
    /**
     * Initialize all providers
     */
    private initializeProviders;
    /**
     * Load API keys from credential store
     */
    private loadAPIKeys;
    /**
     * Get provider configuration for UI
     */
    getProviders(): ProviderConfig[];
    /**
     * Set API key for a provider
     */
    setAPIKey(provider: LLMProvider, apiKey: string): boolean;
    /**
     * Delete API key for a provider
     */
    deleteAPIKey(provider: LLMProvider): boolean;
    /**
     * Check if API key is set for a provider
     */
    hasAPIKey(provider: LLMProvider): boolean;
    /**
     * Test API key validity
     */
    testAPIKey(provider: LLMProvider, apiKey: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Send a message with streaming response
     */
    sendMessage(options: LLMRequestOptions): Promise<string>;
    /**
     * Stream response with tool call handling
     */
    private streamWithTools;
    /**
     * Handle tool calls and continue conversation
     */
    private handleToolCalls;
    /**
     * Cancel an active request
     */
    cancelRequest(requestId: string): void;
    /**
     * Send IPC message to renderer
     */
    private sendToRenderer;
}
//# sourceMappingURL=llm-service.d.ts.map