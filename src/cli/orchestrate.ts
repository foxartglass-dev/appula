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
import { RagClient, NullRagClient } from '../rag/RagClient';
import { GeminiFileSearchClient } from '../rag/GeminiFileSearchClient';
import { MemoryManager } from '../rag/MemoryManager';
import { UITestOrchestrator } from '../e2e/UITestOrchestrator';
import { CommitteeEngine, CommitteeMember } from '../orchestrator/CommitteeEngine';
import { DecisionAggregator } from '../llm/DecisionAggregator';
import { CoderCommitteeEngine, CoderCommitteeMember } from '../orchestrator/CoderCommitteeEngine';
import { CoderHealthTester } from '../orchestrator/CoderHealthTester';
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
  ragRefresh?: boolean;
  uiTest?: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    projectId?: string;
    help?: boolean;
    initPlan?: boolean;
    nextPhase?: boolean;
    cycle?: boolean;
    healthCheck?: boolean;
    ragRefresh?: boolean;
    uiTest?: boolean;
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
    } else if (arg === '--rag-refresh') {
      result.ragRefresh = true;
    } else if (arg === '--ui-test') {
      result.uiTest = true;
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
  --rag-refresh         Index current project snapshot into RAG memory
  --ui-test             Run UI tests via Skyvern (Phase 7)
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

  # Refresh RAG memory with current project state (Phase 6)
  npm run orchestrate -- --project demo --rag-refresh

  # Run UI tests via Skyvern (Phase 7)
  npm run orchestrate -- --project demo --ui-test

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
    : args.ragRefresh
    ? 'Phase 6'
    : args.uiTest
    ? 'Phase 7'
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

    // Phase 6: Initialize RAG client
    let ragClient: RagClient;
    try {
      if (config.geminiApiKey && config.geminiRagEndpoint && config.geminiRagDataStoreId) {
        ragClient = new GeminiFileSearchClient();
        console.log('🧠 RAG: Gemini File Search enabled');
      } else {
        ragClient = new NullRagClient();
        console.log('🧠 RAG: Disabled (Gemini config not set)');
      }
    } catch (err) {
      console.warn('⚠️  Failed to initialize Gemini RAG client. Falling back to NullRagClient.');
      console.warn('   Error:', (err as Error).message);
      ragClient = new NullRagClient();
    }

    // Phase 6: Initialize MemoryManager
    const memoryManager = new MemoryManager(ragClient, psoRepo, logRepo);
    console.log('');

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

      // Phase 6/9: Initialize planner with memory
      const primaryModel = config.openaiPrimaryPlannerModel;
      const planner = new OpenAIPlanner(
        config.openaiApiKey,
        primaryModel,
        config.openaiBaseUrl,
        memoryManager
      );
      const pool = new PlannerModelPool(planner, primaryModel);

      // Phase 9: Add backup planners if configured
      if (config.openaiBackupPlannerModels.length > 0) {
        for (let i = 0; i < config.openaiBackupPlannerModels.length; i++) {
          const backupModel = config.openaiBackupPlannerModels[i];
          const backupPlanner = new OpenAIPlanner(
            config.openaiApiKey,
            backupModel,
            config.openaiBaseUrl,
            memoryManager
          );
          pool.addBackupPlanner(backupPlanner, `backup-${i + 1}`, backupModel);
        }
        console.log(`🔄 Planner baton handoff: ${config.openaiBackupPlannerModels.length} backup(s) configured [${config.openaiBackupPlannerModels.join(', ')}]\n`);
      }

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

      // Phase 6/9: Initialize planner with memory
      const primaryModel = config.openaiPrimaryPlannerModel;
      const planner = new OpenAIPlanner(
        config.openaiApiKey,
        primaryModel,
        config.openaiBaseUrl,
        memoryManager
      );
      const pool = new PlannerModelPool(planner, primaryModel);

      // Phase 9: Add backup planners if configured
      if (config.openaiBackupPlannerModels.length > 0) {
        for (let i = 0; i < config.openaiBackupPlannerModels.length; i++) {
          const backupModel = config.openaiBackupPlannerModels[i];
          const backupPlanner = new OpenAIPlanner(
            config.openaiApiKey,
            backupModel,
            config.openaiBaseUrl,
            memoryManager
          );
          pool.addBackupPlanner(backupPlanner, `backup-${i + 1}`, backupModel);
        }
        console.log(`🔄 Planner baton handoff: ${config.openaiBackupPlannerModels.length} backup(s) configured [${config.openaiBackupPlannerModels.join(', ')}]\n`);
      }

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

      // Phase 6/9: Initialize planner with memory
      const primaryModel = config.openaiPrimaryPlannerModel;
      const planner = new OpenAIPlanner(
        config.openaiApiKey,
        primaryModel,
        config.openaiBaseUrl,
        memoryManager
      );
      const pool = new PlannerModelPool(planner, primaryModel);

      // Phase 9: Add backup planners if configured
      if (config.openaiBackupPlannerModels.length > 0) {
        for (let i = 0; i < config.openaiBackupPlannerModels.length; i++) {
          const backupModel = config.openaiBackupPlannerModels[i];
          const backupPlanner = new OpenAIPlanner(
            config.openaiApiKey,
            backupModel,
            config.openaiBaseUrl,
            memoryManager
          );
          pool.addBackupPlanner(backupPlanner, `backup-${i + 1}`, backupModel);
        }
        console.log(`🔄 Planner baton handoff: ${config.openaiBackupPlannerModels.length} backup(s) configured [${config.openaiBackupPlannerModels.join(', ')}]\n`);
      } else {
        console.log(`🔄 Planner baton handoff: OFF (no backups configured)\n`);
      }

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

      // Phase 9.5: Build coder committee if coder configured
      let coderCommittee: CoderCommitteeEngine | null = null;

      if (coder) {
        const coderHealthTester = new CoderHealthTester(
          coder,
          coder.coderId,
          coder.coderName,
        );

        const member: CoderCommitteeMember = {
          id: coder.coderId,
          name: coder.coderName,
          executor: coder,
          healthTester: coderHealthTester,
        };

        coderCommittee = new CoderCommitteeEngine([member]);
        console.log('🧠 Coder committee mode: ON (single-member: Claude Code CLI, ready for GPT-5.1 in Phase 10)');
        console.log('');
      } else {
        console.log('🧠 Coder committee mode: OFF (no coder configured)');
        console.log('');
      }

      // Create project manager with pool
      const projectManager = new ProjectManager(projectRepo, psoRepo, logRepo, pool);

      // Phase 8: Build committee if enabled
      let committeeEngine: CommitteeEngine | null = null;

      if (config.committeeEnabled && config.committeePlannerModels.length >= 2) {
        const committeeMembers: CommitteeMember[] = config.committeePlannerModels.map((modelName, index) => {
          const memberPlanner = new OpenAIPlanner(
            config.openaiApiKey,
            modelName,
            config.openaiBaseUrl,
            memoryManager
          );
          return {
            id: `planner-${index + 1}`,
            modelName,
            planner: memberPlanner,
          };
        });

        const aggregator = new DecisionAggregator();
        committeeEngine = new CommitteeEngine(committeeMembers, aggregator);

        console.log(`🧠 Committee mode: ON with ${committeeMembers.length} members [${config.committeePlannerModels.join(', ')}]`);
        console.log('');
      } else if (config.committeeEnabled && config.committeePlannerModels.length < 2) {
        console.log('⚠️  Committee mode: DISABLED (need at least 2 models, found ' + config.committeePlannerModels.length + ')');
        console.log('');
      } else {
        console.log('🧠 Committee mode: OFF (single planner)');
        console.log('');
      }

      // Create phase runner with optional coder and committees
      const phaseRunner = new PhaseRunner(pool, logRepo, coder, committeeEngine, coderCommittee);

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

      // Phase 7: Initialize UI test orchestrator
      const uiTestOrchestrator = new UITestOrchestrator();

      // Create orchestrator
      const orchestrator = new Orchestrator(
        projectManager,
        phaseRunner,
        pool,
        logRepo,
        healthMonitor,
        notificationService,
        uiTestOrchestrator
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

      // Phase 9: Show active planner info
      if (result.activePlanner) {
        console.log('\n--- Active Planner (Phase 9) ---');
        console.log(`Planner ID:        ${result.activePlanner.plannerId}`);
        console.log(`Model:             ${result.activePlanner.modelName}`);
        if (result.activePlanner.lastHealthStatus) {
          console.log(`Health Status:     ${result.activePlanner.lastHealthStatus}`);
        }
        if (result.activePlanner.lastHealthScore !== undefined) {
          console.log(`Health Score:      ${result.activePlanner.lastHealthScore.toFixed(2)}`);
        }
        if (result.activePlanner.lastSwitchReason) {
          console.log(`Last Switch:       ${result.activePlanner.lastSwitchReason}`);
        }
      }

      // Phase 9.5: Show active coder info
      if (result.activeCoder) {
        console.log('\n--- Active Coder (Phase 9.5) ---');
        console.log(`Coder ID:          ${result.activeCoder.coderId}`);
        console.log(`Coder Name:        ${result.activeCoder.coderName}`);
        if (result.activeCoder.health) {
          console.log(`Health Status:     ${result.activeCoder.health.status}`);
          console.log(`Health Score:      ${result.activeCoder.health.score.toFixed(2)}`);
          if (result.activeCoder.health.notes) {
            console.log(`Notes:             ${result.activeCoder.health.notes}`);
          }
        }
      }

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

    // Handle rag-refresh (Phase 6)
    if (args.ragRefresh) {
      console.log('🎯 Mode: RAG Memory Refresh\n');

      // Load project config and PSO
      const project = await projectRepo.load(args.projectId);
      const pso = await psoRepo.load(args.projectId);

      if (!pso) {
        console.log(`❌ Project state not found for "${args.projectId}"`);
        console.log('   Please run --init-plan first to create project state.\n');
        process.exit(1);
      }

      // Index current snapshot
      console.log('Indexing current project snapshot into RAG...\n');
      await memoryManager.indexProjectSnapshot(project, pso);

      // Display success
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║        Appula RAG Refresh (Phase 6)       ║');
      console.log('╚═══════════════════════════════════════════╝\n');
      console.log(`Project:   ${project.name}`);
      console.log(`Status:    Indexed current PSO and recent logs into RAG`);
      console.log(`RAG Type:  ${config.geminiRagEndpoint ? 'Gemini File Search' : 'Null (disabled)'}`);
      console.log('');
      console.log('═══════════════════════════════════════════\n');
      console.log('✅ RAG refresh complete!');
      console.log('');
      console.log('The planner will now have access to this historical context.');
      console.log('');
      return;
    }

    // Handle ui-test (Phase 7)
    if (args.uiTest) {
      console.log('🎯 Mode: UI Testing (Skyvern)\n');

      // Load project config and PSO
      const project = await projectRepo.load(args.projectId);
      const pso = await psoRepo.load(args.projectId);

      if (!pso) {
        console.log(`❌ Project state not found for "${args.projectId}"`);
        console.log('   Please run --init-plan first to create project state.\n');
        process.exit(1);
      }

      // Initialize UI test orchestrator
      const uiTestOrchestrator = new UITestOrchestrator();

      // Run UI tests
      console.log('Running UI tests for project...\n');
      const summary = await uiTestOrchestrator.runUiTests(pso);

      // Update PSO with test results
      pso.lastUiTestRun = summary;
      await psoRepo.save(pso);

      // Display results
      console.log('\n╔═══════════════════════════════════════════╗');
      console.log('║      Appula UI Test Results (Phase 7)     ║');
      console.log('╚═══════════════════════════════════════════╝\n');
      console.log(`Project:   ${project.name}`);
      console.log(`Phase:     ${pso.currentPhase ?? 'N/A'}`);
      console.log(`Status:    ${summary.status}`);
      console.log(`Total:     ${summary.results.length} test case(s)`);
      console.log(`Passed:    ${summary.results.filter(r => r.status === 'passed').length}`);
      console.log(`Failed:    ${summary.results.filter(r => r.status === 'failed').length}`);
      console.log(`Skipped:   ${summary.results.filter(r => r.status === 'skipped').length}`);
      console.log('');

      if (summary.notes) {
        console.log(`Notes:     ${summary.notes}`);
        console.log('');
      }

      // Display individual test results
      if (summary.results.length > 0) {
        console.log('═══════════════════════════════════════════');
        console.log('Individual Test Results:');
        console.log('═══════════════════════════════════════════\n');

        for (const result of summary.results) {
          const statusIcon = result.status === 'passed' ? '✅'
            : result.status === 'failed' ? '❌'
            : result.status === 'skipped' ? '⏭️'
            : '⚠️';

          console.log(`${statusIcon} ${result.name}`);
          console.log(`   Status: ${result.status}`);
          if (result.details) {
            console.log(`   Details: ${result.details}`);
          }
          console.log('');
        }
      }

      console.log('═══════════════════════════════════════════\n');

      if (summary.status === 'failed') {
        console.log('❌ UI tests failed! Please review and fix issues.');
      } else if (summary.status === 'passed') {
        console.log('✅ All UI tests passed!');
      } else if (summary.status === 'not_configured') {
        console.log('⚠️  UI testing not configured. Set SKYVERN_API_KEY to enable.');
      } else {
        console.log('⏭️  UI tests were skipped.');
      }

      console.log('');
      return;
    }

    // Default behavior (Phase 1) - Create manager without planner
    // Use a stub pool to satisfy constructor requirements
    const stubPlanner = new OpenAIPlanner('stub', 'gpt-4');
    const stubPool = new PlannerModelPool(stubPlanner, 'gpt-4');
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
