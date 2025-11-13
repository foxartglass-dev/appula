import { ProjectConfig, ProjectStateObject, PhaseExecutionSummary } from './types';
import { PlannerModelPool } from '../llm/PlannerModelPool';
import { LogRepo } from '../storage/LogRepo';
import { CoderExecutor, PhaseExecutionResult } from '../llm/CoderExecutor';

/**
 * Phase 4: Outcome of running a phase
 */
export interface PhaseRunOutcome {
  pso: ProjectStateObject;
  phaseNumber: number | null;
  instruction?: string;
  executionResult?: PhaseExecutionResult;
}

/**
 * Runs individual project phases
 * Phase 4: Returns rich PhaseRunOutcome for orchestrator
 */
export class PhaseRunner {
  private plannerPool: PlannerModelPool;
  private logRepo: LogRepo;
  private coder: CoderExecutor | null;

  constructor(
    plannerPool: PlannerModelPool,
    logRepo: LogRepo,
    coder: CoderExecutor | null = null
  ) {
    this.plannerPool = plannerPool;
    this.logRepo = logRepo;
    this.coder = coder;
  }

  /**
   * Run the next phase of a project
   * Phase 4: Gets instruction from planner, optionally executes with coder, returns outcome
   */
  async runNextPhase(
    project: ProjectConfig,
    pso: ProjectStateObject
  ): Promise<PhaseRunOutcome> {
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
      return { pso, phaseNumber: null };
    }

    console.log(`\n🚀 Running Phase ${nextPhase.number}: ${nextPhase.name}`);

    // Set current phase
    pso.currentPhase = nextPhase.number;
    nextPhase.status = 'running';

    // Initialize attempts counter and execution history
    if (!nextPhase.attempts) {
      nextPhase.attempts = 0;
    }
    nextPhase.attempts++;

    if (!pso.executionHistory) {
      pso.executionHistory = [];
    }

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        project.id,
        'info',
        `Starting phase ${nextPhase.number}: ${nextPhase.name} (attempt ${nextPhase.attempts})`,
        { phase: nextPhase.number, attempts: nextPhase.attempts }
      )
    );

    let instruction = '';

    try {
      // Get active planner
      const planner = this.plannerPool.getActivePlanner();

      // Get instruction from planner
      const result = await planner.planNextPhase(pso);
      instruction = result.instruction;

      console.log('\n📝 Phase Instruction from Planner:\n');
      console.log(instruction);
      console.log('');

      // Log the instruction
      await this.logRepo.append(
        this.logRepo.createLogEntry(
          project.id,
          'info',
          'Phase instruction generated',
          {
            phase: nextPhase.number,
            instruction,
            instructionLength: instruction.length,
          }
        )
      );

      // Phase 3: Conditionally execute with coder if provided
      if (this.coder) {
        console.log('💡 Executing phase with CoderExecutor...\n');

        await this.logRepo.append(
          this.logRepo.createLogEntry(
            project.id,
            'info',
            'Starting coder execution',
            { phase: nextPhase.number }
          )
        );

        // Execute with coder
        const executionResult = await this.coder.runPhase({
          projectId: project.id,
          projectRoot: project.repoPath,
          phaseNumber: nextPhase.number,
          phaseName: nextPhase.name,
          instruction: result.instruction,
        });

        console.log(`\n📊 Execution Result: ${executionResult.status}`);
        if (executionResult.exitCode !== undefined && executionResult.exitCode !== null) {
          console.log(`   Exit Code: ${executionResult.exitCode}`);
        }
        console.log(`   Duration: ${new Date(executionResult.finishedAt).getTime() - new Date(executionResult.startedAt).getTime()}ms`);
        console.log('');

        // Log execution result
        await this.logRepo.append(
          this.logRepo.createLogEntry(
            project.id,
            executionResult.status === 'success' ? 'info' : 'error',
            `Phase execution ${executionResult.status}`,
            {
              phase: nextPhase.number,
              status: executionResult.status,
              exitCode: executionResult.exitCode,
              logs: executionResult.logs,
              errorMessage: executionResult.errorMessage,
            }
          )
        );

        // Update phase based on execution result
        if (executionResult.status === 'success') {
          nextPhase.status = 'done';
          nextPhase.result = {
            status: 'success',
            logs: executionResult.logs,
            finishedAt: executionResult.finishedAt,
          };
          console.log('✅ Phase completed successfully!\n');
        } else {
          nextPhase.status = 'error';
          nextPhase.result = {
            status: 'error',
            logs: executionResult.logs,
            error: executionResult.errorMessage || `Execution ${executionResult.status}`,
            finishedAt: executionResult.finishedAt,
          };
          console.log(`❌ Phase failed: ${executionResult.status}\n`);
        }

        // Phase 4: Track execution in history
        const executionSummary: PhaseExecutionSummary = {
          phaseNumber: nextPhase.number,
          status: nextPhase.status,
          attempts: nextPhase.attempts || 1,
          lastResultStatus: executionResult.status,
          lastErrorMessage: executionResult.errorMessage,
          lastRunAt: executionResult.finishedAt,
        };
        pso.executionHistory!.push(executionSummary);
        pso.lastUpdated = new Date().toISOString();

        return {
          pso,
          phaseNumber: nextPhase.number,
          instruction,
          executionResult,
        };
      } else {
        // Plan-only mode (Phase 2 behavior)
        console.log('💡 Plan-only mode: Coder not configured.');
        console.log('   Instruction generated but not executed.\n');

        await this.logRepo.append(
          this.logRepo.createLogEntry(
            project.id,
            'info',
            'Phase instruction ready (plan-only mode)',
            { phase: nextPhase.number }
          )
        );

        // Phase 4: Track in history even in plan-only mode
        const executionSummary: PhaseExecutionSummary = {
          phaseNumber: nextPhase.number,
          status: nextPhase.status,
          attempts: nextPhase.attempts || 1,
          lastRunAt: new Date().toISOString(),
        };
        pso.executionHistory!.push(executionSummary);
        pso.lastUpdated = new Date().toISOString();

        return {
          pso,
          phaseNumber: nextPhase.number,
          instruction,
        };
      }
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

      // Phase 4: Track error in history
      const executionSummary: PhaseExecutionSummary = {
        phaseNumber: nextPhase.number,
        status: 'error',
        attempts: nextPhase.attempts || 1,
        lastErrorMessage: errorMsg,
        lastRunAt: new Date().toISOString(),
      };
      pso.executionHistory!.push(executionSummary);
      pso.lastUpdated = new Date().toISOString();

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
