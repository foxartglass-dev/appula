import { CommitteeMemberProposal, CommitteePhaseDecision } from '../orchestrator/types';

/**
 * Context for decision aggregation
 */
export interface DecisionContext {
  projectId: string;
  phaseNumber: number;
  phaseName: string;
}

/**
 * Phase 8: Decision aggregator for committee planner
 * Uses a simple, deterministic heuristic to choose the best instruction
 */
export class DecisionAggregator {
  /**
   * Choose the best instruction from multiple committee member proposals
   *
   * Heuristic (Phase 8 - simple and deterministic):
   * - If no proposals: throw descriptive error
   * - Prefer the longest non-empty instruction (proxy for detail)
   * - Break ties by first in list
   *
   * @param proposals Array of proposals from committee members
   * @param context Context about the decision being made
   * @returns Committee decision with chosen instruction
   */
  chooseBestInstruction(
    proposals: CommitteeMemberProposal[],
    context: DecisionContext,
  ): CommitteePhaseDecision {
    // Validation: ensure we have proposals
    if (!proposals || proposals.length === 0) {
      throw new Error(
        `DecisionAggregator: No proposals provided for phase ${context.phaseNumber}. ` +
        'Cannot make a decision without committee input.'
      );
    }

    // Filter out proposals with empty or whitespace-only instructions
    const validProposals = proposals.filter(
      p => p.instruction && p.instruction.trim().length > 0
    );

    // If all proposals are empty, fall back to all proposals
    const workingProposals = validProposals.length > 0 ? validProposals : proposals;

    if (workingProposals.length === 0) {
      throw new Error(
        `DecisionAggregator: All proposals have empty instructions for phase ${context.phaseNumber}`
      );
    }

    // Find the proposal(s) with the maximum instruction length
    const proposalsWithLength = workingProposals.map(p => ({
      proposal: p,
      length: p.instruction.trim().length,
    }));

    const maxLength = Math.max(...proposalsWithLength.map(p => p.length));
    const candidatesWithMaxLength = proposalsWithLength.filter(p => p.length === maxLength);

    // Check if there's a tie
    const tieBroken = candidatesWithMaxLength.length > 1;

    // Pick the first one (deterministic tie-breaking)
    const winner = candidatesWithMaxLength[0].proposal;

    // Build notes about the decision
    const notes = tieBroken
      ? `Selected first of ${candidatesWithMaxLength.length} proposals with max length ${maxLength} chars (tie-broken)`
      : `Selected proposal with max length ${maxLength} chars from ${workingProposals.length} total`;

    // Build and return the decision
    const decision: CommitteePhaseDecision = {
      projectId: context.projectId,
      phaseNumber: context.phaseNumber,
      finalInstruction: winner.instruction,
      winnerMemberId: winner.memberId,
      winnerModelName: winner.modelName,
      tieBroken,
      notes,
      proposals,
      decidedAt: new Date().toISOString(),
    };

    return decision;
  }
}
