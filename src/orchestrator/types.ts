/**
 * Core types for Appula orchestration system
 */

export type ProjectStatus = "idle" | "running" | "paused" | "completed" | "error";
export type PhaseStatus = "pending" | "running" | "done" | "error";
export type PlannerHealthStatus = "healthy" | "degraded" | "unusable";
export type AssessmentStatus = "ok" | "needs_fix" | "stuck" | "human_input";

export interface ProjectConfig {
  id: string;
  name: string;
  repoPath: string;
  description: string;
  status: ProjectStatus;
  plannerModel: string;
  coderMode: "claude-code-cli";
  ragEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Phase {
  number: number;
  name: string;
  status: PhaseStatus;
  description?: string;
  attempts?: number;
  result?: {
    status: 'success' | 'error';
    logs?: string;
    error?: string;
    finishedAt?: string;
  };
}

export interface HealthInfo {
  plannerHealth: PlannerHealthStatus;
  notes?: string;
}

/**
 * Phase 4: Track execution history for each phase
 */
export interface PhaseExecutionSummary {
  phaseNumber: number;
  status: PhaseStatus;
  attempts: number;
  lastResultStatus?: 'success' | 'failed' | 'timeout' | 'cli_error';
  lastErrorMessage?: string;
  lastRunAt?: string;
}

/**
 * Phase 4: Track assessment results
 */
export interface PhaseAssessmentSummary {
  phaseNumber: number;
  status: AssessmentStatus;
  notes?: string;
  lastAssessedAt: string;
}

export interface ProjectStateObject {
  projectId: string;
  summary: string;
  currentPhase: number | null;
  phases: Phase[];
  lastUpdated: string;
  health: HealthInfo;
  metadata: Record<string, unknown>;
  // Phase 4: Orchestration tracking
  executionHistory?: PhaseExecutionSummary[];
  lastAssessment?: PhaseAssessmentSummary;
  lastHealthCheck?: HealthCheckResult | null;
}

export interface PlanProjectResult {
  phases: Array<{
    number: number;
    name: string;
    description: string;
  }>;
}

export interface PlanNextPhaseResult {
  instruction: string;
}

export interface AssessPhaseParams {
  pso: ProjectStateObject;
  phaseNumber: number;
  logs: string;
  errors?: string;
}

export interface AssessPhaseResult {
  status: AssessmentStatus;
  nextInstruction?: string;
  notes?: string;
}

export interface RunInstructionParams {
  project: ProjectConfig;
  instruction: string;
}

export interface RunInstructionResult {
  success: boolean;
  logs: string;
  errors?: string;
}

export interface CommitteeCandidate {
  id: string;
  content: string;
  explanation?: string;
}

export interface CommitteeDecision {
  finalContent: string;
  chosenCandidateId?: string;
  notes?: string;
}

export interface UiTestResult {
  flowName: string;
  success: boolean;
  errors?: string[];
}

/**
 * Phase 5: Individual hallucination test result
 */
export interface HallucinationTestResult {
  name: string;                 // e.g. "math_sanity", "code_reasoning"
  passed: boolean;
  score: number;                // 0–1
  details?: string;
  ranAt: string;                // ISO timestamp
}

/**
 * Phase 5: Planner health snapshot from hallucination tests
 */
export interface PlannerHealthSnapshot {
  modelId: string;
  overallScore: number;         // 0–1 aggregate from all tests
  tests: HallucinationTestResult[];
  status: "ok" | "degraded" | "failing";
  summary: string;
  checkedAt: string;
}

/**
 * Phase 4: Health check result for orchestration cycles
 * Phase 5: Extended with plannerHealth
 */
export interface HealthCheckResult {
  ok: boolean;
  reason?: string;
  suggestedAction?: 'continue' | 'pause' | 'switch_model' | 'require_human';
  plannerHealth?: PlannerHealthSnapshot | null;
  checkedAt: string;
}

/**
 * Legacy: Planner-specific health test result (for HealthMonitor)
 */
export interface HealthTestResult {
  plannerId: string;
  passed: boolean;
  type: string;
  timestamp: string;
}
