/**
 * Phase 3: CoderExecutor interface for Claude Code CLI integration
 * Phase 9.5: Added coderId and dryRun support
 */

export interface PhaseExecutionRequest {
  projectId: string;
  projectRoot: string;
  phaseNumber: number;
  phaseName: string;
  instruction: string;
  planFilePath: string;
  // Phase 9.5 additions:
  coderId?: string;        // which coder is being invoked
  dryRun?: boolean;        // if true, coder should NOT mutate the repo, only simulate/plan
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
  // Phase 9.5 additions:
  coderId?: string;
  coderName?: string;
  dryRun?: boolean;
}

/**
 * Interface for code execution agents
 * Phase 9.5: Implementations must respect dryRun flag - if dryRun === true,
 * they should avoid destructive actions and return a simulated result.
 */
export interface CoderExecutor {
  /**
   * Execute a phase with the given instruction
   * If req.dryRun === true, should simulate execution without mutating the repo
   */
  runPhase(req: PhaseExecutionRequest): Promise<PhaseExecutionResult>;
}
