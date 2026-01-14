/**
 * ComplexityAnalyzer Tool - Analyze code metrics and complexity.
 * Calculates cyclomatic complexity, LOC, and other metrics.
 */

import * as fs from 'fs';
import type { ToolInput, ToolOutput } from '../../types/index.js';
import { BaseTool } from '../ITool.js';

interface ComplexityMetrics {
  linesOfCode: number;
  functionsCount: number;
  cyclomaticComplexity: number;
  avgFunctionLength: number;
  nestingDepth: number;
}

/**
 * Complexity analyzer tool implementation.
 * Analyzes code metrics for TypeScript/JavaScript files.
 */
export class ComplexityAnalyzer extends BaseTool {
  readonly name = 'complexity_analyzer';
  readonly description = 'Analyze code complexity and metrics';
  readonly inputSchema = {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to analyze'
      }
    },
    required: ['filePath']
  };

  /**
   * Analyze code complexity for a file.
   */
  async execute(input: ToolInput): Promise<ToolOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.valid) {
        return {
          success: false,
          data: '',
          error: `Invalid input: ${validation.errors.join('; ')}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      const filePath = input.filePath as string;

      // Read file
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: '',
          error: `File not found: ${filePath}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // Analyze metrics
      const metrics = this.analyzeComplexity(content);

      // Format report
      const report = this.formatReport(metrics, filePath);

      return {
        success: true,
        data: report,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        data: '',
        error: `Analysis error: ${(error as Error).message}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate input parameters.
   */
  validate(input: ToolInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.filePath || typeof input.filePath !== 'string') {
      errors.push('filePath is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if input is safe to execute.
   */
  isSafe(_input: ToolInput): boolean {
    // Complexity analyzer is safe - just reading files
    return true;
  }

  /**
   * Analyze code complexity metrics.
   */
  private analyzeComplexity(content: string): ComplexityMetrics {
    const lines = content.split('\n');

    // Calculate LOC (lines of code, excluding comments and blanks)
    const linesOfCode = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('*');
    }).length;

    // Count functions
    const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|async\s+\(|\w+\s*\(\s*[^)]*\)\s*{/g) || [];
    const functionsCount = functionMatches.length;

    // Estimate cyclomatic complexity (simplified)
    const complexity = this.estimateCyclomaticComplexity(content);

    // Average function length
    const avgFunctionLength = functionsCount > 0 ? Math.round(linesOfCode / functionsCount) : 0;

    // Estimate max nesting depth
    const nestingDepth = this.estimateNestingDepth(content);

    return {
      linesOfCode,
      functionsCount,
      cyclomaticComplexity: complexity,
      avgFunctionLength,
      nestingDepth
    };
  }

  /**
   * Estimate cyclomatic complexity (simplified calculation).
   */
  private estimateCyclomaticComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const ifCount = (content.match(/\bif\s*\(/g) || []).length;
    const elseIfCount = (content.match(/\belse\s*if\s*\(/g) || []).length;
    const switchCount = (content.match(/\bswitch\s*\(/g) || []).length;
    const caseCount = (content.match(/\bcase\s+/g) || []).length;
    const forCount = (content.match(/\bfor\s*\(/g) || []).length;
    const whileCount = (content.match(/\bwhile\s*\(/g) || []).length;
    const catchCount = (content.match(/\bcatch\s*\(/g) || []).length;
    const ternaryCount = (content.match(/\?[^:]*:/g) || []).length;

    complexity += ifCount + elseIfCount + switchCount + caseCount + forCount + whileCount + catchCount + ternaryCount;

    return complexity;
  }

  /**
   * Estimate maximum nesting depth.
   */
  private estimateNestingDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Format analysis report.
   */
  private formatReport(metrics: ComplexityMetrics, filePath: string): string {
    const lines = [
      `Complexity Analysis for: ${filePath}`,
      ``,
      `Metrics:`,
      `  Lines of Code: ${metrics.linesOfCode}`,
      `  Number of Functions: ${metrics.functionsCount}`,
      `  Cyclomatic Complexity: ${metrics.cyclomaticComplexity}`,
      `  Average Function Length: ${metrics.avgFunctionLength} lines`,
      `  Max Nesting Depth: ${metrics.nestingDepth}`,
      ``,
      `Assessment:`,
      this.getComplexityAssessment(metrics)
    ];

    return lines.join('\n');
  }

  /**
   * Get complexity assessment.
   */
  private getComplexityAssessment(metrics: ComplexityMetrics): string {
    const issues: string[] = [];

    if (metrics.cyclomaticComplexity > 10) {
      issues.push(`  ⚠️  High cyclomatic complexity (${metrics.cyclomaticComplexity} > 10)`);
    }

    if (metrics.avgFunctionLength > 50) {
      issues.push(`  ⚠️  Long average function length (${metrics.avgFunctionLength} > 50 lines)`);
    }

    if (metrics.nestingDepth > 5) {
      issues.push(`  ⚠️  Deep nesting (${metrics.nestingDepth} > 5 levels)`);
    }

    if (metrics.linesOfCode > 500) {
      issues.push(`  ⚠️  Large file (${metrics.linesOfCode} > 500 LOC)`);
    }

    if (issues.length === 0) {
      return '  ✓ Complexity looks reasonable';
    }

    return issues.join('\n');
  }
}
