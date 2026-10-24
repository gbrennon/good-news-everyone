import { expect, test } from "bun:test";
import {
  type HookApi,
  type HookEventContext,
  type HookExecOptions,
  type HookExecutionResult,
  NotificationHookService,
  NotificationHooksExtension,
  NotificationTaglineSelector,
  RandomSource,
  ReminderCoordinator,
  type ScheduledTask,
  type Scheduler,
  type SettleEvent,
} from "../src/index";

class FakeHookApi implements HookApi {
  public readonly calls: { command: string; args: readonly string[] }[] = [];
  public readonly lifecycleHandlers: Record<
    string,
    (event: SettleEvent, ctx: HookEventContext) => Promise<void> | void
  > = {};

  public on(event: string, handler: unknown): void {
    if (event === "tool_result") {
      return;
    }
    this.lifecycleHandlers[event] =
      handler as (typeof this.lifecycleHandlers)[string];
  }

  public async exec(
    command: string,
    args: readonly string[],
    _options: HookExecOptions,
  ): Promise<HookExecutionResult> {
    this.calls.push({ command, args });
    if (command === "tmux") {
      return { code: 0, stdout: "session=s window=1:pi id=@1\n", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  }

  public notificationCount(): number {
    return this.calls.filter((call) => call.command === "agent-notify").length;
  }

  public lastNotificationKind(): string | undefined {
    const notifications = this.calls.filter(
      (call) => call.command === "agent-notify",
    );
    return notifications[notifications.length - 1]?.args[1];
  }

  public lastNotificationMessage(): string | undefined {
    const notifications = this.calls.filter(
      (call) => call.command === "agent-notify",
    );
    const last = notifications[notifications.length - 1];
    return last?.args[last.args.indexOf("--message") + 1];
  }
}

class FakeScheduler implements Scheduler {
  public readonly delays: number[] = [];
  private pending: (() => void) | undefined;

  public schedule(callback: () => void, delayMs: number): ScheduledTask {
    this.delays.push(delayMs);
    this.pending = callback;
    return {
      cancel: (): void => {
        if (this.pending === callback) {
          this.pending = undefined;
        }
      },
    };
  }

  public async tick(): Promise<void> {
    const callback = this.pending;
    this.pending = undefined;
    if (!callback) {
      return;
    }
    callback();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

function buildHarness(intervalMs: number, maxReminders: number): {
  api: FakeHookApi;
  scheduler: FakeScheduler;
  ctx: HookEventContext;
} {
  const scheduler = new FakeScheduler();
  const reminders = new ReminderCoordinator(scheduler, intervalMs, maxReminders);
  const service = new NotificationHookService(
    "pi",
    reminders,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const api = new FakeHookApi();
  new NotificationHooksExtension(service).register(api);
  return { api, scheduler, ctx: { cwd: "/work/repo" } };
}

const agentQuestionEvent: SettleEvent = {
  outcome: "completed",
  context: {
    contextMessages: [
      {
        role: "assistant",
        content: [{ type: "text", text: "Which option should I use?" }],
      },
    ],
  },
};

async function askAgentQuestion(
  api: FakeHookApi,
  ctx: HookEventContext,
): Promise<void> {
  await api.lifecycleHandlers.agent_settled!(agentQuestionEvent, ctx);
}

test("re-sends an unanswered agent question after the interval", async () => {
  const { api, scheduler, ctx } = buildHarness(1_000, 3);

  await askAgentQuestion(api, ctx);
  const initialMessage = api.lastNotificationMessage();
  await scheduler.tick();
  const resentMessage = api.lastNotificationMessage();

  expect(scheduler.delays[0]).toBe(1_000);
  expect(api.notificationCount()).toBe(2);
  expect(api.lastNotificationKind()).toBe("question");
  expect(resentMessage).toBe(initialMessage);
  expect(resentMessage).toBe(
    "What-mas?: Which option should I use? [session=s window=1:pi id=@1]",
  );
});

test("does not re-send the idle input-needed prompt", async () => {
  const { api, scheduler, ctx } = buildHarness(1_000, 3);

  await api.lifecycleHandlers.ui_prompt_start!({}, ctx);
  await scheduler.tick();

  expect(api.notificationCount()).toBe(1);
  expect(api.lastNotificationMessage()).toContain("input needed");
});

test("stops re-sending once the maximum reminders is reached", async () => {
  const { api, scheduler, ctx } = buildHarness(1_000, 2);

  await askAgentQuestion(api, ctx);
  await scheduler.tick();
  await scheduler.tick();
  await scheduler.tick();

  expect(api.notificationCount()).toBe(3);
});

test("stops re-sending when the user responds", async () => {
  const { api, scheduler, ctx } = buildHarness(1_000, 3);

  await askAgentQuestion(api, ctx);
  api.lifecycleHandlers.agent_start!({}, ctx);
  await scheduler.tick();

  expect(api.notificationCount()).toBe(1);
});

test("stops re-sending when the session shuts down", async () => {
  const { api, scheduler, ctx } = buildHarness(1_000, 3);

  await askAgentQuestion(api, ctx);
  api.lifecycleHandlers.session_shutdown!({}, ctx);
  await scheduler.tick();

  expect(api.notificationCount()).toBe(1);
});

test("does not re-send completion notifications", async () => {
  const { api, scheduler, ctx } = buildHarness(1_000, 3);

  await api.lifecycleHandlers.agent_settled!({ outcome: "completed" }, ctx);
  await scheduler.tick();

  expect(api.notificationCount()).toBe(1);
  expect(api.lastNotificationKind()).toBe("complete");
});
