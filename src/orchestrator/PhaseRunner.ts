import { ProjectConfig, ProjectStateObject } from './types';
import { PlannerModelPool } from '../llm/PlannerModelPool';
import { LogRepo } from '../storage/LogRepo';

/**
 * Runs individual project phases
 * Phase 2: Integrated with planner (coder still stubbed)
 */
export class PhaseRunner {
  private plannerPool: PlannerModelPool;
  private logRepo: LogRepo;

  constructor(plannerPool: PlannerModelPool, logRepo: LogRepo) {
    this.plannerPool = plannerPool;
    this.logRepo = logRepo;
  }

  /**
   * Run the next phase of a project
   * Phase 2: Gets instruction from planner, logs it (coder still stubbed)
   */
  async runNextPhase(
    project: ProjectConfig,
    pso: ProjectStateObject
  ): Promise<ProjectStateObject> {
    // Find next pending phase
    const nextPhase = pso.phases.find(p => p.status === 'pending');

    if (!nextPhase) {
      console.log('ℹ️  No pending phases found. All phases complete or in progress.');
      await this.logRepo.append(
        this.logRepo.createLogEntry(
          project.id,
          'info',
          'No pending phases to run'
        )
      );
      return pso;
    }

    console.log(`\n🚀 Running Phase ${nextPhase.number}: ${nextPhase.name}`);

    // Set current phase
    pso.currentPhase = nextPhase.number;
    nextPhase.status = 'running';

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        project.id,
        'info',
        `Starting phase ${nextPhase.number}: ${nextPhase.name}`,
        { phase: nextPhase.number }
      )
    );

    try {
      // Get active planner
      const planner = this.plannerPool.getActivePlanner();

      // Get instruction from planner
      const result = await planner.planNextPhase(pso);

      console.log('\n📝 Phase Instruction from Planner:\n');
      console.log(result.instruction);
      console.log('');

      // Log the instruction
      await this.logRepo.append(
        this.logRepo.createLogEntry(
          project.id,
          'info',
          'Phase instruction generated',
          {
            phase: nextPhase.number,
            instruction: result.instruction,
            instructionLength: result.instruction.length,
          }
        )
      );

      // Phase 2: We don't call the coder yet
      // Just log that we would pass this to Claude Code CLI in Phase 3
      console.log('💡 Phase 2: Coder execution is stubbed.');
      console.log('   In Phase 3, this instruction will be passed to Claude Code CLI.\n');

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          project.id,
          'info',
          'Phase instruction ready for coder (coder execution stubbed in Phase 2)',
          { phase: nextPhase.number }
        )
      );

      // Return updated PSO (phase marked as running)
      pso.lastUpdated = new Date().toISOString();
      return pso;
    } catch (error) {
      const errorMsg = `Failed to run phase ${nextPhase.number}: ${(error as Error).message}`;
      console.error('❌', errorMsg);

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          project.id,
          'error',
          errorMsg,
          { phase: nextPhase.number }
        )
      );

      // Mark phase as error
      nextPhase.status = 'error';
      throw error;
    }
  }

  /**
   * Future: Execute a specific phase
   * Phase 2: Still stubbed
   */
  async executePhase(
    _project: ProjectConfig,
    _pso: ProjectStateObject,
    _phaseNumber: number
  ): Promise<ProjectStateObject> {
    throw new Error('PhaseRunner.executePhase not implemented yet (Phase 2 stub)');
  }

  /**
   * Future: Retry a failed phase
   * Phase 2: Still stubbed
   */
  async retryPhase(
    _project: ProjectConfig,
    _pso: ProjectStateObject,
    _phaseNumber: number
  ): Promise<ProjectStateObject> {
    throw new Error('PhaseRunner.retryPhase not implemented yet (Phase 2 stub)');
  }
}
