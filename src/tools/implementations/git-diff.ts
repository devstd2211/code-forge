/**
 * GitDiff Tool - Get git diff for code components.
 * Shows recent changes to a file or directory.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

const execAsync = promisify(exec);

/**
 * Git diff tool implementation.
 * Shows git diff for a component to understand recent changes.
 */
export class GitDiff extends BaseTool {
  readonly name = 'git_diff';
  readonly description = 'Get git diff for a file or component';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File or directory path to get diff for'
      },
      staged: {
        type: 'boolean',
        description: 'Show staged changes only (default: false)'
      },
      commits: {
        type: 'number',
        description: 'Number of commits to show history for (default: 1)'
      }
    },
    required: ['path']
  };

  /**
   * Get git diff for a file or component.
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

      const path = input.path as string;
      const staged = input.staged as boolean | undefined;
      const commits = (input.commits || 1) as number;

      // Build git command
      let command: string;

      if (staged) {
        command = `git diff --cached "${path}"`;
      } else if (commits > 1) {
        command = `git log -p -${commits} --follow -- "${path}"`;
      } else {
        command = `git diff HEAD~1..HEAD -- "${path}"`;
      }

      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

        const output = stdout || stderr || 'No changes found';

        return {
          success: true,
          data: output,
          executionTimeMs: Date.now() - startTime
        };
      } catch (error: any) {
        // Git command may fail if file is untracked or repo doesn't exist
        return {
          success: false,
          data: '',
          error: error.message || 'Failed to get git diff',
          executionTimeMs: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        data: '',
        error: `Git tool error: ${(error as Error).message}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate input parameters.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.path || typeof input.path !== 'string') {
      errors.push('path is required and must be a string');
    }

    if (input.commits && (typeof input.commits !== 'number' || input.commits < 1)) {
      errors.push('commits must be a positive number');
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
    // Git diff tool is safe - just running git commands
    return true;
  }
}
