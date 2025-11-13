import { PlannerLLM } from '../llm/PlannerLLM';
import {
  ProjectConfig,
  ProjectStateObject,
  CommitteeMemberProposal,
  CommitteePhaseDecision,
} from './types';
import { DecisionAggregator, DecisionContext } from '../llm/DecisionAggregator';

/**
 * Committee member configuration
 */
export interface CommitteeMember {
  id: string;
  modelName: string;
  planner: PlannerLLM;
}

/**
 * Phase 8: Multi-model committee decision making engine
 * Coordinates round-table planning between multiple AI models
 */
export class CommitteeEngine {
  constructor(
    private readonly members: CommitteeMember[],
    private readonly aggregator: DecisionAggregator,
  ) {}

  /**
   * Check if the committee has any members
   */
  hasMembers(): boolean {
    return this.members.length > 0;
  }

  /**
   * Get the number of committee members
   */
  getMemberCount(): number {
    return this.members.length;
  }

  /**
   * Plan the next phase using committee consensus
   *
   * Process:
   * 1. Find next pending phase (same logic as PhaseRunner)
   * 2. Ask each committee member to propose an instruction
   * 3. Build CommitteeMemberProposal[] (including memberId/modelName)
   * 4. Use DecisionAggregator.chooseBestInstruction(...)
   * 5. Return { instruction: decision.finalInstruction, decision }
   *
   * @param config Project configuration
   * @param pso Project state object
   * @returns Final instruction and committee decision
   */
  async planNextPhaseWithCommittee(
    config: ProjectConfig,
    pso: ProjectStateObject,
  ): Promise<{ instruction: string; decision: CommitteePhaseDecision }> {
    // 1) Find next pending phase (same logic as PhaseRunner)
    const nextPhase = pso.phases.find(p => p.status === 'pending');

    if (!nextPhase) {
      throw new Error(
        'CommitteeEngine: No pending phases found. Cannot plan next phase.'
      );
    }

    const phaseNumber = nextPhase.number;
    const phaseName = nextPhase.name;

    console.log(`\n🤝 Committee planning phase ${phaseNumber}: ${phaseName}`);
    console.log(`   Members: ${this.members.length}\n`);

    // 2) Collect proposals from all committee members
    const proposals: CommitteeMemberProposal[] = [];
    const errors: string[] = [];

    for (const member of this.members) {
      try {
        console.log(`   📋 Requesting proposal from ${member.id} (${member.modelName})...`);

        // Call the planner's planNextPhase method
        const result = await member.planner.planNextPhase(pso);
        const instruction = result.instruction;

        // Create proposal
        const proposal: CommitteeMemberProposal = {
          memberId: member.id,
          modelName: member.modelName,
          instruction,
          rationale: `Proposed by ${member.modelName}`,
        };

        proposals.push(proposal);

        console.log(`   ✅ Received proposal from ${member.id} (${instruction.length} chars)`);
      } catch (err) {
        const errorMsg = `Committee member ${member.id} (${member.modelName}) failed: ${(err as Error).message}`;
        console.warn(`   ⚠️  ${errorMsg}`);
        errors.push(errorMsg);
        // Continue with other members
      }
    }

    console.log('');

    // 3) Validate that we have at least one successful proposal
    if (proposals.length === 0) {
      const errorSummary = errors.length > 0
        ? `\nErrors:\n${errors.join('\n')}`
        : '';
      throw new Error(
        `CommitteeEngine: All committee members failed to provide proposals for phase ${phaseNumber}.${errorSummary}`
      );
    }

    // Log warning if some members failed
    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} of ${this.members.length} committee members failed. Proceeding with ${proposals.length} successful proposals.\n`);
    }

    // 4) Use DecisionAggregator to choose the best instruction
    const context: DecisionContext = {
      projectId: config.id,
      phaseNumber,
      phaseName,
    };

    console.log(`🎯 Aggregating ${proposals.length} proposal(s)...`);
    const decision = this.aggregator.chooseBestInstruction(proposals, context);

    console.log(`   Winner: ${decision.winnerMemberId} (${decision.winnerModelName})`);
    console.log(`   Decision: ${decision.notes}`);
    if (decision.tieBroken) {
      console.log(`   ⚖️  Tie broken by selection order`);
    }
    console.log('');

    // 5) Return final instruction and full decision
    return {
      instruction: decision.finalInstruction,
      decision,
    };
  }
}
