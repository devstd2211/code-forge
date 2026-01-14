/**
 * ITool.ts - Abstract tool interface.
 * All tools (FileReader, FileWriter, TestRunner, etc.) must implement this.
 */

import type { ToolInput, ToolOutput } from '../types/index.js';

/**
 * Abstract tool interface.
 * Implementations: FileReader, FileWriter, TestRunner, CodeSearch, GitDiff, ComplexityAnalyzer
 *
 * Tools are composable utilities that models can use to gather information or perform actions.
 * Each tool must:
 * 1. Define what inputs it accepts (via inputSchema)
 * 2. Validate inputs before execution
 * 3. Check security (prevent path traversal, etc.)
 * 4. Execute safely with proper error handling
 * 5. Return results in standard ToolOutput format
 */
export interface ITool {
  // ============================================================================
  // METADATA
  // ============================================================================

  /**
   * The unique name of this tool.
   * Used for tool selection and routing.
   * Examples: 'read_file', 'write_file', 'test_runner'
   */
  readonly name: string;

  /**
   * Human-readable description of what this tool does.
   * Shown to users and models.
   */
  readonly description: string;

  /**
   * JSON Schema describing the input parameters.
   * Used for validation and to guide model tool calling.
   * Example:
   * {
   *   type: 'object',
   *   properties: {
   *     path: { type: 'string', description: 'File path' }
   *   },
   *   required: ['path']
   * }
   */
  readonly inputSchema: Record<string, any>;

  // ============================================================================
  // EXECUTION
  // ============================================================================

  /**
   * Execute the tool with the given input.
   *
   * This is the main operation that performs the actual task.
   * The tool executor handles:
   * 1. Validation (before calling this)
   * 2. Security checks (before calling this)
   * 3. Timeouts and resource limits
   * 4. Error handling and recovery
   *
   * @param input - The input parameters for this tool
   * @returns Promise resolving to the tool result
   * @throws Should not throw - all errors should be caught and returned in ToolOutput
   */
  execute(input: ToolInput): Promise<ToolOutput>;

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate that the input matches the schema and is properly formatted.
   *
   * This method checks:
   * 1. Required fields are present
   * 2. Types match the schema
   * 3. Values are within acceptable ranges
   * 4. No unexpected fields (optional)
   *
   * @param input - The input to validate
   * @returns Object with valid flag and list of validation errors
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] };

  // ============================================================================
  // SECURITY
  // ============================================================================

  /**
   * Security check - ensure the input is safe to execute.
   *
   * This method prevents security issues like:
   * 1. Path traversal attacks (../ or absolute paths)
   * 2. Access to forbidden directories
   * 3. Resource exhaustion (huge files, timeouts)
   * 4. Command injection
   * 5. Other security violations
   *
   * @param input - The input to check
   * @returns true if safe to execute, false otherwise
   */
  isSafe(input: ToolInput): boolean;
}

/**
 * Abstract base class for tool implementations.
 * Provides common functionality that all tools share.
 */
export abstract class BaseTool implements ITool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Record<string, any>;

  abstract execute(input: ToolInput): Promise<ToolOutput>;

  abstract isSafe(input: ToolInput): boolean;

  /**
   * Default validation implementation.
   * Subclasses can override for more specific validation.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that input is an object
    if (typeof input !== 'object' || input === null) {
      errors.push('Input must be an object');
      return { valid: false, errors };
    }

    // Check required fields from schema
    const schema = this.inputSchema as any;
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in input)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Check property types (basic check)
    if (schema.properties) {
      for (const [key, value] of Object.entries(input)) {
        if (key in schema.properties) {
          const propSchema = schema.properties[key] as any;
          const expectedType = propSchema.type;
          const actualType = typeof value;

          if (expectedType === 'string' && actualType !== 'string') {
            errors.push(`Field '${key}' should be string, got ${actualType}`);
          } else if (expectedType === 'number' && actualType !== 'number') {
            errors.push(`Field '${key}' should be number, got ${actualType}`);
          } else if (expectedType === 'boolean' && actualType !== 'boolean') {
            errors.push(`Field '${key}' should be boolean, got ${actualType}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
