#!/usr/bin/env node

/**
 * CLI Entry Point - Command-line interface for CodeForge.
 * Handles argument parsing and command routing.
 * Supports two main modes:
 * 1. review - Analyze existing code
 * 2. develop - Interactive workflow for new development
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { reviewCommand } from './commands/review.js';
import { developCommand } from './commands/develop.js';

// Load environment variables
dotenv.config();

/**
 * Create and configure CLI.
 */
const program = new Command();

program
  .name('edison-cli')
  .description('Triple-Model Code Review & Development CLI - Architect → Developer → Reviewer → Code')
  .version('0.2.0');

// Review command - Analyze existing code
program
  .command('review <component>')
  .description('Analyze existing code component (code review mode)')
  .option('--model <name>', 'Model to use (claude, gpt, deepseek)', 'claude')
  .option('--type <type>', 'Model type/version')
  .option('--mode <mode>', 'Execution mode (simple, advanced)', 'simple')
  .option('--config <path>', 'Configuration file path')
  .option('--output <path>', 'Output file path')
  .option('--format <format>', 'Output format (json, markdown, html, text)', 'text')
  .option('--verbose', 'Verbose output')
  .option('--dry-run', 'Dry run (no API calls)')
  .action(async (component, options) => {
    try {
      await reviewCommand(component, options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Develop command - Interactive workflow
program
  .command('develop <project>')
  .alias('workflow')
  .description('Interactive development workflow: architect → developer → reviewer → approve → code')
  .option('--requirements <text>', 'System requirements/specification')
  .option('--config <path>', 'Configuration file path')
  .option('--output <path>', 'Output directory path (default: current directory)')
  .option('--verbose', 'Show detailed workflow messages')
  .option('--dry-run', 'Dry run (test configuration without API calls)')
  .option('--skip-approval', 'Auto-approve iterations (for testing)')
  .action(async (project, options) => {
    try {
      await developCommand(project, options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Examples command
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(`
📚 CodeForge CLI Examples
=========================

1. CODE REVIEW MODE (Analyze existing code)
──────────────────────────────────────────

  # Quick review with Claude
  npm run dev -- review src/api.ts

  # Advanced review with all 3 models
  npm run dev -- review src/core.ts --mode advanced

  # Save results as JSON
  npm run dev -- review src/app.ts --format json --output report.json

2. INTERACTIVE DEVELOPMENT MODE (New project development)
──────────────────────────────────────────────────────────

  # Start interactive workflow with requirements
  npm run dev -- develop my-project \\
    --requirements "Build a monitoring system with high availability"

  # With custom configuration
  npm run dev -- develop my-project \\
    --requirements "Build API gateway" \\
    --config custom-config.json

  # Verbose mode to see all agent communications
  npm run dev -- develop my-project \\
    --requirements "New microservice" \\
    --verbose

3. WORKFLOW EXPLANATION
───────────────────────

  Step 1: ARCHITECT (Claude)
    → Analyzes requirements
    → Designs system architecture
    → Applies SOLID principles
    → Plans components breakdown

  Step 2: DEVELOPER (GPT)
    → Takes architectural plan
    → Implements each component
    → Iterates based on feedback
    → Generates production code

  Step 3: REVIEWER (DeepSeek)
    → Reviews code quality
    → Checks security
    → Validates testing
    → Flags critical issues

  Step 4: APPROVAL
    → User reviews findings
    → Approves or rejects iteration
    → If rejected: developer revises

  Step 5: CODE GENERATION
    → Approved code committed
    → Architecture documented
    → Project structure generated

4. ENVIRONMENT SETUP
─────────────────────

  export ANTHROPIC_API_KEY=sk-ant-...
  export OPENAI_API_KEY=sk-...
  export DEEPSEEK_API_KEY=sk-...

5. CONFIGURATION
──────────────────

  Create config.json:
  {
    "mode": "advanced",
    "roles": {
      "architect": {"model": "claude", "modelType": "claude-opus-4-1"},
      "developer": {"model": "gpt", "modelType": "gpt-4-turbo"},
      "reviewer": {"model": "deepseek", "modelType": "deepseek-chat"}
    }
  }

📖 For full documentation, see README.md or USAGE_GUIDE.md
    `);
  });

// Help command
program
  .command('help')
  .description('Show help')
  .action(() => {
    program.outputHelp();
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (process.argv.length === 2) {
  program.outputHelp();
}
