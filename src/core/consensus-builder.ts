/**
 * ConsensusBuild - Merges findings from multiple models.
 * Handles deduplication, confidence calculation, and agreement scoring.
 */

import type {
  UnifiedResponse,
  Finding,
  MergedFinding,
  ConsensusReport,
  ModelName
} from '../types/index.js';
import { ConsensusBuildError } from '../types/errors.js';

/**
 * Builds consensus from multiple model responses.
 * Merges findings, deduplicates, and calculates confidence scores.
 */
export class ConsensusBuilder {
  /**
   * Build consensus report from multiple model responses.
   *
   * @param responses - Responses from multiple models
   * @returns Consensus report with merged findings
   */
  static buildConsensus(responses: UnifiedResponse[]): ConsensusReport {
    if (responses.length === 0) {
      throw new ConsensusBuildError('No responses to build consensus from');
    }

    // Collect all findings from all models
    const allFindings = this.collectAllFindings(responses);

    // Group findings by similarity (deduplication)
    const groupedFindings = this.groupFindingsBySimilarity(allFindings);

    // Merge findings within each group
    const mergedFindings = Array.from(groupedFindings.values()).map(group =>
      this.mergeFindingGroup(group)
    );

    // Calculate consensus metrics
    const consensusMetrics = this.calculateConsensusMetrics(mergedFindings, responses);

    // Build the report
    const report: ConsensusReport = {
      findings: mergedFindings,
      modelResponses: this.buildModelResponseMap(responses),
      consensusMetrics,
      executionSummary: {
        totalTime: responses.reduce((sum, r) => sum + r.metadata.executionTimeMs, 0),
        modelsUsed: responses.map(r => r.modelName),
        totalTokens: responses.reduce((sum, r) => sum + r.metadata.tokensUsed.total, 0)
      }
    };

    return report;
  }

  /**
   * Collect all findings from all responses.
   */
  private static collectAllFindings(
    responses: UnifiedResponse[]
  ): Array<Finding & { sourceModel: ModelName }> {
    return responses.flatMap(response =>
      response.findings.map(finding => ({
        ...finding,
        sourceModel: response.modelName
      }))
    );
  }

  /**
   * Group findings by similarity for deduplication.
   * Uses finding ID as primary key, with description similarity as fallback.
   */
  private static groupFindingsBySimilarity(
    findings: Array<Finding & { sourceModel: ModelName }>
  ): Map<string, Array<Finding & { sourceModel: ModelName }>> {
    const groups = new Map<string, Array<Finding & { sourceModel: ModelName }>>();

    for (const finding of findings) {
      // Try to find existing group with same ID or similar description
      let groupKey = finding.id;
      let found = false;

      // First try by exact ID match
      if (groups.has(groupKey)) {
        groups.get(groupKey)!.push(finding);
        found = true;
      }

      // If not found, try to find by similar description and location
      if (!found) {
        for (const [, group] of groups.entries()) {
          if (this.findingsSimilar(finding, group[0])) {
            group.push(finding);
            found = true;
            break;
          }
        }
      }

      // If still not found, create new group
      if (!found) {
        groups.set(groupKey, [finding]);
      }
    }

    return groups;
  }

  /**
   * Check if two findings are similar (potential duplicates).
   */
  private static findingsSimilar(f1: Finding, f2: Finding): boolean {
    // Same location and type = likely duplicate
    if (f1.location === f2.location && f1.type === f2.type) {
      // Check description similarity (simple substring match)
      const desc1 = f1.description.toLowerCase();
      const desc2 = f2.description.toLowerCase();
      return desc1.includes(desc2.substring(0, 20)) || desc2.includes(desc1.substring(0, 20));
    }

    return false;
  }

  /**
   * Merge a group of similar findings into one.
   */
  private static mergeFindingGroup(
    group: Array<Finding & { sourceModel: ModelName }>
  ): MergedFinding {
    if (group.length === 0) {
      throw new ConsensusBuildError('Cannot merge empty finding group');
    }

    // Use the first finding as base
    const baseFinding = group[0];

    // Collect all source models and their confidences
    const sources = Array.from(new Set(group.map(f => f.sourceModel)));
    const confidences: Record<ModelName, number> = {} as Record<ModelName, number>;
    for (const finding of group) {
      confidences[finding.sourceModel] = finding.confidence;
    }

    // Calculate merged confidence (average)
    const mergedConfidence = group.reduce((sum, f) => sum + f.confidence, 0) / group.length;

    // Determine consensus level
    const consensusLevel = this.determineConsensusLevel(sources.length, group.length);

    // Calculate agreement score
    const agreementScore = this.calculateAgreementScore(group);

    return {
      ...baseFinding,
      id: baseFinding.id,
      confidence: mergedConfidence,
      sources,
      confidences,
      consensusLevel,
      agreementScore
    };
  }

  /**
   * Determine consensus level based on model agreement.
   */
  private static determineConsensusLevel(
    sourceCount: number,
    totalCount: number
  ): 'unanimous' | 'majority' | 'minority' {
    const percentage = (sourceCount / totalCount) * 100;

    if (percentage === 100) {
      return 'unanimous';
    } else if (percentage >= 66) {
      return 'majority';
    } else {
      return 'minority';
    }
  }

  /**
   * Calculate agreement score (0-1) based on confidence consistency.
   */
  private static calculateAgreementScore(
    group: Array<Finding & { sourceModel: ModelName }>
  ): number {
    if (group.length === 1) {
      return group[0].confidence;
    }

    // Calculate standard deviation of confidences
    const confidences = group.map(f => f.confidence);
    const mean = confidences.reduce((a, b) => a + b) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    // Convert std dev (0-0.5) to agreement score (1-0)
    // High std dev = low agreement, low std dev = high agreement
    return Math.max(0, 1 - stdDev * 2);
  }

  /**
   * Calculate overall consensus metrics.
   */
  private static calculateConsensusMetrics(
    mergedFindings: MergedFinding[],
    responses: UnifiedResponse[]
  ): ConsensusReport['consensusMetrics'] {
    // Overall agreement = average agreement score of all findings
    const overallAgreement =
      mergedFindings.length > 0
        ? mergedFindings.reduce((sum, f) => sum + f.agreementScore, 0) / mergedFindings.length
        : 0;

    // Disagreement hotspots = findings with minority consensus
    const disagreementHotspots = mergedFindings
      .filter(f => f.consensusLevel === 'minority')
      .map(({ sources, confidences, consensusLevel, agreementScore, ...finding }) => finding);

    // Model alignment = how much models agree overall
    const modelAlignmentScore = this.calculateModelAlignment(responses);

    return {
      overallAgreement,
      disagreementHotspots,
      modelAlignmentScore
    };
  }

  /**
   * Calculate how well models align overall.
   */
  private static calculateModelAlignment(responses: UnifiedResponse[]): number {
    if (responses.length <= 1) {
      return 1.0;
    }

    // Simple alignment: compare number of findings each model found
    const findingCounts = responses.map(r => r.findings.length);
    const mean = findingCounts.reduce((a, b) => a + b) / findingCounts.length;
    const variance = findingCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / findingCounts.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 score
    return Math.max(0, 1 - stdDev / (mean + 1));
  }

  /**
   * Build a map of model name to response.
   */
  private static buildModelResponseMap(
    responses: UnifiedResponse[]
  ): Record<ModelName, UnifiedResponse> {
    const map: Record<ModelName, UnifiedResponse> = {} as Record<ModelName, UnifiedResponse>;

    for (const response of responses) {
      map[response.modelName] = response;
    }

    return map;
  }
}
