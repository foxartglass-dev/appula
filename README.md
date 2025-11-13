# Appula

AI orchestration system combining multiple AI agents for software development automation.

## Architecture

- **ChatGPT 5.1 Thinking** - Planner / Reviewer
- **Claude Code CLI** - Coder / Executor
- **Gemini File Search (RAG)** - Long-term memory (future)
- **Skyvern** - UI testing agent (future)

## Current Status: Phase 7

### Phase 1: Project Skeleton ✅
- Clean folder structure
- Strict TypeScript configuration
- Core interfaces and types
- Minimal Express HTTP server
- Stub implementations

### Phase 2: OpenAI Planner Integration ✅
- Real OpenAI GPT integration for project planning
- Automatic phase breakdown for projects
- Next-phase instruction generation
- Planner health monitoring & failover support
- CLI commands: `--init-plan` and `--next-phase`

### Phase 3: Claude Code CLI Executor ✅
- Safe, config-driven Claude Code CLI integration
- Generic command template with placeholders
- Plan file generation (markdown format)
- Structured result capture (stdout/stderr, exit codes, timestamps)
- Graceful degradation to plan-only mode when CLI not configured
- Automatic timeout handling and error categorization

### Phase 4: Orchestration & Assessment ✅
- Full orchestration cycle: plan → execute → assess → health check
- AI-powered phase result assessment (ok, needs_fix, stuck, human_input)
- Health monitoring hooks for future hallucination tests
- Execution history tracking with attempts and status
- Assessment summaries stored in PSO
- Done/blocked status determination for automated workflows
- New CLI command: `--cycle` for single orchestration cycles

### Phase 4.5: Notification Hooks & SMS Alerts ✅
- SMS notifications via Twilio when orchestration cycles are blocked
- NotificationService abstraction for extensible notification channels
- Automatic alerts with project status, planner assessment, and execution details
- Graceful fallback when Twilio is not configured

### Phase 5: Hallucination Tests & Advanced Health Monitor ✅
- Real hallucination detection via probe tests (math, code reasoning, instruction following)
- PlannerHealthTester runs lightweight tests against OpenAI planner model
- PlannerHealthSnapshot with scores, statuses, and detailed test results
- Health monitoring integrated into orchestration cycle
- Blocking and notifications triggered on health failures
- Manual health check via `--health-check` CLI command
- Quality scoring (ok/degraded/failing) with suggested actions (continue/pause/require_human)
- Foundation for future model handoff and multi-model committee logic

### Phase 6: RAG Memory & Baton Handoff Hooks ✅
- Long-term project memory via RAG (Retrieval-Augmented Generation)
- MemoryManager indexes PSO snapshots, logs, and project config into RAG
- OpenAIPlanner enhanced with RAG-aware context injection
- Historical context automatically retrieved and injected into planning prompts
- GeminiFileSearchClient integration (configurable via env, graceful fallback)
- NullRagClient for environments without RAG configuration
- Manual RAG refresh via `--rag-refresh` CLI command
- Baton handoff hooks in PlannerModelPool for future model switching
- Health snapshots recorded in planner pool for quality-based handoff
- Orchestrator marks planner as unhealthy when health score < 0.60
- Foundation for multi-model committee and intelligent model selection

### Phase 7: Skyvern UI Testing & Robot User QA ✅
- End-to-end UI testing via Skyvern browser automation
- UITestOrchestrator coordinates test execution with graceful degradation
- SkyvernClient with safe, env-gated configuration
- UI test types: UiTestCase, UiTestResult, UiTestRunSummary, UiTestStatus
- UI tests run automatically after each orchestration cycle
- Manual UI testing via `--ui-test` CLI command
- UI test results stored in PSO (lastUiTestRun field)
- Failed UI tests block orchestration and trigger SMS notifications
- OrchestrationResult extended with uiTestStatus and uiTestSummary
- Test results tracked with passed/failed/skipped/not_configured statuses
- Foundation for automated regression testing and continuous UI validation

