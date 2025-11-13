import { CommitteeCandidate, CommitteeDecision } from '../orchestrator/types';

/**
 * Aggregates decisions from multiple LLM responses
 * Used for committee-based decision making
 * Phase 1: Stub implementation
 */
export class DecisionAggregator {
  /**
   * Aggregate multiple candidate responses into a final decision
   * Future: Implement voting, synthesis, or other aggregation strategies
   */
  async aggregate(
    _question: string,
    _candidates: CommitteeCandidate[]
  ): Promise<CommitteeDecision> {
    throw new Error('DecisionAggregator.aggregate not implemented yet (Phase 1 stub)');
  }

  /**
   * Score and rank candidates
   */
  scoreCandidates(_candidates: CommitteeCandidate[]): Array<CommitteeCandidate & { score: number }> {
    throw new Error('DecisionAggregator.scoreCandidates not implemented yet (Phase 1 stub)');
  }

  /**
   * Synthesize multiple responses into a unified response
   */
  async synthesize(_candidates: CommitteeCandidate[]): Promise<string> {
    throw new Error('DecisionAggregator.synthesize not implemented yet (Phase 1 stub)');
  }
}
