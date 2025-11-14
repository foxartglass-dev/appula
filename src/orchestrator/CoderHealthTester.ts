import { CoderExecutor, PhaseExecutionRequest, PhaseExecutionResult } from "../llm/CoderExecutor";
import { CoderHealthSnapshot, CoderHealthStatus, CoderId } from "./types";

/**
 * Phase 9.5: Context for coder health testing
 */
export interface CoderHealthTestContext {
  projectId: string;
  projectRoot: string;
}

/**
 * Phase 9.5: CoderHealthTester
 * Runs lightweight health checks against a coder executor using dry-run mode.
 * Similar to PlannerHealthTester but focused on coder availability and responsiveness.
 */
export class CoderHealthTester {
  constructor(
    private readonly coder: CoderExecutor,
    private readonly coderId: CoderId,
    private readonly coderName: string,
  ) {}

  async runHealthCheck(ctx: CoderHealthTestContext): Promise<CoderHealthSnapshot> {
    const startedAt = new Date().toISOString();

    // We simulate a tiny phase in dry-run mode. It should be cheap and safe.
    const req: PhaseExecutionRequest = {
      projectId: ctx.projectId,
      phaseNumber: 0,
      phaseName: "coder-health-probe",
      instruction: "Health probe: pretend to implement a no-op change.",
      projectRoot: ctx.projectRoot,
      planFilePath: "state/health/coder-health-probe.md",
      coderId: this.coderId,
      dryRun: true,
    };

    let result: PhaseExecutionResult | null = null;
    let status: CoderHealthStatus = "ok";
    let score = 1;
    let notes = "";

    try {
      result = await this.coder.runPhase(req);

      // Very simple scoring heuristic for Phase 9.5:
      // - success + non-empty logs => ok
      // - cli_error / timeout => failing
      // - failed => degraded
      if (result.status === "success") {
        status = "ok";
        score = 0.95;
      } else if (result.status === "failed") {
        status = "degraded";
        score = 0.7;
      } else {
        status = "failing";
        score = 0.3;
      }

      notes = `Dry-run status=${result.status}`;
    } catch (err: any) {
      status = "failing";
      score = 0.2;
      notes = `Exception during coder health probe: ${err?.message ?? String(err)}`;
    }

    return {
      coderId: this.coderId,
      coderName: this.coderName,
      status,
      score,
      lastCheckedAt: startedAt,
      notes,
    };
  }
}