## Project Structure

```
appula-core/
├── src/
│   ├── api/              # Express server
│   ├── orchestrator/     # Core orchestration logic
│   ├── llm/              # LLM interfaces and implementations
│   ├── rag/              # RAG client interfaces
│   ├── storage/          # Data persistence
│   ├── e2e/              # E2E test orchestration
│   ├── config/           # Configuration
│   └── cli/              # CLI entrypoints
├── projects/             # Project configuration files
├── state/                # PSO and log storage
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and configure your API keys and Claude Code CLI:

```bash
# Required for Phase 2+
OPENAI_API_KEY=your_key_here
OPENAI_PLANNER_MODEL=gpt-4  # or gpt-4-turbo, o1-mini, o1-preview

# Optional: Phase 3 Claude Code CLI Integration
# Leave empty to run in plan-only mode (planning without execution)
# Set this to enable actual code execution via Claude Code CLI
# Placeholders: {projectRoot}, {phaseNumber}, {planPath}, {instructionSummary}, {phaseName}, {projectId}
# CLAUDE_CODE_COMMAND_TEMPLATE=claude code --project "{projectRoot}" --plan-file "{planPath}" --phase {phaseNumber}
```

### Run Development Server

```bash
npm run dev:server
```

Server runs on `http://localhost:4001`

### Run Orchestrator CLI

**Phase 4+ Commands:**

```bash
# Initialize project plan with AI planner
npm run orchestrate -- --project demo --init-plan

# Run full orchestration cycle (Phase 4+) - RECOMMENDED
# Automatically: plans (if needed) → executes → assesses → health checks
npm run orchestrate -- --project demo --cycle

# Run planner health check (Phase 5)
# Runs hallucination tests and displays health status
npm run orchestrate -- --project demo --health-check

# Refresh RAG memory with current project state (Phase 6)
npm run orchestrate -- --project demo --rag-refresh

# Run UI tests via Skyvern (Phase 7)
# Executes end-to-end browser tests and displays results
npm run orchestrate -- --project demo --ui-test

# Get next phase instruction and execute (Phase 3)
# - If CLAUDE_CODE_COMMAND_TEMPLATE is set: Plans and executes via Claude Code CLI
# - If not set: Plan-only mode (generates instruction but doesn't execute)
npm run orchestrate -- --project demo --next-phase

# Basic project start (Phase 1 mode - no planner/coder)
npm run orchestrate -- --project demo
```

**Orchestration Cycle Workflow (Phase 4+):**

The `--cycle` command runs a complete orchestration cycle:

1. **Plan Check**: Ensures project plan exists (runs `--init-plan` if needed)
2. **Phase Execution**: Runs next pending phase
   - Gets instruction from AI planner
   - Executes with Claude Code CLI (if configured)
   - Tracks attempts and execution history
3. **Assessment**: AI reviews execution results
   - `ok`: Phase completed successfully, proceed to next
   - `needs_fix`: Minor issues, may need retry
   - `stuck`: Major issues, may need different approach
   - `human_input`: Cannot proceed without human decision
4. **Health Check**: Runs planner health monitor with hallucination tests (Phase 5+)
5. **UI Tests**: Runs end-to-end browser tests via Skyvern (Phase 7+)
6. **Status Determination**:
   - `done`: All phases complete
   - `blocked`: Requires human intervention (assessment stuck, health failing, or UI tests failed)
   - Otherwise: Ready for next cycle

**Plan-only Mode vs Execution Mode:**

- **Plan-only mode**: When `CLAUDE_CODE_COMMAND_TEMPLATE` is empty
  - Generates phase instructions using OpenAI planner
  - Displays instructions but doesn't execute them
  - Safe for testing planner output

- **Execution mode**: When `CLAUDE_CODE_COMMAND_TEMPLATE` is configured
  - Generates phase instructions using OpenAI planner
  - Writes instruction to plan file in `state/phase-instructions/`
  - Executes via Claude Code CLI with configured template
  - Captures results (stdout/stderr, exit codes, timing)

