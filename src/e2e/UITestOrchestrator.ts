import { SkyvernClient } from './SkyvernClient';
import {
  UiTestCase,
  UiTestResult,
  UiTestRunSummary,
  UiTestStatus,
  ProjectStateObject,
} from '../orchestrator/types';
import { config } from '../config/env';

/**
 * Phase 7: UI Test Orchestrator
 * Coordinates UI testing via Skyvern client
 * Gracefully degrades when Skyvern is not configured
 */
export class UITestOrchestrator {
  private skyvernClient: SkyvernClient | null = null;

  constructor() {
    // Phase 7: Only initialize if Skyvern is configured
    try {
      if (config.skyvernApiKey) {
        this.skyvernClient = new SkyvernClient();
        console.log('✅ UITestOrchestrator: Skyvern client initialized');
      } else {
        console.log('⚠️  UITestOrchestrator: Skyvern not configured, UI tests will be skipped');
      }
    } catch (err) {
      console.warn('⚠️  UITestOrchestrator: Failed to initialize Skyvern client:', err);
      this.skyvernClient = null;
    }
  }

  /**
   * Get test cases for a project
   * Phase 7: Returns hardcoded test cases
   * Future: Load from {projectRoot}/.appula/ui-tests.json
   */
  getTestCasesForProject(pso: ProjectStateObject): UiTestCase[] {
    // For Phase 7, return hardcoded test cases
    // Future: Load from project-specific configuration file
    const defaultAppUrl = config.skyvernDefaultAppUrl;

    return [
      {
        id: 'smoke-homepage',
        name: 'Smoke: Homepage loads',
        description: 'Navigate to homepage and verify it loads without errors',
        entryUrl: defaultAppUrl,
        tags: ['smoke'],
      },
      {
        id: 'smoke-navigation',
        name: 'Smoke: Basic navigation works',
        description: 'Click through main navigation links',
        entryUrl: defaultAppUrl,
        tags: ['smoke', 'navigation'],
      },
    ];
  }

  /**
   * Run all UI tests for a project
   * Returns summary with overall status and individual test results
   */
  async runUiTests(pso: ProjectStateObject): Promise<UiTestRunSummary> {
    const testCases = this.getTestCasesForProject(pso);
    const results: UiTestResult[] = [];
    const ranAt = new Date().toISOString();

    // If Skyvern not configured, skip all tests
    if (!this.skyvernClient) {
      for (const testCase of testCases) {
        results.push({
          caseId: testCase.id,
          name: testCase.name,
          status: 'not_configured' as UiTestStatus,
          startedAt: ranAt,
          finishedAt: ranAt,
          details: 'Skyvern not configured (SKYVERN_API_KEY not set)',
        });
      }

      return {
        projectId: pso.projectId,
        phaseNumber: pso.currentPhase,
        status: 'not_configured' as UiTestStatus,
        results,
        ranAt,
        notes: 'UI testing disabled: Skyvern not configured',
      };
    }

    // Run each test case
    console.log(`\n🤖 Running ${testCases.length} UI test case(s)...`);
    for (const testCase of testCases) {
      try {
        const result = await this.skyvernClient.runTestCase(testCase);
        results.push(result);
      } catch (err) {
        console.error(`❌ Test case "${testCase.name}" failed with error:`, err);
        results.push({
          caseId: testCase.id,
          name: testCase.name,
          status: 'failed' as UiTestStatus,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          details: `Error running test: ${(err as Error).message}`,
        });
      }
    }

    // Determine overall status
    const hasFailures = results.some(r => r.status === 'failed');
    const allPassed = results.every(r => r.status === 'passed');
    const allSkipped = results.every(
      r => r.status === 'skipped' || r.status === 'not_configured'
    );

    const overallStatus: UiTestStatus = hasFailures
      ? 'failed'
      : allPassed
      ? 'passed'
      : allSkipped
      ? 'skipped'
      : 'skipped';

    const summary: UiTestRunSummary = {
      projectId: pso.projectId,
      phaseNumber: pso.currentPhase,
      status: overallStatus,
      results,
      ranAt,
      notes: `Ran ${results.length} test case(s)`,
    };

    // Log summary
    console.log(`\n📊 UI Test Summary:`);
    console.log(`   Status: ${overallStatus}`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Passed: ${results.filter(r => r.status === 'passed').length}`);
    console.log(`   Failed: ${results.filter(r => r.status === 'failed').length}`);
    console.log(`   Skipped: ${results.filter(r => r.status === 'skipped').length}`);

    return summary;
  }

  /**
   * Check if UI testing is available
   */
  isConfigured(): boolean {
    return this.skyvernClient !== null;
  }
}
