/**
 * Develop Command - Interactive development workflow.
 * Implements the architect → developer → reviewer → approve cycle.
 */

import * as path from 'path';
import type { ReviewCommandArgs, AdvancedModeConfig } from '../../types/index.js';
import { loadConfig } from '../../config/config-loader.js';
import { ModelFactory } from '../../models/model-factory.js';
import { ToolFactory } from '../../tools/tool-factory.js';
import { ToolExecutor } from '../../tools/executor.js';
import { AgentFactory } from '../../agents/agent-factory.js';
import { WorkflowManager } from '../../core/workflow-manager.js';
import { WorkflowOutputFormatter } from '../workflow-output-formatter.js';

/**
 * Execute the develop command - interactive workflow.
 */
export async function developCommand(projectName: string, args: any): Promise<void> {
  try {
    // Initialize output formatter
    const outputFormatter = new WorkflowOutputFormatter();
    outputFormatter.printWorkflowHeader();

    // Load configuration (use advanced mode for workflow)
    const config = loadConfig({
      component: 'workflow',
      mode: 'advanced',
      ...args
    } as ReviewCommandArgs);

    // Validate API keys
    const hasAnthropicKey = config.apiKeys.claude || process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = config.apiKeys.openai || process.env.OPENAI_API_KEY;
    const hasDeepSeekKey = config.apiKeys.deepseek || process.env.DEEPSEEK_API_KEY;

    if (!hasAnthropicKey && !hasOpenAIKey && !hasDeepSeekKey) {
      throw new Error(
        'No API keys found. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY environment variables.'
      );
    }

    // Create tools and executor
    const tools = ToolFactory.createTools(config.tools);
    const toolExecutor = new ToolExecutor(
      tools,
      config.tools.securityRules,
      config.tools.securityRules.timeoutMs
    );

    // Create three models
    const advancedConfig = config.roles as AdvancedModeConfig;

    const architectModel = ModelFactory.create(
      advancedConfig.architect.model,
      advancedConfig.architect.modelType,
      config.apiKeys as any
    );

    const developerModel = ModelFactory.create(
      advancedConfig.developer.model,
      advancedConfig.developer.modelType,
      config.apiKeys as any
    );

    const reviewerModel = ModelFactory.create(
      advancedConfig.reviewer.model,
      advancedConfig.reviewer.modelType,
      config.apiKeys as any
    );

    // Create agents
    const architectAgent = AgentFactory.createAgent('architect', architectModel, tools, toolExecutor);
    const developerAgent = AgentFactory.createAgent('developer', developerModel, tools, toolExecutor);
    const reviewerAgent = AgentFactory.createAgent('reviewer', reviewerModel, tools, toolExecutor);

    // Create workflow manager
    const workflow = new WorkflowManager(
      projectName,
      {
        projectName,
        componentCount: 0,
        totalLOC: 0,
        language: 'typescript',
        framework: 'node'
      },
      architectAgent,
      developerAgent,
      reviewerAgent,
      toolExecutor
    );

    // Get requirements from user/input
    const requirements = args.requirements || getDefaultRequirements();

    if (args.verbose) {
      console.log('Requirements:');
      console.log(requirements);
      console.log('\n');
    }

    // STEP 1: Architecture
    outputFormatter.printArchitecturePhase();
    const architecture = await workflow.startArchitecture(requirements);

    // Save architecture
    const archPath = path.resolve(args.output || 'architecture.json');
    outputFormatter.saveToFile(archPath, architecture);

    // STEP 2: Task Execution with Developer ↔ Reviewer Feedback Loop
    console.log('\n┌─ STEP 2: TASK EXECUTION ───────────────────────────────┐');
    const tasks = workflow.getTasks();
    let allApproved = true;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      outputFormatter.printTaskStart(task, i + 1, tasks.length);

      // Execute task with review loop (Developer → Reviewer → Approval)
      const completedTask = await workflow.executeTaskWithReviewLoop(task);

      if (completedTask.status === 'completed') {
        console.log(`✓ Task completed`);

        // Save implementation code
        if (completedTask.implementation) {
          const codePath = path.resolve(
            args.output || '.',
            `${completedTask.componentName}.component.ts`
          );
          outputFormatter.saveToFile(codePath, completedTask.implementation.sourceCode);
        }

        // Show token usage for this task
        const currentReview = completedTask.reviewHistory[completedTask.reviewHistory.length - 1];
        outputFormatter.printTaskComplete(task, true, currentReview?.issues);
      } else {
        console.log(
          `✗ Task incomplete after ${completedTask.iterationCount} iterations`
        );
        const currentReview = completedTask.reviewHistory[completedTask.reviewHistory.length - 1];
        outputFormatter.printTaskComplete(task, false, currentReview?.issues);
        allApproved = false;
      }
    }

    // STEP 3: Token Usage Summary
    const metrics = workflow.getTokenMetrics();
    outputFormatter.printTokenSummary(metrics);

    // Save metrics to JSON
    const metricsLog = {
      timestamp: new Date().toISOString(),
      projectName,
      totalTokens: metrics.byPhase.total,
      byAgent: metrics.byAgent,
      byPhase: metrics.byPhase,
      estimatedCost: metrics.estimatedCost,
      tasks: workflow.getTasks().map(t => ({
        id: t.id,
        name: t.componentName,
        status: t.status,
        iterations: t.iterationCount + 1,
        tokenUsage: t.tokenUsage
      }))
    };

    const metricsPath = path.resolve(args.output || '.', 'metrics.json');
    outputFormatter.saveToFile(metricsPath, metricsLog);

    // STEP 4: Generate Project Structure
    const projectStructure = workflow.generateProjectStructure();
    outputFormatter.printProjectStructure(projectStructure);

    if (args.output) {
      const structurePath = path.resolve(args.output, 'PROJECT_STRUCTURE.md');
      outputFormatter.saveToFile(structurePath, projectStructure);
    }

    // Save workflow history
    const workflowHistory = {
      timestamp: new Date().toISOString(),
      projectName,
      requirements,
      workflow: {
        totalTokens: metrics.byPhase.total,
        totalCost: metrics.estimatedCost.total,
        status: allApproved ? 'completed' : 'partial',
        completedTasks: workflow.getTasks().filter(t => t.status === 'completed').length,
        totalTasks: workflow.getTasks().length
      },
      tasks: workflow.getTasks().map(t => ({
        id: t.id,
        componentName: t.componentName,
        status: t.status,
        iterations: t.iterationCount + 1,
        maxIterations: t.maxIterations,
        tokenUsage: {
          architecture: t.tokenUsage.architecture,
          development: t.tokenUsage.development,
          review: t.tokenUsage.review,
          total: t.tokenUsage.total
        },
        review: (() => {
          const lastReview = t.reviewHistory[t.reviewHistory.length - 1];
          return lastReview
            ? {
                decision: lastReview.decision,
                issueCount: lastReview.issues.length,
                tokensUsed: lastReview.tokensUsed
              }
            : null;
        })()
      }))
    };

    if (args.output) {
      const historyPath = path.resolve(args.output, 'workflow-history.json');
      outputFormatter.saveToFile(historyPath, workflowHistory);
    }

    // Final status
    outputFormatter.printWorkflowComplete(allApproved);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Develop command failed: ${message}`);
  }
}

/**
 * Get default requirements for demonstration.
 */
function getDefaultRequirements(): string {
  return `
You are designing a system monitoring platform with the following requirements:

Functional Requirements:
1. Monitor system metrics (CPU, memory, disk, network)
2. Collect metrics from multiple hosts
3. Store time-series data
4. Provide real-time dashboards
5. Generate alerts based on thresholds
6. Generate reports and analytics

Non-Functional Requirements:
1. High availability (99.9% uptime)
2. Scalability (handle 1000+ hosts)
3. Low latency (< 100ms for dashboard updates)
4. Secure (encryption, authentication)
5. Maintainable (clean code, SOLID principles)

Design Constraints:
1. Use TypeScript/Node.js
2. Apply SOLID principles strictly
3. Modular and extensible architecture
4. Clear component boundaries
5. Dependency injection pattern

Please design the architecture with these considerations in mind.
`;
}
