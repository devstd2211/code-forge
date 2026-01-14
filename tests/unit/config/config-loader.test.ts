/**
 * Tests for ConfigLoader
 */

import { ConfigLoader, loadConfig } from '../../../src/config/config-loader';

describe('ConfigLoader', () => {
  describe('load with defaults', () => {
    it('should return default config when no args provided', () => {
      const loader = new ConfigLoader();
      const config = loader.load();

      expect(config).toBeDefined();
      expect(config.mode).toBe('simple');
      expect(config.tools.enabled.length).toBeGreaterThan(0);
      expect(config.retryPolicy).toBeDefined();
    });
  });

  describe('load with CLI arguments', () => {
    it('should merge CLI model argument', () => {
      const loader = new ConfigLoader();
      const config = loader.load({
        component: 'test.ts',
        model: 'gpt',
        mode: 'simple'
      });

      const roles = config.roles as any;
      expect(roles.model).toBe('gpt');
    });

    it('should merge CLI modelType argument', () => {
      const loader = new ConfigLoader();
      const config = loader.load({
        component: 'test.ts',
        modelType: 'gpt-4',
        mode: 'simple'
      });

      const roles = config.roles as any;
      expect(roles.modelType).toBe('gpt-4');
    });

    it('should switch to advanced mode', () => {
      const loader = new ConfigLoader();
      const config = loader.load({
        component: 'test.ts',
        mode: 'advanced'
      });

      expect(config.mode).toBe('advanced');
      const roles = config.roles as any;
      expect(roles.architect).toBeDefined();
      expect(roles.developer).toBeDefined();
      expect(roles.reviewer).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate simple mode config', () => {
      const loader = new ConfigLoader();
      const config = loader.load({
        component: 'test.ts',
        mode: 'simple',
        model: 'claude'
      });

      expect(config.mode).toBe('simple');
    });

    it('should validate advanced mode config', () => {
      const loader = new ConfigLoader();
      const config = loader.load({
        component: 'test.ts',
        mode: 'advanced'
      });

      const roles = config.roles as any;
      expect(roles.architect).toBeDefined();
      expect(roles.developer).toBeDefined();
      expect(roles.reviewer).toBeDefined();
    });

    it('should include api keys from args', () => {
      const loader = new ConfigLoader();
      // API keys from environment would be used
      const config = loader.load({
        component: 'test.ts'
      });

      expect(config.apiKeys).toBeDefined();
    });
  });

  describe('loadConfig function', () => {
    it('should load config with args', () => {
      const config = loadConfig({
        component: 'test.ts',
        mode: 'simple'
      });

      expect(config).toBeDefined();
      expect(config.mode).toBe('simple');
    });

    it('should load config without args', () => {
      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.mode).toBeDefined();
    });
  });

  describe('tool configuration', () => {
    it('should have enabled tools', () => {
      const config = loadConfig();
      expect(config.tools.enabled.length).toBeGreaterThan(0);
    });

    it('should have security rules', () => {
      const config = loadConfig();
      expect(config.tools.securityRules).toBeDefined();
      expect(config.tools.securityRules.allowedPaths).toBeDefined();
      expect(config.tools.securityRules.forbiddenPaths).toBeDefined();
    });

    it('should have timeout settings', () => {
      const config = loadConfig();
      expect(config.tools.securityRules.timeoutMs).toBeGreaterThan(0);
    });
  });

  describe('retry policy', () => {
    it('should have retry policy configured', () => {
      const config = loadConfig();
      expect(config.retryPolicy).toBeDefined();
      expect(config.retryPolicy?.maxRetries).toBeGreaterThan(0);
      expect(config.retryPolicy?.backoffMs).toBeGreaterThan(0);
    });
  });
});
