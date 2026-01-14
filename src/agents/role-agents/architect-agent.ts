/**
 * ArchitectAgent - Agent specialized in system architecture analysis.
 * Focuses on design patterns, scalability, and structural issues.
 */

import type { IModel, ITool, AgentRole } from '../../types/index.js';
import { BaseAgent } from '../base-agent.js';
import { getSystemPrompt, getArchitectInstructions } from '../../config/system-prompts.js';
import { ToolExecutor } from '../../tools/executor.js';

/**
 * Architect role agent - analyzes code from an architectural perspective.
 */
export class ArchitectAgent extends BaseAgent {
  constructor(
    model: IModel,
    assignedTools: ITool[],
    toolExecutor: ToolExecutor
  ) {
    super(model, 'architect' as AgentRole, assignedTools, toolExecutor);
  }

  /**
   * Get the system prompt for architect role.
   */
  getSystemPrompt(): string {
    return getSystemPrompt('architect');
  }

  /**
   * Get architect-specific instructions.
   */
  getRoleInstructions(): string {
    return getArchitectInstructions();
  }
}
