import { v4 as uuidv4 } from 'uuid';
import type {
  UnifiedResponse,
  Finding,
  Assessment,
  AgentRole,
  ModelName
} from '../types/index.js';

/**
 * Parses API responses into UnifiedResponse format.
 * Handles different model response formats and extracts common fields.
 */
export class ResponseParser {
  /**
   * Parse Claude API response to UnifiedResponse.
   */
  static parseClaudeResponse(
    apiResponse: any,
    modelName: ModelName,
    role: AgentRole,
    requestTokens: number = 0
  ): UnifiedResponse {
    const timestamp = new Date().toISOString();
    let findings: Finding[] = [];
    let summary = '';
    let overallAssessment: Assessment = 'pass';
    let rawContent = '';

    // Extract content from Claude response
    if (apiResponse.content && Array.isArray(apiResponse.content)) {
      for (const block of apiResponse.content) {
        if (block.type === 'text') {
          rawContent = block.text;

          // Try to parse as JSON for findings
          try {
            const parsed = JSON.parse(block.text);
            if (parsed.findings && Array.isArray(parsed.findings)) {
              findings = parsed.findings.map((f: any) => ({
                id: f.id || uuidv4(),
                type: f.type || 'logic',
                severity: f.severity || 'medium',
                description: f.description || '',
                location: f.location,
                code: f.code,
                suggestion: f.suggestion,
                confidence: f.confidence ?? 0.7,
                relatedFindings: f.relatedFindings
              }));

              summary = parsed.summary || '';
            }
          } catch {
            // If not JSON, create a generic finding from text
            summary = rawContent.substring(0, 500);
            findings = [{
              id: uuidv4(),
              type: 'logic',
              severity: 'medium',
              description: rawContent.substring(0, 200),
              confidence: 0.5
            }];
          }
        }
      }
    }

    // Determine assessment based on findings
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;

    if (criticalCount > 0) {
      overallAssessment = 'critical';
    } else if (highCount > 0) {
      overallAssessment = 'warning';
    } else {
      overallAssessment = 'pass';
    }

    // Extract token usage
    const outputTokens = apiResponse.usage?.output_tokens || 0;
    const inputTokens = apiResponse.usage?.input_tokens || requestTokens;

    // Calculate coverage (simplified for Phase 1)
    const findingCoverage = {
      architecture: findings.filter(f => f.type === 'architecture').length > 0 ? 0.8 : 0.2,
      logic: findings.filter(f => f.type === 'logic').length > 0 ? 0.8 : 0.2,
      performance: findings.filter(f => f.type === 'performance').length > 0 ? 0.8 : 0.2,
      security: findings.filter(f => f.type === 'security').length > 0 ? 0.8 : 0.2,
      testCoverage: findings.filter(f => f.type === 'test-coverage').length > 0 ? 0.8 : 0.2
    };

    // Calculate confidence (average of finding confidences)
    const confidence = findings.length > 0
      ? findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
      : 0.5;

    return {
      modelName,
      role,
      timestamp,
      findings,
      summary: summary || 'No significant findings',
      overallAssessment,
      confidence,
      findingCoverage,
      metadata: {
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        executionTimeMs: 0,
        iterationCount: 1,
        toolCalls: []
      },
      rawResponse: rawContent
    };
  }

  /**
   * Parse error response and return default UnifiedResponse.
   */
  static parseErrorResponse(
    error: any,
    modelName: ModelName,
    role: AgentRole
  ): UnifiedResponse {
    const timestamp = new Date().toISOString();

    const finding: Finding = {
      id: uuidv4(),
      type: 'logic',
      severity: 'high',
      description: `Analysis failed: ${error.message || 'Unknown error'}`,
      confidence: 0.5
    };

    return {
      modelName,
      role,
      timestamp,
      findings: [finding],
      summary: `Error during analysis: ${error.message || 'Unknown error'}`,
      overallAssessment: 'critical',
      confidence: 0.3,
      findingCoverage: {
        architecture: 0,
        logic: 0,
        performance: 0,
        security: 0,
        testCoverage: 0
      },
      metadata: {
        tokensUsed: {
          input: 0,
          output: 0,
          total: 0
        },
        executionTimeMs: 0,
        iterationCount: 0,
        toolCalls: []
      }
    };
  }

