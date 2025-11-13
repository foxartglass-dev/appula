import { PlannerLLM } from './PlannerLLM';

/**
 * Pool of planner instances with backup/failover support
 * Phase 2: Implements constructor with primary planner and getActivePlanner()
 */
export class PlannerModelPool {
  private primaryPlanner: PlannerLLM;
  private backupPlanners: PlannerLLM[] = [];
  private unhealthyReason: string | null = null;

  constructor(primary: PlannerLLM) {
    this.primaryPlanner = primary;
  }

  /**
   * Get the active planner (primary for now, future: could return backup if primary unhealthy)
   */
  getActivePlanner(): PlannerLLM {
    return this.primaryPlanner;
  }

  /**
   * Add a backup planner for failover
   */
  addBackupPlanner(planner: PlannerLLM): void {
    this.backupPlanners.push(planner);
  }

  /**
   * Mark the primary planner as unhealthy (for future use)
   * Phase 2: Stub - just stores the reason
   */
  markPlannerUnhealthy(reason: string): void {
    this.unhealthyReason = reason;
    console.warn(`⚠️  Primary planner marked unhealthy: ${reason}`);
    // TODO Phase 3+: Implement actual failover to backup
  }

  /**
   * Get backup planner by index
   */
  getBackup(index: number = 0): PlannerLLM | null {
    return this.backupPlanners[index] || null;
  }

  /**
   * Get all planners (primary + backups)
   */
  getAllPlanners(): PlannerLLM[] {
    const planners: PlannerLLM[] = [this.primaryPlanner];
    planners.push(...this.backupPlanners);
    return planners;
  }

  /**
   * Execute operation with automatic failover to backup planners
   * Phase 2: Basic implementation
   */
  async executeWithFailover<T>(
    operation: (planner: PlannerLLM) => Promise<T>
  ): Promise<T> {
    const allPlanners = this.getAllPlanners();
    let lastError: Error | null = null;

    // Try primary planner first, then backups
    for (let i = 0; i < allPlanners.length; i++) {
      const planner = allPlanners[i];
      const plannerType = i === 0 ? 'primary' : `backup-${i}`;

      try {
        console.log(`Attempting operation with ${plannerType} planner...`);
        const result = await operation(planner);
        if (i > 0) {
          console.log(`✅ Operation succeeded with ${plannerType} planner after primary failed`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Operation failed with ${plannerType} planner:`, error);

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
}
