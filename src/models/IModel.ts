/**
 * IModel.ts - Core abstraction for all AI models.
 * All model implementations (Claude, GPT, DeepSeek) must implement this interface.
 * This allows the orchestrator to work with any model uniformly.
 */

import type {
  ModelName,
  AgentRole,
  UnifiedRequest,
  UnifiedResponse,
  ToolDefinition,
  ModelCapabilities
} from '../types/index.js';

/**
 * Core abstraction for all AI models.
 * Implementations: ClaudeAdapter, GPTAdapter, DeepSeekAdapter
 *
 * The IModel interface defines the contract that all models must follow.
 * This enables the system to:
 * 1. Work with multiple models interchangeably
 * 2. Switch models without changing orchestration code
 * 3. Test with mock implementations
 * 4. Add new models by just implementing this interface
 */
export interface IModel {
  // ============================================================================
  // IDENTITY
  // ============================================================================

  /**
   * The name of this model provider.
   * Examples: 'claude', 'gpt', 'deepseek'
   * Used for routing and configuration.
   */
  readonly name: ModelName;

  /**
   * The specific model type/version being used.
   * Examples: 'claude-opus-4-1', 'gpt-4-turbo', 'deepseek-chat'
   * Used for API calls and capability checks.
   */
  readonly modelId: string;

  /**
   * The role this model is currently assigned to.
   * Examples: 'architect', 'developer', 'reviewer'
   * Optional and can be changed at runtime.
   */
  currentRole?: AgentRole;

  // ============================================================================
  // CORE OPERATION
  // ============================================================================

  /**
   * Analyze a code component and return findings.
   *
   * This is the main method that orchestrators call to perform analysis.
   * It takes a standardized UnifiedRequest and returns a standardized UnifiedResponse.
   * The model adapter is responsible for:
   * 1. Transforming UnifiedRequest to the model's native API format
   * 2. Calling the model's API
   * 3. Handling tool use if the model requests tools
   * 4. Transforming the response back to UnifiedResponse format
   *
   * @param request - Unified request with component info, context, and tools
   * @returns Promise resolving to unified response with findings
   * @throws ModelError if API call fails
   */
  analyze(request: UnifiedRequest): Promise<UnifiedResponse>;

  // ============================================================================
  // TOOL SUPPORT
  // ============================================================================

  /**
   * Get the list of tools this model can use.
   *
   * Some models support tool use (Claude, GPT-4) while others don't.
   * This method allows the orchestrator to know what tools are available.
   * Models can handle tool calls in analyze() if needed.
   *
   * @returns Array of tool definitions this model supports
   */
  supportedTools(): ToolDefinition[];

  // ============================================================================
  // CAPABILITIES & CONSTRAINTS
  // ============================================================================

  /**
   * Get the capabilities and constraints of this model.
   *
   * This method returns metadata about what this model can do:
   * - Max tokens it can process
   * - Context window size
   * - Cost per 1k tokens
   * - Which roles it supports
   * - Strengths and weaknesses
   *
   * Used for:
   * 1. Cost estimation before running analysis
   * 2. Choosing appropriate max tokens
   * 3. Selecting best model for each role
   * 4. Informing the user about model capabilities
   *
   * @returns Model capabilities metadata
   */
  getCapabilities(): ModelCapabilities;

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate that a request is properly formatted for this model.
   *
   * Some models might have different requirements or constraints.
   * This method allows each model to validate inputs before attempting analysis.
   *
   * Examples:
   * - Check token count doesn't exceed model's limit
   * - Verify all required fields are present
   * - Check that requested tools are supported
   * - Validate component path format
   *
   * @param request - The request to validate
   * @returns Object with valid flag and list of error messages
   */
  validateInput(request: UnifiedRequest): { valid: boolean; errors: string[] };
}

/**
 * Abstract base class for model implementations.
 * Provides common functionality that all models share.
 */
export abstract class BaseModel implements IModel {
  abstract readonly name: ModelName;
  abstract readonly modelId: string;
  currentRole?: AgentRole;

  abstract analyze(request: UnifiedRequest): Promise<UnifiedResponse>;

  abstract supportedTools(): ToolDefinition[];

  abstract getCapabilities(): ModelCapabilities;

  validateInput(request: UnifiedRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.component?.name) {
      errors.push('Component name is required');
    }

    if (!request.component?.sourcePath) {
      errors.push('Component source path is required');
    }

    if (!request.modelName) {
      errors.push('Model name is required');
    }

    if (!request.role) {
      errors.push('Role is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
