import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config/env';
import {
  CoderExecutor,
  PhaseExecutionRequest,
  PhaseExecutionResult,
  PhaseExecutionStatus,
} from './CoderExecutor';

const execAsync = promisify(exec);

/**
 * Phase 3: Claude Code CLI executor implementation
 * Phase 9.5: Added coderId/coderName for identity tracking and dryRun support
 *
 * Executes phases using the Claude Code CLI with configurable command templates.
 * Supports plan-only mode when CLI is not configured.
 * Supports dry-run mode for health testing without mutating the repository.
 */
export class ClaudeCodeCliExecutor implements CoderExecutor {
  public readonly coderId: string = "claude-cli";
  public readonly coderName = "Claude Code CLI";

  constructor(private readonly defaultProjectRoot: string) {}

  /**
   * Execute a phase using Claude Code CLI
   * Phase 9.5: Supports dry-run mode for health checks
   */
  async runPhase(req: PhaseExecutionRequest): Promise<PhaseExecutionResult> {
    const startedAt = new Date().toISOString();

    // Phase 9.5: Handle dry-run mode
    if (req.dryRun) {
      const planPath = req.planFilePath || `state/phase-instructions/${req.projectId}_phase${req.phaseNumber}.md`;
      const command = config.claudeCodeCommandTemplate
        ? this.buildCommandForDryRun(req, planPath)
        : 'N/A (no template configured)';

      const now = new Date().toISOString();
      return {
        status: 'success',
        startedAt: now,
        finishedAt: now,
        logs: `Phase 9.5 dry-run for ${this.coderName}.\nWould run:\n${command}\n\nNo actual execution performed (dry-run mode).`,
        coderId: this.coderId,
        coderName: this.coderName,
        dryRun: true,
      };
    }

    // Check if command template is configured
    if (!config.claudeCodeCommandTemplate || config.claudeCodeCommandTemplate.trim() === '') {
      return {
        status: 'cli_error',
        startedAt,
        finishedAt: new Date().toISOString(),
        exitCode: null,
        logs: '[Plan-only mode] Claude Code CLI command template not configured',
        errorMessage: 'CLAUDE_CODE_COMMAND_TEMPLATE environment variable is not set. Running in plan-only mode.',
        coderId: this.coderId,
        coderName: this.coderName,
        dryRun: false,
      };
    }

    try {
      // Step 1: Write plan file
      const planPath = await this.writePlanFile(req);

      // Step 2: Build command from template
      const command = this.buildCommand(req, planPath);

      // Step 3: Execute with timeout
      const workingDir = config.claudeCodeWorkingDir || req.projectRoot;
      const timeout = config.claudeCodeTimeoutMs;

      console.log(`🚀 Executing: ${command}`);
      console.log(`📂 Working directory: ${workingDir}`);
      console.log(`⏱️  Timeout: ${timeout}ms`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const finishedAt = new Date().toISOString();
      const logs = this.combineLogs(stdout, stderr);

      return {
        status: 'success',
        startedAt,
        finishedAt,
        exitCode: 0,
        logs,
        coderId: this.coderId,
        coderName: this.coderName,
        dryRun: false,
      };
    } catch (error: any) {
      const finishedAt = new Date().toISOString();

      // Handle timeout
      if (error.killed && error.signal === 'SIGTERM') {
        return {
          status: 'timeout',
          startedAt,
          finishedAt,
          exitCode: null,
          logs: this.combineLogs(error.stdout || '', error.stderr || ''),
          errorMessage: `Execution timed out after ${config.claudeCodeTimeoutMs}ms`,
          coderId: this.coderId,
          coderName: this.coderName,
          dryRun: false,
        };
      }

      // Handle CLI execution error (non-zero exit code)
      if (error.code !== undefined && error.code !== 0) {
        return {
          status: 'failed',
          startedAt,
          finishedAt,
          exitCode: error.code,
          logs: this.combineLogs(error.stdout || '', error.stderr || ''),
          errorMessage: `CLI exited with code ${error.code}`,
          coderId: this.coderId,
          coderName: this.coderName,
          dryRun: false,
        };
      }

      // Handle other errors (CLI not found, permission issues, etc.)
      return {
        status: 'cli_error',
        startedAt,
        finishedAt,
        exitCode: null,
        logs: error.stdout ? this.combineLogs(error.stdout, error.stderr || '') : '',
        errorMessage: error.message || 'Unknown CLI error',
        coderId: this.coderId,
        coderName: this.coderName,
        dryRun: false,
      };
    }
  }

  /**
   * Write phase instruction to plan file
   * Creates: state/phase-instructions/{projectId}_phase{N}.md
   */
  private async writePlanFile(req: PhaseExecutionRequest): Promise<string> {
    const instructionsDir = path.join(config.stateDir, 'phase-instructions');

    // Create directory if it doesn't exist
    await fs.mkdir(instructionsDir, { recursive: true });

    // Build file path
    const fileName = `${req.projectId}_phase${req.phaseNumber}.md`;
    const planPath = path.join(instructionsDir, fileName);

    // Write instruction as markdown
    const content = `# Phase ${req.phaseNumber}: ${req.phaseName}

**Project ID**: ${req.projectId}
**Project Root**: ${req.projectRoot}
**Generated**: ${new Date().toISOString()}

## Instruction

${req.instruction}
`;

    await fs.writeFile(planPath, content, 'utf-8');

    return planPath;
  }

  /**
   * Build CLI command from template with placeholder replacement
   * Placeholders: {projectRoot}, {phaseNumber}, {planPath}, {instructionSummary}
   */
  private buildCommand(req: PhaseExecutionRequest, planPath: string): string {
    const template = config.claudeCodeCommandTemplate!;

    // Extract first line of instruction as summary
    const instructionSummary = req.instruction.split('\n')[0].substring(0, 100);

    // Replace placeholders
    return template
      .replace(/\{projectRoot\}/g, req.projectRoot)
      .replace(/\{phaseNumber\}/g, String(req.phaseNumber))
      .replace(/\{planPath\}/g, planPath)
      .replace(/\{instructionSummary\}/g, instructionSummary)
      .replace(/\{phaseName\}/g, req.phaseName)
      .replace(/\{projectId\}/g, req.projectId);
  }

  /**
   * Phase 9.5: Build command string for dry-run display (doesn't execute)
   */
  private buildCommandForDryRun(req: PhaseExecutionRequest, planPath: string): string {
    const template = config.claudeCodeCommandTemplate!;
    const instructionSummary = req.instruction.split('\n')[0].substring(0, 100);

    return template
      .replace(/\{projectRoot\}/g, req.projectRoot)
      .replace(/\{phaseNumber\}/g, String(req.phaseNumber))
      .replace(/\{planPath\}/g, planPath)
      .replace(/\{instructionSummary\}/g, instructionSummary)
      .replace(/\{phaseName\}/g, req.phaseName)
      .replace(/\{projectId\}/g, req.projectId);
  }

  /**
   * Combine stdout and stderr into a single log string
   */
  private combineLogs(stdout: string, stderr: string): string {
    const parts: string[] = [];

    if (stdout && stdout.trim()) {
      parts.push('=== STDOUT ===\n' + stdout.trim());
    }

    if (stderr && stderr.trim()) {
      parts.push('=== STDERR ===\n' + stderr.trim());
    }

    return parts.join('\n\n') || '(no output)';
  }
}
