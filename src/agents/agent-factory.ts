/**
 * AgentFactory - Creates agents with role assignment and configuration.
 * Responsible for instantiating agents with appropriate models and tools.
 */

import type { IModel, ITool, IAgent, AgentRole } from '../types/index.js';
import { ArchitectAgent } from './role-agents/architect-agent.js';
import { DeveloperAgent } from './role-agents/developer-agent.js';
import { ReviewerAgent } from './role-agents/reviewer-agent.js';
import { ToolExecutor } from '../tools/executor.js';
import { ConfigError } from '../types/errors.js';

/**
 * Factory for creating agent instances.
 * Handles role-based agent instantiation and configuration.
 */
export class AgentFactory {
  /**
   * Create an agent with the given role and model.
   *
   * @param role - The role for the agent (architect, developer, reviewer)
   * @param model - The model to use for this agent
   * @param assignedTools - Tools available to this agent
   * @param toolExecutor - Tool executor for tool operations
   * @returns A configured agent instance
   */
  static createAgent(
    role: AgentRole,
    model: IModel,
    assignedTools: ITool[],
    toolExecutor: ToolExecutor
  ): IAgent {
    switch (role) {
      case 'architect':
        return new ArchitectAgent(model, assignedTools, toolExecutor);
      case 'developer':
        return new DeveloperAgent(model, assignedTools, toolExecutor);
      case 'reviewer':
        return new ReviewerAgent(model, assignedTools, toolExecutor);
      default:
        throw new ConfigError(`Unknown agent role: ${role}`);
    }
  }

  /**
   * Create multiple agents for advanced mode (3 agents).
   *
   * @param architectModel - Model for architect role
   * @param developerModel - Model for developer role
   * @param reviewerModel - Model for reviewer role
   * @param tools - Tools available to all agents
   * @param toolExecutor - Tool executor
   * @returns Array of 3 agents
   */
  static createAgentsForAdvancedMode(
    architectModel: IModel,
    developerModel: IModel,
    reviewerModel: IModel,
    tools: ITool[],
    toolExecutor: ToolExecutor
  ): [IAgent, IAgent, IAgent] {
    const architect = this.createAgent('architect', architectModel, tools, toolExecutor);
    const developer = this.createAgent('developer', developerModel, tools, toolExecutor);
    const reviewer = this.createAgent('reviewer', reviewerModel, tools, toolExecutor);

    return [architect, developer, reviewer];
  }
}
