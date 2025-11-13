import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectConfig } from '../orchestrator/types';
import { config } from '../config/env';

export class ProjectRepo {
  private projectsDir: string;

  constructor(projectsDir?: string) {
    this.projectsDir = projectsDir || config.projectsDir;
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.projectsDir, { recursive: true });
  }

  private getProjectPath(projectId: string): string {
    return path.join(this.projectsDir, `${projectId}.json`);
  }

  async load(projectId: string): Promise<ProjectConfig> {
    await this.ensureDir();
    const projectPath = this.getProjectPath(projectId);

    try {
      const data = await fs.readFile(projectPath, 'utf-8');
      return JSON.parse(data) as ProjectConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Project not found: ${projectId}`);
      }
      throw error;
    }
  }

  async save(project: ProjectConfig): Promise<void> {
    await this.ensureDir();
    const projectPath = this.getProjectPath(project.id);
    project.updatedAt = new Date().toISOString();
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2), 'utf-8');
  }

  async exists(projectId: string): Promise<boolean> {
    await this.ensureDir();
    const projectPath = this.getProjectPath(projectId);
    try {
      await fs.access(projectPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<ProjectConfig[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.projectsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const projects: ProjectConfig[] = [];
    for (const file of jsonFiles) {
      const projectId = file.replace('.json', '');
      try {
        const project = await this.load(projectId);
        projects.push(project);
      } catch (error) {
        console.error(`Failed to load project ${projectId}:`, error);
      }
    }

    return projects;
  }

  async delete(projectId: string): Promise<void> {
    await this.ensureDir();
    const projectPath = this.getProjectPath(projectId);
    await fs.unlink(projectPath);
  }
}
