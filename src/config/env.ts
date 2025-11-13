import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface AppConfig {
  port: number;
  openaiApiKey: string;
  openaiBaseUrl?: string;
  openaiPlannerModel: string;
  claudeApiKey: string;
  claudeCodeCommandTemplate: string | null;
  claudeCodeTimeoutMs: number;
  claudeCodeWorkingDir: string | null;
  geminiApiKey: string;
  // Phase 6: Gemini RAG configuration
  geminiRagEndpoint: string | null;
  geminiRagDataStoreId: string | null;
  // Phase 7: Skyvern UI testing configuration
  skyvernApiKey: string | null;
  skyvernBaseUrl: string;
  skyvernDefaultAppUrl: string;
  // Phase 8: Committee planner configuration
  committeeEnabled: boolean;
  committeePlannerModels: string[];
  projectsDir: string;
  stateDir: string;
  logsDir: string;
  // Phase 4.5: Twilio SMS notifications
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
  notifySmsTo: string | null;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '4001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openaiPlannerModel: process.env.OPENAI_PLANNER_MODEL || 'gpt-4',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  claudeCodeCommandTemplate: process.env.CLAUDE_CODE_COMMAND_TEMPLATE || null,
  claudeCodeTimeoutMs: parseInt(process.env.CLAUDE_CODE_TIMEOUT_MS || String(30 * 60 * 1000), 10),
  claudeCodeWorkingDir: process.env.CLAUDE_CODE_WORKING_DIR || null,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  // Phase 6: Gemini RAG configuration
  geminiRagEndpoint: process.env.GEMINI_RAG_ENDPOINT || null,
  geminiRagDataStoreId: process.env.GEMINI_RAG_DATASTORE_ID || null,
  // Phase 7: Skyvern UI testing configuration
  skyvernApiKey: process.env.SKYVERN_API_KEY || null,
  skyvernBaseUrl: process.env.SKYVERN_BASE_URL || 'https://api.skyvern.ai',
  skyvernDefaultAppUrl: process.env.SKYVERN_DEFAULT_APP_URL || 'http://localhost:3000',
  // Phase 8: Committee planner configuration
  committeeEnabled: process.env.COMMITTEE_ENABLED === 'true',
  committeePlannerModels: process.env.COMMITTEE_PLANNER_MODELS
    ? process.env.COMMITTEE_PLANNER_MODELS.split(',').map(m => m.trim()).filter(m => m.length > 0)
    : [],
  projectsDir: process.env.PROJECTS_DIR || './projects',
  stateDir: process.env.STATE_DIR || './state',
  logsDir: process.env.LOGS_DIR || './state/logs',
  // Phase 4.5: Twilio SMS notifications
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || null,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || null,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || null,
  notifySmsTo: process.env.NOTIFY_SMS_TO || null,
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
