import type {
  AgentOutcome,
  HookApi,
  HookEventContext,
  NotificationEvent,
  SettleEvent,
  SettleMessage,
} from "./contracts";
import type { ReminderCoordinator } from "./reminder_coordinator";

interface NotificationTemplate {
  readonly kind: NotificationEvent;
  readonly message: string;
}

const NOTIFICATION_BY_OUTCOME: Readonly<Record<AgentOutcome, NotificationTemplate>> = {
  completed: { kind: "complete", message: "task complete" },
  aborted: { kind: "error", message: "task failed" },
  error: { kind: "error", message: "task failed" },
};

const QUESTION_START = /^(what|which|where|when|why|how|who|can|could|would|should|do|does|is|are)\b/i;

/**
 * Dispatch desktop lifecycle notifications for the Pi coding agent.
 *
 * Tracks the latest turn outcome per workspace directory and invokes
 * agent-notify on prompt questions and agent settlement.
 */
export class NotificationHookService {
  private readonly agentName: string;
  private readonly reminders: ReminderCoordinator | undefined;
  private readonly outcomesByWorkspace: Record<string, AgentOutcome>;
  private readonly agentEndNotificationByWorkspace: Record<string, boolean>;

  public constructor(
    agentName: string = "pi",
    reminders?: ReminderCoordinator,
  ) {
    this.agentName = agentName;
    this.reminders = reminders;
    this.outcomesByWorkspace = {};
    this.agentEndNotificationByWorkspace = {};
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
    this.reminders?.cancel(ctx.cwd);
    this.outcomesByWorkspace[ctx.cwd] = "completed";
    this.agentEndNotificationByWorkspace[ctx.cwd] = false;
  }

  /**
   * Cancel every pending reminder when the session shuts down.
   */
  public handleSessionShutdown(): void {
    this.reminders?.cancelAll();
  }

  /**
   * Notify when an agent-end message asks the user for input.
   */
  public async handleAgentEnd(
    api: HookApi,
    event: SettleEvent,
    ctx: HookEventContext,
  ): Promise<void> {
    const notification = this.getAgentEndNotification(event);
    if (!notification) {
      return;
    }
    this.agentEndNotificationByWorkspace[ctx.cwd] = true;
    await this.sendNotification(
      api,
      notification.kind,
      ctx.cwd,
      notification.message,
      notification.kind === "question",
    );
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
    if (this.agentEndNotificationByWorkspace[ctx.cwd]) {
      return;
    }
    const template = this.getSettlementTemplate(event, ctx);
    await this.sendNotification(
      api,
      template.kind,
      ctx.cwd,
      template.message,
      template.kind === "question",
    );
  }

  private getAgentEndNotification(
    event: SettleEvent,
  ): NotificationTemplate | undefined {
    if (this.isAssistantFailure(event)) {
      return { kind: "error", message: "task failed" };
    }
    const question = this.getAssistantQuestion(event);
    return question ? { kind: "question", message: question } : undefined;
  }

  private getSettlementTemplate(
    event: SettleEvent,
    ctx: HookEventContext,
  ): NotificationTemplate {
    const question = this.getAssistantQuestion(event);
    if (question) {
      return { kind: "question", message: question };
    }
    const outcome = event.aborted
      ? "aborted"
      : event.outcome || this.outcomesByWorkspace[ctx.cwd] || "completed";
    return NOTIFICATION_BY_OUTCOME[outcome];
  }

  private getAssistantQuestion(event: SettleEvent): string | undefined {
    const assistantMessage = this.findLatestAssistantMessage(
      this.getSettleMessages(event),
    );
    if (!assistantMessage) {
      return undefined;
    }
    const text = this.readMessageText(assistantMessage).trim();
    return this.isQuestionText(text) ? this.summarizeQuestion(text) : undefined;
  }

  private summarizeQuestion(text: string): string {
    const singleLine = text.replace(/\s+/g, " ").trim();
    const maxLength = 120;
    if (singleLine.length <= maxLength) {
      return singleLine;
    }
    return `${singleLine.slice(0, maxLength - 3)}...`;
  }

  private isAssistantFailure(event: SettleEvent): boolean {
    const assistantMessage = this.findLatestAssistantMessage(
      this.getSettleMessages(event),
    );
    return assistantMessage?.stopReason === "error"
      || assistantMessage?.stopReason === "aborted";
  }

  private isQuestionText(text: string): boolean {
    const normalizedText = text.trim();
    return normalizedText.endsWith("?") || QUESTION_START.test(normalizedText);
  }

  private getSettleMessages(event: SettleEvent): readonly SettleMessage[] {
    if (event.messages) {
      return event.messages;
    }
    return event.context?.contextMessages ?? [];
  }

  private findLatestAssistantMessage(
    messages: readonly SettleMessage[],
  ): SettleMessage | undefined {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") {
        return messages[index];
      }
    }
    return undefined;
  }

  private readMessageText(message: SettleMessage): string {
    if (typeof message.content === "string") {
      return message.content;
    }
    return message.content?.map((block) => block.text).join(" ") ?? "";
  }

  private async sendNotification(
    api: HookApi,
    event: NotificationEvent,
    cwd: string,
    message: string,
    resend: boolean = false,
  ): Promise<void> {
    await this.dispatch(api, event, cwd, message);
    if (resend) {
      this.reminders?.arm(cwd, (): Promise<void> =>
        this.dispatch(api, event, cwd, message));
    }
  }

  private async dispatch(
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
