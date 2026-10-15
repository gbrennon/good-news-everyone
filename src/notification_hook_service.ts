import type {
  AgentOutcome,
  HookApi,
  HookEventContext,
  NotificationEvent,
  SettleEvent,
} from "./contracts";

interface NotificationTemplate {
  readonly kind: NotificationEvent;
  readonly message: string;
}

const NOTIFICATION_BY_OUTCOME: Readonly<Record<AgentOutcome, NotificationTemplate>> = {
  completed: { kind: "complete", message: "task complete" },
  aborted: { kind: "error", message: "task failed" },
  error: { kind: "error", message: "task failed" },
};

/**
 * Dispatch desktop lifecycle notifications for the Pi coding agent.
 *
 * Tracks the latest turn outcome per workspace directory and invokes
 * agent-notify on prompt questions and agent settlement.
 */
export class NotificationHookService {
  private readonly agentName: string;
  private readonly outcomesByWorkspace: Record<string, AgentOutcome>;

  public constructor(agentName: string = "pi") {
    this.agentName = agentName;
    this.outcomesByWorkspace = {};
  }

  /**
   * Notify the user when Pi starts waiting for interactive input.
   */
  public async handlePromptStart(
    api: HookApi,
    ctx: HookEventContext,
  ): Promise<void> {
    await this.sendNotification(api, "question", ctx.cwd, "input needed");
  }

  /**
   * Reset the recorded outcome for the workspace when a new agent turn starts.
   */
  public handleAgentStart(ctx: HookEventContext): void {
    const outcomes = this.outcomesByWorkspace;
    outcomes[ctx.cwd] = "completed";
  }

  /**
   * Record the outcome reported immediately before the agent settles.
   */
  public handleBeforeSettle(event: SettleEvent, ctx: HookEventContext): void {
    const outcomes = this.outcomesByWorkspace;
    outcomes[ctx.cwd] = event.outcome || "completed";
  }

  /**
   * Emit a completion or error desktop notification when the agent settles.
   */
  public async handleAgentSettled(
    api: HookApi,
    event: SettleEvent,
    ctx: HookEventContext,
  ): Promise<void> {
    const outcome = event.aborted
      ? "aborted"
      : event.outcome || this.outcomesByWorkspace[ctx.cwd] || "completed";
    const template = NOTIFICATION_BY_OUTCOME[outcome];
    await this.sendNotification(api, template.kind, ctx.cwd, template.message);
  }

  private async sendNotification(
    api: HookApi,
    event: NotificationEvent,
    cwd: string,
    message: string,
  ): Promise<void> {
    const context = await this.readTmuxContext(api, cwd);
    const contextualMessage = `${message} [${context}]`;

    try {
      await api.exec(
        "agent-notify",
        [this.agentName, event, "--cwd", cwd, "--message", contextualMessage],
        { cwd },
      );
    } catch {
      return;
    }
  }

  private async readTmuxContext(api: HookApi, cwd: string): Promise<string> {
    try {
      const result = await api.exec(
        "tmux",
        [
          "display-message",
          "-p",
          "session=#{session_name} window=#{window_index}:#{window_name} id=#{window_id}",
        ],
        { cwd },
      );
      const context = result.stdout.trim();
      return result.code === 0 && context.length > 0
        ? context
        : "session=unavailable window=unavailable id=unavailable";
    } catch {
      return "session=unavailable window=unavailable id=unavailable";
    }
  }
}
