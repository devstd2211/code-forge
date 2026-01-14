/**
 * Model Registry - Metadata about available models.
 * Provides information about each model's capabilities, costs, and strengths.
 */

import type { ModelMetadata } from '../types/index.js';

/**
 * Registry of all available models with their metadata.
 * Used for model selection, cost estimation, and capability queries.
 */
export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
  // ============================================================================
  // CLAUDE MODELS
  // ============================================================================

  'claude-opus-4-1': {
    name: 'claude',
    displayName: 'Claude 3 Opus',
    type: 'claude-opus-4-1',
    provider: 'Anthropic',
    releaseDate: '2024-01-15',
    costTier: 'expensive',
    capabilities: {
      supportsToolUse: true,
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1kTokens: {
        input: 0.015,
        output: 0.075
      },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Complex reasoning',
        'Long-form analysis',
        'Code architecture',
        'Nuanced understanding',
        'Multi-step reasoning'
      ],
      weaknesses: [
        'Slower response times',
        'Higher cost',
        'Real-time information'
      ]
    }
  },

  'claude-sonnet-4-5': {
    name: 'claude',
    displayName: 'Claude 3.5 Sonnet',
    type: 'claude-sonnet-4-5',
    provider: 'Anthropic',
    releaseDate: '2024-06-20',
    costTier: 'medium',
    capabilities: {
      supportsToolUse: true,
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1kTokens: {
        input: 0.003,
        output: 0.015
      },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Excellent speed/quality tradeoff',
        'Code analysis',
        'Logic reasoning',
        'Balanced performance',
        'Good for most tasks'
      ],
      weaknesses: [
        'Slightly less reasoning than Opus',
        'Not ideal for very complex cases'
      ]
    }
  },

  'claude-haiku-3-5': {
    name: 'claude',
    displayName: 'Claude 3.5 Haiku',
    type: 'claude-haiku-3-5',
    provider: 'Anthropic',
    releaseDate: '2024-06-20',
    costTier: 'cheap',
    capabilities: {
      supportsToolUse: true,
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1kTokens: {
        input: 0.00025,
        output: 0.00125
      },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Very fast responses',
        'Very low cost',
        'Good for simple analysis',
        'High throughput'
      ],
      weaknesses: [
        'Less reasoning ability',
        'Not ideal for complex analysis',
        'Lower quality for nuanced tasks'
      ]
    }
  },

  // ============================================================================
  // GPT MODELS (Phase 2)
  // ============================================================================

  'gpt-4': {
    name: 'gpt',
    displayName: 'GPT-4',
    type: 'gpt-4',
    provider: 'OpenAI',
    releaseDate: '2023-03-14',
    costTier: 'expensive',
    capabilities: {
      supportsToolUse: true,
      maxTokens: 8192,
      contextWindow: 128000,
      costPer1kTokens: {
        input: 0.03,
        output: 0.06
      },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Strong reasoning',
        'Code understanding',
        'Function calling',
        'Large context'
      ],
      weaknesses: [
        'Slower',
        'Higher cost',
        'Knowledge cutoff'
      ]
    }
  },

  'gpt-4-turbo': {
    name: 'gpt',
    displayName: 'GPT-4 Turbo',
    type: 'gpt-4-turbo',
    provider: 'OpenAI',
    releaseDate: '2023-11-06',
    costTier: 'medium',
    capabilities: {
      supportsToolUse: true,
      maxTokens: 4096,
      contextWindow: 128000,
      costPer1kTokens: {
        input: 0.01,
        output: 0.03
      },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Fast processing',
        'Good reasoning',
        'Large context',
        'Function calling'
      ],
      weaknesses: [
        'Less reasoning than GPT-4',
        'Knowledge cutoff'
      ]
    }
  },

  'gpt-4o': {
    name: 'gpt',
    displayName: 'GPT-4o',
    type: 'gpt-4o',
    provider: 'OpenAI',
    releaseDate: '2024-05-13',
    costTier: 'medium',
    capabilities: {
      supportsToolUse: true,
      maxTokens: 4096,
      contextWindow: 128000,
      costPer1kTokens: {
        input: 0.005,
        output: 0.015
      },
      supportedRoles: ['architect', 'developer', 'reviewer'],
      strengths: [
        'Fast and capable',
        'Good balance',
        'Recent knowledge',
        'Function calling'
      ],
      weaknesses: [
        'Newer model less tested',
        'Knowledge cutoff'
      ]
    }
  },

  // ============================================================================
  // DEEPSEEK MODELS (Phase 2)
  // ============================================================================

  'deepseek-chat': {
    name: 'deepseek',
    displayName: 'DeepSeek Chat',
    type: 'deepseek-chat',
    provider: 'DeepSeek',
    releaseDate: '2024-01-15',
    costTier: 'cheap',
    capabilities: {
      supportsToolUse: false,
      maxTokens: 4096,
      contextWindow: 32000,
      costPer1kTokens: {
        input: 0.0002,
        output: 0.0006
      },
      supportedRoles: ['developer', 'reviewer'],
      strengths: [
        'Very low cost',
        'Fast responses',
        'Decent code understanding'
      ],
      weaknesses: [
        'Smaller context',
        'No tool support',
        'Less reasoning ability',
        'Not ideal for architecture'
      ]
    }
  },

  'deepseek-coder': {
    name: 'deepseek',
    displayName: 'DeepSeek Coder',
    type: 'deepseek-coder',
    provider: 'DeepSeek',
    releaseDate: '2024-03-12',
    costTier: 'cheap',
    capabilities: {
      supportsToolUse: false,
      maxTokens: 4096,
      contextWindow: 32000,
      costPer1kTokens: {
        input: 0.0002,
        output: 0.0006
      },
      supportedRoles: ['developer', 'reviewer'],
      strengths: [
        'Code-specific training',
        'Very low cost',
        'Good for code tasks'
      ],
      weaknesses: [
        'Smaller context',
        'No tool support',
        'Not ideal for architecture',
        'Limited reasoning'
      ]
    }
  }
};

