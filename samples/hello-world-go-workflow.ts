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
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  CodeForge Workflow Sample: Hello World in Go           │');
  console.log('│  Architect → Developer → Reviewer (with error fixing)   │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

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

  // ========== STEP 1: ARCHITECTURE ==========
  console.log('┌─ STEP 1: ARCHITECTURE DESIGN ──────────────────────────────┐\n');

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

  const architecture = await workflow.startArchitecture(requirements);

  console.log('Architect created architecture with components:');
  architecture.componentBreakdown.forEach((comp, idx) => {
    console.log(`  ${idx + 1}. ${comp.name} - ${comp.description}`);
  });

  // ========== STEP 2: TASK EXECUTION ==========
  console.log('\n┌─ STEP 2: TASK EXECUTION WITH FEEDBACK LOOP ───────────────┐\n');

  const tasks = workflow.getTasks();

  // Process all tasks
  for (let taskIdx = 0; taskIdx < tasks.length; taskIdx++) {
    const task = tasks[taskIdx];
    console.log(`\n>>> TASK ${taskIdx + 1}: ${task.componentName}`);
    console.log('─'.repeat(60));

    // Reset review and development state for this task
    (reviewerModel as MockDeepSeekAdapter).resetReviewPass();
    (developerModel as MockGPTAdapter).setIterationCount(0);

    // ========== ITERATION 1 ==========
    console.log('\n[PHASE 1] Developer Iteration 1 - Initial Implementation');
    console.log('→ Developer writes code');

    const devResult1 = await developerModel.analyze({
      component: { name: task.componentName, sourcePath: 'main.go' },
      context: { projectName: 'hello-world-go', componentCount: 2, totalLOC: 0, language: 'go' },
      role: 'developer',
      task: 'develop'
    });

    console.log(`\nDeveloper Response (first 300 chars):`);
    console.log(devResult1.summary.substring(0, 300) + '...');
    console.log(`✓ Tokens used: ${devResult1.metadata?.tokensUsed?.total || 0}`);

    console.log('\n[PHASE 2] Reviewer Iteration 1 - First Review');
    console.log('→ Reviewer analyzes code');

    const reviewResult1 = await reviewerModel.analyze({
      component: { name: task.componentName, sourcePath: 'main.go' },
      context: { projectName: 'hello-world-go', componentCount: 2, totalLOC: 0, language: 'go' },
      role: 'reviewer',
      task: 'review'
    });

    // Check if there are critical issues
    const hasCriticalIssues = reviewResult1.findings.some(f => f.severity === 'critical');

    if (hasCriticalIssues) {
      console.log(`\n🚨 CRITICAL ISSUES FOUND:`);
      reviewResult1.findings.forEach(finding => {
        if (finding.severity === 'critical') {
          console.log(`   ⚠️  [${finding.severity.toUpperCase()}] ${finding.description}`);
          console.log(`       Location: ${finding.location}`);
          console.log(`       Fix: ${finding.suggestion}`);
        }
      });
      console.log(`✓ Reviewer tokens used: ${reviewResult1.metadata?.tokensUsed?.total || 0}`);
      console.log('\n❌ DECISION: REJECTED - Must fix critical issues');

      // ========== ITERATION 2: FIX ==========
      console.log('\n[PHASE 1] Developer Iteration 2 - Fixed Implementation');
      console.log('→ Developer fixes the issues');

      // Increment iteration count on developer
      (developerModel as MockGPTAdapter).setIterationCount(1);

      const devResult2 = await developerModel.analyze({
        component: { name: task.componentName, sourcePath: 'main.go' },
        context: { projectName: 'hello-world-go', componentCount: 2, totalLOC: 0, language: 'go' },
        role: 'developer',
        task: 'develop'
      });

      console.log(`\nDeveloper Response (fixed code):`);
      console.log(devResult2.summary.substring(0, 300) + '...');
      console.log(`✓ Tokens used: ${devResult2.metadata?.tokensUsed?.total || 0}`);

      console.log('\n[PHASE 2] Reviewer Iteration 2 - Second Review');
      console.log('→ Reviewer checks the fixed code');

      // Set review pass to 1 to get approval response
      (reviewerModel as MockDeepSeekAdapter).setReviewPass(1);

      const reviewResult2 = await reviewerModel.analyze({
        component: { name: task.componentName, sourcePath: 'main.go' },
        context: { projectName: 'hello-world-go', componentCount: 2, totalLOC: 0, language: 'go' },
        role: 'reviewer',
        task: 'review'
      });

      console.log(`\n✅ APPROVED - Code meets quality standards`);
      console.log(reviewResult2.summary.substring(0, 200) + '...');
      console.log(`✓ Reviewer tokens used: ${reviewResult2.metadata?.tokensUsed?.total || 0}`);
    } else {
      console.log(`\n✅ APPROVED - Code meets quality standards`);
      console.log(reviewResult1.summary.substring(0, 200) + '...');
      console.log(`✓ Reviewer tokens used: ${reviewResult1.metadata?.tokensUsed?.total || 0}`);
    }
  }

  // ========== STEP 3: TOKEN SUMMARY ==========
  console.log('\n┌─ STEP 3: WORKFLOW SUMMARY ────────────────────────────────┐\n');

  const metrics = workflow.getTokenMetrics();

  console.log('Token Usage Summary:');
  console.log(`  Architect:  ${metrics.byAgent.architect.toLocaleString()} tokens`);
  console.log(`  Developer:  ${metrics.byAgent.developer.toLocaleString()} tokens (2 iterations)`);
  console.log(`  Reviewer:   ${metrics.byAgent.reviewer.toLocaleString()} tokens (2 reviews)`);
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

  // ========== CONCLUSION ==========
  console.log('\n┌─ WORKFLOW COMPLETION ─────────────────────────────────────┐\n');

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
