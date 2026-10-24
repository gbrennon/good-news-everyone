import type { ScheduledTask } from "../contracts";
import type { ReminderResend } from "./reminder_resend";

/**
 * Track one scheduled notification resend.
 */
export interface PendingReminder {
  readonly resend: ReminderResend;
  remindersSent: number;
  task: ScheduledTask;
}
