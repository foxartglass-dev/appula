import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface AppConfig {
  port: number;
  openaiApiKey: string;
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
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  skyvernApiKey: process.env.SKYVERN_API_KEY || '',
  projectsDir: process.env.PROJECTS_DIR || './projects',
  stateDir: process.env.STATE_DIR || './state',
  logsDir: process.env.LOGS_DIR || './state/logs',
};

export function validateConfig(): void {
  // For Phase 1, we don't require API keys
  // This validation will be expanded in future phases
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid PORT configuration');
  }
}
