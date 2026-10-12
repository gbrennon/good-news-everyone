import { NotificationHookService } from "./notification_hook_service";
import { NotificationHooksExtension } from "./notification_hooks_extension";

export type {
  AgentOutcome,
  HookApi,
  HookEventContext,
  HookExecOptions,
  HookExecutionResult,
  NotificationEvent,
  SettleEvent,
} from "./contracts";

export { NotificationHookService, NotificationHooksExtension };

const defaultExtension = new NotificationHooksExtension();

export default defaultExtension.register.bind(defaultExtension);
