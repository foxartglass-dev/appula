import { UiTestCase, UiTestResult, UiTestStatus } from '../orchestrator/types';
import { config } from '../config/env';

/**
 * Phase 7: Configuration interface for SkyvernClient
 */
export interface SkyvernClientConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Skyvern browser agent client for UI testing
 * Phase 7: Safe, env-gated implementation with simulated results
 * Future: Will integrate with real Skyvern API
 */
export class SkyvernClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(clientConfig?: Partial<SkyvernClientConfig>) {
    const apiKey = clientConfig?.apiKey ?? config.skyvernApiKey;
    const baseUrl = clientConfig?.baseUrl ?? config.skyvernBaseUrl;

    if (!apiKey) {
      throw new Error(
        'SkyvernClient requires SKYVERN_API_KEY environment variable to be set. ' +
        'Set SKYVERN_API_KEY in your .env file or pass apiKey in config.'
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Run a single UI test case
   * Phase 7: Returns simulated results (status: "skipped")
   * Future: Will make real HTTP calls to Skyvern API
   */
  async runTestCase(testCase: UiTestCase): Promise<UiTestResult> {
    const startedAt = new Date().toISOString();

    console.log(`[SkyvernClient] Running UI test: ${testCase.name}`);
    console.log(`[SkyvernClient] Entry URL: ${testCase.entryUrl}`);
    console.log(`[SkyvernClient] Description: ${testCase.description}`);

    // Phase 7: Simulated HTTP call – shape only, not real wire yet
    // TODO: Real implementation in future phase
    // const response = await fetch(`${this.baseUrl}/v1/tasks`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     url: testCase.entryUrl,
    //     navigation_goal: testCase.description,
    //     // ... other Skyvern API parameters
    //   }),
    // });

    // Simulate a delay (as if making API call)
    await new Promise(resolve => setTimeout(resolve, 500));

    const finishedAt = new Date().toISOString();

    // Phase 7: Return placeholder result
    const result: UiTestResult = {
      caseId: testCase.id,
      name: testCase.name,
      status: 'skipped' as UiTestStatus,
      startedAt,
      finishedAt,
      details: 'Phase 7: Skyvern client not fully wired yet. Test case logged but not executed.',
      evidenceUrl: undefined,
    };

    console.log(`[SkyvernClient] Result: ${result.status}`);

    return result;
  }

  /**
   * Get the base URL for this client (useful for diagnostics)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Check if client is configured (has valid API key)
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
