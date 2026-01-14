/**
 * GPT Adapter - Integration with OpenAI's GPT models.
 * Transforms UnifiedRequests to OpenAI API format and vice versa.
 */

import OpenAI from 'openai';
import type {
  ModelName,
  UnifiedRequest,
  UnifiedResponse,
  ToolDefinition,
  ModelCapabilities,
  GPTModel
} from '../../types/index.js';
import { BaseModel } from '../IModel.js';
import { ResponseParser } from '../../transport/response-parser.js';
import { RequestHandler } from '../../transport/request-handler.js';
import { ModelError } from '../../types/errors.js';
import { getSystemPrompt, ANALYSIS_TASK_INSTRUCTION } from '../../config/system-prompts.js';

/**
 * OpenAI GPT API adapter implementing the IModel interface.
 * Handles all communication with OpenAI's GPT models.
 */
export class GPTAdapter extends BaseModel {
  readonly name: ModelName = 'gpt';
  readonly modelId: GPTModel;
  private client: OpenAI;

  // GPT model configurations
  private static readonly MODEL_CONFIGS: Record<GPTModel, { display: string; contextWindow: number }> = {
    'gpt-4': { display: 'GPT-4', contextWindow: 8192 },
    'gpt-4-turbo': { display: 'GPT-4 Turbo', contextWindow: 128000 },
    'gpt-4o': { display: 'GPT-4o', contextWindow: 128000 },
    'gpt-4o-mini': { display: 'GPT-4o Mini', contextWindow: 128000 }
  };

  /**
   * Create a new GPT adapter.
   * @param modelId - The GPT model to use
   * @param apiKey - The OpenAI API key
   */
  constructor(modelId: GPTModel, apiKey: string) {
    super();
    this.modelId = modelId;

    if (!apiKey) {
      throw new ModelError('gpt', 'OPENAI_API_KEY is not set');
    }

    this.client = new OpenAI({
      apiKey
    });
  }

  /**
   * Analyze code component using GPT.
   * Main method that performs the actual analysis.
   */
  async analyze(request: UnifiedRequest): Promise<UnifiedResponse> {
    try {
      // Validate input
      const validation = this.validateInput(request);
      if (!validation.valid) {
        throw new ModelError('gpt', `Invalid request: ${validation.errors.join('; ')}`);
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

      // Call OpenAI API
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
      const unifiedResponse = ResponseParser.parseGPTResponse(
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

      // Calculate cost estimate (GPT-4 pricing)
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
          throw new ModelError('gpt', 'Invalid API key (401 Unauthorized)', error);
        }
        if (error.status === 429) {
          throw new ModelError('gpt', 'Rate limit exceeded (429)', error);
        }
        if (error.status === 500) {
          throw new ModelError('gpt', 'OpenAI API server error (500)', error);
        }
        throw new ModelError('gpt', `API error: ${error.message}`, error);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ModelError('gpt', 'Network error - failed to reach OpenAI API', error);
      }

      // Re-throw CodeReviewErrors
      if (error instanceof ModelError) {
        throw error;
      }

      // Handle unknown errors
      throw new ModelError('gpt', `Unexpected error: ${(error as Error).message}`, error as Error);
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
   * Get supported tools for GPT models.
   * GPT supports similar tools to Claude.
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
    const config = GPTAdapter.MODEL_CONFIGS[this.modelId];

    return {
      supportsToolUse: true,
      maxTokens: config.contextWindow,
      contextWindow: config.contextWindow,
      costPer1kTokens: this.getCostPer1kTokens(),
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Code analysis',
        'Logic verification',
        'Performance optimization',
        'Security auditing',
        'Test coverage analysis'
      ],
      weaknesses: [
        'Occasional hallucinations',
        'Can be verbose'
      ]
    };
  }

  /**
   * Calculate cost per 1k tokens for this model.
   * Prices as of late 2024 (in USD).
   */
  private getCostPer1kTokens(): { input: number; output: number } {
    switch (this.modelId) {
      case 'gpt-4':
        return { input: 0.03, output: 0.06 };
      case 'gpt-4-turbo':
        return { input: 0.01, output: 0.03 };
      case 'gpt-4o':
        return { input: 0.005, output: 0.015 };
      case 'gpt-4o-mini':
        return { input: 0.00015, output: 0.0006 };
      default:
        return { input: 0.01, output: 0.03 };
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
