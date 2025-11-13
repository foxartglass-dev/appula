import {
  PlannerHealthStatus,
  HealthTestResult,
  HealthCheckResult,
  ProjectStateObject,
  PhaseExecutionSummary,
  PhaseAssessmentSummary,
  PlannerHealthSnapshot,
} from './types';
import { PlannerHealthTester } from './PlannerHealthTester';

/**
 * Phase 4: Context for orchestration health checks
 * Phase 5: Extended with additional context
 */
export interface HealthMonitorContext {
  projectId: string;
  pso: ProjectStateObject;
  lastPhaseNumber: number | null;
  lastExecution?: PhaseExecutionSummary | null;
  lastAssessment?: PhaseAssessmentSummary | null;
  // Legacy fields from Phase 4 (still supported)
  phaseNumber?: number | null;
  logsSnippet?: string;
  errorsSnippet?: string;
}

/**
 * Phase 4: Interface for orchestration health monitoring
 */
export interface OrchestrationHealthMonitor {
  runHealthCheck(ctx: HealthMonitorContext): Promise<HealthCheckResult>;
}

/**
 * Phase 5: Real health monitor that runs hallucination tests via PlannerHealthTester
 */
export class PlannerHealthMonitor implements OrchestrationHealthMonitor {
  private readonly tester: PlannerHealthTester;

  constructor(tester: PlannerHealthTester) {
    this.tester = tester;
  }

  async runHealthCheck(ctx: HealthMonitorContext): Promise<HealthCheckResult> {
    const checkedAt = new Date().toISOString();

    try {
      const snapshot = await this.tester.runHealthChecks();

      const ok = snapshot.status === "ok";

      const suggestedAction: HealthCheckResult["suggestedAction"] =
        snapshot.status === "ok"
          ? "continue"
          : snapshot.status === "degraded"
          ? "pause"
          : "require_human";

      const result: HealthCheckResult = {
        ok,
        reason: snapshot.summary,
        suggestedAction,
        plannerHealth: snapshot,
        checkedAt,
      };

      return result;
    } catch (err) {
      const result: HealthCheckResult = {
        ok: false,
        reason: `Health check failed to run: ${String(err)}`,
        suggestedAction: "pause",
        plannerHealth: null,
        checkedAt,
      };
      return result;
    }
  }
}

/**
 * Phase 4: No-op health monitor that always returns "ok"
 * Used as fallback when OpenAI config is not available
 */
export class NoopHealthMonitor implements OrchestrationHealthMonitor {
  async runHealthCheck(_ctx: HealthMonitorContext): Promise<HealthCheckResult> {
    const now = new Date().toISOString();
    return {
      ok: true,
      checkedAt: now,
      reason: 'Noop health monitor: health checks disabled.',
      suggestedAction: 'continue',
      plannerHealth: null,
    };
  }
}

/**
 * Monitors planner health through hallucination tests and performance metrics
 * Phase 1: Stub implementation with in-memory storage
 */
export class HealthMonitor {
  private testResults: Map<string, HealthTestResult[]> = new Map();
  private healthCache: Map<string, PlannerHealthStatus> = new Map();

  /**
   * Record a test result for a planner
   */
  recordTestResult(result: HealthTestResult): void {
    const results = this.testResults.get(result.plannerId) || [];
    results.push(result);
    this.testResults.set(result.plannerId, results);

    // Invalidate health cache for this planner
    this.healthCache.delete(result.plannerId);
  }

  /**
   * Get health status for a planner
   * Phase 1: Simple implementation based on recent test results
   */
  getHealth(plannerId: string): PlannerHealthStatus {
    if (this.healthCache.has(plannerId)) {
      return this.healthCache.get(plannerId)!;
    }

    const results = this.testResults.get(plannerId) || [];
    if (results.length === 0) {
      // No test results yet, assume healthy
      return 'healthy';
    }

    // Check last 10 test results
    const recentResults = results.slice(-10);
    const passRate = recentResults.filter(r => r.passed).length / recentResults.length;

    let health: PlannerHealthStatus;
    if (passRate >= 0.8) {
      health = 'healthy';
    } else if (passRate >= 0.5) {
      health = 'degraded';
    } else {
      health = 'unusable';
    }

    this.healthCache.set(plannerId, health);
    return health;
  }

  /**
   * Get all test results for a planner
   */
  getTestResults(plannerId: string): HealthTestResult[] {
    return this.testResults.get(plannerId) || [];
  }

  /**
   * Get recent test results
   */
  getRecentTestResults(plannerId: string, limit: number = 10): HealthTestResult[] {
    const results = this.testResults.get(plannerId) || [];
    return results.slice(-limit);
  }

  /**
   * Clear all test results for a planner
   */
  clearTestResults(plannerId: string): void {
    this.testResults.delete(plannerId);
    this.healthCache.delete(plannerId);
  }

  /**
   * Future: Run automated hallucination tests
   */
  async runHallucinationTest(_plannerId: string): Promise<HealthTestResult> {
    throw new Error('HealthMonitor.runHallucinationTest not implemented yet (Phase 1 stub)');
  }
}
