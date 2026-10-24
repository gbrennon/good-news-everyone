import type { HookApi, HookEventContext, SettleEvent } from "./contracts";
import { NotificationHookService } from "./notification_hook_service";

export type AgentLifecycle = "settled" | "end";

/**
 * Register the native TypeScript notification hook on the Pi HookApi.
 *
 * Binds lifecycle desktop notifications dispatched through agent-notify to the
 * Pi extension runtime. The lifecycle selects which event marks the terminal
 * run: pi settles on agent_settled, while omp treats agent_end as terminal
 * because it does not emit agent_settled, agent_before_settle, or
 * ui_prompt_start.
 */
export class NotificationHooksExtension {
  private readonly notificationService: NotificationHookService;
  private readonly lifecycle: AgentLifecycle;

  public constructor(
    notificationService?: NotificationHookService,
    lifecycle: AgentLifecycle = "settled",
  ) {
    this.notificationService = notificationService ?? new NotificationHookService("pi");
    this.lifecycle = lifecycle;
  }

  /**
   * Register all notification lifecycle listeners on the provided API instance.
   */
  public register(api: HookApi): void {
    api.on("agent_start", (_event: SettleEvent, ctx: HookEventContext) => {
      this.notificationService.handleAgentStart(ctx);
    });
    api.on("session_shutdown", (_event: SettleEvent, _ctx: HookEventContext) => {
      this.notificationService.handleSessionShutdown();
    });
    if (this.lifecycle === "end") {
      this.registerTerminalEnd(api);
      return;
    }
    this.registerSettled(api);
  }

  private registerTerminalEnd(api: HookApi): void {
    api.on("agent_end", (event: SettleEvent, ctx: HookEventContext) => {
      return this.notificationService.handleTerminalEnd(api, event, ctx);
    });
  }

  private registerSettled(api: HookApi): void {
    api.on("ui_prompt_start", (_event: SettleEvent, ctx: HookEventContext) => {
      return this.notificationService.handlePromptStart(api, ctx);
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
  }
}
