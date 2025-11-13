import { PlannerLLM } from './PlannerLLM';

/**
 * Pool of planner instances with backup/failover support
 * Phase 2: Basic implementation with failover support
 */
export class PlannerModelPool {
  private primaryPlanner: PlannerLLM | null = null;
  private backupPlanners: PlannerLLM[] = [];

  constructor() {
    // Pool constructor
  }

  addPrimary(planner: PlannerLLM): void {
    this.primaryPlanner = planner;
  }

  addBackup(planner: PlannerLLM): void {
    this.backupPlanners.push(planner);
  }

  getPrimary(): PlannerLLM {
    if (!this.primaryPlanner) {
      throw new Error('No primary planner configured');
    }
    return this.primaryPlanner;
  }

  getBackup(index: number = 0): PlannerLLM | null {
    return this.backupPlanners[index] || null;
  }

  getAllPlanners(): PlannerLLM[] {
    const planners: PlannerLLM[] = [];
    if (this.primaryPlanner) {
      planners.push(this.primaryPlanner);
    }
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

    if (allPlanners.length === 0) {
      throw new Error('No planners configured in pool');
    }

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
