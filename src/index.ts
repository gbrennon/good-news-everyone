import { NotificationHookService } from "./notification_hook_service";
import {
  type AgentLifecycle,
  NotificationHooksExtension,
} from "./notification_hooks_extension";
import { ReminderCoordinator } from "./reminder_coordinator";
import { SystemScheduler } from "./system_scheduler";

export type {
  AgentOutcome,
  HookApi,
  HookEventContext,
  HookExecOptions,
  HookExecutionResult,
  NotificationEvent,
  ScheduledTask,
  Scheduler,
  SettleEvent,
} from "./contracts";

export type { AgentLifecycle };

export {
  NotificationHookService,
  NotificationHooksExtension,
  ReminderCoordinator,
  SystemScheduler,
};

function lifecycleForAgent(agent: string): AgentLifecycle {
  return agent === "omp" ? "end" : "settled";
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const reminderCoordinator = new ReminderCoordinator(
  new SystemScheduler(),
  readPositiveInteger(process.env.PI_NOTIFY_REMINDER_INTERVAL_MS, 120_000),
  readPositiveInteger(process.env.PI_NOTIFY_MAX_REMINDERS, 3),
);

const agentName = process.env.PI_HOOK_AGENT ?? "pi";

const defaultExtension = new NotificationHooksExtension(
  new NotificationHookService(agentName, reminderCoordinator),
  lifecycleForAgent(agentName),
);

export default defaultExtension.register.bind(defaultExtension);
