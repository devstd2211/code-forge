/**
 * Develop Command - Interactive development workflow.
 * Implements the architect → developer → reviewer → approve cycle.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReviewCommandArgs, AdvancedModeConfig } from '../../types/index.js';
import { loadConfig } from '../../config/config-loader.js';
import { ModelFactory } from '../../models/model-factory.js';
import { ToolFactory } from '../../tools/tool-factory.js';
import { ToolExecutor } from '../../tools/executor.js';
import { AgentFactory } from '../../agents/agent-factory.js';
import { WorkflowManager } from '../../core/workflow-manager.js';

/**
 * Execute the develop command - interactive workflow.
 */
export async function developCommand(projectName: string, args: any): Promise<void> {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          EDISON INTERACTIVE DEVELOPMENT WORKFLOW           ║');
    console.log('║     Architect → Developer → Reviewer → Approval → Code    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

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
    console.log('┌─ STEP 1: ARCHITECTURE ─────────────────────────────────┐');
    const architecture = await workflow.startArchitecture(requirements);

    // Save architecture
    const archPath = path.resolve(args.output || 'architecture.json');
    fs.writeFileSync(archPath, JSON.stringify(architecture, null, 2));
    console.log(`✓ Architecture saved to ${archPath}`);

    // STEP 2: Task Execution with Developer ↔ Reviewer Feedback Loop
    console.log('\n┌─ STEP 2: TASK EXECUTION ───────────────────────────────┐');
    const tasks = workflow.getTasks();
    let allApproved = true;

    for (const task of tasks) {
      console.log(`\n[${task.priority}/${tasks.length}] ${task.componentName}`);
      console.log('─'.repeat(60));

      // Execute task with review loop (Developer → Reviewer → Approval)
      const completedTask = await workflow.executeTaskWithReviewLoop(task);

      if (completedTask.status === 'completed') {
        console.log(`✓ Task completed and committed`);

        // Save implementation code
        if (completedTask.implementation) {
          const codePath = path.resolve(
            args.output || '.',
            `${completedTask.componentName}.component.ts`
          );
          fs.writeFileSync(codePath, completedTask.implementation.sourceCode);
          console.log(`✓ Component code saved to ${codePath}`);
        }

        // Show token usage for this task
        console.log(`\nToken Usage for ${task.componentName}:`);
        console.log(`  Architecture: ${completedTask.tokenUsage.architecture}`);
        console.log(
          `  Development: ${completedTask.tokenUsage.development.join(', ') || 'N/A'}`
        );
        console.log(`  Review: ${completedTask.tokenUsage.review.join(', ') || 'N/A'}`);
        console.log(`  Total: ${completedTask.tokenUsage.total}`);
      } else {
        console.log(
          `✗ Task incomplete after ${completedTask.iterationCount} iterations`
        );
        allApproved = false;
      }
    }

    // STEP 3: Token Usage Summary
    console.log('\n┌─ STEP 3: TOKEN USAGE SUMMARY ──────────────────────────┐');
    const metrics = workflow.getTokenMetrics();

    console.log('\nTokens by Agent:');
    console.log(`  Architect:  ${metrics.byAgent.architect.toLocaleString()} tokens`);
    console.log(`  Developer:  ${metrics.byAgent.developer.toLocaleString()} tokens`);
    console.log(`  Reviewer:   ${metrics.byAgent.reviewer.toLocaleString()} tokens`);
    console.log(`  ───────────────────────────────`);
    console.log(`  Total:      ${metrics.byPhase.total.toLocaleString()} tokens`);

    console.log('\nTokens by Phase:');
    console.log(`  Architecture: ${metrics.byPhase.architecture.toLocaleString()} tokens`);
    console.log(`  Development:  ${metrics.byPhase.development.toLocaleString()} tokens`);
    console.log(`  Review:       ${metrics.byPhase.review.toLocaleString()} tokens`);

    console.log('\nEstimated Cost (USD):');
    console.log(
      `  Architect:  $${metrics.estimatedCost.architect.toFixed(4)}`
    );
    console.log(
      `  Developer:  $${metrics.estimatedCost.developer.toFixed(4)}`
    );
    console.log(
      `  Reviewer:   $${metrics.estimatedCost.reviewer.toFixed(4)}`
    );
    console.log(
      `  ───────────────────────────────`
    );
    console.log(`  Total:      $${metrics.estimatedCost.total.toFixed(4)}`);

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
    fs.writeFileSync(metricsPath, JSON.stringify(metricsLog, null, 2));
    console.log(`\n✓ Metrics saved to ${metricsPath}`);

    // STEP 4: Generate Project Structure
    console.log('\n┌─ STEP 4: PROJECT SUMMARY ──────────────────────────────┐');
    const projectStructure = workflow.generateProjectStructure();
    console.log(projectStructure);

    if (args.output) {
      const structurePath = path.resolve(args.output, 'PROJECT_STRUCTURE.md');
      fs.writeFileSync(structurePath, projectStructure);
      console.log(`\n✓ Project structure saved to ${structurePath}`);
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
        review: t.currentReview
          ? {
              decision: t.currentReview.decision,
              issueCount: t.currentReview.issues.length,
              tokensUsed: t.currentReview.tokensUsed
            }
          : null
      }))
    };

    if (args.output) {
      const historyPath = path.resolve(args.output, 'workflow-history.json');
      fs.writeFileSync(historyPath, JSON.stringify(workflowHistory, null, 2));
      console.log(`✓ Workflow history saved to ${historyPath}`);
    }

    console.log(`\n✓ Workflow ${allApproved ? 'completed' : 'completed with partial results'}`);

    // Final status
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    if (allApproved) {
      console.log('║                   ✓ WORKFLOW COMPLETE                     ║');
      console.log('║            All components approved and ready!             ║');
    } else {
      console.log('║                   ⚠ WORKFLOW COMPLETE                     ║');
      console.log('║        Some components need further iteration             ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Save conversation history
    if (args.verbose) {
      const history = workflow.getConversationHistory();
      const historyPath = path.resolve(args.output || '.', 'workflow-history.json');
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      console.log(`Conversation history saved to ${historyPath}`);
    }
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
