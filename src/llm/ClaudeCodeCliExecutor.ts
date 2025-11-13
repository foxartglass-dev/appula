import { CoderExecutor } from './CoderExecutor';
import { RunInstructionParams, RunInstructionResult } from '../orchestrator/types';

/**
 * Claude Code CLI implementation of CoderExecutor
 * Phase 1: Stub implementation
 * Future: Will execute actual Claude Code CLI commands
 */
export class ClaudeCodeCliExecutor implements CoderExecutor {
  private _cliPath: string;

  constructor(cliPath: string = 'claude') {
    this._cliPath = cliPath;
  }

  async runInstruction(_params: RunInstructionParams): Promise<RunInstructionResult> {
    throw new Error('ClaudeCodeCliExecutor.runInstruction not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Check if Claude Code CLI is installed and accessible
   */
  async checkAvailability(): Promise<boolean> {
    throw new Error('ClaudeCodeCliExecutor.checkAvailability not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Get CLI version
   */
  async getVersion(): Promise<string> {
    throw new Error('ClaudeCodeCliExecutor.getVersion not implemented yet (Phase 1 stub)');
  }
}
