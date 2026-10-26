import type { HookApi } from "../contracts";
import { NotificationHookService } from "../notification_hook_service";
import { NotificationTaglineSelector } from "../notification_taglines";
import type { AgentLifecycle } from "../notification_hooks_extension";
import { NotificationHooksExtension } from "../notification_hooks_extension";
import { ReminderCoordinator } from "../reminder_coordinator";
import { SystemScheduler } from "../system_scheduler";

/**
 * Compose and expose the production notification extension.
 */
export class DefaultExtension {
  private readonly extension: NotificationHooksExtension;

  public constructor() {
    const agentName = process.env.PI_HOOK_AGENT ?? "pi";
    const reminders = new ReminderCoordinator(
      new SystemScheduler(),
      DefaultExtension.readPositiveInteger(
        process.env.PI_NOTIFY_REMINDER_INTERVAL_MS,
        120_000,
      ),
      DefaultExtension.readPositiveInteger(
        process.env.PI_NOTIFY_MAX_REMINDERS,
        3,
      ),
    );
    this.extension = new NotificationHooksExtension(
      new NotificationHookService(
        agentName,
        reminders,
        new NotificationTaglineSelector(),
      ),
      DefaultExtension.lifecycleForAgent(agentName),
    );
  }

  /**
   * Register the configured notification extension on a hook API.
   */
  public register(api: HookApi): void {
    this.extension.register(api);
  }

  private static lifecycleForAgent(agent: string): AgentLifecycle {
    return agent === "omp" ? "end" : "settled";
  }

  private static readPositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}

const defaultExtension = new DefaultExtension();

export default defaultExtension.register.bind(defaultExtension);
