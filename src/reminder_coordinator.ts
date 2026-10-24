import type { ScheduledTask, Scheduler } from "./contracts";

export type ReminderResend = () => Promise<void>;

interface PendingReminder {
  readonly resend: ReminderResend;
  remindersSent: number;
  task: ScheduledTask;
}

const DEFAULT_INTERVAL_MS = 120_000;
const DEFAULT_MAX_REMINDERS = 3;

/**
 * Re-send unhandled notifications until the user acts on them.
 *
 * Arms a per-workspace reminder when a notification needs a response and
 * re-dispatches it on a fixed interval up to a bounded number of times.
 * Cancelling a workspace reminder marks the notification as handled.
 */
export class ReminderCoordinator {
  private readonly scheduler: Scheduler;
  private readonly intervalMs: number;
  private readonly maxReminders: number;
  private readonly pendingByWorkspace: Record<string, PendingReminder>;

  public constructor(
    scheduler: Scheduler,
    intervalMs: number = DEFAULT_INTERVAL_MS,
    maxReminders: number = DEFAULT_MAX_REMINDERS,
  ) {
    this.scheduler = scheduler;
    this.intervalMs = intervalMs;
    this.maxReminders = maxReminders;
    this.pendingByWorkspace = {};
  }

  /**
   * Begin reminding for a workspace, replacing any prior pending reminder.
   */
  public arm(cwd: string, resend: ReminderResend): void {
    if (this.maxReminders < 1 || this.intervalMs <= 0) {
      return;
    }
    this.cancel(cwd);
    const reminder: PendingReminder = {
      resend,
      remindersSent: 0,
      task: this.scheduleNext(cwd),
    };
    this.pendingByWorkspace[cwd] = reminder;
  }

  /**
   * Stop reminding for a workspace because its notification was handled.
   */
  public cancel(cwd: string): void {
    const reminder = this.pendingByWorkspace[cwd];
    if (!reminder) {
      return;
    }
    reminder.task.cancel();
    delete this.pendingByWorkspace[cwd];
  }

  /**
   * Stop reminding for every tracked workspace.
   */
  public cancelAll(): void {
    for (const cwd of Object.keys(this.pendingByWorkspace)) {
      this.cancel(cwd);
    }
  }

  private scheduleNext(cwd: string): ScheduledTask {
    return this.scheduler.schedule((): void => {
      void this.fire(cwd);
    }, this.intervalMs);
  }

  private async fire(cwd: string): Promise<void> {
    const reminder = this.pendingByWorkspace[cwd];
    if (!reminder) {
      return;
    }
    reminder.remindersSent += 1;
    await reminder.resend();
    if (reminder.remindersSent < this.maxReminders) {
      reminder.task = this.scheduleNext(cwd);
      return;
    }
    delete this.pendingByWorkspace[cwd];
  }
}
