# Appula

AI orchestration system combining multiple AI agents for software development automation.

## Architecture

- **ChatGPT 5.1 Thinking** - Planner / Reviewer
- **Claude Code CLI** - Coder / Executor
- **Gemini File Search (RAG)** - Long-term memory (future)
- **Skyvern** - UI testing agent (future)

## Current Status: Phase 2

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

Edit `.env` and add your OpenAI API key:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_PLANNER_MODEL=gpt-4  # or gpt-4-turbo, gpt-3.5-turbo
```

### Run Development Server

```bash
npm run dev:server
```

Server runs on `http://localhost:4001`

### Run Orchestrator CLI

**Phase 2 Commands:**

```bash
# Initialize project plan with AI
npm run orchestrate -- --project demo --init-plan

# Get next phase instruction
npm run orchestrate -- --project demo --next-phase

# Basic project start (Phase 1 mode)
npm run orchestrate -- --project demo
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

### Next Phases

- **Phase 3**: Add Claude Code CLI executor (coder integration)
- **Phase 4**: Implement orchestration loop (planner → coder → assess)
- **Phase 5**: Add RAG (Gemini File Search for long-term memory)
- **Phase 6**: Integrate Skyvern for UI testing

## License

MIT
