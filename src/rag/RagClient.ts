import { ProjectStateObject } from '../orchestrator/types';

/**
 * Phase 6: Document type for RAG indexing
 */
export interface RagDocument {
  id: string;              // logical ID (project-phase, PSO snapshot, etc.)
  projectId: string;
  kind: "spec" | "pso" | "log" | "design" | "other";
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 6: Search parameters for RAG queries
 */
export interface RagSearchParams {
  projectId: string;
  query: string;
  topK?: number;
}

/**
 * Phase 6: Search result from RAG
 */
export interface RagSearchResult {
  documentId: string;
  score: number;
  title: string;
  snippet: string;
}

/**
 * Interface for RAG (Retrieval-Augmented Generation) clients
 * Phase 6: Normalized interface with document-based indexing and search
 */
export interface RagClient {
  /**
   * Index documents into the RAG system
   */
  indexDocuments(docs: RagDocument[]): Promise<void>;

  /**
   * Search for relevant context based on query
   */
  search(params: RagSearchParams): Promise<RagSearchResult[]>;

  /**
   * Legacy: Update project knowledge (maps to indexDocuments)
   * @deprecated Use indexDocuments instead
   */
  updateProjectKnowledge?(projectId: string, pso: ProjectStateObject): Promise<void>;

  /**
   * Legacy: Retrieve context (maps to search)
   * @deprecated Use search instead
   */
  retrieveContext?(projectId: string, query: string): Promise<string[]>;
}

/**
 * Phase 6: Null/Noop RAG client for graceful fallback
 * Used when RAG is not configured or unavailable
 */
export class NullRagClient implements RagClient {
  async indexDocuments(_docs: RagDocument[]): Promise<void> {
    // no-op - graceful degradation
  }

  async search(_params: RagSearchParams): Promise<RagSearchResult[]> {
    return [];
  }
}
