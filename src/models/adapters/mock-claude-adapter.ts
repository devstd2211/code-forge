/**
 * Mock Claude Adapter - For testing without API calls
 * Returns predefined responses for architecture and development tasks
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  UnifiedRequest,
  UnifiedResponse,
  ClaudeModel,
  ToolDefinition,
  ModelCapabilities
} from '../../types/index.js';
import { BaseModel } from '../IModel.js';

export class MockClaudeAdapter extends BaseModel {
  readonly name = 'claude';
  readonly modelId: ClaudeModel = 'claude-sonnet-4-5';

  constructor(_modelId?: ClaudeModel, _apiKey?: string) {
    super();
    // Mock doesn't need API key
  }

  supportedTools(): ToolDefinition[] {
    return [];
  }

  getCapabilities(): ModelCapabilities {
    return {
      supportsToolUse: false,
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1kTokens: { input: 0.003, output: 0.015 },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: ['architecture', 'design', 'planning'],
      weaknesses: []
    };
  }

  async analyze(request: UnifiedRequest): Promise<UnifiedResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const role = request.role || 'architect';
    const task = request.task || '';
    const timestamp = new Date().toISOString();

    // Architect Phase - Design architecture
    if (role === 'architect' && task === 'design') {
      return {
        modelName: this.name,
        role,
        timestamp,
        summary: `System Architecture for Hello World Go Application

## Design Overview
Two-phase implementation approach:
1. **Phase 1 - Project Structure**: Set up Go module, main function, basic structure
2. **Phase 2 - Console Output**: Implement string formatting and console print

## Components
- **main.go**: Entry point with hello world message
- Proper error handling
- Clean separation of concerns

## SOLID Principles
- Single Responsibility: Each function has one purpose
- Open/Closed: Extensible for future features
- Liskov Substitution: Compatible interfaces
- Interface Segregation: Minimal interfaces
- Dependency Inversion: No hard dependencies`,

        findings: [
          {
            id: uuidv4(),
            severity: 'low',
            type: 'architecture',
            description: 'Two components identified for implementation',
            location: 'design',
            suggestion: 'Implement main.go with placeholder for output function',
            confidence: 0.95
          }
        ],
        overallAssessment: 'pass',
        confidence: 0.95,
        findingCoverage: {
          architecture: 100,
          logic: 0,
          performance: 0,
          security: 0,
          testCoverage: 0
        },

        metadata: {
          tokensUsed: { input: 150, output: 200, total: 350 },
          executionTimeMs: 100,
          costEstimate: 0.0075,
          iterationCount: 1,
          toolCalls: []
        }
      };
    }

    // Default response
    return {
      modelName: this.name,
      role,
      timestamp,
      summary: 'Analysis complete',
      findings: [],
      overallAssessment: 'pass',
      confidence: 0.9,
      findingCoverage: {
        architecture: 0,
        logic: 0,
        performance: 0,
        security: 0,
        testCoverage: 0
      },

      metadata: {
        tokensUsed: { input: 100, output: 100, total: 200 },
        executionTimeMs: 100,
        costEstimate: 0.004,
        iterationCount: 1,
        toolCalls: []
      }
    };
  }
}
