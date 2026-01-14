/**
 * Complete type exports for the entire system.
 * This is the single point of import for all type definitions.
 */

// ============================================================================
// ENUMS & LITERAL TYPES
// ============================================================================

export type ModelName = 'claude' | 'gpt' | 'deepseek';
export type AgentRole = 'architect' | 'developer' | 'reviewer';
export type ExecutionMode = 'simple' | 'advanced';
export type FindingType =
  | 'architecture'
  | 'logic'
  | 'performance'
  | 'security'
  | 'test-coverage';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Assessment = 'pass' | 'warning' | 'critical';

// Model types supported by each provider
export type ClaudeModel = 'claude-opus-4-1' | 'claude-sonnet-4-5' | 'claude-haiku-3-5';
export type GPTModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini';
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-coder';

export type ModelType =
  | ClaudeModel
  | GPTModel
  | DeepSeekModel;

// ============================================================================
// COMPONENT & CONTEXT TYPES
// ============================================================================

export interface ComponentReference {
  name: string;           // e.g., "OrderBlockAnalyzer"
  sourcePath: string;     // e.g., "src/trading/OrderBlockAnalyzer.ts"
  testPath?: string;      // e.g., "tests/trading/OrderBlockAnalyzer.test.ts"
  lines?: {
    start: number;
    end: number;
  };
}

export interface AnalysisContext {
  projectName: string;
  componentCount: number;
  totalLOC: number;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust';
  framework?: string;    // e.g., "express", "react"
  description?: string;
}

// ============================================================================
// FINDING TYPES
// ============================================================================

export interface Finding {
  id: string;             // UUID v4 for deduplication
  type: FindingType;
  severity: Severity;
  description: string;
  location?: string;      // "file:line:col"
  code?: string;          // Code snippet
  suggestion?: string;    // How to fix
  relatedFindings?: string[];  // IDs of related findings
  confidence: number;     // 0.0 - 1.0
  tags?: string[];       // Optional categorization tags
}

export interface FindingSummary {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    architecture: number;
    logic: number;
    performance: number;
    security: number;
    testCoverage: number;
  };
}

// ============================================================================
// TRANSPORT TYPES
// ============================================================================

export interface ToolInput {
  [key: string]: string | number | string[] | boolean;
}

export interface ToolOutput {
  success: boolean;
  data: string;              // Result content
  error?: string;            // Error message if failed
  executionTimeMs: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;  // JSON Schema
  outputSchema?: Record<string, any>;
}

export interface UnifiedRequest {
  // Routing
  modelName: ModelName;
  role: AgentRole;

  // Task
  task: string;            // "analyze", "review", "validate"
  component: ComponentReference;

  // Context
  context?: AnalysisContext;
  sourceCode?: string;     // Inline code if needed
  previousFindings?: Finding[];

  // Tools & Control
  availableTools: string[];
  temperature?: number;    // 0.0 - 1.0, default 0.7
  maxTokens?: number;
}

export interface ExecutionMetadata {
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  executionTimeMs: number;
  iterationCount: number;
  toolCalls: string[];
  costEstimate?: number;   // Estimated API cost in USD
}

export interface UnifiedResponse {
  // Identity
  modelName: ModelName;
  role: AgentRole;
  timestamp: string;       // ISO 8601

  // Results
  findings: Finding[];
  summary: string;         // Executive summary
  overallAssessment: Assessment;

  // Quality metrics
  confidence: number;      // 0.0 - 1.0
  findingCoverage: {
    architecture: number;
    logic: number;
    performance: number;
    security: number;
    testCoverage: number;
  };

  // Execution
  metadata: ExecutionMetadata;
  rawResponse?: string;
}

// ============================================================================
// CONSENSUS TYPES
// ============================================================================

export interface MergedFinding extends Finding {
  sources: ModelName[];           // Which models found this
  confidences: Record<ModelName, number>;  // Per-model confidence
  consensusLevel: 'unanimous' | 'majority' | 'minority';
  agreementScore: number;         // 0.0 - 1.0
}

export interface ConsensusReport {
  findings: MergedFinding[];
  modelResponses: Record<ModelName, UnifiedResponse>;
  consensusMetrics: {
    overallAgreement: number;      // % of findings agreed upon
    disagreementHotspots: Finding[];
    modelAlignmentScore: number;
  };
  executionSummary: {
    totalTime: number;
    modelsUsed: ModelName[];
    totalTokens: number;
  };
}

