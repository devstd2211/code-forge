/**
 * CodeSearch Tool - Search for code patterns in source files.
 * Uses regex patterns to find and report code usage.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

/**
 * Code search tool implementation.
 * Searches for patterns in source files and reports matches.
 */
export class CodeSearch extends BaseTool {
  readonly name = 'code_search';
  readonly description = 'Search for code patterns in source files';
  readonly inputSchema = {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regex pattern to search for'
      },
      directory: {
        type: 'string',
        description: 'Directory to search in (e.g., "src", ".")'
      },
      fileExtension: {
        type: 'string',
        description: 'File extension to search (e.g., "ts", "js")'
      }
    },
    required: ['pattern', 'directory']
  };

  /**
   * Search for code patterns in the specified directory.
   */
  async execute(input: ToolInput): Promise<ToolOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.valid) {
        return {
          success: false,
          data: '',
          error: `Invalid input: ${validation.errors.join('; ')}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      const pattern = input.pattern as string;
      const directory = input.directory as string;
      const fileExtension = (input.fileExtension || 'ts') as string;

      // Build regex
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, 'g');
      } catch (error) {
        return {
          success: false,
          data: '',
          error: `Invalid regex pattern: ${(error as Error).message}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Search files
      const results = this.searchDirectory(directory, regex, fileExtension);

      if (results.length === 0) {
        return {
          success: true,
          data: `No matches found for pattern: ${pattern}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Format results
      const output = results
        .slice(0, 50) // Limit to 50 results
        .map(r => `${r.file}:${r.line}: ${r.text.trim()}`)
        .join('\n');

      return {
        success: true,
        data: `Found ${results.length} match(es):\n${output}`,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        data: '',
        error: `Search error: ${(error as Error).message}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate input parameters.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.pattern || typeof input.pattern !== 'string') {
      errors.push('pattern is required and must be a string');
    }

    if (!input.directory || typeof input.directory !== 'string') {
      errors.push('directory is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if input is safe to execute.
   */
  isSafe(_input: ToolInput): boolean {
    // Search tool is safe - just reading files, no path traversal concerns
    return true;
  }

  /**
   * Recursively search directory for pattern matches.
   */
  private searchDirectory(
    dir: string,
    pattern: RegExp,
    extension: string
  ): Array<{ file: string; line: number; text: string }> {
    const results: Array<{ file: string; line: number; text: string }> = [];

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        if (file.startsWith('.')) continue;

        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Recursively search subdirectories
          results.push(...this.searchDirectory(filePath, pattern, extension));
        } else if (file.endsWith(`.${extension}`) || file.endsWith(extension)) {
          // Search file contents
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
              if (pattern.test(line)) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  text: line
                });
              }
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Return partial results if directory read fails
    }

    return results;
  }
}
