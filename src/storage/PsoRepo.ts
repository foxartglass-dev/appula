import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectStateObject } from '../orchestrator/types';
import { config } from '../config/env';

export class PsoRepo {
  private stateDir: string;

  constructor(stateDir?: string) {
    this.stateDir = stateDir || config.stateDir;
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
  }

  private getPsoPath(projectId: string): string {
    return path.join(this.stateDir, `${projectId}-pso.json`);
  }

  async load(projectId: string): Promise<ProjectStateObject | null> {
    await this.ensureDir();
    const psoPath = this.getPsoPath(projectId);

    try {
      const data = await fs.readFile(psoPath, 'utf-8');
      return JSON.parse(data) as ProjectStateObject;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async save(pso: ProjectStateObject): Promise<void> {
    await this.ensureDir();
    const psoPath = this.getPsoPath(pso.projectId);
    pso.lastUpdated = new Date().toISOString();
    await fs.writeFile(psoPath, JSON.stringify(pso, null, 2), 'utf-8');
  }

  async exists(projectId: string): Promise<boolean> {
    await this.ensureDir();
    const psoPath = this.getPsoPath(projectId);
    try {
      await fs.access(psoPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(projectId: string): Promise<void> {
    await this.ensureDir();
    const psoPath = this.getPsoPath(projectId);
    await fs.unlink(psoPath);
  }

  createInitialPso(projectId: string): ProjectStateObject {
    return {
      projectId,
      summary: '',
      currentPhase: null,
      phases: [],
      lastUpdated: new Date().toISOString(),
      health: {
        plannerHealth: 'healthy',
      },
      metadata: {},
    };
  }
}
