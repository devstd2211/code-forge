/**
 * Agent Context Manager - Manages isolated contexts for each agent.
 * Ensures that agents maintain independent conversation histories and
 * state that can be cleared between task iterations.
 */

import type { AgentContext, AgentMessage, AgentRole, Task } from '../types/index.js';

export class AgentContextManager {
  private contexts: Map<string, AgentContext>;

  constructor() {
    this.contexts = new Map();
  }

  /**
   * Create a new isolated context for an agent.
   */
  createContext(agentId: string, role: AgentRole): AgentContext {
    const context: AgentContext = {
      agentId,
      role,
      conversationHistory: [],
      tokenUsage: 0,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    };

    this.contexts.set(agentId, context);
    return context;
  }

  /**
   * Retrieve an agent's context.
   */
  getContext(agentId: string): AgentContext | undefined {
    return this.contexts.get(agentId);
  }

  /**
   * Clear an agent's context (conversation history and current task).
   * Preserves agent metadata and token usage statistics.
   */
  clearContext(agentId: string): void {
    const context = this.contexts.get(agentId);
    if (context) {
      context.conversationHistory = [];
      context.currentTask = undefined;
      context.lastActivityAt = new Date().toISOString();
    }
  }

  /**
   * Add a message to an agent's conversation history.
   */
  addMessage(agentId: string, message: AgentMessage): void {
    const context = this.contexts.get(agentId);
    if (context) {
      context.conversationHistory.push(message);
      context.lastActivityAt = new Date().toISOString();

      if (message.tokensUsed) {
        context.tokenUsage += message.tokensUsed;
      }
    }
  }

  /**
   * Get all messages from an agent's conversation history.
   */
  getMessages(agentId: string): AgentMessage[] {
    const context = this.contexts.get(agentId);
    return context?.conversationHistory || [];
  }

  /**
   * Set the current task being worked on by an agent.
   */
  setCurrentTask(agentId: string, task: Task): void {
    const context = this.contexts.get(agentId);
    if (context) {
      context.currentTask = task;
      context.lastActivityAt = new Date().toISOString();
    }
  }

  /**
   * Get the current task an agent is working on.
   */
  getCurrentTask(agentId: string): Task | undefined {
    const context = this.contexts.get(agentId);
    return context?.currentTask;
  }

  /**
   * Get total tokens used by an agent across all interactions.
   */
  getTokenUsage(agentId: string): number {
    const context = this.contexts.get(agentId);
    return context?.tokenUsage || 0;
  }

  /**
   * Reset all contexts.
   */
  resetAll(): void {
    this.contexts.clear();
  }

  /**
   * Get all active contexts.
   */
  getAllContexts(): AgentContext[] {
    return Array.from(this.contexts.values());
  }
}