// ============================================================================
// MODEL CAPABILITIES
// ============================================================================

export interface ModelCapabilities {
  supportsToolUse: boolean;
  maxTokens: number;
  contextWindow: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  supportedRoles: AgentRole[];
  strengths: string[];       // e.g., ["architecture analysis", "complex reasoning"]
  weaknesses: string[];      // e.g., ["real-time data", "image analysis"]
}

export interface ModelMetadata {
  name: ModelName;
  displayName: string;
  type: ModelType;
  provider: string;
  capabilities: ModelCapabilities;
  releaseDate: string;
  costTier: 'cheap' | 'medium' | 'expensive';
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface RoleConfiguration {
  model: ModelName;
  modelType: ModelType;
  systemPrompt?: string;      // Override default
  temperature?: number;
  maxTokens?: number;
}

export interface SimpleModeConfig {
  model: ModelName;
  modelType: ModelType;
  role: AgentRole;
  temperature?: number;
  maxTokens?: number;
}

export interface AdvancedModeConfig {
  architect: RoleConfiguration;
  developer: RoleConfiguration;
  reviewer: RoleConfiguration;
}

export interface ToolSecurityRules {
  allowedPaths: string[];
  forbiddenPaths: string[];
  maxFileSize?: number;       // in bytes
  timeoutMs?: number;         // tool execution timeout
}

export interface ToolConfiguration {
  enabled: string[];          // Enabled tool names
  securityRules: ToolSecurityRules;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs?: number;      // Max wait time
  backoffMultiplier?: number; // Exponential backoff
}

export interface ApiKeyConfig {
  claude?: string;
  openai?: string;
  deepseek?: string;
}

export interface SystemConfig {
  mode: ExecutionMode;
  roles: SimpleModeConfig | AdvancedModeConfig;
  tools: ToolConfiguration;
  apiKeys: ApiKeyConfig;
  retryPolicy?: RetryPolicy;
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
}

// ============================================================================
// CLI ARGUMENT TYPES
// ============================================================================

export interface ReviewCommandArgs {
  component: string;           // Component name or path
  mode?: ExecutionMode;
  model?: ModelName;
  modelType?: ModelType;
  architectModel?: ModelName;
  architectType?: ModelType;
  developerModel?: ModelName;
  developerType?: ModelType;
  reviewerModel?: ModelName;
  reviewerType?: ModelType;
  config?: string;             // Path to config file
  output?: string;             // Output file path
  format?: 'json' | 'markdown' | 'html' | 'text';
  verbose?: boolean;
  dryRun?: boolean;
}

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

/**
 * Core abstraction for all AI models.
 * Implementations: ClaudeAdapter, GPTAdapter, DeepSeekAdapter
 */
export interface IModel {
  // Identity
  readonly name: ModelName;
  readonly modelId: string;

  // Current assignment
  currentRole?: AgentRole;

  // Core operation - unified interface for all models
  analyze(request: UnifiedRequest): Promise<UnifiedResponse>;

  // Tool support
  supportedTools(): ToolDefinition[];

  // Capabilities
  getCapabilities(): ModelCapabilities;

  // Validation
  validateInput(request: UnifiedRequest): { valid: boolean; errors: string[] };
}

/**
 * Abstract tool interface.
 * Implementations: FileReader, FileWriter, TestRunner, CodeSearch, GitDiff, Validator
 */
export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, any>;  // JSON Schema

  // Execute tool with given input
  execute(input: ToolInput): Promise<ToolOutput>;

  // Validate input before execution
  validate(input: ToolInput): { valid: boolean; errors: string[] };

  // Security check - ensure path/input is safe
  isSafe(input: ToolInput): boolean;
}

/**
 * An agent is a model with an assigned role and access to specific tools.
 */
export interface IAgent {
  readonly id: string;
  readonly model: IModel;
  readonly role: AgentRole;
  readonly assignedTools: ITool[];

  // Execute analysis task
  performAnalysis(request: AnalysisRequest): Promise<UnifiedResponse>;

  // Get role-specific system prompt
  getSystemPrompt(): string;

  // Get role-specific instructions
  getRoleInstructions(): string;
}

export interface AnalysisRequest {
  component: ComponentReference;
  context: AnalysisContext;
  task: string;
  availableTools: string[];
}

// All types are already exported above
