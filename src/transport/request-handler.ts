import type {
  UnifiedRequest,
  ComponentReference,
  AnalysisContext,
  AgentRole,
  ModelName
} from '../types/index.js';
import { ValidationError } from '../types/errors.js';

/**
 * Handles building and validating UnifiedRequest objects.
 * Ensures all required fields are present and properly formatted.
 */
export class RequestHandler {
  /**
   * Build a UnifiedRequest from component and context.
   */
  static build(
    component: ComponentReference,
    modelName: ModelName,
    role: AgentRole,
    options?: {
      context?: AnalysisContext;
      sourceCode?: string;
      availableTools?: string[];
      temperature?: number;
      maxTokens?: number;
    }
  ): UnifiedRequest {
    const request: UnifiedRequest = {
      modelName,
      role,
      task: 'analyze',
      component,
      context: options?.context,
      sourceCode: options?.sourceCode,
      availableTools: options?.availableTools || ['read_file', 'write_file'],
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 4096
    };

    // Validate before returning
    this.validate(request);

    return request;
  }

  /**
   * Validate a UnifiedRequest.
   */
  static validate(request: UnifiedRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!request.modelName || !['claude', 'gpt', 'deepseek'].includes(request.modelName)) {
      errors.push(`Invalid modelName: ${request.modelName}`);
    }

    if (!request.role || !['architect', 'developer', 'reviewer'].includes(request.role)) {
      errors.push(`Invalid role: ${request.role}`);
    }

    if (!request.task || typeof request.task !== 'string') {
      errors.push('Task must be a non-empty string');
    }

    if (!request.component) {
      errors.push('Component is required');
    } else {
      if (!request.component.name) {
        errors.push('Component.name is required');
      }
      if (!request.component.sourcePath) {
        errors.push('Component.sourcePath is required');
      }
    }

    if (!request.availableTools || !Array.isArray(request.availableTools)) {
      errors.push('availableTools must be an array');
    }

    // Check optional fields if provided
    if (request.temperature !== undefined) {
      if (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 1) {
        errors.push('temperature must be a number between 0 and 1');
      }
    }

    if (request.maxTokens !== undefined) {
      if (typeof request.maxTokens !== 'number' || request.maxTokens < 1) {
        errors.push('maxTokens must be a positive number');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Ensure request has required fields and apply defaults.
   */
  static normalize(request: UnifiedRequest): UnifiedRequest {
    const normalized = { ...request };

    // Apply defaults
    if (!normalized.temperature) {
      normalized.temperature = 0.7;
    }

    if (!normalized.maxTokens) {
      normalized.maxTokens = 4096;
    }

    if (!normalized.availableTools) {
      normalized.availableTools = ['read_file', 'write_file'];
    }

    return normalized;
  }

  /**
   * Throw validation error if request is invalid.
   */
  static validateOrThrow(request: UnifiedRequest): void {
    const validation = this.validate(request);
    if (!validation.valid) {
      throw new ValidationError(
        `Invalid UnifiedRequest: ${validation.errors.join('; ')}`
      );
    }
  }
}
