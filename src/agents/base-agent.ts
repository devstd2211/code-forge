/**
 * BaseAgent - Abstract base class for all agents.
 * Provides common functionality for role-specific agents.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IAgent,
  IModel,
  ITool,
  AgentRole,
  AnalysisRequest,
  UnifiedResponse
} from '../types/index.js';
import { RequestHandler } from '../transport/request-handler.js';
import { ToolExecutor } from '../tools/executor.js';

/**
 * Base agent implementation providing common functionality.
 * Extended by specific role agents: ArchitectAgent, DeveloperAgent, ReviewerAgent.
 */
export abstract class BaseAgent implements IAgent {
  readonly id: string;
  readonly model: IModel;
  readonly role: AgentRole;
  readonly assignedTools: ITool[];
  protected toolExecutor: ToolExecutor;

  constructor(
    model: IModel,
    role: AgentRole,
    assignedTools: ITool[],
    toolExecutor: ToolExecutor
  ) {
    this.id = uuidv4();
    this.model = model;
    this.role = role;
    this.assignedTools = assignedTools;
    this.toolExecutor = toolExecutor;
  }

  /**
   * Perform analysis - main entry point for agents.
   */
  async performAnalysis(request: AnalysisRequest): Promise<UnifiedResponse> {
    // Build unified request from analysis request
    const unifiedRequest = RequestHandler.build(
      request.component,
      this.model.name,
      this.role,
      {
        context: request.context,
        availableTools: request.availableTools,
      }
    );

    // Perform the analysis
    return this.model.analyze(unifiedRequest);
  }

  /**
   * Get role-specific system prompt.
   * This should be overridden by subclasses.
   */
  abstract getSystemPrompt(): string;

  /**
   * Get role-specific instructions.
   * This should be overridden by subclasses.
   */
  abstract getRoleInstructions(): string;
}
