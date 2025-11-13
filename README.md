# Appula

AI orchestration system combining multiple AI agents for software development automation.

## Architecture

- **ChatGPT 5.1 Thinking** - Planner / Reviewer
- **Claude Code CLI** - Coder / Executor
- **Gemini File Search (RAG)** - Long-term memory (future)
- **Skyvern** - UI testing agent (future)

## Phase 1: Project Skeleton

This phase establishes the TypeScript foundation with:
- Clean folder structure
- Strict TypeScript configuration
- Core interfaces and types
- Minimal Express HTTP server
- Stub implementations (no actual AI calls)

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

### Run Development Server

```bash
npm run dev:server
```

Server runs on `http://localhost:4001`

### Run Orchestrator CLI

```bash
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

## Phase 1 Status

✅ Project structure created
✅ TypeScript configuration
✅ Core types and interfaces defined
✅ Stub implementations (no actual AI calls)
✅ Express server with basic endpoints
✅ CLI entrypoint

## Next Phases

- **Phase 2**: Implement OpenAI planner integration
- **Phase 3**: Add Claude Code CLI executor
- **Phase 4**: Implement orchestration loop
- **Phase 5**: Add RAG (Gemini File Search)
- **Phase 6**: Integrate Skyvern for UI testing

## License

MIT
