import { RunInstructionParams, RunInstructionResult } from '../orchestrator/types';

/**
 * Interface for code execution agents
 */
export interface CoderExecutor {
  /**
   * Execute a coding instruction
   */
  runInstruction(params: RunInstructionParams): Promise<RunInstructionResult>;
}
