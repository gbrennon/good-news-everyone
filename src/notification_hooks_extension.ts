import type { HookApi, HookEventContext, SettleEvent } from "./contracts";
import { NotificationHookService } from "./notification_hook_service";

/**
 * Register the native TypeScript notification hook on the Pi HookApi.
 *
 * Binds lifecycle desktop notifications dispatched through agent-notify to the
 * Pi extension runtime.
 */
export class NotificationHooksExtension {
  private readonly notificationService: NotificationHookService;

  public constructor(notificationService?: NotificationHookService) {
    this.notificationService = notificationService ?? new NotificationHookService("pi");
  }

  /**
   * Register all notification lifecycle listeners on the provided API instance.
   */
  public register(api: HookApi): void {
    api.on("ui_prompt_start", (_event: SettleEvent, ctx: HookEventContext) => {
      return this.notificationService.handlePromptStart(api, ctx);
    });
    api.on("agent_start", (_event: SettleEvent, ctx: HookEventContext) => {
      this.notificationService.handleAgentStart(ctx);
    });
    api.on("agent_end", (event: SettleEvent, ctx: HookEventContext) => {
      return this.notificationService.handleAgentEnd(api, event, ctx);
    });
    api.on("agent_before_settle", (event: SettleEvent, ctx: HookEventContext) => {
      this.notificationService.handleBeforeSettle(event, ctx);
    });
    api.on("agent_settled", (event: SettleEvent, ctx: HookEventContext) => {
      return this.notificationService.handleAgentSettled(api, event, ctx);
    });
    api.on("session_shutdown", (_event: SettleEvent, _ctx: HookEventContext) => {
      this.notificationService.handleSessionShutdown();
    });
  }
}
