import { ProjectConfig, ProjectStateObject } from './types';

/**
 * Runs individual project phases
 * Phase 1: Stub implementation
 */
export class PhaseRunner {
  /**
   * Run the next phase of a project
   * Future: Implement actual phase execution with planner and coder
   */
  async runNextPhase(
    project: ProjectConfig,
    pso: ProjectStateObject
  ): Promise<ProjectStateObject> {
    console.log('PhaseRunner.runNextPhase called (Phase 1 stub)');
    console.log(`Project: ${project.name}`);
    console.log(`Current phase: ${pso.currentPhase || 'None'}`);

    // In future phases, this will:
    // 1. Ask planner for next phase instruction
    // 2. Execute instruction with coder
    // 3. Assess results
    // 4. Update PSO
    // 5. Return updated PSO

    // For now, just return the same PSO
    return pso;
  }

  /**
   * Future: Execute a specific phase
   */
  async executePhase(
    _project: ProjectConfig,
    _pso: ProjectStateObject,
    _phaseNumber: number
  ): Promise<ProjectStateObject> {
    throw new Error('PhaseRunner.executePhase not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Retry a failed phase
   */
  async retryPhase(
    _project: ProjectConfig,
    _pso: ProjectStateObject,
    _phaseNumber: number
  ): Promise<ProjectStateObject> {
    throw new Error('PhaseRunner.retryPhase not implemented yet (Phase 1 stub)');
  }
}
