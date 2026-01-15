import type { Task, AgentRole, WorkflowTokenMetrics, TaskTokenUsage, IAgent } from '../types/index.js';

export interface ModelPricing {
  input: number;
  output: number;
}

/**
 * Tracks and aggregates token usage across the entire workflow.
 * Single responsibility: Token metrics collection and reporting.
 */
export class WorkflowTokenTracker {
  private metrics: WorkflowTokenMetrics;
  private costCalculators: Map<AgentRole, ModelPricing>;

  constructor(
    architectAgent: IAgent,
    developerAgent: IAgent,
    reviewerAgent: IAgent
  ) {
    this.metrics = {
      byAgent: { architect: 0, developer: 0, reviewer: 0 },
      byTask: new Map(),
      byPhase: { architecture: 0, development: 0, review: 0, total: 0 },
      estimatedCost: { architect: 0, developer: 0, reviewer: 0, total: 0 }
    };

    // Extract pricing from model capabilities
    this.costCalculators = new Map([
      ['architect', architectAgent.model?.getCapabilities().costPer1kTokens || { input: 0, output: 0 }],
      ['developer', developerAgent.model?.getCapabilities().costPer1kTokens || { input: 0, output: 0 }],
      ['reviewer', reviewerAgent.model?.getCapabilities().costPer1kTokens || { input: 0, output: 0 }]
    ]);
  }

  /**
   * Record tokens from architecture phase.
   */
  recordArchitecture(agentRole: AgentRole, tokens: number): void {
    this.metrics.byPhase.architecture += tokens;
    this.metrics.byPhase.total += tokens;
    this.metrics.byAgent[agentRole] += tokens;
    this.updateCostEstimate(agentRole, tokens);
  }

  /**
   * Record tokens from development phase.
   */
  recordDevelopment(task: Task, agentRole: AgentRole, tokens: number): void {
    // Get or create task metrics
    let taskMetrics = this.metrics.byTask.get(task.id);
    if (!taskMetrics) {
      taskMetrics = {
        architecture: 0,
        development: [],
        review: [],
        total: 0
      };
      this.metrics.byTask.set(task.id, taskMetrics);
    }

    // Record tokens
    taskMetrics.development.push(tokens);
    task.tokenUsage.development.push(tokens);

    // Update aggregates
    this.metrics.byPhase.development += tokens;
    this.metrics.byPhase.total += tokens;
    this.metrics.byAgent[agentRole] += tokens;
    this.updateTaskTotal(task);
    this.updateCostEstimate(agentRole, tokens);
  }

  /**
   * Record tokens from review phase.
   */
  recordReview(task: Task, agentRole: AgentRole, tokens: number): void {
    // Get or create task metrics
    let taskMetrics = this.metrics.byTask.get(task.id);
    if (!taskMetrics) {
      taskMetrics = {
        architecture: 0,
        development: [],
        review: [],
        total: 0
      };
      this.metrics.byTask.set(task.id, taskMetrics);
    }

    // Record tokens
    taskMetrics.review.push(tokens);
    task.tokenUsage.review.push(tokens);

    // Update aggregates
    this.metrics.byPhase.review += tokens;
    this.metrics.byPhase.total += tokens;
    this.metrics.byAgent[agentRole] += tokens;
    this.updateTaskTotal(task);
    this.updateCostEstimate(agentRole, tokens);
  }

  /**
   * Get all aggregated metrics.
   */
  getMetrics(): WorkflowTokenMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics for a specific task.
   */
  getTaskMetrics(taskId: string): TaskTokenUsage | undefined {
    return this.metrics.byTask.get(taskId);
  }

  /**
   * Calculate cost for given tokens.
   */
  private calculateCost(tokens: number, pricing?: ModelPricing): number {
    if (!pricing) return 0;
    const avgPrice = (pricing.input + pricing.output) / 2;
    return (tokens / 1000) * avgPrice;
  }

  /**
   * Update cost estimate when new tokens are recorded.
   */
  private updateCostEstimate(agentRole: AgentRole, tokens: number): void {
    const pricing = this.costCalculators.get(agentRole);
    const cost = this.calculateCost(tokens, pricing);
    this.metrics.estimatedCost[agentRole] += cost;
    this.metrics.estimatedCost.total += cost;
  }

  /**
   * Update total tokens for a task.
   */
  private updateTaskTotal(task: Task): void {
    const taskMetrics = this.metrics.byTask.get(task.id);
    if (taskMetrics) {
      taskMetrics.total =
        taskMetrics.architecture +
        taskMetrics.development.reduce((a, b) => a + b, 0) +
        taskMetrics.review.reduce((a, b) => a + b, 0);
      task.tokenUsage.total = taskMetrics.total;
    }
  }
}
