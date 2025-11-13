/**
 * Phase 3: CoderExecutor interface for Claude Code CLI integration
 */

export interface PhaseExecutionRequest {
  projectId: string;
  projectRoot: string;
  phaseNumber: number;
  phaseName: string;
  instruction: string;
}

export type PhaseExecutionStatus =
  | 'success'
  | 'failed'
  | 'timeout'
  | 'cli_error';

export interface PhaseExecutionResult {
  status: PhaseExecutionStatus;
  startedAt: string;
  finishedAt: string;
  exitCode?: number | null;
  logs: string;        // combined stdout/stderr
  errorMessage?: string;
}

/**
 * Interface for code execution agents
 */
export interface CoderExecutor {
  /**
   * Execute a phase with the given instruction
   */
  runPhase(req: PhaseExecutionRequest): Promise<PhaseExecutionResult>;
}