/**
 * Get metadata for a specific model.
 */
export function getModelMetadata(modelId: string): ModelMetadata | null {
  return MODEL_REGISTRY[modelId] || null;
}

/**
 * Get all models from a provider.
 */
export function getModelsForProvider(provider: 'Anthropic' | 'OpenAI' | 'DeepSeek'): ModelMetadata[] {
  return Object.values(MODEL_REGISTRY).filter(m => m.provider === provider);
}

/**
 * Get models available for Phase 1 (Claude only).
 */
export function getPhase1Models(): ModelMetadata[] {
  return getModelsForProvider('Anthropic');
}

/**
 * Get all models grouped by provider.
 */
export function getModelsGroupedByProvider(): Record<string, ModelMetadata[]> {
  const grouped: Record<string, ModelMetadata[]> = {};

  for (const metadata of Object.values(MODEL_REGISTRY)) {
    if (!grouped[metadata.provider]) {
      grouped[metadata.provider] = [];
    }
    grouped[metadata.provider].push(metadata);
  }

  return grouped;
}

/**
 * Check if a model is available in the registry.
 */
export function isModelAvailable(modelId: string): boolean {
  return modelId in MODEL_REGISTRY;
}

/**
 * Get the cheapest model for a given provider.
 */
export function getCheapestModel(provider: 'Anthropic' | 'OpenAI' | 'DeepSeek'): ModelMetadata | null {
  const models = getModelsForProvider(provider);
  if (models.length === 0) return null;

  return models.reduce((cheapest, current) => {
    const currentCost = current.capabilities.costPer1kTokens.input + current.capabilities.costPer1kTokens.output;
    const cheapestCost = cheapest.capabilities.costPer1kTokens.input + cheapest.capabilities.costPer1kTokens.output;
    return currentCost < cheapestCost ? current : cheapest;
  });
}

/**
 * Get the most capable model for a given provider.
 */
export function getMostCapableModel(provider: 'Anthropic' | 'OpenAI' | 'DeepSeek'): ModelMetadata | null {
  const models = getModelsForProvider(provider);
  if (models.length === 0) return null;

  return models.reduce((best, current) => {
    // Prefer expensive models (usually better)
    const costTierRank: Record<string, number> = { cheap: 1, medium: 2, expensive: 3 };
    return costTierRank[current.costTier] > costTierRank[best.costTier] ? current : best;
  });
}
