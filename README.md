# Appula

AI orchestration system combining multiple AI agents for software development automation.

## Architecture

- **ChatGPT 5.1 Thinking** - Planner / Reviewer
- **Claude Code CLI** - Coder / Executor
- **Gemini File Search (RAG)** - Long-term memory (future)
- **Skyvern** - UI testing agent (future)

## Current Status: Phase 3

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

**Phase 3 Commands:**

```bash
# Initialize project plan with AI planner
npm run orchestrate -- --project demo --init-plan

# Get next phase instruction and execute (Phase 3)
# - If CLAUDE_CODE_COMMAND_TEMPLATE is set: Plans and executes via Claude Code CLI
# - If not set: Plan-only mode (generates instruction but doesn't execute)
npm run orchestrate -- --project demo --next-phase

# Basic project start (Phase 1 mode - no planner/coder)
npm run orchestrate -- --project demo
```

**Plan-only Mode vs Execution Mode:**

- **Plan-only mode**: Set when `CLAUDE_CODE_COMMAND_TEMPLATE` is empty
  - Generates phase instructions using OpenAI planner
  - Displays instructions but doesn't execute them
  - Safe for testing planner output

- **Execution mode**: Set when `CLAUDE_CODE_COMMAND_TEMPLATE` is configured
  - Generates phase instructions using OpenAI planner
  - Writes instruction to plan file in `state/phase-instructions/`
  - Executes via Claude Code CLI with configured template
  - Captures results (stdout/stderr, exit codes, timing)

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

### Next Phases

- **Phase 4**: Implement full orchestration loop (planner → coder → assess → iterate)
- **Phase 5**: Add RAG (Gemini File Search for long-term memory)
- **Phase 6**: Integrate Skyvern for UI testing
- **Phase 7**: Multi-project orchestration and advanced error recovery

## License

MIT
