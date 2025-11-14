import {
  PhaseExecutionRequest,
  PhaseExecutionResult,
  CoderExecutor,
} from "../llm/CoderExecutor";
import {
  CoderCommitteeDecision,
  CoderCommitteeProposal,
  CoderHealthSnapshot,
  CoderId,
} from "./types";
import { CoderHealthTester, CoderHealthTestContext } from "./CoderHealthTester";

/**
 * Phase 9.5: Member of the coder committee
 */
export interface CoderCommitteeMember {
  id: CoderId;
  name: string;
  executor: CoderExecutor;
  healthTester: CoderHealthTester;
}

/**
 * Phase 9.5: Result from coder committee selection
 */
export interface CoderCommitteeEngineResult {
  decision: CoderCommitteeDecision;
  chosenExecutor: CoderExecutor;
  chosenHealth: CoderHealthSnapshot | null;
}

/**
 * Phase 9.5: CoderCommitteeEngine
 * Manages multiple coder candidates (e.g., Claude Code CLI, GPT-5.1 executor).
 * Runs dry-run health probes and selects the healthiest coder for each phase.
 * Similar to CommitteeEngine but for code execution rather than planning.
 */
export class CoderCommitteeEngine {
  constructor(private readonly members: CoderCommitteeMember[]) {}

  hasMembers(): boolean {
    return this.members.length > 0;
  }

  async chooseCoderForPhase(
    ctx: CoderHealthTestContext,
    phaseNumber: number,
    phaseName: string,
    instruction: string,
  ): Promise<CoderCommitteeEngineResult> {
    if (!this.hasMembers()) {
      throw new Error("CoderCommitteeEngine called with no members configured");
    }

    const proposals: CoderCommitteeProposal[] = [];
    const healthSnapshots: Record<CoderId, CoderHealthSnapshot> = {};

    // Phase 9.5: simple loop, all members run a dry-run probe.
    for (const member of this.members) {
      const health = await member.healthTester.runHealthCheck(ctx);
      healthSnapshots[member.id] = health;

      const score = health.score;
      proposals.push({
        coderId: member.id,
        coderName: member.name,
        instructionSummary: `Will execute phase ${phaseNumber} "${phaseName}" with ${member.name}. Health score=${score.toFixed(
          2,
        )}.`,
        confidence: score,
        estimatedDurationMinutes: null,
      });
    }

    // Heuristic: pick highest health score; tie => first in list.
    let winner = this.members[0];
    let winnerHealth = healthSnapshots[winner.id];
    let tieBroken = false;

    for (const member of this.members.slice(1)) {
      const h = healthSnapshots[member.id];
      if (!winnerHealth || h.score > winnerHealth.score + 1e-6) {
        winner = member;
        winnerHealth = h;
        tieBroken = false;
      } else if (Math.abs(h.score - winnerHealth.score) <= 1e-6) {
        // keep earlier winner, but mark tie
        tieBroken = true;
      }
    }

    const decision: CoderCommitteeDecision = {
      phaseNumber,
      chosenCoderId: winner.id,
      chosenCoderName: winner.name,
      proposals,
      tieBroken,
      reason: `Chosen coder has highest health score (${winnerHealth?.score.toFixed(
        2,
      ) ?? "n/a"}).`,
      decidedAt: new Date().toISOString(),
    };

    return {
      decision,
      chosenExecutor: winner.executor,
      chosenHealth: winnerHealth ?? null,
    };
  }
}
