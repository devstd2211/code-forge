/**
 * Claude Adapter - Integration with Anthropic's Claude API.
 * This is the HIGH PRIORITY component that makes the system work.
 * It transforms UnifiedRequests to Claude API format and vice versa.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ModelName,
  UnifiedRequest,
  UnifiedResponse,
  ToolDefinition,
  ModelCapabilities,
  ClaudeModel
} from '../../types/index.js';
import { BaseModel } from '../IModel.js';
import { ResponseParser } from '../../transport/response-parser.js';
import { RequestHandler } from '../../transport/request-handler.js';
import { ModelError } from '../../types/errors.js';
import { getSystemPrompt, ANALYSIS_TASK_INSTRUCTION } from '../../config/system-prompts.js';

/**
 * Claude API adapter implementing the IModel interface.
 * Handles all communication with Anthropic's Claude models.
 */
export class ClaudeAdapter extends BaseModel {
  readonly name: ModelName = 'claude';
  readonly modelId: ClaudeModel;
  private client: Anthropic;
  // private apiKey: string; // Stored in client config, not needed separately

  // Claude model configurations
  private static readonly MODEL_CONFIGS: Record<ClaudeModel, { display: string; contextWindow: number }> = {
    'claude-opus-4-1': { display: 'Claude 3 Opus', contextWindow: 200000 },
    'claude-sonnet-4-5': { display: 'Claude 3.5 Sonnet', contextWindow: 200000 },
    'claude-haiku-3-5': { display: 'Claude 3.5 Haiku', contextWindow: 200000 }
  };

  /**
   * Create a new Claude adapter.
   * @param modelId - The Claude model to use (opus, sonnet, haiku)
   * @param apiKey - The Anthropic API key
   */
  constructor(modelId: ClaudeModel, apiKey: string) {
    super();
    this.modelId = modelId;

    if (!apiKey) {
      throw new ModelError('claude', 'ANTHROPIC_API_KEY is not set');
    }

    this.client = new Anthropic({
      apiKey
    });
  }

  /**
   * Analyze code component using Claude.
   * Main method that performs the actual analysis.
   */
  async analyze(request: UnifiedRequest): Promise<UnifiedResponse> {
    try {
      // Validate input
      const validation = this.validateInput(request);
      if (!validation.valid) {
        throw new ModelError('claude', `Invalid request: ${validation.errors.join('; ')}`);
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

      // Call Claude API
      const response = await this.client.messages.create({
        model: this.modelId,
        max_tokens: normalizedRequest.maxTokens || 4096,
        temperature: normalizedRequest.temperature || 0.7,
        system: fullSystemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Parse response to unified format
      const unifiedResponse = ResponseParser.parseClaudeResponse(
        response,
        request.modelName,
        request.role,
        0 // requestTokens will be calculated below
      );

      // Update metadata with actual values
      unifiedResponse.metadata.tokensUsed = {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
        total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      };
      unifiedResponse.metadata.executionTimeMs = executionTimeMs;

      // Calculate cost estimate (Claude 3.5 Sonnet pricing)
      const costEstimate = this.calculateCostEstimate(
        unifiedResponse.metadata.tokensUsed.input,
        unifiedResponse.metadata.tokensUsed.output
      );
      unifiedResponse.metadata.costEstimate = costEstimate;

      return unifiedResponse;
    } catch (error) {
      // Handle specific API errors
      if (error instanceof Anthropic.APIError) {
        if (error.status === 401) {
          throw new ModelError('claude', 'Invalid API key (401 Unauthorized)', error);
        }
        if (error.status === 429) {
          throw new ModelError('claude', 'Rate limit exceeded (429)', error);
        }
        if (error.status === 500) {
          throw new ModelError('claude', 'Anthropic API server error (500)', error);
        }
        throw new ModelError('claude', `API error: ${error.message}`, error);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ModelError('claude', 'Network error - failed to reach Anthropic API', error);
      }

      // Re-throw CodeReviewErrors
      if (error instanceof ModelError) {
        throw error;
      }

      // Handle unknown errors
      throw new ModelError('claude', `Unexpected error: ${(error as Error).message}`, error as Error);
    }
  }

  /**
   * Get tools that Claude supports.
   * Note: Claude has native tool use support, but we're using simplified tool handling for Phase 1.
   */
  supportedTools(): ToolDefinition[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write contents to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'File contents' }
          },
          required: ['path', 'content']
        }
      }
    ];
  }

  /**
   * Get Claude's capabilities and constraints.
   */
  getCapabilities(): ModelCapabilities {
    const config = ClaudeAdapter.MODEL_CONFIGS[this.modelId];

    return {
      supportsToolUse: true,
      maxTokens: 4096,
      contextWindow: config.contextWindow,
      costPer1kTokens: this.getCostPer1kTokens(this.modelId),
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Complex reasoning',
        'Code architecture analysis',
        'Detailed explanations',
        'Multi-step problem solving',
        'Long context understanding'
      ],
      weaknesses: [
        'Real-time data',
        'Very recent information',
        'Executing code'
      ]
    };
  }

  /**
   * Build the user message from the UnifiedRequest.
   */
  private buildUserMessage(request: UnifiedRequest): string {
    const lines: string[] = [];

    lines.push('# Code Analysis Task');
    lines.push('');
    lines.push('## Component');
    lines.push(`- **Name**: ${request.component.name}`);
    lines.push(`- **Path**: ${request.component.sourcePath}`);
    if (request.component.testPath) {
      lines.push(`- **Test Path**: ${request.component.testPath}`);
    }
    lines.push('');

    if (request.context) {
      lines.push('## Context');
      lines.push(`- **Project**: ${request.context.projectName}`);
      lines.push(`- **Language**: ${request.context.language}`);
      if (request.context.framework) {
        lines.push(`- **Framework**: ${request.context.framework}`);
      }
      lines.push(`- **Components**: ${request.context.componentCount}`);
      lines.push(`- **LOC**: ${request.context.totalLOC}`);
      lines.push('');
    }

    if (request.sourceCode) {
      lines.push('## Source Code');
      lines.push('```');
      lines.push(request.sourceCode);
      lines.push('```');
      lines.push('');
    }

    if (request.availableTools && request.availableTools.length > 0) {
      lines.push('## Available Tools');
      for (const tool of request.availableTools) {
        lines.push(`- ${tool}`);
      }
      lines.push('');
    }

    lines.push('Please perform a thorough analysis and return findings in JSON format.');

    return lines.join('\n');
  }

  /**
   * Calculate API cost estimate based on token usage.
   * Pricing as of 2024 for Claude 3.5 Sonnet.
   */
  private calculateCostEstimate(inputTokens: number, outputTokens: number): number {
    const costPer1k = this.getCostPer1kTokens(this.modelId);
    return (inputTokens / 1000) * costPer1k.input + (outputTokens / 1000) * costPer1k.output;
  }

  /**
   * Get cost per 1k tokens for the model.
   */
  private getCostPer1kTokens(modelId: ClaudeModel): { input: number; output: number } {
    // Pricing as of 2024
    switch (modelId) {
      case 'claude-opus-4-1':
        return { input: 0.015, output: 0.075 };
      case 'claude-sonnet-4-5':
        return { input: 0.003, output: 0.015 };
      case 'claude-haiku-3-5':
        return { input: 0.00025, output: 0.00125 };
      default:
        return { input: 0.003, output: 0.015 }; // Default to Sonnet
    }
  }
}
