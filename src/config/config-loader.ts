import * as fs from 'fs';
import * as path from 'path';
import type { SystemConfig, ReviewCommandArgs } from '../types/index.js';
import { ConfigError } from '../types/errors.js';
import { DEFAULT_CONFIG, ADVANCED_MODE_DEFAULT } from './defaults.js';

/**
 * Configuration loader that merges multiple config sources.
 * Priority order (highest to lowest):
 * 1. CLI arguments
 * 2. Environment variables
 * 3. Config file (config.json or ~/.codeforge/config.json)
 * 4. Defaults
 */
export class ConfigLoader {
  private config: SystemConfig;

  constructor() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * Load configuration from all sources and merge them.
   */
  load(args?: ReviewCommandArgs): SystemConfig {
    // Start with defaults
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // Merge with environment variables
    this.mergeEnvironmentConfig();

    // Try to load from config file
    const configFile = this.findConfigFile();
    if (configFile) {
      this.mergeConfigFile(configFile);
    }

    // Merge with CLI arguments
    if (args) {
      this.mergeCliArguments(args);
    }

    // Validate the final config
    this.validate();

    return this.config;
  }

  /**
   * Find config file in standard locations.
   */
  private findConfigFile(): string | null {
    const possiblePaths = [
      path.join(process.cwd(), 'config.json'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', '.codeforge', 'config.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Merge environment variables into config.
   */
  private mergeEnvironmentConfig(): void {
    const env = process.env;

    // Mode
    if (env.EDISON_MODE === 'simple' || env.EDISON_MODE === 'advanced') {
      this.config.mode = env.EDISON_MODE;
    }

    // API Keys
    if (env.ANTHROPIC_API_KEY) {
      this.config.apiKeys.claude = env.ANTHROPIC_API_KEY;
    }
    if (env.OPENAI_API_KEY) {
      this.config.apiKeys.openai = env.OPENAI_API_KEY;
    }
    if (env.DEEPSEEK_API_KEY) {
      this.config.apiKeys.deepseek = env.DEEPSEEK_API_KEY;
    }

    // Logging
    if (env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'info' ||
        env.LOG_LEVEL === 'warn' || env.LOG_LEVEL === 'error') {
      if (this.config.logging) {
        this.config.logging.level = env.LOG_LEVEL;
      }
    }
  }

  /**
   * Merge config file into config.
   */
  private mergeConfigFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileConfig = JSON.parse(content) as Partial<SystemConfig>;

      // Deep merge
      this.config = this.deepMerge(this.config, fileConfig);
    } catch (error) {
      throw new ConfigError(
        `Failed to load config file: ${(error as Error).message}`,
        filePath
      );
    }
  }

  /**
   * Merge CLI arguments into config.
   */
  private mergeCliArguments(args: ReviewCommandArgs): void {
    // Mode
    if (args.mode) {
      const oldMode = this.config.mode;
      this.config.mode = args.mode;

      // If switching to advanced mode, use advanced defaults if not already set
      if (args.mode === 'advanced' && oldMode === 'simple') {
        this.config = JSON.parse(JSON.stringify(ADVANCED_MODE_DEFAULT));
      }
    }

    // Simple mode model/type
    if (args.model && this.config.mode === 'simple') {
      const roles = this.config.roles as any;
      roles.model = args.model;
    }

    if (args.modelType && this.config.mode === 'simple') {
      const roles = this.config.roles as any;
      roles.modelType = args.modelType;
    }

    // Advanced mode role assignments
    if (this.config.mode === 'advanced') {
      const roles = this.config.roles as any;

      if (args.architectModel) {
        roles.architect.model = args.architectModel;
      }
      if (args.architectType) {
        roles.architect.modelType = args.architectType;
      }

      if (args.developerModel) {
        roles.developer.model = args.developerModel;
      }
      if (args.developerType) {
        roles.developer.modelType = args.developerType;
      }

      if (args.reviewerModel) {
        roles.reviewer.model = args.reviewerModel;
      }
      if (args.reviewerType) {
        roles.reviewer.modelType = args.reviewerType;
      }
    }
  }

  /**
   * Deep merge objects (right overwrites left).
   */
  private deepMerge(target: any, source: any): any {
    const result = JSON.parse(JSON.stringify(target));

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Validate the configuration.
   */
  private validate(): void {
    // Validate mode
    if (this.config.mode !== 'simple' && this.config.mode !== 'advanced') {
      throw new ConfigError(`Invalid mode: ${this.config.mode}`);
    }

    // Validate roles based on mode
    if (this.config.mode === 'simple') {
      const roles = this.config.roles as any;
      if (!roles.model || !roles.modelType) {
        throw new ConfigError('Simple mode requires model and modelType');
      }
    } else {
      const roles = this.config.roles as any;
      if (!roles.architect || !roles.developer || !roles.reviewer) {
        throw new ConfigError('Advanced mode requires architect, developer, and reviewer configurations');
      }
    }

    // Validate tools config
    if (!this.config.tools.securityRules.allowedPaths || this.config.tools.securityRules.allowedPaths.length === 0) {
      console.warn('Warning: No allowed paths configured for tools');
    }
  }
}

/**
 * Convenience function to load config with a single call.
 */
export function loadConfig(args?: ReviewCommandArgs): SystemConfig {
  const loader = new ConfigLoader();
  return loader.load(args);
}
