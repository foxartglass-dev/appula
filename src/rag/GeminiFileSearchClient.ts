import { RagClient } from './RagClient';
import { ProjectStateObject } from '../orchestrator/types';

/**
 * Gemini File Search implementation of RagClient
 * Phase 1: Stub implementation
 * Future: Will integrate with Google Gemini API for file search
 */
export class GeminiFileSearchClient implements RagClient {
  private _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  async updateProjectKnowledge(_projectId: string, _pso: ProjectStateObject): Promise<void> {
    throw new Error('GeminiFileSearchClient.updateProjectKnowledge not implemented yet (Phase 1 stub)');
  }

  async retrieveContext(_projectId: string, _query: string): Promise<string[]> {
    throw new Error('GeminiFileSearchClient.retrieveContext not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Initialize file corpus for a project
   */
  async initializeCorpus(_projectId: string): Promise<string> {
    throw new Error('GeminiFileSearchClient.initializeCorpus not implemented yet (Phase 1 stub)');
  }

  /**
   * Future: Upload files to corpus
   */
  async uploadFiles(_corpusId: string, _files: string[]): Promise<void> {
    throw new Error('GeminiFileSearchClient.uploadFiles not implemented yet (Phase 1 stub)');
  }
}
