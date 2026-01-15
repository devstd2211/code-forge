/**
 * GitCommit Tool - Create git commits with files.
 * Stages files and creates a commit with the provided message.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

const execAsync = promisify(exec);

/**
 * Git commit tool implementation.
 * Creates a git commit with the provided message and files.
 */
export class GitCommit extends BaseTool {
  readonly name = 'git_commit';
  readonly description = 'Create a git commit with staged files';
  readonly inputSchema = {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Commit message'
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files to stage and commit'
      },
      allowEmpty: {
        type: 'boolean',
        description: 'Allow empty commits (default: false)'
      }
    },
    required: ['message', 'files']
  };

  /**
   * Create a git commit with the provided files and message.
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

      const message = input.message as string;
      const files = input.files as string[];
      const allowEmpty = (input.allowEmpty as boolean) || false;

      // Validate that files exist
      const missingFiles: string[] = [];
      for (const file of files) {
        if (!existsSync(file)) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        return {
          success: false,
          data: '',
          error: `Files not found: ${missingFiles.join(', ')}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      try {
        // Stage files
        for (const file of files) {
          await execAsync(`git add "${file}"`, { timeout: 5000 });
        }

        // Create commit
        const commitCommand = `git commit -m "${message.replace(/"/g, '\\"')}"${allowEmpty ? ' --allow-empty' : ''}`;
        const { stdout } = await execAsync(commitCommand, { timeout: 5000 });

        // Extract commit hash from output
        const hashMatch = stdout.match(/\[[\w\s]+\s(\w+)\]/);
        const commitHash = hashMatch ? hashMatch[1] : 'unknown';

        return {
          success: true,
          data: JSON.stringify({
            commitHash,
            filesCommitted: files.length,
            message: message.substring(0, 50)
          }),
          executionTimeMs: Date.now() - startTime
        };
      } catch (error: any) {
        return {
          success: false,
          data: '',
          error: error.message || 'Failed to create commit',
          executionTimeMs: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        data: '',
        error: `Git commit tool error: ${(error as Error).message}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate input parameters.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.message || typeof input.message !== 'string') {
      errors.push('message is required and must be a string');
    }

    if (!input.files || !Array.isArray(input.files) || input.files.length === 0) {
      errors.push('files is required and must be a non-empty array of strings');
    }

    if (input.files && Array.isArray(input.files)) {
      const nonStringFiles = input.files.filter(f => typeof f !== 'string');
      if (nonStringFiles.length > 0) {
        errors.push('All items in files array must be strings');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if input is safe to execute.
   */
  isSafe(input: ToolInput): boolean {
    // Check that files don't escape the project directory
    const files = input.files as string[];
    if (!files) return false;

    for (const file of files) {
      // Basic safety check - no absolute paths outside current directory
      if (file.startsWith('/') || file.startsWith('\\')) {
        return false;
      }
      // No path traversal
      if (file.includes('..')) {
        return false;
      }
    }

    return true;
  }
}
