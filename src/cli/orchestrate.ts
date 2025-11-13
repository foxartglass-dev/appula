#!/usr/bin/env node

import { ProjectManager } from '../orchestrator/ProjectManager';
import { ProjectRepo } from '../storage/ProjectRepo';
import { PsoRepo } from '../storage/PsoRepo';
import { LogRepo } from '../storage/LogRepo';
import { OpenAIPlanner } from '../llm/OpenAIPlanner';
import { PlannerModelPool } from '../llm/PlannerModelPool';
import { ClaudeCodeCliExecutor } from '../llm/ClaudeCodeCliExecutor';
import { PhaseRunner } from '../orchestrator/PhaseRunner';
import { Orchestrator } from '../orchestrator/Orchestrator';
import {
  OrchestrationHealthMonitor,
  PlannerHealthMonitor,
  NoopHealthMonitor,
} from '../orchestrator/HealthMonitor';
import { PlannerHealthTester } from '../orchestrator/PlannerHealthTester';
import {
  NotificationService,
  TwilioNotificationService,
  NoopNotificationService,
} from '../notifications/NotificationService';
import { config, validateConfig } from '../config/env';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  projectId?: string;
  help?: boolean;
  initPlan?: boolean;
  nextPhase?: boolean;
  cycle?: boolean;
  healthCheck?: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    projectId?: string;
    help?: boolean;
    initPlan?: boolean;
    nextPhase?: boolean;
    cycle?: boolean;
    healthCheck?: boolean;
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
    } else if (arg === '--cycle') {
      result.cycle = true;
    } else if (arg === '--health-check') {
      result.healthCheck = true;
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
  --cycle               Run full orchestration cycle (plan → execute → assess → health)
  --health-check        Run planner health check and display results
  --help, -h            Show this help message

Examples:
  # Initialize a project plan
  npm run orchestrate -- --project demo --init-plan

  # Get next phase instruction
  npm run orchestrate -- --project demo --next-phase

  # Run a full orchestration cycle (Phase 4+)
  npm run orchestrate -- --project demo --cycle

  # Run planner health check (Phase 5)
  npm run orchestrate -- --project demo --health-check

  # Basic project start (Phase 1 behavior)
  npm run orchestrate -- --project demo

Phase 4 Features:
  --cycle: Runs a complete orchestration cycle:
           1. Ensures plan exists (runs --init-plan if needed)
           2. Runs next phase (plan + execute with coder if configured)
           3. Assesses phase result with AI
           4. Runs health checks
           5. Returns summary (done/blocked status)

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

  const phaseVersion = args.cycle
    ? 'Phase 4'
    : args.healthCheck
    ? 'Phase 5'
    : args.initPlan || args.nextPhase
    ? 'Phase 2'
    : 'Phase 1';

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

      // Load project to get repoPath for executor
      const project = await projectRepo.load(args.projectId);

      // Phase 3: Create coder executor (optional based on config)
      const coder = config.claudeCodeCommandTemplate
        ? new ClaudeCodeCliExecutor(project.repoPath)
        : null;

      if (coder) {
        console.log('🤖 Claude Code CLI executor configured');
      } else {
        console.log('📝 Plan-only mode (CLAUDE_CODE_COMMAND_TEMPLATE not set)');
      }
      console.log('');

      // Create project manager with pool
      const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo, pool);

      // Get next phase instruction and optionally execute
      const instruction = await projectManager.getNextPhaseInstruction(args.projectId, coder);

      console.log('✅ Phase instruction complete!');
      console.log('');
      if (coder) {
        console.log('Instruction was passed to Claude Code CLI for execution.');
      } else {
        console.log('Note: To enable code execution, set CLAUDE_CODE_COMMAND_TEMPLATE');
        console.log('in your .env file. See .env.example for details.');
      }
      console.log('');
      return;
    }

    // Handle cycle (Phase 4)
    if (args.cycle) {
      console.log('🎯 Mode: Run Orchestration Cycle\n');

      // Validate OpenAI config
      validateConfig(true);

      // Initialize planner and pool
      const planner = new OpenAIPlanner(
        config.openaiApiKey,
        config.openaiPlannerModel,
        config.openaiBaseUrl
      );
      const pool = new PlannerModelPool(planner);

      // Load project to get repoPath for executor
      const project = await projectRepo.load(args.projectId);

      // Phase 4: Create coder executor (optional based on config)
      const coder = config.claudeCodeCommandTemplate
        ? new ClaudeCodeCliExecutor(project.repoPath)
        : null;

      if (coder) {
        console.log('🤖 Claude Code CLI executor configured');
      } else {
        console.log('📝 Plan-only mode (CLAUDE_CODE_COMMAND_TEMPLATE not set)');
      }
      console.log('');

      // Create project manager with pool
      const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo, pool);

      // Create phase runner with optional coder
      const phaseRunner = new PhaseRunner(pool, logRepo, coder);

      // Phase 5: Create health monitor based on OpenAI config
      let healthMonitor: OrchestrationHealthMonitor;

      if (config.openaiApiKey && config.openaiPlannerModel) {
        const tester = new PlannerHealthTester();
        healthMonitor = new PlannerHealthMonitor(tester);
        console.log('🧠 Planner health monitor enabled');
      } else {
        healthMonitor = new NoopHealthMonitor();
        console.log('🧠 Planner health monitor disabled (no OpenAI config)');
      }
      console.log('');

      // Phase 4.5: Create notification service based on config
      let notificationService: NotificationService;

      if (
        config.twilioAccountSid &&
        config.twilioAuthToken &&
        config.twilioFromNumber &&
        config.notifySmsTo
      ) {
        notificationService = new TwilioNotificationService();
        console.log('🔔 SMS notifications enabled via Twilio');
      } else {
        notificationService = new NoopNotificationService();
        console.log('🔕 SMS notifications disabled (Twilio env not configured)');
      }
      console.log('');

      // Create orchestrator
      const orchestrator = new Orchestrator(
        projectManager,
        phaseRunner,
        pool,
        logRepo,
        healthMonitor,
        notificationService
      );

      // Run single orchestration cycle
      const result = await orchestrator.runSingleCycle(args.projectId);

      console.log('\n═══════════════════════════════════════════');
      console.log('          Orchestration Cycle Result');
      console.log('═══════════════════════════════════════════\n');
      console.log(`Project:           ${result.projectId}`);
      console.log(`Phase:             ${result.phaseNumber ?? 'none'}`);
      console.log(`Planner Status:    ${result.plannerStatus ?? 'n/a'}`);
      console.log(`Execution Status:  ${result.executionStatus ?? 'n/a'}`);
      console.log(`Health OK:         ${result.health?.ok ?? true}`);
      console.log(`Done:              ${result.done}`);
      console.log(`Blocked:           ${result.blocked}`);
      if (result.notes) {
        console.log(`\nNotes: ${result.notes}`);
      }
      console.log('\n═══════════════════════════════════════════\n');

      if (result.done) {
        console.log('✅ All phases complete!');
      } else if (result.blocked) {
        console.log('⚠️  Orchestration blocked. Human input or intervention required.');
      } else {
        console.log('✅ Cycle complete. Run again to continue to next phase.');
      }
      console.log('');
      return;
    }

    // Handle health-check (Phase 5)
    if (args.healthCheck) {
      console.log('🎯 Mode: Planner Health Check\n');

      // Validate OpenAI config
      validateConfig(true);

      // Create health monitor
      let healthMonitor: OrchestrationHealthMonitor;

      if (config.openaiApiKey && config.openaiPlannerModel) {
        const tester = new PlannerHealthTester();
        healthMonitor = new PlannerHealthMonitor(tester);
        console.log('🧠 Planner health monitor enabled\n');
      } else {
        console.log('❌ OpenAI configuration required for health checks');
        console.log('   Please set OPENAI_API_KEY and OPENAI_PLANNER_MODEL in .env\n');
        process.exit(1);
      }

      // Load PSO
      const pso = await psoRepo.load(args.projectId);

      if (!pso) {
        console.log(`❌ Project state not found for "${args.projectId}"`);
        console.log('   Please run --init-plan first to create project state.\n');
        process.exit(1);
      }

      // Build context for health check
      const lastExecution = pso.executionHistory && pso.executionHistory.length > 0
        ? pso.executionHistory[pso.executionHistory.length - 1]
        : null;

      const lastPhaseNumber = pso.currentPhase ?? (lastExecution?.phaseNumber ?? null);

      const ctx = {
        projectId: args.projectId,
        pso,
        lastPhaseNumber,
        lastExecution,
        lastAssessment: pso.lastAssessment ?? null,
      };

      // Run health check
      console.log('Running planner health checks...\n');
      const healthResult = await healthMonitor.runHealthCheck(ctx);

      // Save to PSO
      pso.lastHealthCheck = healthResult;
      await psoRepo.save(pso);

      // Display results
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║        Appula Planner Health Check        ║');
      console.log('╚═══════════════════════════════════════════╝\n');

      if (healthResult.plannerHealth) {
        const ph = healthResult.plannerHealth;
        console.log(`Model:           ${ph.modelId}`);
        console.log(`Status:          ${ph.status}`);
        console.log(`Overall Score:   ${ph.overallScore.toFixed(2)}`);
        console.log(`Summary:         ${ph.summary}\n`);
        console.log('Tests:');

        for (const test of ph.tests) {
          const icon = test.passed ? '✅' : '❌';
          console.log(`  ${icon} ${test.name.padEnd(25)} (score=${test.score.toFixed(2)})`);
          if (test.details) {
            console.log(`     ${test.details}`);
          }
        }
        console.log('');
      } else {
        console.log(`Status:          ${healthResult.ok ? 'OK' : 'Failed'}`);
        console.log(`Reason:          ${healthResult.reason ?? 'n/a'}\n`);
      }

      console.log(`Suggested Action: ${healthResult.suggestedAction ?? 'continue'}\n`);
      console.log('═══════════════════════════════════════════\n');

      if (healthResult.ok) {
        console.log('✅ Planner health check passed!');
      } else {
        console.log('⚠️  Planner health check failed. Review results above.');
      }
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
