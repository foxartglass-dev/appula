import { ProjectConfig, ProjectStateObject, HealthCheckResult, PhaseAssessmentSummary } from './types';
import { ProjectManager } from './ProjectManager';
import { PhaseRunner, PhaseRunOutcome } from './PhaseRunner';
import { PlannerModelPool } from '../llm/PlannerModelPool';
import { OrchestrationHealthMonitor, NoopHealthMonitor } from './HealthMonitor';
import { LogRepo } from '../storage/LogRepo';
import { NotificationService, NoopNotificationService } from '../notifications/NotificationService';

/**
 * Phase 4: Result of an orchestration cycle
 */
export interface OrchestrationResult {
  projectId: string;
  phaseNumber: number | null;
  plannerStatus?: 'ok' | 'needs_fix' | 'stuck' | 'human_input';
  executionStatus?: string;
  health: HealthCheckResult | null;
  notes?: string;
  done: boolean;      // true if no more phases
  blocked: boolean;   // true if we should stop (e.g. human_input)
}

/**
 * Phase 4: Orchestrator that runs full plan → execute → assess → health cycles
 * Phase 4.5: Added notification support for blocked cycles
 */
export class Orchestrator {
  constructor(
    private readonly manager: ProjectManager,
    private readonly phaseRunner: PhaseRunner,
    private readonly plannerPool: PlannerModelPool,
    private readonly logRepo: LogRepo,
    private readonly healthMonitor: OrchestrationHealthMonitor = new NoopHealthMonitor(),
    private readonly notifications: NotificationService = new NoopNotificationService(),
  ) {}

  /**
   * Run a single orchestration cycle for a project
   * Returns a summary of what happened and whether to continue
   */
  async runSingleCycle(projectId: string): Promise<OrchestrationResult> {
    // 1) Ensure plan exists
    let pso = await this.manager.loadOrInitPSO(projectId);
    let config = await this.manager.loadProjectConfig(projectId);

    if (!pso.phases || pso.phases.length === 0) {
      console.log('📋 No plan found. Initializing project plan...\n');
      pso = await this.manager.initPlan(projectId);
      config = await this.manager.loadProjectConfig(projectId);
    }

    // 2) Run next phase (plan + optional execution)
    const outcome: PhaseRunOutcome = await this.phaseRunner.runNextPhase(config, pso);

    if (outcome.phaseNumber == null) {
      // nothing to do; project may be done
      console.log('✅ No pending phases. Project complete or all phases in progress.\n');
      return {
        projectId,
        phaseNumber: null,
        plannerStatus: undefined,
        executionStatus: undefined,
        health: null,
        notes: 'No pending phases. Project may be complete.',
        done: true,
        blocked: false,
      };
    }

    // Use updated PSO from outcome
    pso = outcome.pso;

    const planner = this.plannerPool.getActivePlanner();

    // 3) Build logs/errors for assessment
    const logs = outcome.executionResult?.logs ?? '';
    const errors = outcome.executionResult?.errorMessage;

    console.log('\n🔍 Assessing phase result...\n');

    const assessment = await planner.assessPhaseResult({
      pso,
      phaseNumber: outcome.phaseNumber,
      logs,
      errors,
    });

    const assessedAt = new Date().toISOString();

    const assessmentSummary: PhaseAssessmentSummary = {
      phaseNumber: outcome.phaseNumber,
      status: assessment.status,
      notes: assessment.notes,
      lastAssessedAt: assessedAt,
    };

    pso.lastAssessment = assessmentSummary;

    console.log(`   Assessment: ${assessment.status}`);
    if (assessment.notes) {
      console.log(`   Notes: ${assessment.notes}`);
    }
    console.log('');

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        'info',
        `Phase ${outcome.phaseNumber} assessed: ${assessment.status}`,
        {
          phase: outcome.phaseNumber,
          status: assessment.status,
          notes: assessment.notes,
        }
      )
    );

    // 4) Health monitor hook
    console.log('🏥 Running health check...\n');

    // Phase 5: Build comprehensive context for health monitor
    const lastExecution = pso.executionHistory && pso.executionHistory.length > 0
      ? pso.executionHistory[pso.executionHistory.length - 1]
      : null;

    const healthResult = await this.healthMonitor.runHealthCheck({
      projectId,
      pso,
      lastPhaseNumber: outcome.phaseNumber,
      lastExecution,
      lastAssessment: pso.lastAssessment ?? null,
      // Legacy Phase 4 fields (still supported)
      phaseNumber: outcome.phaseNumber,
      logsSnippet: logs.slice(0, 4000),
      errorsSnippet: (errors ?? '').slice(0, 1000),
    });

    pso.lastHealthCheck = healthResult;

    console.log(`   Health: ${healthResult.ok ? '✅ OK' : '⚠️  Issues detected'}`);
    if (healthResult.reason) {
      console.log(`   Reason: ${healthResult.reason}`);
    }
    if (healthResult.suggestedAction) {
      console.log(`   Suggested action: ${healthResult.suggestedAction}`);
    }
    console.log('');

    await this.logRepo.append(
      this.logRepo.createLogEntry(
        projectId,
        healthResult.ok ? 'info' : 'warn',
        `Health check: ${healthResult.ok ? 'OK' : 'Issues detected'}`,
        {
          phase: outcome.phaseNumber,
          ok: healthResult.ok,
          suggestedAction: healthResult.suggestedAction,
        }
      )
    );

    // Phase 6: Record health snapshot in planner pool for future baton handoff
    if (healthResult.plannerHealth) {
      this.plannerPool.recordHealthSnapshot(healthResult.plannerHealth);

      // If health is failing, mark planner as unhealthy
      if (healthResult.plannerHealth.status === 'failing') {
        this.plannerPool.markPlannerUnhealthy(
          `Planner failing with score ${healthResult.plannerHealth.overallScore.toFixed(2)}`,
        );
      }
    }

    // 5) Persist PSO
    await this.manager.savePSO(pso);

    // 6) Decide done/blocked flags
    const blocked =
      assessment.status === 'human_input' ||
      assessment.status === 'stuck' ||
      healthResult.suggestedAction === 'require_human' ||
      healthResult.suggestedAction === 'pause';

    const allPhasesProcessed = pso.phases.every(
      p => p.status === 'done' || p.status === 'error'
    );

    const done = !blocked && allPhasesProcessed;

    // 7) Build result summary
    const result: OrchestrationResult = {
      projectId,
      phaseNumber: outcome.phaseNumber,
      plannerStatus: assessment.status,
      executionStatus: outcome.executionResult?.status,
      health: healthResult,
      notes: assessment.notes,
      done,
      blocked,
    };

    // Phase 4.5: Send notification when blocked
    if (result.blocked) {
      await this.notifications.notifyHumanNeeded(result);
    }

    return result;
  }
}
