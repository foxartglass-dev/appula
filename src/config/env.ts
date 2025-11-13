import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface AppConfig {
  port: number;
  openaiApiKey: string;
  openaiBaseUrl?: string;
  openaiPlannerModel: string;
  claudeApiKey: string;
  geminiApiKey: string;
  skyvernApiKey: string;
  projectsDir: string;
  stateDir: string;
  logsDir: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '4001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openaiPlannerModel: process.env.OPENAI_PLANNER_MODEL || 'gpt-4',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  skyvernApiKey: process.env.SKYVERN_API_KEY || '',
  projectsDir: process.env.PROJECTS_DIR || './projects',
  stateDir: process.env.STATE_DIR || './state',
  logsDir: process.env.LOGS_DIR || './state/logs',
};

export function validateConfig(requireOpenAI: boolean = false): void {
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid PORT configuration');
  }

  // Phase 2: Validate OpenAI configuration when needed
  if (requireOpenAI) {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for planner operations');
    }
    if (!config.openaiPlannerModel) {
      throw new Error('OPENAI_PLANNER_MODEL is required');
    }
  }
}
