import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config/env';

export interface LogEntry {
  timestamp: string;
  projectId: string;
  phase?: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

export class LogRepo {
  private logsDir: string;

  constructor(logsDir?: string) {
    this.logsDir = logsDir || config.logsDir;
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.logsDir, { recursive: true });
  }

  private getLogPath(projectId: string): string {
    return path.join(this.logsDir, `${projectId}.log`);
  }

  async append(entry: LogEntry): Promise<void> {
    await this.ensureDir();
    const logPath = this.getLogPath(entry.projectId);
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, logLine, 'utf-8');
  }

  async appendMany(entries: LogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    await this.ensureDir();
    const projectId = entries[0].projectId;
    const logPath = this.getLogPath(projectId);
    const logLines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.appendFile(logPath, logLines, 'utf-8');
  }

  async read(projectId: string): Promise<LogEntry[]> {
    await this.ensureDir();
    const logPath = this.getLogPath(projectId);

    try {
      const data = await fs.readFile(logPath, 'utf-8');
      const lines = data.trim().split('\n').filter(line => line.length > 0);
      return lines.map(line => JSON.parse(line) as LogEntry);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async readRecent(projectId: string, limit: number = 100): Promise<LogEntry[]> {
    const allLogs = await this.read(projectId);
    return allLogs.slice(-limit);
  }

  async clear(projectId: string): Promise<void> {
    await this.ensureDir();
    const logPath = this.getLogPath(projectId);
    try {
      await fs.unlink(logPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  createLogEntry(
    projectId: string,
    level: LogEntry['level'],
    message: string,
    metadata?: Record<string, unknown>,
    phase?: number
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      projectId,
      phase,
      level,
      message,
      metadata,
    };
  }
}
