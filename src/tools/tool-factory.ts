/**
 * ToolFactory - Creates tool instances based on configuration.
 */

import type { ITool } from './ITool.js';
import type { ToolConfiguration } from '../types/index.js';
import { FileReader } from './implementations/file-reader.js';
import { FileWriter } from './implementations/file-writer.js';
import { TestRunner } from './implementations/test-runner.js';
import { CodeSearch } from './implementations/code-search.js';
import { GitDiff } from './implementations/git-diff.js';
import { ComplexityAnalyzer } from './implementations/complexity-analyzer.js';
import { ConfigError } from '../types/errors.js';

/**
 * Factory for creating tool instances.
 */
export class ToolFactory {
  /**
   * Create all enabled tools based on configuration.
   */
  static createTools(config: ToolConfiguration): ITool[] {
    const tools: ITool[] = [];

    for (const toolName of config.enabled) {
      const tool = this.createTool(toolName, config);
      if (tool) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Create a single tool by name.
   */
  private static createTool(toolName: string, config: ToolConfiguration): ITool | null {
    switch (toolName) {
      case 'read_file':
        return new FileReader({
          allowedPaths: config.securityRules.allowedPaths,
          forbiddenPaths: config.securityRules.forbiddenPaths,
          maxFileSize: config.securityRules.maxFileSize
        });

      case 'write_file':
        return new FileWriter({
          allowedPaths: config.securityRules.allowedPaths,
          forbiddenPaths: config.securityRules.forbiddenPaths,
          maxFileSize: config.securityRules.maxFileSize
        });

      case 'test_runner':
        return new TestRunner();

      case 'code_search':
        return new CodeSearch();

      case 'git_diff':
        return new GitDiff();

      case 'complexity_analyzer':
        return new ComplexityAnalyzer();

      default:
        throw new ConfigError(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Get list of available tool names.
   */
  static getAvailableTools(): string[] {
    return [
      'read_file',
      'write_file',
      'test_runner',
      'code_search',
      'git_diff',
      'complexity_analyzer'
    ];
  }

  /**
   * Check if a tool is available.
   */
  static isToolAvailable(toolName: string): boolean {
    return this.getAvailableTools().includes(toolName);
  }
}

/**
 * Create tools from configuration.
 */
export function createTools(config: ToolConfiguration): ITool[] {
  return ToolFactory.createTools(config);
}
