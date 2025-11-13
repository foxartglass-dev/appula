import {
  ProjectConfig,
  ProjectStateObject,
  PlanProjectResult,
  PlanNextPhaseResult,
  AssessPhaseParams,
  AssessPhaseResult,
} from '../orchestrator/types';

/**
 * Interface for LLM planner that plans and reviews project phases
 */
export interface PlannerLLM {
  /**
   * Plan the entire project and break it into phases
   */
  planProject(config: ProjectConfig): Promise<PlanProjectResult>;

  /**
   * Plan the next phase based on current project state
   */
  planNextPhase(pso: ProjectStateObject): Promise<PlanNextPhaseResult>;

  /**
   * Assess the result of a phase execution
   */
  assessPhaseResult(params: AssessPhaseParams): Promise<AssessPhaseResult>;
}
