import { OrchestrationResult } from '../orchestrator/Orchestrator';
import { config } from '../config/env';

/**
 * Phase 4.5: Interface for notification services
 */
export interface NotificationService {
  notifyHumanNeeded(result: OrchestrationResult): Promise<void>;
}

/**
 * Phase 4.5: No-op notification service (default)
 * Does nothing when human intervention is needed
 */
export class NoopNotificationService implements NotificationService {
  async notifyHumanNeeded(_result: OrchestrationResult): Promise<void> {
    // intentionally does nothing
  }
}

/**
 * Phase 4.5: Twilio SMS notification service
 * Sends SMS alerts when orchestration cycles are blocked
 */
export class TwilioNotificationService implements NotificationService {
  private client: any;

  constructor() {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      throw new Error('TwilioNotificationService initialized without Twilio credentials');
    }

    // Lazy require to avoid forcing Twilio when not used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
  }

  async notifyHumanNeeded(result: OrchestrationResult): Promise<void> {
    if (!config.twilioFromNumber || !config.notifySmsTo) {
      return;
    }

    const lines: string[] = [
      'Appula needs your attention 🚨',
      `Project: ${result.projectId}`,
      `Phase: ${result.phaseNumber ?? 'none'}`,
      `Planner: ${result.plannerStatus ?? 'n/a'}`,
      `Execution: ${result.executionStatus ?? 'n/a'}`,
      `Done: ${result.done}`,
      `Blocked: ${result.blocked}`,
    ];

    // Phase 7: Include UI test status if available
    if (result.uiTestStatus) {
      lines.push(`UI Tests: ${result.uiTestStatus}`);
      if (result.uiTestSummary && result.uiTestStatus === 'failed') {
        const failedCount = result.uiTestSummary.results.filter(r => r.status === 'failed').length;
        lines.push(`Failed: ${failedCount}/${result.uiTestSummary.results.length} test(s)`);
      }
    }

    if (result.notes) {
      lines.push(`Notes: ${result.notes.slice(0, 160)}`);
    }

    const body = lines.join('\n');

    try {
      await this.client.messages.create({
        from: config.twilioFromNumber,
        to: config.notifySmsTo,
        body,
      });
    } catch (err) {
      // Do not crash the orchestrator if SMS fails; just log
      console.error('Failed to send Twilio SMS notification:', err);
    }
  }
}
