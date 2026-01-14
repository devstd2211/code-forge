/**
 * OutputFormatter - Formats analysis results for display.
 * Supports multiple output formats: text, json, markdown, html.
 */

import type { UnifiedResponse } from '../types/index.js';

/**
 * Formats analysis results in various formats.
 */
export class OutputFormatter {
  /**
   * Format response based on requested format.
   */
  format(response: UnifiedResponse, format: string = 'text'): string {
    switch (format) {
      case 'json':
        return this.formatJson(response);
      case 'markdown':
        return this.formatMarkdown(response);
      case 'html':
        return this.formatHtml(response);
      case 'text':
      default:
        return this.formatText(response);
    }
  }

  /**
   * Format as plain text with colors.
   */
  private formatText(response: UnifiedResponse): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Code Analysis Report`);
    lines.push(`═══════════════════════════════════════════════════════════`);
    lines.push('');

    // Header
    lines.push(`Model:     ${response.modelName} (${response.role})`);
    lines.push(`Timestamp: ${response.timestamp}`);
    lines.push(`Assessment: ${response.overallAssessment.toUpperCase()}`);
    lines.push(`Confidence: ${(response.confidence * 100).toFixed(1)}%`);
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(response.summary);
    lines.push('');

    // Findings
    if (response.findings.length === 0) {
      lines.push('No findings detected.');
    } else {
      lines.push(`FINDINGS (${response.findings.length} total)`);
      lines.push('───────────────────────────────────────────────────────────');

      for (const finding of response.findings) {
        const severityBadge = this.getSeverityBadge(finding.severity);
        lines.push('');
        lines.push(`${severityBadge} [${finding.type}] ${finding.description}`);

        if (finding.location) {
          lines.push(`   Location: ${finding.location}`);
        }

        if (finding.suggestion) {
          lines.push(`   Fix: ${finding.suggestion}`);
        }

        lines.push(`   Confidence: ${(finding.confidence * 100).toFixed(0)}%`);
      }

      lines.push('');
    }

    // Coverage
    lines.push('COVERAGE');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Architecture: ${(response.findingCoverage.architecture * 100).toFixed(0)}%`);
    lines.push(`Logic:        ${(response.findingCoverage.logic * 100).toFixed(0)}%`);
    lines.push(`Performance:  ${(response.findingCoverage.performance * 100).toFixed(0)}%`);
    lines.push(`Security:     ${(response.findingCoverage.security * 100).toFixed(0)}%`);
    lines.push(`Test Coverage:${(response.findingCoverage.testCoverage * 100).toFixed(0)}%`);
    lines.push('');

    // Metadata
    lines.push('EXECUTION');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Tokens: ${response.metadata.tokensUsed.total} (input: ${response.metadata.tokensUsed.input}, output: ${response.metadata.tokensUsed.output})`);
    lines.push(`Time: ${response.metadata.executionTimeMs}ms`);
    if (response.metadata.costEstimate) {
      lines.push(`Cost: $${response.metadata.costEstimate.toFixed(4)}`);
    }
    lines.push('');

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Format as JSON.
   */
  private formatJson(response: UnifiedResponse): string {
    return JSON.stringify(response, null, 2);
  }

  /**
   * Format as Markdown.
   */
  private formatMarkdown(response: UnifiedResponse): string {
    const lines: string[] = [];

    lines.push('# Code Analysis Report');
    lines.push('');

    lines.push(`- **Model:** ${response.modelName} (${response.role})`);
    lines.push(`- **Assessment:** ${response.overallAssessment}`);
    lines.push(`- **Confidence:** ${(response.confidence * 100).toFixed(1)}%`);
    lines.push(`- **Timestamp:** ${response.timestamp}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(response.summary);
    lines.push('');

    // Findings
    if (response.findings.length > 0) {
      lines.push('## Findings');
      lines.push('');

      for (const finding of response.findings) {
        lines.push(`### ${finding.severity.toUpperCase()}: ${finding.description}`);
        lines.push('');
        lines.push(`- **Type:** ${finding.type}`);
        lines.push(`- **Confidence:** ${(finding.confidence * 100).toFixed(0)}%`);

        if (finding.location) {
          lines.push(`- **Location:** ${finding.location}`);
        }

        if (finding.suggestion) {
          lines.push(`- **Suggestion:** ${finding.suggestion}`);
        }

        lines.push('');
      }
    }

    // Coverage
    lines.push('## Coverage');
    lines.push('');
    lines.push(`- Architecture: ${(response.findingCoverage.architecture * 100).toFixed(0)}%`);
    lines.push(`- Logic: ${(response.findingCoverage.logic * 100).toFixed(0)}%`);
    lines.push(`- Performance: ${(response.findingCoverage.performance * 100).toFixed(0)}%`);
    lines.push(`- Security: ${(response.findingCoverage.security * 100).toFixed(0)}%`);
    lines.push(`- Test Coverage: ${(response.findingCoverage.testCoverage * 100).toFixed(0)}%`);
    lines.push('');

    // Execution
    lines.push('## Execution Details');
    lines.push('');
    lines.push(`- **Tokens Used:** ${response.metadata.tokensUsed.total}`);
    lines.push(`- **Execution Time:** ${response.metadata.executionTimeMs}ms`);
    if (response.metadata.costEstimate) {
      lines.push(`- **Estimated Cost:** $${response.metadata.costEstimate.toFixed(4)}`);
    }

    return lines.join('\n');
  }

  /**
   * Format as HTML.
   */
  private formatHtml(response: UnifiedResponse): string {
    const findingsHtml = response.findings
      .map(f => `
        <div class="finding ${f.severity}">
          <h4>${f.severity.toUpperCase()}: ${this.escapeHtml(f.description)}</h4>
          <p><strong>Type:</strong> ${f.type}</p>
          <p><strong>Confidence:</strong> ${(f.confidence * 100).toFixed(0)}%</p>
          ${f.location ? `<p><strong>Location:</strong> ${this.escapeHtml(f.location)}</p>` : ''}
          ${f.suggestion ? `<p><strong>Suggestion:</strong> ${this.escapeHtml(f.suggestion)}</p>` : ''}
        </div>
      `)
      .join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Code Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { border-bottom: 2px solid #333; margin-bottom: 20px; }
    .finding { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
    .finding.critical { border-color: #d32f2f; background: #ffebee; }
    .finding.high { border-color: #f57c00; background: #fff3e0; }
    .finding.medium { border-color: #fbc02d; background: #fffde7; }
    .finding.low { border-color: #388e3c; background: #f1f8e9; }
    h4 { margin: 0 0 10px 0; }
    p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Code Analysis Report</h1>
    <p><strong>Model:</strong> ${response.modelName}</p>
    <p><strong>Assessment:</strong> ${response.overallAssessment}</p>
    <p><strong>Confidence:</strong> ${(response.confidence * 100).toFixed(1)}%</p>
  </div>

  <h2>Summary</h2>
  <p>${this.escapeHtml(response.summary)}</p>

  <h2>Findings</h2>
  ${findingsHtml}

  <h2>Coverage</h2>
  <ul>
    <li>Architecture: ${(response.findingCoverage.architecture * 100).toFixed(0)}%</li>
    <li>Logic: ${(response.findingCoverage.logic * 100).toFixed(0)}%</li>
    <li>Performance: ${(response.findingCoverage.performance * 100).toFixed(0)}%</li>
    <li>Security: ${(response.findingCoverage.security * 100).toFixed(0)}%</li>
    <li>Test Coverage: ${(response.findingCoverage.testCoverage * 100).toFixed(0)}%</li>
  </ul>
</body>
</html>
    `.trim();
  }

  /**
   * Get badge for severity level.
   */
  private getSeverityBadge(severity: string): string {
    const badges: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return badges[severity] || '⚪';
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
