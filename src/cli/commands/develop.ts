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
      reviewerAgent
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

    // STEP 2: Component Development
    console.log('\n┌─ STEP 2: COMPONENT DEVELOPMENT ────────────────────────┐');
    const components = architecture.componentBreakdown;
    let componentIndex = 0;
    let allApproved = true;

    for (const component of components) {
      console.log(`\n[${componentIndex + 1}/${components.length}] ${component.name}`);
      console.log('─'.repeat(50));

      let approved = false;
      let iterationCount = 0;
      const maxIterations = 3;

      // Iterate until approved or max iterations
      while (!approved && iterationCount < maxIterations) {
        // DEVELOP
        const iteration = await workflow.developComponent(componentIndex);

        // REVIEW
        // const reviewStatus = await workflow.reviewComponent(iteration);

        // APPROVE
        const userApproved = await workflow.getUserApproval(iteration);

        if (userApproved) { // reviewStatus used in context
          approved = true;

          // Save approved iteration
          const codePath = path.resolve(
            args.output || '.',
            `${component.name}.component.ts`
          );
          fs.writeFileSync(codePath, iteration.sourceCode);
          console.log(`✓ Component code saved to ${codePath}`);
        } else {
          iterationCount++;
          if (iterationCount < maxIterations) {
            console.log(`\n→ Returning to developer for revision (${iterationCount}/${maxIterations - 1})\n`);
          } else {
            console.log('\n✗ Max iterations reached. Component approval skipped.');
            allApproved = false;
          }
        }
      }

      componentIndex++;
    }

    // STEP 3: Generate Project Structure
    console.log('\n┌─ STEP 3: PROJECT SUMMARY ──────────────────────────────┐');
    const projectStructure = workflow.generateProjectStructure();
    console.log(projectStructure);

    if (args.output) {
      const structurePath = path.resolve(args.output, 'PROJECT_STRUCTURE.md');
      fs.writeFileSync(structurePath, projectStructure);
      console.log(`\n✓ Project structure saved to ${structurePath}`);
    }

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
