#!/usr/bin/env node

import { ProjectManager } from '../orchestrator/ProjectManager';
import { ProjectRepo } from '../storage/ProjectRepo';
import { PsoRepo } from '../storage/PsoRepo';
import { LogRepo } from '../storage/LogRepo';
import { OpenAIPlanner } from '../llm/OpenAIPlanner';
import { PlannerModelPool } from '../llm/PlannerModelPool';
import { config, validateConfig } from '../config/env';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  projectId?: string;
  help?: boolean;
  initPlan?: boolean;
  nextPhase?: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    projectId?: string;
    help?: boolean;
    initPlan?: boolean;
    nextPhase?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--project' || arg === '-p') {
      result.projectId = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--init-plan') {
      result.initPlan = true;
    } else if (arg === '--next-phase') {
      result.nextPhase = true;
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
  npm run orchestrate -- --project <projectId> [options]

Options:
  --project, -p <id>    Project ID to orchestrate (required)
  --init-plan           Initialize project plan with AI planner
  --next-phase          Get next phase instruction from planner
  --help, -h            Show this help message

Examples:
  # Initialize a project plan
  npm run orchestrate -- --project demo --init-plan

  # Get next phase instruction
  npm run orchestrate -- --project demo --next-phase

  # Basic project start (Phase 1 behavior)
  npm run orchestrate -- --project demo

Phase 2 Features:
  --init-plan: Uses OpenAI GPT to analyze your project and
               break it down into logical development phases.

  --next-phase: Gets detailed instruction for the next phase
                from the AI planner (coder execution still stubbed).

Configuration:
  Projects dir: ${config.projectsDir}
  State dir:    ${config.stateDir}
  Logs dir:     ${config.logsDir}
  OpenAI Model: ${config.openaiPlannerModel}

Environment Variables:
  OPENAI_API_KEY         - Required for planner operations
  OPENAI_BASE_URL        - Optional custom OpenAI endpoint
  OPENAI_PLANNER_MODEL   - Model to use (default: gpt-4)
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

  const phaseVersion = args.initPlan || args.nextPhase ? 'Phase 2' : 'Phase 1';

  console.log('╔═══════════════════════════════════════════╗');
  console.log(`║        Appula Orchestrator (${phaseVersion})      ║`);
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  try {
    // Initialize repositories
    const projectRepo = new ProjectRepo();
    const psoRepo = new PsoRepo();
    const logRepo = new LogRepo();

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
      console.log(
        JSON.stringify(
          {
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
          },
          null,
          2
        )
      );
      console.log('');
      process.exit(1);
    }

    // Handle init-plan
    if (args.initPlan) {
      console.log('🎯 Mode: Initialize Project Plan\n');

      // Validate OpenAI config
      validateConfig(true);

      // Initialize planner and pool
      const planner = new OpenAIPlanner(
        config.openaiApiKey,
        config.openaiPlannerModel,
        config.openaiBaseUrl
      );
      const pool = new PlannerModelPool(planner);

      // Create project manager with pool
      const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo, pool);

      // Initialize plan
      await projectManager.initPlan(args.projectId);

      console.log('✅ Plan initialization complete!');
      console.log('');
      console.log('Next steps:');
      console.log(`  npm run orchestrate -- --project ${args.projectId} --next-phase`);
      console.log('');
      return;
    }

    // Handle next-phase
    if (args.nextPhase) {
      console.log('🎯 Mode: Get Next Phase Instruction\n');

      // Validate OpenAI config
      validateConfig(true);

      // Initialize planner and pool
      const planner = new OpenAIPlanner(
        config.openaiApiKey,
        config.openaiPlannerModel,
        config.openaiBaseUrl
      );
      const pool = new PlannerModelPool(planner);

      // Create project manager with pool
      const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo, pool);

      // Get next phase instruction
      const instruction = await projectManager.getNextPhaseInstruction(args.projectId);

      console.log('✅ Instruction generated!');
      console.log('');
      console.log('Note: This instruction would be passed to Claude Code CLI');
      console.log('in a future phase. For now, it\'s just displayed above.');
      console.log('');
      return;
    }

    // Default behavior (Phase 1) - Create manager without planner
    // Use a stub pool to satisfy constructor requirements
    const stubPlanner = new OpenAIPlanner('stub', 'gpt-4');
    const stubPool = new PlannerModelPool(stubPlanner);
    const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo, stubPool);

    console.log('🚀 Starting Appula orchestration...');
    console.log('');

    await projectManager.startProject(args.projectId);

    console.log('');
    console.log('✅ Phase 1 skeleton execution complete!');
    console.log('');
    console.log('Available Phase 2 commands:');
    console.log(`  npm run orchestrate -- --project ${args.projectId} --init-plan`);
    console.log(`  npm run orchestrate -- --project ${args.projectId} --next-phase`);
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
