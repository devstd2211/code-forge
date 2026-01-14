/**
 * Review Command - Main analysis command.
 * Implements the 'review' CLI command.
 * Supports both simple mode (single model) and advanced mode (three models with consensus).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ComponentReference, ReviewCommandArgs, AgentRole, ModelName, AdvancedModeConfig } from '../../types/index.js';
import { loadConfig } from '../../config/config-loader.js';
import { ModelFactory } from '../../models/model-factory.js';
import { ToolFactory } from '../../tools/tool-factory.js';
import { ToolExecutor } from '../../tools/executor.js';
import { Orchestrator } from '../../core/orchestrator.js';
import { OutputFormatter } from '../output-formatter.js';

/**
 * Execute the review command.
 */
export async function reviewCommand(componentPath: string, args: any): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig(args as ReviewCommandArgs);

    // Build component reference
    const component = buildComponentReference(componentPath);

    // Check if component file exists
    const sourcePath = path.resolve(component.sourcePath);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Component file not found: ${sourcePath}`);
    }

    // Dry run mode
    if (args.dryRun) {
      console.log('Dry run mode - no API calls will be made');
      console.log('Component:', component);
      console.log('Config:', config);
      return;
    }

    // Validate API keys are available
    const hasAnthropicKey = config.apiKeys.claude || process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = config.apiKeys.openai || process.env.OPENAI_API_KEY;
    const hasDeepSeekKey = config.apiKeys.deepseek || process.env.DEEPSEEK_API_KEY;

    if (!hasAnthropicKey && !hasOpenAIKey && !hasDeepSeekKey) {
      throw new Error(
        'No API keys found. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY environment variables.'
      );
    }

    // Create tools
    const tools = ToolFactory.createTools(config.tools);
    const toolExecutor = new ToolExecutor(
      tools,
      config.tools.securityRules,
      config.tools.securityRules.timeoutMs
    );

    // Read component source code
    const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

    // Execute analysis based on mode
    let response;

    if (config.mode === 'simple') {
      response = await executeSimpleMode(
        config,
        component,
        toolExecutor,
        sourceCode,
        args
      );
    } else {
      response = await executeAdvancedMode(
        config,
        component,
        toolExecutor,
        sourceCode,
        args
      );
    }

    // Format and display output
    const formatter = new OutputFormatter();
    const formatted = formatter.format(response, args.format || 'text');

    // Output results
    if (args.output) {
      // Write to file
      const outputPath = path.resolve(args.output);
      fs.writeFileSync(outputPath, formatted);
      console.log(`Results written to: ${outputPath}`);
    } else {
      // Print to console
      console.log(formatted);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Review command failed: ${message}`);
  }
}

/**
 * Execute analysis in simple mode (single model).
 */
async function executeSimpleMode(
  config: any,
  component: ComponentReference,
  toolExecutor: ToolExecutor,
  sourceCode: string,
  args: any
): Promise<any> {
  // Get model configuration from simple mode config
  const simpleConfig = config.roles as any;
  const modelName: ModelName = args.model || simpleConfig.model || 'claude';
  const modelType = args.type || simpleConfig.modelType || 'claude-sonnet-4-5';
  const role: AgentRole = simpleConfig.role || 'architect';

  if (args.verbose) {
    console.log('Executing in SIMPLE mode');
    console.log(`  Component: ${component.name}`);
    console.log(`  Model: ${modelName} (${modelType})`);
    console.log(`  Role: ${role}`);
  }

  // Create model
  const model = ModelFactory.create(modelName, modelType, config.apiKeys as any);

  // Create orchestrator
  const orchestrator = new Orchestrator(model, toolExecutor, config.retryPolicy);

  // Execute analysis
  const response = await orchestrator.executeSimple(
    component,
    modelName,
    role,
    {
      projectName: 'edison-cli',
      componentCount: 1,
      totalLOC: sourceCode.split('\n').length,
      language: 'typescript',
      framework: 'node'
    }
  );

  return response;
}

/**
 * Execute analysis in advanced mode (three models with consensus).
 */
async function executeAdvancedMode(
  config: any,
  component: ComponentReference,
  toolExecutor: ToolExecutor,
  sourceCode: string,
  args: any
): Promise<any> {
  const advancedConfig = config.roles as AdvancedModeConfig;

  if (args.verbose) {
    console.log('Executing in ADVANCED mode');
    console.log(`  Component: ${component.name}`);
    console.log(`  Architect: ${advancedConfig.architect.model} (${advancedConfig.architect.modelType})`);
    console.log(`  Developer: ${advancedConfig.developer.model} (${advancedConfig.developer.modelType})`);
    console.log(`  Reviewer: ${advancedConfig.reviewer.model} (${advancedConfig.reviewer.modelType})`);
  }

  // Create three models for different roles
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

  // Create orchestrator
  const orchestrator = new Orchestrator(architectModel, toolExecutor, config.retryPolicy);

  // Execute advanced analysis
  const response = await orchestrator.executeAdvanced(
    component,
    architectModel,
    developerModel,
    reviewerModel,
    {
      projectName: 'edison-cli',
      componentCount: 1,
      totalLOC: sourceCode.split('\n').length,
      language: 'typescript',
      framework: 'node'
    }
  );

  return response;
}

/**
 * Build component reference from path.
 */
function buildComponentReference(componentPath: string): ComponentReference {
  const fullPath = path.resolve(componentPath);
  const name = path.basename(componentPath, path.extname(componentPath));

  return {
    name,
    sourcePath: fullPath,
    testPath: fullPath.replace(/\.(ts|js)$/, '.test.$1')
  };
}
