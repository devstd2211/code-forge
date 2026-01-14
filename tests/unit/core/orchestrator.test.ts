/**
 * Tests for Orchestrator
 */

import { Orchestrator } from '../../../src/core/orchestrator';
import type { IModel, UnifiedResponse } from '../../../src/types';

/**
 * Mock model for testing
 */
class MockModel implements IModel {
  readonly name = 'claude' as const;
  readonly modelId = 'mock-v1';
  currentRole = 'architect' as const;

  async analyze(): Promise<UnifiedResponse> {
    return {
      modelName: 'claude',
      role: 'architect',
      timestamp: new Date().toISOString(),
      findings: [],
      summary: 'Test summary',
      overallAssessment: 'pass',
      confidence: 0.9,
      findingCoverage: {
        architecture: 0.5,
        logic: 0.5,
        performance: 0.5,
        security: 0.5,
        testCoverage: 0.5
      },
      metadata: {
        tokensUsed: { input: 100, output: 100, total: 200 },
        executionTimeMs: 1000,
        iterationCount: 1,
        toolCalls: []
      }
    };
  }

  supportedTools() {
    return [];
  }

  getCapabilities() {
    return {
      supportsToolUse: false,
      maxTokens: 4096,
      contextWindow: 8192,
      costPer1kTokens: { input: 0.01, output: 0.03 },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [],
      weaknesses: []
    };
  }

  validateInput() {
    return { valid: true, errors: [] };
  }
}

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let model: IModel;

  beforeEach(() => {
    model = new MockModel();
    orchestrator = new Orchestrator(
      model,
      null as any, // Mock tool executor
      {
        maxRetries: 3,
        backoffMs: 100
      }
    );
  });

  describe('constructor', () => {
    it('should initialize with model and executor', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getModel()).toBe(model);
    });

    it('should set default retry policy', () => {
      const orch = new Orchestrator(model, null as any);
      expect(orch).toBeDefined();
    });
  });

  describe('executeSimple', () => {
    it('should execute and return response', async () => {
      const response = await orchestrator.executeSimple(
        {
          name: 'test',
          sourcePath: '/test/file.ts'
        },
        'claude',
        'architect',
        {
          projectName: 'test',
          componentCount: 1,
          totalLOC: 100,
          language: 'typescript'
        }
      );

      expect(response).toBeDefined();
      expect(response.modelName).toBe('claude');
      expect(response.role).toBe('architect');
      expect(response.overallAssessment).toBe('pass');
    });

    it('should include context in request', async () => {
      const response = await orchestrator.executeSimple(
        {
          name: 'test',
          sourcePath: '/test/file.ts'
        },
        'claude',
        'architect',
        {
          projectName: 'my-project',
          componentCount: 5,
          totalLOC: 1000,
          language: 'typescript',
          framework: 'express'
        }
      );

      expect(response.modelName).toBe('claude');
    });
  });

  describe('getModel', () => {
    it('should return the model', () => {
      expect(orchestrator.getModel()).toBe(model);
    });
  });
});
