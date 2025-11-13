import { PlannerLLM } from './PlannerLLM';

/**
 * Pool of planner instances with backup/failover support
 * Phase 1: Stub implementation
 */
export class PlannerModelPool {
  private primaryPlanner: PlannerLLM | null = null;
  private backupPlanners: PlannerLLM[] = [];

  constructor() {
    // Stub constructor
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
   * Future: Implement automatic failover logic
   */
  async executeWithFailover<T>(
    _operation: (planner: PlannerLLM) => Promise<T>
  ): Promise<T> {
    throw new Error('PlannerModelPool.executeWithFailover not implemented yet (Phase 1 stub)');
  }
}
