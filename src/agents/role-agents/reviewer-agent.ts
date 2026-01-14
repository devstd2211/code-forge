/**
 * ReviewerAgent - Agent specialized in security and reliability analysis.
 * Focuses on vulnerabilities, testing, and error handling.
 */

import type { IModel, ITool, AgentRole } from '../../types/index.js';
import { BaseAgent } from '../base-agent.js';
import { getSystemPrompt, getReviewerInstructions } from '../../config/system-prompts.js';
import { ToolExecutor } from '../../tools/executor.js';

/**
 * Reviewer role agent - analyzes code from a security and reliability perspective.
 */
export class ReviewerAgent extends BaseAgent {
  constructor(
    model: IModel,
    assignedTools: ITool[],
    toolExecutor: ToolExecutor
  ) {
    super(model, 'reviewer' as AgentRole, assignedTools, toolExecutor);
  }

  /**
   * Get the system prompt for reviewer role.
   */
  getSystemPrompt(): string {
    return getSystemPrompt('reviewer');
  }

  /**
   * Get reviewer-specific instructions.
   */
  getRoleInstructions(): string {
    return getReviewerInstructions();
  }
}
