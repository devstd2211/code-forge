/**
 * Model Factory - Creates model instances based on configuration.
 * Implements the factory pattern for model creation and management.
 */

import type { IModel } from './IModel.js';
import type { ModelName, ClaudeModel, GPTModel, DeepSeekModel, ModelType } from '../types/index.js';
import { ClaudeAdapter } from './adapters/claude-adapter.js';
import { GPTAdapter } from './adapters/gpt-adapter.js';
import { DeepSeekAdapter } from './adapters/deepseek-adapter.js';
import { ModelError, ConfigError } from '../types/errors.js';

/**
 * Factory for creating model instances.
 * Handles model instantiation, API key validation, and model selection.
 */
export class ModelFactory {
  /**
   * Create a model instance based on name and API key.
   *
   * @param modelName - The model provider ('claude', 'gpt', 'deepseek')
   * @param modelType - The specific model type/version
   * @param apiKeys - Object with API keys for each provider
   * @returns IModel instance
   * @throws ModelError if API key is missing
   * @throws ConfigError if model is not supported yet
   */
  static create(
    modelName: ModelName,
    modelType: ModelType,
    apiKeys: Record<string, string | undefined>
  ): IModel {
    switch (modelName) {
      case 'claude':
        return this.createClaude(modelType as ClaudeModel, apiKeys.claude);

      case 'gpt':
        return this.createGPT(modelType as GPTModel, apiKeys.openai);

      case 'deepseek':
        return this.createDeepSeek(modelType as DeepSeekModel, apiKeys.deepseek);

      default:
        throw new ConfigError(`Unknown model: ${modelName}`);
    }
  }

  /**
   * Create a Claude model adapter.
   */
  private static createClaude(modelType: ClaudeModel, apiKey?: string): IModel {
    if (!apiKey) {
      throw new ModelError(
        'claude',
        'ANTHROPIC_API_KEY is required for Claude models. Set it in environment or config.'
      );
    }

    const validModels: ClaudeModel[] = ['claude-opus-4-1', 'claude-sonnet-4-5', 'claude-haiku-3-5'];
    if (!validModels.includes(modelType)) {
      throw new ConfigError(
        `Invalid Claude model: ${modelType}. Valid options: ${validModels.join(', ')}`
      );
    }

    return new ClaudeAdapter(modelType, apiKey);
  }

  /**
   * Create a GPT model adapter.
   */
  private static createGPT(modelType: GPTModel, apiKey?: string): IModel {
    if (!apiKey) {
      throw new ModelError(
        'gpt',
        'OPENAI_API_KEY is required for GPT models. Set it in environment or config.'
      );
    }

    const validModels: GPTModel[] = ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
    if (!validModels.includes(modelType)) {
      throw new ConfigError(
        `Invalid GPT model: ${modelType}. Valid options: ${validModels.join(', ')}`
      );
    }

    return new GPTAdapter(modelType, apiKey);
  }

  /**
   * Create a DeepSeek model adapter.
   */
  private static createDeepSeek(modelType: DeepSeekModel, apiKey?: string): IModel {
    if (!apiKey) {
      throw new ModelError(
        'deepseek',
        'DEEPSEEK_API_KEY is required for DeepSeek models. Set it in environment or config.'
      );
    }

    const validModels: DeepSeekModel[] = ['deepseek-chat', 'deepseek-coder'];
    if (!validModels.includes(modelType)) {
      throw new ConfigError(
        `Invalid DeepSeek model: ${modelType}. Valid options: ${validModels.join(', ')}`
      );
    }

    return new DeepSeekAdapter(modelType, apiKey);
  }

  /**
   * Validate that API key exists for a model.
   */
  static validateApiKey(_modelName: ModelName, apiKey?: string): boolean {
    if (!apiKey) {
      return false;
    }
    return apiKey.length > 0;
  }

  /**
   * Get default model type for a provider.
   */
  static getDefaultModelType(modelName: ModelName): ModelType {
    switch (modelName) {
      case 'claude':
        return 'claude-sonnet-4-5';
      case 'gpt':
        return 'gpt-4-turbo';
      case 'deepseek':
        return 'deepseek-chat';
      default:
        return 'claude-sonnet-4-5';
    }
  }
}

/**
 * Create a model with sensible defaults.
 * Convenience function for common use cases.
 */
export function createModel(
  modelName: ModelName,
  apiKeys: Record<string, string | undefined>,
  modelType?: ModelType
): IModel {
  const type = modelType || ModelFactory.getDefaultModelType(modelName);
  return ModelFactory.create(modelName, type, apiKeys);
}
