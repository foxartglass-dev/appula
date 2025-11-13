import { ProjectConfig, ProjectStateObject } from './types';

/**
 * Refreshes Project State Object summaries and metadata
 * Phase 1: Stub implementation
 */
export class PsoRefresher {
  /**
   * Refresh the PSO summary
   * Phase 1: Sets a placeholder summary
   * Future: Use LLM to generate actual summary from project state
   */
  async refreshSummary(
    config: ProjectConfig,
    pso: ProjectStateObject
  ): Promise<ProjectStateObject> {
    pso.summary = `Placeholder summary for ${config.name}`;
    pso.lastUpdated = new Date().toISOString();
    return pso;
  }

  /**
   * Future: Refresh PSO from codebase analysis
   */
  async refreshFromCodebase(
    _config: ProjectConfig,
    _pso: ProjectStateObject
  ): Promise<ProjectStateObject> {
    throw new Error('PsoRefresher.refreshFromCodebase not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Update metadata with recent changes
   */
  async updateMetadata(
    pso: ProjectStateObject,
    metadata: Record<string, unknown>
  ): Promise<ProjectStateObject> {
    pso.metadata = { ...pso.metadata, ...metadata };
    pso.lastUpdated = new Date().toISOString();
    return pso;
  }
}
