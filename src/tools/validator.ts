/**
 * ToolValidator - Validates tool execution safety.
 * Ensures tools are called safely without security violations.
 */

import * as path from 'path';
import type { ToolInput, ToolSecurityRules } from '../types/index.js';

/**
 * Validator for tool execution security.
 */
export class ToolValidator {
  private securityRules: ToolSecurityRules;

  constructor(securityRules: ToolSecurityRules) {
    this.securityRules = securityRules;
  }

  /**
   * Validate that a tool call is safe to execute.
   * Checks path traversal, allowed/forbidden paths, and resource limits.
   */
  isSafe(toolName: string, input: ToolInput): boolean {
    // File-based tools need path validation
    if (toolName === 'read_file' || toolName === 'write_file') {
      return this.isFilePathSafe(input);
    }

    // Other tools are considered safe for Phase 1
    return true;
  }

  /**
   * Check if a file path is safe to access.
   */
  private isFilePathSafe(input: ToolInput): boolean {
    const filePath = input.path;

    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // Prevent path traversal
    if (filePath.includes('..')) {
      return false;
    }

    // Resolve to absolute path for validation
    let resolvedPath: string;
    try {
      resolvedPath = path.resolve(filePath);
    } catch {
      return false;
    }

    // Check against forbidden paths
    for (const forbidden of this.securityRules.forbiddenPaths) {
      const resolvedForbidden = path.resolve(forbidden);
      if (resolvedPath.startsWith(resolvedForbidden)) {
        return false;
      }
    }

    // Check against allowed paths (if specified)
    if (this.securityRules.allowedPaths && this.securityRules.allowedPaths.length > 0) {
      let isAllowed = false;
      for (const allowed of this.securityRules.allowedPaths) {
        const resolvedAllowed = path.resolve(allowed);
        if (resolvedPath.startsWith(resolvedAllowed)) {
          isAllowed = true;
          break;
        }
      }
      return isAllowed;
    }

    // If no allowed paths specified, allow access (except forbidden)
    return true;
  }

  /**
   * Check if file size is within limits.
   */
  isFileSizeOk(fileSize: number): boolean {
    if (!this.securityRules.maxFileSize) {
      return true;
    }
    return fileSize <= this.securityRules.maxFileSize;
  }

  /**
   * Check if tool execution time is within limits.
   */
  isExecutionTimeOk(executionTimeMs: number): boolean {
    if (!this.securityRules.timeoutMs) {
      return true;
    }
    return executionTimeMs < this.securityRules.timeoutMs;
  }

  /**
   * Get all validation errors for a tool call.
   */
  getValidationErrors(toolName: string, input: ToolInput): string[] {
    const errors: string[] = [];

    if (!this.isSafe(toolName, input)) {
      errors.push('Tool call failed security check');
    }

    if (toolName === 'read_file' || toolName === 'write_file') {
      const filePath = input.path;
      if (!filePath || typeof filePath !== 'string') {
        errors.push('path must be a non-empty string');
      }

      if (filePath && typeof filePath === 'string' && filePath.includes('..')) {
        errors.push('path traversal not allowed');
      }
    }

    return errors;
  }
}

/**
 * Create a validator from configuration.
 */
export function createValidator(rules: ToolSecurityRules): ToolValidator {
  return new ToolValidator(rules);
}
