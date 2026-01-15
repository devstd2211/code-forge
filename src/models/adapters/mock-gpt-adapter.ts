import type {
  UnifiedRequest,
  UnifiedResponse,
  ToolDefinition,
  ModelCapabilities
} from '../../types/index.js';
import { BaseModel } from '../IModel.js';

export class MockGPTAdapter extends BaseModel {
  readonly name = 'gpt';
  readonly modelId = 'gpt-4-turbo';

  // Track iterations per component for feedback loop
  private iterationCountPerComponent: Map<string, number> = new Map();

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
      contextWindow: 128000,
      costPer1kTokens: { input: 0.01, output: 0.03 },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: ['implementation', 'coding', 'logic'],
      weaknesses: []
    };
  }

  async analyze(request: UnifiedRequest): Promise<UnifiedResponse> {
    await new Promise(resolve => setTimeout(resolve, 150));

    const role = request.role || 'developer';
    const task = request.task || '';
    const componentName = request.component?.name || 'component';
    const timestamp = new Date().toISOString();

    // Track iterations per component for feedback loop
    // Note: task comes as 'analyze' not 'develop' due to RequestHandler transformation
    if (role === 'developer' && (task === 'develop' || task === 'analyze')) {
      const iterCount = this.iterationCountPerComponent.get(componentName) || 0;

      // Service component: return clean code immediately (no errors)
      if (componentName === 'Service') {
        return {
          modelName: this.name,
          role,
          timestamp,
          summary: `Implementation of ${componentName}\n\nGenerated Go code with clean separation of concerns.\nService layer implemented correctly.`,
          findings: [],
          overallAssessment: 'pass',
          confidence: 0.95,
          findingCoverage: {
            architecture: 0,
            logic: 0,
            performance: 0,
            security: 0,
            testCoverage: 0
          },
          metadata: {
            tokensUsed: { input: 280, output: 420, total: 500 },
            executionTimeMs: 150,
            costEstimate: 0.0105,
            iterationCount: 1,
            toolCalls: []
          }
        };
      }

      // Core component: first iteration has bug, second iteration is fixed
      if (iterCount === 0) {
        // First iteration: return code with intentional error (division by zero)
        this.iterationCountPerComponent.set(componentName, iterCount + 1);

        return {
          modelName: this.name,
          role,
          timestamp,
          summary: `Implementation of ${componentName}\n\nGenerated Go code with main function.\nCode includes message definition and console output.`,
          findings: [],
          overallAssessment: 'pass',
          confidence: 0.8,
          findingCoverage: {
            architecture: 0,
            logic: 0,
            performance: 0,
            security: 0,
            testCoverage: 0
          },
          metadata: {
            tokensUsed: { input: 250, output: 450, total: 500 },
            executionTimeMs: 150,
            costEstimate: 0.0105,
            iterationCount: 1,
            toolCalls: []
          }
        };
      } else {
        // Second+ iteration: return fixed code
        return {
          modelName: this.name,
          role,
          timestamp,
          summary: `Fixed Implementation of ${componentName}\n\nGenerated Go code with corrected logic.\nDivision by zero issue resolved.`,
          findings: [],
          overallAssessment: 'pass',
          confidence: 0.95,
          findingCoverage: {
            architecture: 0,
            logic: 0,
            performance: 0,
            security: 0,
            testCoverage: 0
          },
          metadata: {
            tokensUsed: { input: 300, output: 400, total: 500 },
            executionTimeMs: 150,
            costEstimate: 0.0105,
            iterationCount: 2,
            toolCalls: []
          }
        };
      }
    }

    return {
      modelName: this.name,
      role,
      timestamp,
      summary: `Implementation of ${componentName}`,
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
        tokensUsed: { input: 200, output: 300, total: 500 },
        executionTimeMs: 150,
        costEstimate: 0.015,
        iterationCount: 1,
        toolCalls: []
      }
    };
  }

}
