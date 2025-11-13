import { PlannerLLM } from './PlannerLLM';
import {
  ProjectConfig,
  ProjectStateObject,
  PlanProjectResult,
  PlanNextPhaseResult,
  AssessPhaseParams,
  AssessPhaseResult,
} from '../orchestrator/types';

/**
 * OpenAI implementation of PlannerLLM
 * Phase 1: Stub implementation that throws "Not implemented"
 */
export class OpenAIPlanner implements PlannerLLM {
  private _apiKey: string;
  private _model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    this._apiKey = apiKey;
    this._model = model;
  }

  async planProject(_config: ProjectConfig): Promise<PlanProjectResult> {
    throw new Error('OpenAIPlanner.planProject not implemented yet (Phase 1 stub)');
  }

  async planNextPhase(_pso: ProjectStateObject): Promise<PlanNextPhaseResult> {
    throw new Error('OpenAIPlanner.planNextPhase not implemented yet (Phase 1 stub)');
  }

  async assessPhaseResult(_params: AssessPhaseParams): Promise<AssessPhaseResult> {
    throw new Error('OpenAIPlanner.assessPhaseResult not implemented yet (Phase 1 stub)');
  }
}