**SMS Notifications (Phase 4.5):**

Appula can send SMS alerts when orchestration cycles are blocked and require human intervention.

- **Configuration**: Set Twilio environment variables in `.env`:
  ```bash
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_FROM_NUMBER=+15555555555
  NOTIFY_SMS_TO=+15555555555
  ```

- **Behavior**: When `--cycle` results in `blocked=true`, an SMS is automatically sent with:
  - Project ID and phase number
  - Planner status (ok, needs_fix, stuck, human_input)
  - Execution status
  - Health check results
  - Assessment notes (truncated to 160 characters)

- **Graceful fallback**: If Twilio credentials are not configured, notifications are disabled and the CLI will show:
  ```
  🔕 SMS notifications disabled (Twilio env not configured)
  ```

Example workflow:
```bash
# Run orchestration with SMS notifications enabled
npm run orchestrate -- --project demo --cycle

# If project becomes blocked (e.g., planner returns "human_input"):
# → SMS is sent to NOTIFY_SMS_TO
# → Console shows: "⚠️  Orchestration blocked. Human input or intervention required."
```

**Planner Health Monitoring (Phase 5):**

Appula continuously monitors planner health through automated hallucination tests.

- **Health Tests**: Three lightweight probe tests run against the planner model:
  - **Math Sanity**: Basic arithmetic consistency (17 × 12 = ?)
  - **Code Reasoning**: JavaScript knowledge verification (Array.map behavior)
  - **Instruction Following**: Strict instruction adherence (respond with "OK" only)

- **Health Scoring**:
  - Each test produces a 0–1 score (pass/fail)
  - Overall score is averaged across all tests
  - Status determined by score:
    - `ok`: score ≥ 0.85 → suggested action: `continue`
    - `degraded`: 0.60 ≤ score < 0.85 → suggested action: `pause`
    - `failing`: score < 0.60 → suggested action: `require_human`

- **Integration**:
  - Health checks run automatically during `--cycle` orchestration
  - Results stored in PSO as `lastHealthCheck`
  - Failed health checks can block orchestration and trigger SMS notifications
  - Manual health checks available via `--health-check` command

- **Configuration**:
  - Requires `OPENAI_API_KEY` and `OPENAI_PLANNER_MODEL` in `.env`
  - Automatically enabled when OpenAI is configured
  - Falls back to NoopHealthMonitor if not configured

Example usage:
```bash
# Run manual health check
npm run orchestrate -- --project demo --health-check

# Output includes:
# - Model ID and overall status
# - Individual test results with scores
# - Suggested action (continue/pause/require_human)
# - Results saved to PSO for history tracking

# Health checks also run automatically during orchestration cycles
npm run orchestrate -- --project demo --cycle
# → If health score < 0.85, cycle may be blocked
# → SMS notification sent if Twilio configured
```

**RAG Memory System (Phase 6):**

Appula features a Retrieval-Augmented Generation (RAG) system for long-term project memory.

- **Memory Indexing**: Automatically indexes project state, logs, and configuration into RAG
- **Context Retrieval**: Planner retrieves relevant historical context when planning phases
- **Gemini Integration**: Optional Gemini File Search backend for vector storage
- **Graceful Fallback**: NullRagClient used when Gemini not configured
- **Never Forgets**: RAG ensures planner has access to entire project history

- **Configuration**: Set Gemini environment variables in `.env`:
  ```bash
  GEMINI_API_KEY=your_gemini_api_key_here
  GEMINI_RAG_ENDPOINT=https://your-gemini-rag-endpoint.com
  GEMINI_RAG_DATASTORE_ID=your_datastore_id_here
  ```

- **Behavior**:
  - When RAG is configured, planner automatically retrieves historical context
  - Memory snippets injected into planning prompts as system messages
  - `--rag-refresh` manually indexes current project snapshot
  - Orchestration cycles can auto-index after successful phases

