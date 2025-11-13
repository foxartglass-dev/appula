import { PlannerLLM } from './PlannerLLM';
import { PlannerHealthSnapshot, ActivePlannerInfo } from '../orchestrator/types';

/**
 * Internal planner entry with identity and health tracking
 */
interface PlannerEntry {
  id: string;               // "primary", "backup-1", etc.
  modelName: string;
  planner: PlannerLLM;
  lastHealthSnapshot?: PlannerHealthSnapshot;
  isHealthy: boolean;
}

/**
 * Pool of planner instances with backup/failover support
 * Phase 2: Implements constructor with primary planner and getActivePlanner()
 * Phase 6: Added baton handoff hooks for health-based model switching
 * Phase 9: Real baton handoff with automatic model switching based on health
 */
export class PlannerModelPool {
  private entries: PlannerEntry[] = [];
  private activeIndex = 0;
  private lastSwitchReason: string | null = null;
  private lastHealthSnapshot: PlannerHealthSnapshot | null = null;

  constructor(primary: PlannerLLM, primaryModelName: string) {
    this.entries.push({
      id: "primary",
      modelName: primaryModelName,
      planner: primary,
      isHealthy: true,
    });
  }

  /**
   * Get the active planner (primary or backup based on health)
   */
  getActivePlanner(): PlannerLLM {
    return this.entries[this.activeIndex].planner;
  }

  /**
   * Phase 9: Get active planner info for baton handoff tracking
   */
  getActivePlannerInfo(): ActivePlannerInfo {
    const entry = this.entries[this.activeIndex];
    return {
      plannerId: entry.id,
      modelName: entry.modelName,
      lastHealthStatus: entry.lastHealthSnapshot?.status,
      lastHealthScore: entry.lastHealthSnapshot?.overallScore,
      lastSwitchReason: this.lastSwitchReason ?? undefined,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add a backup planner for failover
   * Phase 9: Now accepts id and modelName for identity tracking
   */
  addBackupPlanner(planner: PlannerLLM, id?: string, modelName?: string): void {
    // Backward compatibility: if no id/modelName provided, use defaults
    const backupId = id ?? `backup-${this.entries.length}`;
    const backupModelName = modelName ?? 'unknown';

    this.entries.push({
      id: backupId,
      modelName: backupModelName,
      planner,
      isHealthy: true,
    });
  }

  /**
   * Phase 9: Mark planner as unhealthy and switch to next healthy backup
   */
  markPlannerUnhealthy(reason: string): void {
    const current = this.entries[this.activeIndex];
    current.isHealthy = false;
    this.lastSwitchReason = reason;

    console.warn(`⚠️  Planner "${current.id}" (${current.modelName}) marked unhealthy: ${reason}`);

    // Try to find next healthy planner
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].isHealthy) {
        const old = this.entries[this.activeIndex];
        this.activeIndex = i;
        const newEntry = this.entries[i];

        console.log(`🔄 Switching planner: ${old.id} (${old.modelName}) → ${newEntry.id} (${newEntry.modelName})`);
        return;
      }
    }

    // No healthy planners left – keep current, but log warning
    console.warn(`[PlannerModelPool] No healthy planners available. Staying on current: ${current.id} (${current.modelName})`);
  }

  /**
   * Get backup planner by index (for backward compatibility)
   */
  getBackup(index: number = 0): PlannerLLM | null {
    // index+1 because entries[0] is primary
    const backupIndex = index + 1;
    return this.entries[backupIndex]?.planner || null;
  }

  /**
   * Get all planners (for backward compatibility)
   */
  getAllPlanners(): PlannerLLM[] {
    return this.entries.map(e => e.planner);
  }

  /**
   * Execute operation with automatic failover to backup planners
   * Phase 2: Basic implementation (kept for backward compatibility)
   */
  async executeWithFailover<T>(
    operation: (planner: PlannerLLM) => Promise<T>
  ): Promise<T> {
    const allPlanners = this.getAllPlanners();
    let lastError: Error | null = null;

    // Try planners in order
    for (let i = 0; i < allPlanners.length; i++) {
      const planner = allPlanners[i];
      const entry = this.entries[i];

      try {
        console.log(`Attempting operation with ${entry.id} planner (${entry.modelName})...`);
        const result = await operation(planner);
        if (i > 0) {
          console.log(`✅ Operation succeeded with ${entry.id} planner after primary failed`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Operation failed with ${entry.id} planner:`, error);

        // If this wasn't the last planner, try the next one
        if (i < allPlanners.length - 1) {
          console.log(`Failing over to next planner...`);
        }
      }
    }

    // All planners failed
    throw new Error(
      `All planners failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Phase 6/9: Record health snapshot from health monitor
   * Attaches snapshot to current active entry
   */
  recordHealthSnapshot(snapshot: PlannerHealthSnapshot): void {
    const entry = this.entries[this.activeIndex];
    entry.lastHealthSnapshot = snapshot;
    this.lastHealthSnapshot = snapshot; // Keep for getDiagnostics backward compat
  }

  /**
   * Phase 6: Get diagnostics for debugging and monitoring
   * Returns health snapshot, switch reason, and backup count
   */
  getDiagnostics(): {
    lastHealthSnapshot: PlannerHealthSnapshot | null;
    lastSwitchReason: string | null;
    backupCount: number;
  } {
    return {
      lastHealthSnapshot: this.lastHealthSnapshot,
      lastSwitchReason: this.lastSwitchReason,
      backupCount: this.entries.length > 0 ? this.entries.length - 1 : 0,
    };
  }
}
