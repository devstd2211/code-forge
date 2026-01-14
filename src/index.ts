/**
 * Edison CLI - Triple-Model Code Review System
 * Main entry point for the library.
 */

// Export types
export * from './types/index.js';
export * from './types/errors.js';

// Export config
export { loadConfig, ConfigLoader } from './config/config-loader.js';
export { DEFAULT_CONFIG, ADVANCED_MODE_DEFAULT } from './config/defaults.js';
export { getSystemPrompt, ANALYSIS_TASK_INSTRUCTION } from './config/system-prompts.js';

// Export models
export type { IModel } from './models/IModel.js';
export { ClaudeAdapter } from './models/adapters/claude-adapter.js';
export { ModelFactory, createModel } from './models/model-factory.js';
export { MODEL_REGISTRY, getModelMetadata } from './models/model-registry.js';

// Export tools
export type { ITool } from './tools/ITool.js';
export { FileReader } from './tools/implementations/file-reader.js';
export { FileWriter } from './tools/implementations/file-writer.js';
export { ToolExecutor, createExecutor } from './tools/executor.js';
export { ToolValidator, createValidator } from './tools/validator.js';
export { ToolFactory, createTools } from './tools/tool-factory.js';

// Export transport
export { RequestHandler } from './transport/request-handler.js';
export { ResponseParser } from './transport/response-parser.js';
export { Serializer } from './transport/serializer.js';

// Export core
export { Orchestrator } from './core/orchestrator.js';

// Export CLI
export { OutputFormatter } from './cli/output-formatter.js';
export { reviewCommand } from './cli/commands/review.js';
