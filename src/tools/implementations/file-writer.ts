/**
 * FileWriter Tool - Write files safely to the filesystem.
 * Prevents path traversal and enforces security rules.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

/**
 * FileWriter tool implementation.
 * Writes file contents with security validation.
 */
export class FileWriter extends BaseTool {
  readonly name = 'write_file';
  readonly description = 'Write contents to a file in the filesystem';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        enum: ['utf-8', 'utf8', 'ascii', 'latin1']
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to overwrite existing file (default: false)'
      }
    },
    required: ['path', 'content']
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
   * Write file with given content.
   */
  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      const filePath = input.path as string;
      const content = input.content as string;
      const encoding = (input.encoding || 'utf-8') as BufferEncoding;
      const overwrite = input.overwrite === true;

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

      // Check file size
      if (content.length > this.maxFileSize) {
        return {
          success: false,
          data: '',
          error: `Content too large: ${content.length} bytes (max: ${this.maxFileSize})`,
          executionTimeMs: 0
        };
      }

      // Check if file exists and overwrite is false
      if (fs.existsSync(filePath) && !overwrite) {
        return {
          success: false,
          data: '',
          error: `File already exists: ${filePath} (set overwrite=true to replace)`,
          executionTimeMs: 0
        };
      }

      // Create directories if needed
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      const startTime = Date.now();
      fs.writeFileSync(filePath, content, encoding);
      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: `File written successfully: ${filePath} (${content.length} bytes)`,
        executionTimeMs
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        data: '',
        error: `Failed to write file: ${message}`,
        executionTimeMs: 0
      };
    }
  }

  /**
   * Validate file writing input.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.path || typeof input.path !== 'string') {
      errors.push('path is required and must be a string');
    }

    if (!('content' in input) || typeof input.content !== 'string') {
      errors.push('content is required and must be a string');
    }

    if (input.encoding && typeof input.encoding !== 'string') {
      errors.push('encoding must be a string');
    }

    if (input.encoding && !['utf-8', 'utf8', 'ascii', 'latin1'].includes(input.encoding as string)) {
      errors.push(`encoding must be one of: utf-8, utf8, ascii, latin1`);
    }

    if (input.overwrite !== undefined && typeof input.overwrite !== 'boolean') {
      errors.push('overwrite must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Security check for file writing.
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
