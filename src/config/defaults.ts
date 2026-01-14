import type { SystemConfig } from '../types/index.js';

/**
 * Default system configuration for Phase 1 (simple mode with Claude).
 * This is the baseline that can be overridden by config files or CLI arguments.
 */
export const DEFAULT_CONFIG: SystemConfig = {
  mode: 'simple',
  roles: {
    model: 'claude',
    modelType: 'claude-sonnet-4-5',
    role: 'architect',
    temperature: 0.7,
    maxTokens: 4096
  },
  tools: {
    enabled: ['read_file', 'write_file'],
    securityRules: {
      allowedPaths: ['./src', './tests', './'],
      forbiddenPaths: ['/etc', '/root', '/sys', '/proc', './.git', './node_modules'],
      maxFileSize: 10485760, // 10MB
      timeoutMs: 30000 // 30 seconds
    }
  },
  apiKeys: {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY
  },
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 30000,
    backoffMultiplier: 2
  },
  logging: {
    level: 'info',
    format: 'text'
  }
};

/**
 * Advanced mode defaults (for Phase 2+).
 * Uses three different models for different roles.
 */
export const ADVANCED_MODE_DEFAULT: SystemConfig = {
  mode: 'advanced',
  roles: {
    architect: {
      model: 'claude',
      modelType: 'claude-opus-4-1',
      temperature: 0.5,
      maxTokens: 4096
    },
    developer: {
      model: 'gpt',
      modelType: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 4096
    },
    reviewer: {
      model: 'deepseek',
      modelType: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 2048
    }
  },
  tools: {
    enabled: ['read_file', 'write_file', 'test_runner', 'code_search'],
    securityRules: {
      allowedPaths: ['./src', './tests', './'],
      forbiddenPaths: ['/etc', '/root', '/sys', '/proc', './.git', './node_modules'],
      maxFileSize: 10485760,
      timeoutMs: 30000
    }
  },
  apiKeys: {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY
  },
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 30000,
    backoffMultiplier: 2
  },
  logging: {
    level: 'info',
    format: 'text'
  }
};
