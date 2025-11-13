import { UiTestResult } from '../orchestrator/types';

/**
 * Skyvern browser agent client for UI testing
 * Phase 1: Stub implementation
 * Future: Will integrate with Skyvern API
 */
export class SkyvernClient {
  private _apiKey: string;
  private _baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.skyvern.com') {
    this._apiKey = apiKey;
    this._baseUrl = baseUrl;
  }

  async runFlow(_url: string, _flowName: string): Promise<UiTestResult> {
    throw new Error('SkyvernClient.runFlow not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Create a new test flow
   */
  async createFlow(_name: string, _steps: unknown[]): Promise<string> {
    throw new Error('SkyvernClient.createFlow not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Get flow execution status
   */
  async getFlowStatus(_flowId: string): Promise<{ status: string; result?: UiTestResult }> {
    throw new Error('SkyvernClient.getFlowStatus not implemented yet (Phase 1 stub)');
  }
}
