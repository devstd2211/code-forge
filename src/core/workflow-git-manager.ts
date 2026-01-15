import type { Task } from '../types/index.js';
import type { ToolExecutor } from '../tools/executor.js';

/**
 * Handles git operations for completed tasks.
 * Single responsibility: Git commit management with delegation to ToolExecutor.
 */
export class WorkflowGitManager {
  constructor(private toolExecutor?: ToolExecutor) {}

  /**
   * Create a git commit for an approved task.
   */
  async commitTask(task: Task): Promise<void> {
    if (!task.implementation) {
      console.log('✗ No implementation to commit');
      return;
    }

    console.log(`\n=== COMMITTING TASK: ${task.componentName} ===`);

    const commitMessage = this.formatCommitMessage(task);
    const files = this.extractFilesFromTask(task);

    // Fallback if no toolExecutor
    if (!this.toolExecutor) {
      this.logCommitDetails(commitMessage, files);
      return;
    }

    // PURE DELEGATION - No duplicate error handling
    try {
      const result = await this.toolExecutor.executeTool('git_commit', {
        message: commitMessage,
        files
      });

      if (result.success) {
        try {
          const data = JSON.parse(result.data || '{}');
          console.log(`✓ Committed: ${data.commitHash?.substring(0, 7)} (${data.filesCommitted} files)`);
        } catch {
          console.log(`✓ Files committed successfully`);
        }
      } else {
        console.log(`✗ Commit failed: ${result.data}`);
      }
    } catch (error) {
      // Simple logging - ToolExecutor handles retries/errors
      console.log(`✗ Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format commit message with task metadata.
   */
  private formatCommitMessage(task: Task): string {
    return `feat: Implement ${task.componentName}

${task.description || 'Component implementation'}

Task ID: ${task.id}
Iterations: ${task.iterationCount + 1}
Status: ${task.status}
Tokens Used: ${task.tokenUsage.total}

Co-authored-by: CodeForge Workflow <workflow@codeforge.ai>`;
  }

  /**
   * Extract files from task implementation.
   */
  private extractFilesFromTask(task: Task): string[] {
    return task.implementation?.filesCreated || [];
  }

  /**
   * Log commit details when toolExecutor is not available.
   */
  private logCommitDetails(message: string, files: string[]): void {
    console.log(`Would commit: ${files.length} files`);
    console.log(`Message: ${message.split('\n')[0]}`);
  }
}
