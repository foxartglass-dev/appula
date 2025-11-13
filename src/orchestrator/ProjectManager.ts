import { ProjectRepo } from '../storage/ProjectRepo';
import { PsoRepo } from '../storage/PsoRepo';
import { LogRepo } from '../storage/LogRepo';
import { ProjectConfig, ProjectStateObject, Phase } from './types';
import { PlannerModelPool } from '../llm/PlannerModelPool';

/**
 * Manages project lifecycle and state
 * Phase 2: Uses PlannerModelPool for planner operations
 */
export class ProjectManager {
  private projectRepo: ProjectRepo;
  private psoRepo: PsoRepo;
  private logRepo: LogRepo;
  private plannerPool: PlannerModelPool;

  constructor(
    projectRepo: ProjectRepo,
    psoRepo: PsoRepo,
    logRepo: LogRepo,
    plannerPool: PlannerModelPool
  ) {
    this.projectRepo = projectRepo;
    this.psoRepo = psoRepo;
    this.logRepo = logRepo;
    this.plannerPool = plannerPool;
  }

  /**
   * Load project configuration
   */
  async loadProjectConfig(projectId: string): Promise<ProjectConfig> {
    return this.projectRepo.load(projectId);
  }

  /**
   * Load or initialize Project State Object
   */
  async loadOrInitPSO(projectId: string): Promise<ProjectStateObject> {
    let pso = await this.psoRepo.load(projectId);

    if (!pso) {
      // Initialize new PSO
      pso = this.psoRepo.createInitialPso(projectId);
      await this.psoRepo.save(pso);

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          projectId,
          'info',
          'Initialized new Project State Object'
        )
      );
    }

    return pso;
  }

  /**
   * Start a project
   * Phase 1: Just loads config and PSO, logs a message
   */
  async startProject(projectId: string): Promise<void> {
    const config = await this.loadProjectConfig(projectId);
    const pso = await this.loadOrInitPSO(projectId);

    console.log(`Starting project: ${config.name} (${projectId})`);
    console.log(`Current phase: ${pso.currentPhase || 'None'}`);
    console.log(`Status: ${config.status}`);

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        'info',
        `Project started: ${config.name}`
      )
    );

    // Update project status
    config.status = 'running';
    await this.projectRepo.save(config);
  }

  /**
   * Pause a project
   * Phase 1: Stub implementation
   */
  async pauseProject(projectId: string): Promise<void> {
    console.log(`Pausing project: ${projectId}`);

    const config = await this.loadProjectConfig(projectId);
    config.status = 'paused';
    await this.projectRepo.save(config);

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        'info',
        'Project paused'
      )
    );
  }

  /**
   * Stop a project
   */
  async stopProject(projectId: string): Promise<void> {
    console.log(`Stopping project: ${projectId}`);

    const config = await this.loadProjectConfig(projectId);
    config.status = 'idle';
    await this.projectRepo.save(config);

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        'info',
        'Project stopped'
      )
    );
  }

  /**
   * Save project configuration
   */
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    await this.projectRepo.save(config);
  }

  /**
   * Save Project State Object
   */
  async savePSO(pso: ProjectStateObject): Promise<void> {
    await this.psoRepo.save(pso);
  }

  /**
   * Initialize project plan using the planner
   * Phase 2: Generate initial phases and save to PSO (renamed from initializePlan)
   */
  async initPlan(projectId: string): Promise<ProjectStateObject> {
    console.log('🤖 Initializing project plan with AI planner...');

    const config = await this.loadProjectConfig(projectId);
    const pso = await this.loadOrInitPSO(projectId);

    // Check if already has phases
    if (pso.phases.length > 0) {
      console.log('⚠️  Project already has phases. Skipping plan initialization.');
      return pso;
    }

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        'info',
        'Starting plan initialization with AI planner'
      )
    );

    try {
      // Get active planner from pool
      const planner = this.plannerPool.getActivePlanner();

      // Call planner to generate phases
      const planResult = await planner.planProject(config);

      console.log(`✅ Generated ${planResult.phases.length} phases`);

      // Convert to Phase objects with status
      const phases: Phase[] = planResult.phases.map(p => ({
        number: p.number,
        name: p.name,
        description: p.description,
        status: 'pending' as const,
      }));

      // Update PSO with phases
      pso.phases = phases;
      pso.currentPhase = null; // Will be set when starting first phase
      pso.summary = `Project planned with ${phases.length} phases`;
      pso.lastUpdated = new Date().toISOString();

      await this.savePSO(pso);

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          projectId,
          'info',
          `Plan initialized successfully with ${phases.length} phases`,
          { phaseCount: phases.length }
        )
      );

      // Display phases
      console.log('\n📋 Project Phases:');
      phases.forEach(phase => {
        console.log(`  ${phase.number}. ${phase.name}`);
        if (phase.description) {
          console.log(`     ${phase.description}`);
        }
      });
      console.log('');

      return pso;
    } catch (error) {
      const errorMsg = `Failed to initialize plan: ${(error as Error).message}`;
      console.error('❌', errorMsg);

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          projectId,
          'error',
          errorMsg
        )
      );

      throw error;
    }
  }

  /**
   * Get next phase instruction from planner
   * Phase 2: Ask planner for detailed instruction for current phase
   */
  async getNextPhaseInstruction(projectId: string): Promise<string> {
    const pso = await this.loadOrInitPSO(projectId);

    if (pso.phases.length === 0) {
      throw new Error('No phases defined. Run --init-plan first.');
    }

    // Determine next phase
    let nextPhaseNumber: number;

    if (pso.currentPhase === null) {
      // No phase started yet, start with phase 1
      nextPhaseNumber = 1;
      pso.currentPhase = 1;
    } else {
      nextPhaseNumber = pso.currentPhase;
    }

    const currentPhase = pso.phases.find(p => p.number === nextPhaseNumber);

    if (!currentPhase) {
      throw new Error(`Phase ${nextPhaseNumber} not found`);
    }

    console.log(`\n🤖 Getting instruction for Phase ${currentPhase.number}: ${currentPhase.name}`);

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        'info',
        `Requesting instruction for phase ${nextPhaseNumber}`,
        { phase: nextPhaseNumber }
      )
    );

    try {
      // Mark phase as running
      currentPhase.status = 'running';
      await this.savePSO(pso);

      // Get active planner from pool
      const planner = this.plannerPool.getActivePlanner();

      // Get instruction from planner
      const result = await planner.planNextPhase(pso);

      console.log('\n📝 Phase Instruction:\n');
      console.log(result.instruction);
      console.log('');

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          projectId,
          'info',
          'Instruction received from planner',
          { phase: nextPhaseNumber, instructionLength: result.instruction.length }
        )
      );

      return result.instruction;
    } catch (error) {
      const errorMsg = `Failed to get phase instruction: ${(error as Error).message}`;
      console.error('❌', errorMsg);

      await this.logRepo.append(
        this.logRepo.createLogEntry(
          projectId,
          'error',
          errorMsg,
          { phase: nextPhaseNumber }
        )
      );

      throw error;
    }
  }
}
