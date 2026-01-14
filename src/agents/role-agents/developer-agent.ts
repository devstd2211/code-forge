/**
 * DeveloperAgent - Agent specialized in code quality and logic analysis.
 * Focuses on correctness, performance, and code quality.
 */

import type { IModel, ITool, AgentRole } from '../../types/index.js';
import { BaseAgent } from '../base-agent.js';
import { getSystemPrompt, getDeveloperInstructions } from '../../config/system-prompts.js';
import { ToolExecutor } from '../../tools/executor.js';

/**
 * Developer role agent - analyzes code from a quality and correctness perspective.
 */
export class DeveloperAgent extends BaseAgent {
  constructor(
    model: IModel,
    assignedTools: ITool[],
    toolExecutor: ToolExecutor
  ) {
    super(model, 'developer' as AgentRole, assignedTools, toolExecutor);
  }

  /**
   * Get the system prompt for developer role.
   */
  getSystemPrompt(): string {
    return getSystemPrompt('developer');
  }

  /**
   * Get developer-specific instructions.
   */
  getRoleInstructions(): string {
    return getDeveloperInstructions();
  }
}
