/**
 * Orchestrator - Main coordination engine for analysis workflows.
 * Coordinates models, tools, and orchestration logic.
 */

import type {
  IModel,
  UnifiedRequest,
  UnifiedResponse,
  ComponentReference,
  AnalysisContext,
  AgentRole,
  ModelName
} from '../types/index.js';
import { ModelError, ToolError } from '../types/errors.js';
import { RequestHandler } from '../transport/request-handler.js';
import { ToolExecutor } from '../tools/executor.js';

/**
 * Main orchestrator that coordinates analysis workflows.
 * Handles simple mode execution and error recovery.
 */
export class Orchestrator {
  private model: IModel;
  private toolExecutor: ToolExecutor;
  private maxRetries: number;
  private backoffMs: number;

  constructor(
    model: IModel,
    toolExecutor: ToolExecutor,
    config?: {
      maxRetries?: number;
      backoffMs?: number;
    }
  ) {
    this.model = model;
    this.toolExecutor = toolExecutor;
    this.maxRetries = config?.maxRetries || 3;
    this.backoffMs = config?.backoffMs || 1000;
  }

  /**
   * Execute simple mode analysis (single model).
   */
  async executeSimple(
    component: ComponentReference,
    modelName: ModelName,
    role: AgentRole,
    context?: AnalysisContext
  ): Promise<UnifiedResponse> {
    // Build request
    const request = RequestHandler.build(component, modelName, role, {
      context,
      availableTools: this.toolExecutor.getAvailableTools()
    });

    // Execute with retries
    return this.executeWithRetry(request);
  }

  /**
   * Execute advanced mode analysis (three models with consensus).
   * Runs three agents in parallel and merges their findings.
   */
  async executeAdvanced(
    component: ComponentReference,
    architectModel: IModel,
    developerModel: IModel,
    reviewerModel: IModel,
    context?: AnalysisContext
  ): Promise<UnifiedResponse> {
    // Import needed modules
    const { AgentFactory } = await import('../agents/agent-factory.js');
    const { ConsensusBuilder } = await import('./consensus-builder.js');

    // Create three agents
    const agents = AgentFactory.createAgentsForAdvancedMode(
      architectModel,
      developerModel,
      reviewerModel,
      [], // Tools passed to each agent
      this.toolExecutor
    );

    // Build analysis request
    const analysisRequest = {
      component,
      context: context || {
        projectName: 'Unknown',
        componentCount: 0,
        totalLOC: 0,
        language: 'typescript' as const
      },
      task: 'analyze',
      availableTools: this.toolExecutor.getAvailableTools()
    };

    // Execute all agents in parallel
    const responses = await Promise.all(
      agents.map(agent => agent.performAnalysis(analysisRequest))
    );

    // Build consensus from responses
    const consensusReport = ConsensusBuilder.buildConsensus(responses);

    // Return consensus report as unified response
    // Use the first response as a base and add consensus data
    return {
      ...responses[0],
      findings: consensusReport.findings,
      summary: `Consensus analysis from 3 models: ${consensusReport.findings.length} findings identified`,
      metadata: {
        ...responses[0].metadata,
        toolCalls: ['consensus-builder']
      }
    };
  }

  /**
   * Execute request with retry logic for transient errors.
   */
  private async executeWithRetry(request: UnifiedRequest): Promise<UnifiedResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.model.analyze(request);
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }

        // Calculate backoff time
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new ModelError(request.modelName, 'Unknown error in retry loop');
  }

  /**
   * Check if an error is retryable.
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof ModelError) {
      const message = error.message.toLowerCase();
      // Retry on rate limiting and transient errors
      return message.includes('rate limit') || message.includes('timeout') || message.includes('429');
    }

    if (error instanceof ToolError) {
      // Don't retry tool errors, they're usually permanent
      return false;
    }

    return false;
  }

  /**
   * Calculate exponential backoff.
   */
  private calculateBackoff(attempt: number): number {
    // Simple exponential backoff: 1s, 2s, 4s, etc.
    return this.backoffMs * Math.pow(2, attempt - 1);
  }

  /**
   * Sleep for milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the current model.
   */
  getModel(): IModel {
    return this.model;
  }

  /**
   * Get the tool executor.
   */
  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }
}
