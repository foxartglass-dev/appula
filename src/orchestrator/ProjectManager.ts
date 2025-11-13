import { ProjectRepo } from '../storage/ProjectRepo';
import { PsoRepo } from '../storage/PsoRepo';
import { LogRepo } from '../storage/LogRepo';
import { ProjectConfig, ProjectStateObject } from './types';

/**
 * Manages project lifecycle and state
 */
export class ProjectManager {
  private projectRepo: ProjectRepo;
  private psoRepo: PsoRepo;
  private logRepo: LogRepo;

  constructor(projectRepo: ProjectRepo, psoRepo: PsoRepo, logRepo: LogRepo) {
    this.projectRepo = projectRepo;
    this.psoRepo = psoRepo;
    this.logRepo = logRepo;
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
}
