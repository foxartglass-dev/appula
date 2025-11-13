#!/usr/bin/env node

import { ProjectManager } from '../orchestrator/ProjectManager';
import { ProjectRepo } from '../storage/ProjectRepo';
import { PsoRepo } from '../storage/PsoRepo';
import { LogRepo } from '../storage/LogRepo';
import { config } from '../config/env';

/**
 * Parse command line arguments
 */
function parseArgs(): { projectId?: string; help?: boolean } {
  const args = process.argv.slice(2);
  const result: { projectId?: string; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--project' || arg === '-p') {
      result.projectId = args[i + 1];
      i++; // Skip next arg
    }
  }

  return result;
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
╔═══════════════════════════════════════════╗
║        Appula Orchestrator CLI            ║
╚═══════════════════════════════════════════╝

Usage:
  npm run orchestrate -- --project <projectId>

Options:
  --project, -p <id>    Project ID to orchestrate
  --help, -h            Show this help message

Examples:
  npm run orchestrate -- --project demo
  npm run orchestrate -- -p my-project

Phase 1 Status:
  This is a skeleton implementation. No actual AI calls
  are made yet. The CLI will load the project config and
  PSO, then exit gracefully.

Configuration:
  Projects dir: ${config.projectsDir}
  State dir:    ${config.stateDir}
  Logs dir:     ${config.logsDir}
  `);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.projectId) {
    console.error('Error: --project argument is required\n');
    showHelp();
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════╗');
  console.log('║        Appula Orchestrator (Phase 1)      ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  try {
    // Initialize repositories
    const projectRepo = new ProjectRepo();
    const psoRepo = new PsoRepo();
    const logRepo = new LogRepo();

    // Create project manager
    const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo);

    console.log(`📁 Project ID: ${args.projectId}`);
    console.log('');

    // Check if project exists
    const exists = await projectRepo.exists(args.projectId);

    if (!exists) {
      console.log(`⚠️  Project "${args.projectId}" does not exist yet.`);
      console.log('');
      console.log('To create a project, add a JSON file to the projects/ directory:');
      console.log(`  projects/${args.projectId}.json`);
      console.log('');
      console.log('Example project configuration:');
      console.log(JSON.stringify({
        id: args.projectId,
        name: 'My Project',
        repoPath: '/path/to/repo',
        description: 'Project description',
        status: 'idle',
        plannerModel: 'gpt-4',
        coderMode: 'claude-code-cli',
        ragEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, null, 2));
      console.log('');
      process.exit(1);
    }

    // Start project orchestration
    console.log('🚀 Starting Appula orchestration...');
    console.log('');

    await projectManager.startProject(args.projectId);

    console.log('');
    console.log('✅ Phase 1 skeleton execution complete!');
    console.log('');
    console.log('Note: This is a Phase 1 stub implementation.');
    console.log('No actual AI calls or orchestration logic executed yet.');
    console.log('');
    console.log('Next phases will implement:');
    console.log('  - OpenAI planner integration');
    console.log('  - Claude Code CLI executor');
    console.log('  - Orchestration loop');
    console.log('  - RAG (Gemini File Search)');
    console.log('  - UI testing (Skyvern)');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', (error as Error).message);
    console.error('');

    if (process.env.DEBUG) {
      console.error('Stack trace:');
      console.error((error as Error).stack);
    }

    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
