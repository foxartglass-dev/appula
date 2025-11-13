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
}

export interface HealthInfo {
  plannerHealth: PlannerHealthStatus;
  notes?: string;
}

export interface ProjectStateObject {
  projectId: string;
  summary: string;
  currentPhase: number | null;
  phases: Phase[];
  lastUpdated: string;
  health: HealthInfo;
  metadata: Record<string, unknown>;
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

export interface HealthTestResult {
  plannerId: string;
  passed: boolean;
  type: string;
  timestamp: string;
}