Example usage:
```bash
# Manually refresh RAG memory with current project state
npm run orchestrate -- --project demo --rag-refresh

# Output includes:
# - Project name and status
# - Number of documents indexed (PSO, logs, config)
# - RAG type (Gemini or Null)

# Planner uses RAG automatically during planning
npm run orchestrate -- --project demo --cycle
# → Planner retrieves top-5 relevant historical snippets
# → Context injected into planning prompts
# → "Never forgets" older project decisions and patterns
```

**Baton Handoff Hooks (Phase 6):**

Foundation for future multi-model coordination and intelligent model switching.

- **Health Recording**: PlannerModelPool records health snapshots after each health check
- **Automatic Marking**: Planner marked as unhealthy when health score < 0.60 (failing status)
- **Diagnostics API**: `getDiagnostics()` provides health history and backup planner count
- **Future Handoff**: Hooks ready for automatic model switching based on health scores
- **Multi-Model Prep**: Foundation for Phase 8 committee voting and model selection

Current behavior:
- Health snapshots recorded in planner pool
- Unhealthy planners logged with warnings
- No automatic switching yet (planned for future phases)
- Backup planners can be added via `addBackupPlanner()`

**UI Testing with Skyvern (Phase 7):**

Appula integrates Skyvern for automated end-to-end UI testing.

- **Test Execution**: UITestOrchestrator coordinates browser-based tests via SkyvernClient
- **Test Types**: Hardcoded smoke tests (homepage load, navigation) in Phase 7
- **Future Tests**: Load from project-specific `.appula/ui-tests.json` configuration
- **Automatic Testing**: UI tests run after each orchestration cycle (post-health check)
- **Manual Testing**: Run tests on-demand via `--ui-test` CLI command
- **Result Tracking**: Test results stored in PSO with detailed status and timing

- **Configuration**: Set Skyvern environment variables in `.env`:
  ```bash
  SKYVERN_API_KEY=your_skyvern_api_key_here
  SKYVERN_BASE_URL=https://api.skyvern.ai
  SKYVERN_DEFAULT_APP_URL=http://localhost:3000
  ```

- **Test Statuses**:
  - `passed`: Test completed successfully
  - `failed`: Test failed (blocks orchestration, triggers SMS)
  - `skipped`: Test skipped (Phase 7 simulated mode)
  - `not_configured`: Skyvern API key not set

- **Behavior**:
  - When Skyvern configured: Tests run against configured app URL
  - When not configured: Tests marked as `not_configured`, orchestration continues
  - Failed tests block orchestration and send SMS notifications
  - Test results include execution time, status, and optional evidence URLs

- **Graceful Degradation**: Without Skyvern API key, UI tests are safely skipped

Example usage:
```bash
# Run manual UI tests
npm run orchestrate -- --project demo --ui-test

# Output includes:
# - Project name and phase number
# - Overall test status (passed/failed/skipped/not_configured)
# - Individual test results with details
# - Test execution summary

# UI tests run automatically during orchestration cycles
npm run orchestrate -- --project demo --cycle
# → After health checks, UI tests execute automatically
# → If any test fails, cycle is blocked
# → SMS notification sent if Twilio configured
```

## API Endpoints

- `GET /health` - Health check
- `GET /version` - Service version

## Development

### Type Checking

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## Implementation Status

### ✅ Phase 1: Project Skeleton
- Project structure created
- TypeScript configuration
- Core types and interfaces defined
- Stub implementations
- Express server with basic endpoints
- CLI entrypoint

### ✅ Phase 2: OpenAI Planner
- OpenAI GPT integration
- Project phase planning
- Next-phase instruction generation
- Planner model pool with failover
- Enhanced CLI with `--init-plan` and `--next-phase`

### ✅ Phase 3: Claude Code CLI Executor
- ClaudeCodeCliExecutor implementation with CoderExecutor interface
- Config-driven command templates (no hard-coded CLI flags)
- Plan file generation in `state/phase-instructions/`
- Child process execution with timeout handling
- Structured result capture (PhaseExecutionResult)
- Status categorization: success, failed, timeout, cli_error
- PhaseRunner integration with optional coder execution
- Graceful fallback to plan-only mode

