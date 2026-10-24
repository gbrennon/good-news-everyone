import type { ScheduledTask } from "./scheduled_task";

/**
 * Schedule callbacks for later execution.
 */
export interface Scheduler {
  schedule(callback: () => void, delayMs: number): ScheduledTask;
}
