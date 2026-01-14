import type { ModelName } from './index.js';

/**
 * Base error class for the entire system.
 * All errors should extend this for consistent handling.
 */
export class CodeReviewError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CodeReviewError';
    Object.setPrototypeOf(this, CodeReviewError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Error thrown when a model API fails.
 */
export class ModelError extends CodeReviewError {
  constructor(
    public modelName: ModelName,
    message: string,
    public originalError?: Error
  ) {
    super('MODEL_ERROR', `[${modelName}] ${message}`, { modelName });
    this.name = 'ModelError';
    Object.setPrototypeOf(this, ModelError.prototype);
  }
}

/**
 * Error thrown when tool execution fails.
 */
export class ToolError extends CodeReviewError {
  constructor(
    public toolName: string,
    message: string,
    public originalError?: Error
  ) {
    super('TOOL_ERROR', `[${toolName}] ${message}`, { toolName });
    this.name = 'ToolError';
    Object.setPrototypeOf(this, ToolError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid.
 */
export class ConfigError extends CodeReviewError {
  constructor(message: string, public configPath?: string) {
    super('CONFIG_ERROR', message, { configPath });
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Error thrown when consensus building fails.
 */
export class ConsensusBuildError extends CodeReviewError {
  constructor(message: string, public details_info?: Record<string, any>) {
    super('CONSENSUS_ERROR', message, details_info);
    this.name = 'ConsensusBuildError';
    Object.setPrototypeOf(this, ConsensusBuildError.prototype);
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends CodeReviewError {
  constructor(message: string, public field?: string) {
    super('VALIDATION_ERROR', message, { field });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Check if an error is a CodeReviewError or one of its subclasses.
 */
export function isCodeReviewError(error: unknown): error is CodeReviewError {
  return error instanceof CodeReviewError;
}

/**
 * Check if an error is a ModelError.
 */
export function isModelError(error: unknown): error is ModelError {
  return error instanceof ModelError;
}

/**
 * Check if an error is a ToolError.
 */
export function isToolError(error: unknown): error is ToolError {
  return error instanceof ToolError;
}

/**
 * Check if an error is a ConfigError.
 */
export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError;
}
