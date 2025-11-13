import { ProjectStateObject } from '../orchestrator/types';

/**
 * Interface for RAG (Retrieval-Augmented Generation) clients
 */
export interface RagClient {
  /**
   * Update the knowledge base with current project state
   */
  updateProjectKnowledge(projectId: string, pso: ProjectStateObject): Promise<void>;

  /**
   * Retrieve relevant context for a query
   */
  retrieveContext(projectId: string, query: string): Promise<string[]>;
}
