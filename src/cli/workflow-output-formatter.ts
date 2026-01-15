import * as fs from 'fs';
import * as path from 'path';
import type { Task, WorkflowTokenMetrics, ReviewIssue } from '../types/index.js';

/**
 * Formats and outputs all workflow-related information.
 * Single responsibility: Console output and file I/O for workflow commands.
 */
export class WorkflowOutputFormatter {
  /**
   * Print workflow header banner.
   */
  printWorkflowHeader(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          EDISON INTERACTIVE DEVELOPMENT WORKFLOW           ║');
    console.log('║     Architect → Developer → Reviewer → Approval → Code    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Print architecture phase header.
   */
  printArchitecturePhase(): void {
    console.log('┌─ STEP 1: ARCHITECTURE ─────────────────────────────────┐');
  }

  /**
   * Print task execution start.
   */
  printTaskStart(task: Task, taskNum: number, total: number): void {
    console.log(`\n[${taskNum}/${total}] ${task.componentName}`);
    console.log('─'.repeat(60));
  }

  /**
   * Print task completion with status.
   */
  printTaskComplete(task: Task, approved: boolean, issues?: ReviewIssue[]): void {
    if (approved) {
      console.log(`✓ Task completed`);
    } else {
      console.log(`❌ REJECTED - Issues found:`);
      if (issues) {
        issues.forEach(issue => {
          console.log(`  [${issue.severity.toUpperCase()}] ${issue.description}`);
          if (issue.suggestion) {
            console.log(`    Fix: ${issue.suggestion}`);
          }
        });
      }
    }

    console.log(`\nToken Usage for ${task.componentName}:`);
    console.log(`  Architecture: ${task.tokenUsage.architecture}`);
    console.log(`  Development: ${task.tokenUsage.development.join(', ') || 'N/A'}`);
    console.log(`  Review: ${task.tokenUsage.review.join(', ') || 'N/A'}`);
    console.log(`  Total: ${task.tokenUsage.total}`);
  }

  /**
   * Print iteration status.
   */
  printIterationStatus(iterationNum: number, phase: 'development' | 'review', approved: boolean): void {
    const status = approved ? '✅ APPROVED' : '❌ REJECTED';
    console.log(`\n  [Iteration ${iterationNum}] ${phase} → ${status}`);
  }

  /**
   * Print token usage summary.
   */
  printTokenSummary(metrics: WorkflowTokenMetrics): void {
    console.log('\n┌─ STEP 3: TOKEN USAGE SUMMARY ──────────────────────────┐');

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
    console.log(`  Architect:  $${metrics.estimatedCost.architect.toFixed(4)}`);
    console.log(`  Developer:  $${metrics.estimatedCost.developer.toFixed(4)}`);
    console.log(`  Reviewer:   $${metrics.estimatedCost.reviewer.toFixed(4)}`);
    console.log(`  ───────────────────────────────`);
    console.log(`  Total:      $${metrics.estimatedCost.total.toFixed(4)}`);
  }

  /**
   * Print project structure.
   */
  printProjectStructure(structure: string): void {
    console.log('\n┌─ STEP 4: PROJECT SUMMARY ──────────────────────────────┐');
    console.log(structure);
  }

  /**
   * Print final workflow completion status.
   */
  printWorkflowComplete(allApproved: boolean): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    if (allApproved) {
      console.log('║                   ✓ WORKFLOW COMPLETE                     ║');
      console.log('║            All components approved and ready!             ║');
    } else {
      console.log('║                   ⚠ WORKFLOW COMPLETE                     ║');
      console.log('║        Some components need further iteration             ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Save content to file with automatic formatting.
   */
  saveToFile(filePath: string, content: string | object): void {
    const dir = path.dirname(filePath);

    // Create directory if needed
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }

    const finalContent = typeof content === 'string'
      ? content
      : JSON.stringify(content, null, 2);

    fs.writeFileSync(filePath, finalContent);
    console.log(`✓ Saved to ${filePath}`);
  }
}
