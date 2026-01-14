/**
 * FileReader Tool - Read files safely from the filesystem.
 * Prevents path traversal and enforces security rules.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

/**
 * FileReader tool implementation.
 * Reads file contents with security validation.
 */
export class FileReader extends BaseTool {
  readonly name = 'read_file';
  readonly description = 'Read the contents of a file from the filesystem';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read'
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        enum: ['utf-8', 'utf8', 'ascii', 'latin1']
      }
    },
    required: ['path']
  };

  private allowedPaths: string[];
  private forbiddenPaths: string[];
  private maxFileSize: number;

  constructor(config?: {
    allowedPaths?: string[];
    forbiddenPaths?: string[];
    maxFileSize?: number;
  }) {
    super();
    this.allowedPaths = config?.allowedPaths || ['./'];
    this.forbiddenPaths = config?.forbiddenPaths || ['/etc', '/root', '/sys', '/proc', './.git'];
    this.maxFileSize = config?.maxFileSize || 10485760; // 10MB default
  }

  /**
   * Read file and return contents.
   */
  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      const filePath = input.path as string;
      const encoding = (input.encoding || 'utf-8') as BufferEncoding;

      // Validate input
      const validation = this.validate(input);
      if (!validation.valid) {
        return {
          success: false,
          data: '',
          error: `Validation failed: ${validation.errors.join('; ')}`,
          executionTimeMs: 0
        };
      }

      // Security check
      if (!this.isSafe(input)) {
        return {
          success: false,
          data: '',
          error: 'Path is not allowed (security violation)',
          executionTimeMs: 0
        };
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: '',
          error: `File not found: ${filePath}`,
          executionTimeMs: 0
        };
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        return {
          success: false,
          data: '',
          error: `File too large: ${stats.size} bytes (max: ${this.maxFileSize})`,
          executionTimeMs: 0
        };
      }

      // Read file
      const startTime = Date.now();
      const contents = fs.readFileSync(filePath, encoding);
      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: contents,
        executionTimeMs
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        data: '',
        error: `Failed to read file: ${message}`,
        executionTimeMs: 0
      };
    }
  }

  /**
   * Validate file reading input.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.path || typeof input.path !== 'string') {
      errors.push('path is required and must be a string');
    }

    if (input.encoding && typeof input.encoding !== 'string') {
      errors.push('encoding must be a string');
    }

    if (input.encoding && !['utf-8', 'utf8', 'ascii', 'latin1'].includes(input.encoding as string)) {
      errors.push(`encoding must be one of: utf-8, utf8, ascii, latin1`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Security check for file reading.
   * Prevents path traversal and access to forbidden directories.
   */
  isSafe(input: ToolInput): boolean {
    const filePath = input.path as string;

    if (!filePath) {
      return false;
    }

    // Resolve to absolute path
    let resolvedPath: string;
    try {
      resolvedPath = path.resolve(filePath);
    } catch {
      return false;
    }

    // Check forbidden paths
    for (const forbidden of this.forbiddenPaths) {
      const resolvedForbidden = path.resolve(forbidden);
      if (resolvedPath.startsWith(resolvedForbidden)) {
        return false;
      }
    }

    // Check allowed paths
    let isAllowed = false;
    for (const allowed of this.allowedPaths) {
      const resolvedAllowed = path.resolve(allowed);
      if (resolvedPath.startsWith(resolvedAllowed)) {
        isAllowed = true;
        break;
      }
    }

    // If allowedPaths is empty, allow everything (except forbidden)
    if (this.allowedPaths.length === 0) {
      isAllowed = true;
    }

    // Prevent directory traversal attacks
    if (filePath.includes('..')) {
      return false;
    }

    return isAllowed;
  }
}
