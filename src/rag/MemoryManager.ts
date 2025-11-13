import {
  RagClient,
  RagDocument,
  RagSearchParams,
  RagSearchResult,
} from "./RagClient";
import { ProjectConfig, ProjectStateObject } from "../orchestrator/types";
import { LogRepo } from "../storage/LogRepo";
import { PsoRepo } from "../storage/PsoRepo";

/**
 * Phase 6: MemoryManager for project-level RAG
 * Sits between orchestrator and RagClient, knows what to store and retrieve
 */
export class MemoryManager {
  constructor(
    private readonly rag: RagClient,
    private readonly psoRepo: PsoRepo,
    private readonly logRepo: LogRepo,
  ) {}

  /**
   * Index a project snapshot (PSO + logs) into RAG
   */
  async indexProjectSnapshot(config: ProjectConfig, pso: ProjectStateObject): Promise<void> {
    const docs: RagDocument[] = [];
    const now = new Date().toISOString();

    // 1) Index PSO snapshot
    docs.push({
      id: `${config.id}-pso-${now}`,
      projectId: config.id,
      kind: "pso",
      title: `PSO snapshot for ${config.name} at ${now}`,
      content: JSON.stringify(pso, null, 2),
      createdAt: now,
      updatedAt: now,
    });

    // 2) Index recent logs (trimmed to avoid huge payloads)
    try {
      const recentLogs = await this.logRepo.readRecent(config.id, 100);
      if (recentLogs.length > 0) {
        const logContent = recentLogs.map(log =>
          `[${log.timestamp}] [${log.level}] ${log.message}`
        ).join('\n');

        docs.push({
          id: `${config.id}-logs-${now}`,
          projectId: config.id,
          kind: "log",
          title: `Recent logs for ${config.name}`,
          content: logContent,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (err) {
      console.warn(`[MemoryManager] Failed to read logs for ${config.id}:`, err);
      // Continue without logs - not critical
    }

    // 3) Index project config/metadata
    docs.push({
      id: `${config.id}-config-${now}`,
      projectId: config.id,
      kind: "spec",
      title: `Project configuration for ${config.name}`,
      content: JSON.stringify({
        name: config.name,
        description: config.description,
        repoPath: config.repoPath,
        plannerModel: config.plannerModel,
        coderMode: config.coderMode,
      }, null, 2),
      createdAt: now,
      updatedAt: now,
    });

    // Index all documents
    await this.rag.indexDocuments(docs);
  }

  /**
   * Search for relevant project context
   */
  async searchProjectContext(
    projectId: string,
    query: string,
    topK: number = 5,
  ): Promise<RagSearchResult[]> {
    const params: RagSearchParams = {
      projectId,
      query,
      topK,
    };
    return this.rag.search(params);
  }

  /**
   * Build memory text block from search results for prompt injection
   */
  buildMemoryTextBlock(results: RagSearchResult[]): string | null {
    if (results.length === 0) {
      return null;
    }

    const sections = results.map((r, idx) => {
      return `[${idx + 1}] ${r.title}\n${r.snippet}`;
    }).join('\n\n');

    return `=== HISTORICAL CONTEXT FROM PROJECT MEMORY ===\n\n${sections}\n\n=== END OF HISTORICAL CONTEXT ===`;
  }
}
