/**
 * DeepSeek Adapter - Integration with DeepSeek API.
 * DeepSeek provides an OpenAI-compatible API, so we use OpenAI client with custom endpoint.
 */

import OpenAI from 'openai';
import type {
  ModelName,
  UnifiedRequest,
  UnifiedResponse,
  ToolDefinition,
  ModelCapabilities,
  DeepSeekModel
} from '../../types/index.js';
import { BaseModel } from '../IModel.js';
import { ResponseParser } from '../../transport/response-parser.js';
import { RequestHandler } from '../../transport/request-handler.js';
import { ModelError } from '../../types/errors.js';
import { getSystemPrompt, ANALYSIS_TASK_INSTRUCTION } from '../../config/system-prompts.js';

/**
 * DeepSeek API adapter implementing the IModel interface.
 * Uses OpenAI-compatible API with custom endpoint.
 */
export class DeepSeekAdapter extends BaseModel {
  readonly name: ModelName = 'deepseek';
  readonly modelId: DeepSeekModel;
  private client: OpenAI;

  // DeepSeek model configurations
  private static readonly MODEL_CONFIGS: Record<DeepSeekModel, { display: string; contextWindow: number }> = {
    'deepseek-chat': { display: 'DeepSeek Chat', contextWindow: 4096 },
    'deepseek-coder': { display: 'DeepSeek Coder', contextWindow: 4096 }
  };

  /**
   * Create a new DeepSeek adapter.
   * @param modelId - The DeepSeek model to use
   * @param apiKey - The DeepSeek API key
   */
  constructor(modelId: DeepSeekModel, apiKey: string) {
    super();
    this.modelId = modelId;

    if (!apiKey) {
      throw new ModelError('deepseek', 'DEEPSEEK_API_KEY is not set');
    }

    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/beta'
    });
  }

  /**
   * Analyze code component using DeepSeek.
   * Main method that performs the actual analysis.
   */
  async analyze(request: UnifiedRequest): Promise<UnifiedResponse> {
    try {
      // Validate input
      const validation = this.validateInput(request);
      if (!validation.valid) {
        throw new ModelError('deepseek', `Invalid request: ${validation.errors.join('; ')}`);
      }

      // Normalize request
      const normalizedRequest = RequestHandler.normalize(request);

      // Build system message with role-specific prompt
      const systemPrompt = getSystemPrompt(request.role);
      const fullSystemPrompt = `${systemPrompt}\n\n${ANALYSIS_TASK_INSTRUCTION}`;

      // Build user message with component details
      const userMessage = this.buildUserMessage(normalizedRequest);

      // Record start time for execution timing
      const startTime = Date.now();

      // Call DeepSeek API (OpenAI-compatible)
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        max_tokens: normalizedRequest.maxTokens || 4096,
        temperature: normalizedRequest.temperature || 0.7,
        messages: [
          {
            role: 'system',
            content: fullSystemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Parse response to unified format
      const unifiedResponse = ResponseParser.parseDeepSeekResponse(
        response,
        request.modelName,
        request.role,
        0 // requestTokens will be calculated below
      );

      // Update metadata with actual values
      unifiedResponse.metadata.tokensUsed = {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0
      };
      unifiedResponse.metadata.executionTimeMs = executionTimeMs;

      // Calculate cost estimate
      const costEstimate = this.calculateCostEstimate(
        unifiedResponse.metadata.tokensUsed.input,
        unifiedResponse.metadata.tokensUsed.output
      );
      unifiedResponse.metadata.costEstimate = costEstimate;

      return unifiedResponse;
    } catch (error) {
      // Handle specific API errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new ModelError('deepseek', 'Invalid API key (401 Unauthorized)', error);
        }
        if (error.status === 429) {
          throw new ModelError('deepseek', 'Rate limit exceeded (429)', error);
        }
        if (error.status === 500) {
          throw new ModelError('deepseek', 'DeepSeek API server error (500)', error);
        }
        throw new ModelError('deepseek', `API error: ${error.message}`, error);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ModelError('deepseek', 'Network error - failed to reach DeepSeek API', error);
      }

      // Re-throw CodeReviewErrors
      if (error instanceof ModelError) {
        throw error;
      }

      // Handle unknown errors
      throw new ModelError('deepseek', `Unexpected error: ${(error as Error).message}`, error as Error);
    }
  }

  /**
   * Build user message with component details.
   */
  private buildUserMessage(request: UnifiedRequest): string {
    const lines = [
      `Component: ${request.component.name}`,
      `File: ${request.component.sourcePath}`,
      ''
    ];

    if (request.sourceCode) {
      lines.push('Source Code:');
      lines.push('```');
      lines.push(request.sourceCode);
      lines.push('```');
      lines.push('');
    }

    if (request.context) {
      lines.push('Context:');
      lines.push(`- Project: ${request.context.projectName}`);
      lines.push(`- Language: ${request.context.language}`);
      if (request.context.framework) {
        lines.push(`- Framework: ${request.context.framework}`);
      }
      lines.push('');
    }

    lines.push('Please analyze this component thoroughly.');

    return lines.join('\n');
  }

  /**
   * Get supported tools for DeepSeek models.
   */
  supportedTools(): ToolDefinition[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a source file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write to' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      }
    ];
  }

  /**
   * Get capabilities of this model.
   */
  getCapabilities(): ModelCapabilities {
    const config = DeepSeekAdapter.MODEL_CONFIGS[this.modelId];

    return {
      supportsToolUse: true,
      maxTokens: config.contextWindow,
      contextWindow: config.contextWindow,
      costPer1kTokens: this.getCostPer1kTokens(),
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Cost-effective',
        'Code analysis',
        'Performance optimization',
        'Fast inference'
      ],
      weaknesses: [
        'Limited context window',
        'Less advanced reasoning than GPT-4'
      ]
    };
  }

  /**
   * Calculate cost per 1k tokens for this model.
   * DeepSeek pricing is significantly cheaper than GPT-4.
   */
  private getCostPer1kTokens(): { input: number; output: number } {
    switch (this.modelId) {
      case 'deepseek-chat':
        return { input: 0.0014, output: 0.0042 };
      case 'deepseek-coder':
        return { input: 0.0014, output: 0.0042 };
      default:
        return { input: 0.0014, output: 0.0042 };
    }
  }

  /**
   * Calculate cost estimate for tokens used.
   */
  private calculateCostEstimate(inputTokens: number, outputTokens: number): number {
    const costs = this.getCostPer1kTokens();
    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    return inputCost + outputCost;
  }

  /**
   * Validate input request.
   */
  validateInput(request: UnifiedRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.component) {
      errors.push('Missing component reference');
    }

    if (!request.role) {
      errors.push('Missing role assignment');
    }

    if (!request.availableTools) {
      errors.push('Missing available tools');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
