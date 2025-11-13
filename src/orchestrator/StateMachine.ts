import { ProjectStateObject, PhaseStatus } from './types';

/**
 * State machine for project state transitions
 * Phase 1: Simple skeleton implementation
 */
export class StateMachine {
  /**
   * Advance the state based on an event
   * Phase 1: Just returns the same PSO
   * Future: Implement actual state transition logic
   */
  advance(pso: ProjectStateObject, event: string): ProjectStateObject {
    console.log(`StateMachine.advance: event=${event} (Phase 1 stub)`);
    return pso;
  }

  /**
   * Future: Validate state transition
   */
  canTransition(_pso: ProjectStateObject, _event: string): boolean {
    // For now, allow all transitions
    return true;
  }

  /**
   * Future: Get valid next events from current state
   */
  getValidEvents(_pso: ProjectStateObject): string[] {
    return ['start_phase', 'complete_phase', 'fail_phase', 'pause', 'resume'];
  }

  /**
   * Update phase status
   */
  updatePhaseStatus(pso: ProjectStateObject, phaseNumber: number, status: PhaseStatus): ProjectStateObject {
    const phase = pso.phases.find(p => p.number === phaseNumber);
    if (phase) {
      phase.status = status;
    }
    return pso;
  }

  /**
   * Move to next phase
   */
  advanceToNextPhase(pso: ProjectStateObject): ProjectStateObject {
    if (pso.currentPhase === null) {
      pso.currentPhase = 1;
    } else {
      pso.currentPhase += 1;
    }
    return pso;
  }
}
