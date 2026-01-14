/**
 * ToolExecutor - Dispatches and executes tool calls.
 * Routes tool names to implementations, validates input, and handles execution.
 */

import type { ITool } from './ITool.js';
import type { ToolInput, ToolOutput, ToolSecurityRules } from '../types/index.js';
import { ToolValidator } from './validator.js';

/**
 * Executes tool calls by dispatching to the appropriate tool implementation.
 */
export class ToolExecutor {
  private tools: Map<string, ITool>;
  private validator: ToolValidator;
  private timeoutMs: number;

  constructor(tools: ITool[], securityRules: ToolSecurityRules, timeoutMs?: number) {
    this.tools = new Map();
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
    this.validator = new ToolValidator(securityRules);
    this.timeoutMs = timeoutMs || 30000; // 30 second default
  }

  /**
   * Execute a tool call by name.
   */
  async executeTool(toolName: string, input: ToolInput): Promise<ToolOutput> {
    try {
      // Check if tool exists
      const tool = this.tools.get(toolName);
      if (!tool) {
        return this.errorOutput(`Tool not found: ${toolName}`);
      }

      // Validate security
      if (!this.validator.isSafe(toolName, input)) {
        return this.errorOutput('Security violation: tool call not allowed');
      }

      // Validate input format
      const validation = tool.validate(input);
      if (!validation.valid) {
        return this.errorOutput(`Invalid input: ${validation.errors.join('; ')}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(tool, input);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.errorOutput(`Tool execution error: ${message}`);
    }
  }

  /**
   * Execute tool with timeout protection.
   */
  private executeWithTimeout(tool: ITool, input: ToolInput): Promise<ToolOutput> {
    return Promise.race([
      tool.execute(input),
      this.createTimeoutPromise()
    ]);
  }

  /**
   * Create a promise that rejects after timeout.
   */
  private createTimeoutPromise(): Promise<ToolOutput> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });
  }

  /**
   * Create error output.
   */
  private errorOutput(message: string): ToolOutput {
    return {
      success: false,
      data: '',
      error: message,
      executionTimeMs: 0
    };
  }

  /**
   * Get list of available tools.
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is available.
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Add a tool to the executor.
   */
  addTool(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Remove a tool from the executor.
   */
  removeTool(toolName: string): void {
    this.tools.delete(toolName);
  }

  /**
   * Get tool metadata.
   */
  getToolMetadata(toolName: string) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return null;
    }

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    };
  }
}

/**
 * Create an executor with standard tools and configuration.
 */
export function createExecutor(
  tools: ITool[],
  securityRules: ToolSecurityRules,
  timeoutMs?: number
): ToolExecutor {
  return new ToolExecutor(tools, securityRules, timeoutMs);
}
