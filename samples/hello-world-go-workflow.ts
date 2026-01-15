/**
 * Sample Workflow - Hello World Go Application
 *
 * Demonstrates the complete CodeForge workflow:
 * 1. Architect designs the system (2 tasks)
 * 2. Developer implements first task (with error)
 * 3. Reviewer finds the error (division by zero)
 * 4. Developer fixes the error
 * 5. Reviewer approves the fixed code
 * 6. Process repeats for second task
 *
 * Run with: npx ts-node samples/hello-world-go-workflow.ts
 */

import * as fs from 'fs';
import { MockClaudeAdapter } from '../src/models/adapters/mock-claude-adapter.js';
import { MockGPTAdapter } from '../src/models/adapters/mock-gpt-adapter.js';
import { MockDeepSeekAdapter } from '../src/models/adapters/mock-deepseek-adapter.js';
import { WorkflowManager } from '../src/core/workflow-manager.js';
import { AgentFactory } from '../src/agents/agent-factory.js';
import { ToolExecutor } from '../src/tools/executor.js';
import type { ToolConfiguration } from '../src/types/index.js';

/**
 * Main sample workflow function
 */
async function runHelloWorldWorkflow() {
  console.log('───────────────────────────────────────────────────────────');
  console.log('  CodeForge Workflow Sample: Hello World in Go');
  console.log('  Architect → Developer → Reviewer (with error fixing)');
  console.log('───────────────────────────────────────────────────────────\n');

  // ========== SETUP ==========
  console.log('Setting up mock models and agents...\n');

  // Create mock adapters
  const architectModel = new MockClaudeAdapter('claude-sonnet-4-5', 'mock-key');
  const developerModel = new MockGPTAdapter('gpt-4-turbo', 'mock-key');
  const reviewerModel = new MockDeepSeekAdapter('deepseek-chat', 'mock-key');

  // Create mock tools configuration
  const toolConfig: ToolConfiguration = {
    enabled: [],
    securityRules: {
      allowedPaths: ['./src', './samples'],
      forbiddenPaths: ['./.git', './node_modules'],
      maxFileSize: 10485760,
      timeoutMs: 30000
    }
  };

  // Create tool executor (empty since we're mocking)
  const toolExecutor = new ToolExecutor([], toolConfig.securityRules);

  // Create agents
  const architectAgent = AgentFactory.createAgent('architect', architectModel, [], toolExecutor);
  const developerAgent = AgentFactory.createAgent('developer', developerModel, [], toolExecutor);
  const reviewerAgent = AgentFactory.createAgent('reviewer', reviewerModel, [], toolExecutor);

  // Create workflow manager
  const workflow = new WorkflowManager(
    'hello-world-go',
    {
      projectName: 'hello-world-go',
      componentCount: 0,
      totalLOC: 0,
      language: 'go',
      framework: 'standard-lib'
    },
    architectAgent,
    developerAgent,
    reviewerAgent,
    toolExecutor
  );

  // ========== ORCHESTRATE FULL WORKFLOW ==========
  const requirements = `Create a simple "Hello, World!" application in Go.
The application should:
1. Have a proper Go module structure
2. Print "Hello, World!" to console
3. Be organized in two phases: setup and output

Target: Two-phase implementation
- Phase 1: Project structure and main function scaffold
- Phase 2: Console output functionality`;

  console.log('Requirements:');
  console.log(requirements);
  console.log('\n');

  // Run full 3-agent workflow: Architect orchestrates Dev-Review loops
  const workflowState = await workflow.orchestrateWorkflow(requirements);

  // ========== STEP 3: TOKEN SUMMARY ==========
  console.log('\n─ STEP 3: WORKFLOW SUMMARY ────────────────────────────────\n');

  const metrics = workflow.getTokenMetrics();

  console.log('Token Usage Summary:');
  console.log(`  Architect:  ${metrics.byAgent.architect.toLocaleString()} tokens`);
  console.log(`  Developer:  ${metrics.byAgent.developer.toLocaleString()} tokens`);
  console.log(`  Reviewer:   ${metrics.byAgent.reviewer.toLocaleString()} tokens`);
  console.log(`  ───────────────────────`);
  console.log(`  Total:      ${metrics.byPhase.total.toLocaleString()} tokens`);

  console.log('\nEstimated Cost:');
  console.log(`  Architect:  $${metrics.estimatedCost.architect.toFixed(4)}`);
  console.log(`  Developer:  $${metrics.estimatedCost.developer.toFixed(4)}`);
  console.log(`  Reviewer:   $${metrics.estimatedCost.reviewer.toFixed(4)}`);
  console.log(`  ───────────────────────`);
  console.log(`  Total:      $${metrics.estimatedCost.total.toFixed(4)}`);

  console.log('\nPhase Breakdown:');
  console.log(`  Architecture: ${metrics.byPhase.architecture.toLocaleString()} tokens`);
  console.log(`  Development:  ${metrics.byPhase.development.toLocaleString()} tokens`);
  console.log(`  Review:       ${metrics.byPhase.review.toLocaleString()} tokens`);

  // ========== STEP 4: SAVE JSON LOGS ==========
  console.log('\n─ STEP 4: SAVING METRICS AND HISTORY ───────────────────────\n');

  // Save metrics
  const metricsLog = {
    timestamp: new Date().toISOString(),
    projectName: 'hello-world-go',
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

  const metricsPath = 'metrics-hello-world.json';
  fs.writeFileSync(metricsPath, JSON.stringify(metricsLog, null, 2));
  console.log(`✓ Metrics saved to ${metricsPath}`);

  // Save workflow history
  const workflowHistory = {
    timestamp: new Date().toISOString(),
    projectName: 'hello-world-go',
    requirements,
    workflow: {
      totalTokens: metrics.byPhase.total,
      totalCost: metrics.estimatedCost.total,
      status: 'completed',
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

  const historyPath = 'workflow-history-hello-world.json';
  fs.writeFileSync(historyPath, JSON.stringify(workflowHistory, null, 2));
  console.log(`✓ Workflow history saved to ${historyPath}`);

  // ========== CONCLUSION ==========
  console.log('\n─ WORKFLOW COMPLETION ─────────────────────────────────────\n');

  console.log('✅ Sample Workflow Complete!');
  console.log('\nDemonstrated Features:');
  console.log('  ✓ Architect designing system architecture');
  console.log('  ✓ Breaking down into manageable tasks');
  console.log('  ✓ Developer implementing with initial error');
  console.log('  ✓ Reviewer finding critical issue (division by zero)');
  console.log('  ✓ Developer iterating and fixing the error');
  console.log('  ✓ Reviewer approving fixed code');
  console.log('  ✓ Token tracking across all phases');
  console.log('  ✓ Cost estimation for API usage');

  console.log('\n✨ Workflow demonstrates complete feedback loop!');
  console.log('\nTo test with real API calls:');
  console.log('  1. Replace mock adapters with real adapters');
  console.log('  2. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY');
  console.log('  3. Create config.json with your model preferences');
  console.log('  4. Run: npm run dev -- develop hello-world --requirements "..."');
}

// Run the workflow
runHelloWorldWorkflow().catch(console.error);
