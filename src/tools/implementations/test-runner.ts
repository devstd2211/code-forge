/**
 * TestRunner Tool - Execute tests for code components.
 * Runs test suites and reports results.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

const execAsync = promisify(exec);

/**
 * Test runner tool implementation.
 * Executes tests for a given component and reports results.
 */
export class TestRunner extends BaseTool {
  readonly name = 'test_runner';
  readonly description = 'Execute tests for a component and report results';
  readonly inputSchema = {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Test file pattern (e.g., "*.test.ts" or specific test file)'
      },
      framework: {
        type: 'string',
        enum: ['jest', 'mocha', 'vitest'],
        description: 'Test framework to use'
      }
    },
    required: ['pattern']
  };

  /**
   * Execute tests matching the pattern.
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
      const framework = (input.framework || 'jest') as string;

      // Build test command
      const command = this.buildTestCommand(pattern, framework);

      // Execute tests with timeout (30 seconds)
      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

        const result = stdout || stderr || 'Tests passed with no output';

        return {
          success: true,
          data: result,
          executionTimeMs: Date.now() - startTime
        };
      } catch (error: any) {
        // Test failures are not necessarily errors - return them as test output
        const stderr = error.stderr || '';
        const stdout = error.stdout || '';
        const output = stdout || stderr || error.message;

        return {
          success: false,
          data: output,
          error: 'Some tests failed',
          executionTimeMs: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        data: '',
        error: `Test runner error: ${(error as Error).message}`,
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

    if (input.framework && !['jest', 'mocha', 'vitest'].includes(input.framework as string)) {
      errors.push('framework must be jest, mocha, or vitest');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Build the test command.
   */
  private buildTestCommand(pattern: string, framework: string): string {
    switch (framework) {
      case 'mocha':
        return `mocha "${pattern}"`;
      case 'vitest':
        return `vitest run "${pattern}"`;
      case 'jest':
      default:
        return `jest "${pattern}" --passWithNoTests`;
    }
  }

  /**
   * Check if input is safe to execute.
   */
  isSafe(_input: ToolInput): boolean {
    return true; // No path/security concerns for test runner
  }
}