  /**
   * Parse a JSON findings array from text.
   */
  static parseFindingsFromText(text: string): Finding[] {
    try {
      const parsed = JSON.parse(text);
      if (parsed.findings && Array.isArray(parsed.findings)) {
        return parsed.findings.map((f: any) => ({
          id: f.id || uuidv4(),
          type: f.type || 'logic',
          severity: f.severity || 'medium',
          description: f.description || '',
          location: f.location,
          code: f.code,
          suggestion: f.suggestion,
          confidence: f.confidence ?? 0.7,
          relatedFindings: f.relatedFindings
        }));
      }
    } catch {
      // Not JSON, ignore
    }

    return [];
  }

  /**
   * Validate response structure.
   */
  static validate(response: UnifiedResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!response.modelName) {
      errors.push('modelName is required');
    }

    if (!response.role) {
      errors.push('role is required');
    }

    if (!response.timestamp) {
      errors.push('timestamp is required');
    }

    if (!Array.isArray(response.findings)) {
      errors.push('findings must be an array');
    }

    if (typeof response.summary !== 'string') {
      errors.push('summary must be a string');
    }

    if (!response.metadata) {
      errors.push('metadata is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse OpenAI GPT API response to UnifiedResponse.
   */
  static parseGPTResponse(
    apiResponse: any,
    modelName: ModelName,
    role: AgentRole,
    requestTokens: number = 0
  ): UnifiedResponse {
    const timestamp = new Date().toISOString();
    let findings: Finding[] = [];
    let summary = '';
    let overallAssessment: Assessment = 'pass';
    let rawContent = '';

    // Extract content from GPT response
    if (apiResponse.choices && Array.isArray(apiResponse.choices)) {
      const choice = apiResponse.choices[0];
      if (choice.message && choice.message.content) {
        rawContent = choice.message.content;

        // Try to parse as JSON for findings
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed.findings && Array.isArray(parsed.findings)) {
            findings = parsed.findings.map((f: any) => ({
              id: f.id || uuidv4(),
              type: f.type || 'logic',
              severity: f.severity || 'medium',
              description: f.description || '',
              location: f.location,
              code: f.code,
              suggestion: f.suggestion,
              confidence: f.confidence ?? 0.7,
              relatedFindings: f.relatedFindings
            }));

            summary = parsed.summary || '';
          }
        } catch {
          // If not JSON, create a generic finding from text
          summary = rawContent.substring(0, 500);
          findings = [{
            id: uuidv4(),
            type: 'logic',
            severity: 'medium',
            description: rawContent.substring(0, 200),
            confidence: 0.5
          }];
        }
      }
    }

    // Determine assessment based on findings
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;

    if (criticalCount > 0) {
      overallAssessment = 'critical';
    } else if (highCount > 0) {
      overallAssessment = 'warning';
    } else {
      overallAssessment = 'pass';
    }

    // Extract token usage
    const outputTokens = apiResponse.usage?.completion_tokens || 0;
    const inputTokens = apiResponse.usage?.prompt_tokens || requestTokens;

    // Calculate coverage
    const findingCoverage = {
      architecture: findings.filter(f => f.type === 'architecture').length > 0 ? 0.8 : 0.2,
      logic: findings.filter(f => f.type === 'logic').length > 0 ? 0.8 : 0.2,
      performance: findings.filter(f => f.type === 'performance').length > 0 ? 0.8 : 0.2,
      security: findings.filter(f => f.type === 'security').length > 0 ? 0.8 : 0.2,
      testCoverage: findings.filter(f => f.type === 'test-coverage').length > 0 ? 0.8 : 0.2
    };

    // Calculate confidence
    const confidence = findings.length > 0
      ? findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
      : 0.5;

    return {
      modelName,
      role,
      timestamp,
      findings,
      summary: summary || 'No significant findings',
      overallAssessment,
      confidence,
      findingCoverage,
      metadata: {
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        executionTimeMs: 0,
        iterationCount: 1,
        toolCalls: []
      },
      rawResponse: rawContent
    };
  }

  /**
   * Parse DeepSeek API response to UnifiedResponse.
   * DeepSeek uses OpenAI-compatible format, so parsing is identical to GPT.
   */
  static parseDeepSeekResponse(
    apiResponse: any,
    modelName: ModelName,
    role: AgentRole,
    requestTokens: number = 0
  ): UnifiedResponse {
    // DeepSeek uses the same format as OpenAI GPT
    return this.parseGPTResponse(apiResponse, modelName, role, requestTokens);
  }
}
