import type { ScheduledTask, Scheduler } from "./contracts";

/**
 * Scheduler adapter backed by the host runtime timer.
 *
 * Schedules callbacks with setTimeout and unreferences the timer so a
 * pending reminder never keeps the Pi process alive on its own.
 */
export class SystemScheduler implements Scheduler {
  /**
   * Schedule a callback and return a task that can cancel it.
   */
  public schedule(callback: () => void, delayMs: number): ScheduledTask {
    const handle = setTimeout(callback, delayMs);
    handle.unref?.();
    return { cancel: (): void => clearTimeout(handle) };
  }
}
