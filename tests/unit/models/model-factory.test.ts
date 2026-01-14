/**
 * Tests for ModelFactory
 */

import { ModelFactory } from '../../../src/models/model-factory';
import { ModelError } from '../../../src/types/errors';

describe('ModelFactory', () => {
  describe('create', () => {
    it('should create a Claude model', () => {
      const model = ModelFactory.create('claude', 'claude-sonnet-4-5', {
        claude: 'test-key'
      });

      expect(model).toBeDefined();
      expect(model.name).toBe('claude');
      expect(model.modelId).toBe('claude-sonnet-4-5');
    });

    it('should create a GPT model', () => {
      const model = ModelFactory.create('gpt', 'gpt-4-turbo', {
        openai: 'test-key'
      });

      expect(model).toBeDefined();
      expect(model.name).toBe('gpt');
      expect(model.modelId).toBe('gpt-4-turbo');
    });

    it('should create a DeepSeek model', () => {
      const model = ModelFactory.create('deepseek', 'deepseek-chat', {
        deepseek: 'test-key'
      });

      expect(model).toBeDefined();
      expect(model.name).toBe('deepseek');
      expect(model.modelId).toBe('deepseek-chat');
    });

    it('should throw error for unknown model', () => {
      expect(() => {
        ModelFactory.create('unknown' as any, 'gpt-4-turbo', {});
      }).toThrow();
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        ModelFactory.create('claude', 'claude-sonnet-4-5', {});
      }).toThrow(ModelError);
    });
  });

  describe('getCapabilities', () => {
    it('should return Claude capabilities', () => {
      const model = ModelFactory.create('claude', 'claude-sonnet-4-5', {
        claude: 'test-key'
      });

      const caps = model.getCapabilities();
      expect(caps.supportsToolUse).toBe(true);
      expect(caps.supportedRoles).toContain('architect');
      expect(caps.supportedRoles).toContain('developer');
      expect(caps.supportedRoles).toContain('reviewer');
    });

    it('should return correct context window', () => {
      const model = ModelFactory.create('claude', 'claude-sonnet-4-5', {
        claude: 'test-key'
      });

      const caps = model.getCapabilities();
      expect(caps.contextWindow).toBe(200000);
    });
  });

  describe('validateInput', () => {
    it('should validate correct request', () => {
      const model = ModelFactory.create('claude', 'claude-sonnet-4-5', {
        claude: 'test-key'
      });

      const result = model.validateInput({
        modelName: 'claude',
        role: 'architect',
        task: 'analyze',
        component: {
          name: 'test',
          sourcePath: '/test/file.ts'
        },
        availableTools: []
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid request', () => {
      const model = ModelFactory.create('claude', 'claude-sonnet-4-5', {
        claude: 'test-key'
      });

      const result = model.validateInput({
        modelName: 'claude',
        role: 'architect',
        task: 'analyze',
        component: {
          name: '',
          sourcePath: ''
        },
        availableTools: []
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
