/**
 * Tests for ResponseParser
 */

import { ResponseParser } from '../../../src/transport/response-parser';

describe('ResponseParser', () => {
  describe('parseClaudeResponse', () => {
    it('should parse valid Claude response with JSON findings', () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  id: '123',
                  type: 'architecture',
                  severity: 'high',
                  description: 'Test finding',
                  confidence: 0.9
                }
              ],
              summary: 'Test summary'
            })
          }
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      };

      const result = ResponseParser.parseClaudeResponse(
        mockResponse,
        'claude',
        'architect'
      );

      expect(result.modelName).toBe('claude');
      expect(result.role).toBe('architect');
      expect(result.findings.length).toBe(1);
      expect(result.findings[0].type).toBe('architecture');
      expect(result.findings[0].severity).toBe('high');
    });

    it('should parse response with multiple findings', () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  id: '1',
                  type: 'architecture',
                  severity: 'critical',
                  description: 'Critical issue',
                  confidence: 0.95
                },
                {
                  id: '2',
                  type: 'security',
                  severity: 'high',
                  description: 'Security issue',
                  confidence: 0.85
                },
                {
                  id: '3',
                  type: 'performance',
                  severity: 'medium',
                  description: 'Performance issue',
                  confidence: 0.7
                }
              ],
              summary: 'Found 3 issues'
            })
          }
        ],
        usage: {
          input_tokens: 200,
          output_tokens: 150
        }
      };

      const result = ResponseParser.parseClaudeResponse(
        mockResponse,
        'claude',
        'reviewer'
      );

      expect(result.findings.length).toBe(3);
      expect(result.metadata.tokensUsed.total).toBe(350);
    });

    it('should determine assessment based on severity', () => {
      const criticalResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  id: '1',
                  type: 'logic',
                  severity: 'critical',
                  description: 'Critical bug',
                  confidence: 0.9
                }
              ],
              summary: 'Critical issue found'
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        criticalResponse,
        'claude',
        'developer'
      );

      expect(result.overallAssessment).toBe('critical');
    });

    it('should determine assessment as warning for high severity', () => {
      const highResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  id: '1',
                  type: 'logic',
                  severity: 'high',
                  description: 'High severity issue',
                  confidence: 0.85
                }
              ],
              summary: 'High severity issue found'
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        highResponse,
        'claude',
        'developer'
      );

      expect(result.overallAssessment).toBe('warning');
    });

    it('should determine assessment as pass for no critical/high findings', () => {
      const passResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  id: '1',
                  type: 'logic',
                  severity: 'low',
                  description: 'Minor issue',
                  confidence: 0.6
                }
              ],
              summary: 'Only minor issues found'
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        passResponse,
        'claude',
        'developer'
      );

      expect(result.overallAssessment).toBe('pass');
    });

    it('should handle text content without JSON', () => {
      const textResponse = {
        content: [
          {
            type: 'text',
            text: 'This is a plain text response without JSON'
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        textResponse,
        'claude',
        'architect'
      );

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('should calculate confidence from findings', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  id: '1',
                  type: 'architecture',
                  severity: 'medium',
                  description: 'Test 1',
                  confidence: 0.8
                },
                {
                  id: '2',
                  type: 'logic',
                  severity: 'medium',
                  description: 'Test 2',
                  confidence: 0.9
                }
              ],
              summary: 'Test summary'
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        response,
        'claude',
        'developer'
      );

      // Average of 0.8 and 0.9 = 0.85
      expect(result.confidence).toBeCloseTo(0.85, 5);
    });

    it('should generate UUIDs for findings without IDs', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [
                {
                  type: 'architecture',
                  severity: 'medium',
                  description: 'Test finding',
                  confidence: 0.7
                }
              ],
              summary: 'Test'
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        response,
        'claude',
        'architect'
      );

      expect(result.findings[0].id).toBeDefined();
      expect(result.findings[0].id.length).toBeGreaterThan(0);
    });

    it('should include raw response', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'Test response content'
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        response,
        'claude',
        'architect'
      );

      expect(result.rawResponse).toBe('Test response content');
    });

    it('should include timestamp', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              findings: [],
              summary: 'Test'
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const result = ResponseParser.parseClaudeResponse(
        response,
        'claude',
        'architect'
      );

      expect(result.timestamp).toBeDefined();
      // Should be valid ISO 8601 date string
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
