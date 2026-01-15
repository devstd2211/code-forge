import { v4 as uuidv4 } from 'uuid';
import type {
  UnifiedRequest,
  UnifiedResponse,
  ToolDefinition,
  ModelCapabilities
} from '../../types/index.js';
import { BaseModel } from '../IModel.js';

export class MockDeepSeekAdapter extends BaseModel {
  readonly name = 'deepseek';
  readonly modelId = 'deepseek-chat';

  private reviewPass = 0;

  constructor(_modelId?: string, _apiKey?: string) {
    super();
  }

  supportedTools(): ToolDefinition[] {
    return [];
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportsToolUse: false,
      maxTokens: 4096,
      contextWindow: 4096,
      costPer1kTokens: { input: 0.0005, output: 0.0015 },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: ['review', 'analysis', 'testing'],
      weaknesses: []
    };
  }

  async analyze(request: UnifiedRequest): Promise<UnifiedResponse> {
    await new Promise(resolve => setTimeout(resolve, 120));

    const role = request.role || 'reviewer';
    const task = request.task || '';
    const componentName = request.component?.name || 'component';
    const timestamp = new Date().toISOString();

    if (role === 'reviewer' && task === 'review' && this.reviewPass === 0) {
      this.reviewPass++;

      return {
        modelName: this.name,
        role,
        timestamp,
        summary: `Critical Code Review - ${componentName}\n\nISSUES FOUND: 1 Critical, 2 High Priority\n\nDivision by zero detected in main logic.\nThe code will panic at runtime on line 12.`,
        findings: [
          {
            id: uuidv4(),
            severity: 'critical',
            type: 'logic',
            description: 'Division by zero will cause runtime panic',
            location: 'main.go:12',
            suggestion: 'Change y := 0 to y := 1, or remove division if not needed',
            confidence: 1.0
          },
          {
            id: uuidv4(),
            severity: 'high',
            type: 'security',
            description: 'No panic recovery or error handling',
            location: 'main.go:10-15',
            suggestion: 'Add defer recover() or validate divisor before operation',
            confidence: 0.95
          },
          {
            id: uuidv4(),
            severity: 'high',
            type: 'test-coverage',
            description: 'No tests for edge cases or error scenarios',
            location: 'main.go',
            suggestion: 'Add unit tests for arithmetic operations with zero divisor',
            confidence: 0.9
          }
        ],
        overallAssessment: 'critical',
        confidence: 1.0,
        findingCoverage: {
          architecture: 0,
          logic: 33,
          performance: 0,
          security: 33,
          testCoverage: 33
        },
        metadata: {
          tokensUsed: { input: 600, output: 350, total: 950 },
          executionTimeMs: 120,
          costEstimate: 0.0095,
          iterationCount: 1,
          toolCalls: []
        }
      };
    }

    if (role === 'reviewer' && task === 'review' && this.reviewPass >= 1) {
      return {
        modelName: this.name,
        role,
        timestamp,
        summary: `Code Review - ${componentName} - APPROVED\n\nAll critical issues resolved.\nCode follows Go conventions and best practices.\n\nAPPROVED FOR PRODUCTION`,
        findings: [
          {
            id: uuidv4(),
            severity: 'low',
            type: 'architecture',
            description: 'Good use of fmt package for output',
            location: 'main.go:14-15',
            suggestion: 'Consider adding more detailed logging if needed',
            confidence: 0.85
          },
          {
            id: uuidv4(),
            severity: 'low',
            type: 'performance',
            description: 'Clean and readable code structure',
            location: 'main.go',
            suggestion: 'Maintain this coding style',
            confidence: 0.9
          }
        ],
        overallAssessment: 'pass',
        confidence: 0.95,
        findingCoverage: {
          architecture: 100,
          logic: 100,
          performance: 100,
          security: 100,
          testCoverage: 100
        },
        metadata: {
          tokensUsed: { input: 550, output: 250, total: 800 },
          executionTimeMs: 120,
          costEstimate: 0.008,
          iterationCount: 1,
          toolCalls: []
        }
      };
    }

    return {
      modelName: this.name,
      role,
      timestamp,
      summary: `Code Review - ${componentName}`,
      findings: [],
      overallAssessment: 'pass',
      confidence: 0.85,
      findingCoverage: {
        architecture: 0,
        logic: 0,
        performance: 0,
        security: 0,
        testCoverage: 0
      },
      metadata: {
        tokensUsed: { input: 400, output: 300, total: 700 },
        executionTimeMs: 120,
        costEstimate: 0.007,
        iterationCount: 1,
        toolCalls: []
      }
    };
  }

  resetReviewPass(): void {
    this.reviewPass = 0;
  }

  setReviewPass(pass: number): void {
    this.reviewPass = pass;
  }
}