### ✅ Phase 4: Orchestration & Assessment
- Orchestrator service for full cycle management
- PhaseRunner enhanced to return PhaseRunOutcome
- AI-powered assessment via OpenAIPlanner.assessPhaseResult
- OrchestrationHealthMonitor interface with NoopHealthMonitor
- PSO extended with executionHistory, lastAssessment, lastHealthCheck
- PhaseExecutionSummary and PhaseAssessmentSummary types
- CLI `--cycle` command for single orchestration cycles
- Done/blocked status determination
- Health check hooks for future hallucination tests

### ✅ Phase 4.5: Notification Hooks & SMS Alerts
- NotificationService interface abstraction
- TwilioNotificationService implementation for SMS alerts
- NoopNotificationService as default (graceful fallback)
- Automatic SMS notifications when orchestration cycles are blocked
- Configurable via Twilio environment variables
- SMS includes project status, planner assessment, and execution results
- CLI shows notification status on startup

### ✅ Phase 5: Hallucination Tests & Advanced Health Monitor
- PlannerHealthTester with three probe tests (math, code reasoning, instruction following)
- PlannerHealthSnapshot type with scores, status, and test details
- PlannerHealthMonitor implementation using PlannerHealthTester
- Health checks integrated into orchestration cycle
- HealthCheckResult extended with plannerHealth field
- Health-based blocking (pause/require_human suggestions)
- Manual health check via `--health-check` CLI command
- Health results stored in PSO (lastHealthCheck field)
- Quality scoring: ok (≥0.85), degraded (≥0.60), failing (<0.60)
- Suggested actions: continue, pause, switch_model, require_human
- Foundation for future model handoff and multi-model committee logic

### ✅ Phase 6: RAG Memory & Baton Handoff Hooks
- RagClient interface with RagDocument, RagSearchParams, RagSearchResult types
- NullRagClient for graceful fallback when RAG not configured
- GeminiFileSearchClient with proper env configuration and error handling
- MemoryManager for project-level RAG (indexes PSO, logs, config)
- OpenAIPlanner enhanced with RAG-aware context retrieval
- Memory snippets automatically injected into planning prompts
- CLI wiring: RAG client initialization with Gemini or Null fallback
- Manual `--rag-refresh` command to index current project snapshot
- PlannerModelPool extended with recordHealthSnapshot() and getDiagnostics()
- Orchestrator records health snapshots and marks planner unhealthy when failing
- Health-based hooks ready for future baton handoff and model switching
- Foundation for multi-model committee and intelligent model selection

### ✅ Phase 7: Skyvern UI Testing & Robot User QA
- UITestOrchestrator for coordinating UI test execution
- SkyvernClient with safe, env-gated configuration (requires SKYVERN_API_KEY)
- UI test types: UiTestCase, UiTestResult, UiTestRunSummary, UiTestStatus
- ProjectStateObject extended with lastUiTestRun field
- Orchestrator integration: UI tests run after health checks in orchestration cycle
- OrchestrationResult extended with uiTestStatus and uiTestSummary fields
- Failed UI tests block orchestration (blocked=true)
- SMS notifications include UI test failure details
- Manual `--ui-test` command for on-demand UI testing
- Graceful degradation: Tests marked as "not_configured" when Skyvern not set
- Hardcoded smoke tests (homepage load, navigation) ready for future customization
- Foundation for automated regression testing and continuous UI validation

### Next Phases

- **Phase 8**: Multi-model committee/voting logic (CommitteeEngine) with baton handoff
- **Phase 9**: Multi-project orchestration and advanced error recovery
- **Phase 10**: Real Gemini RAG integration with actual HTTP calls
- **Phase 11**: Real Skyvern HTTP integration with actual browser automation

## License

MIT
