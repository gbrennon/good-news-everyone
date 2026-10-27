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
  type SettleEvent,
} from "../src/index";

class FakeHookApi implements HookApi {
  public readonly calls: { command: string; args: readonly string[] }[] = [];
  public readonly registeredEvents: string[] = [];
  public readonly lifecycleHandlers: Record<
    string,
    (event: SettleEvent, ctx: HookEventContext) => Promise<void> | void
  > = {};

  public on(event: string, handler: unknown): void {
    this.registeredEvents.push(event);
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
      return { code: 0, stdout: "session=s window=1:omp id=@1\n", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  }

  public lastNotification(): readonly string[] | undefined {
    const notifications = this.calls.filter(
      (call) => call.command === "agent-notify",
    );
    return notifications[notifications.length - 1]?.args;
  }
}

function buildOmp(): { api: FakeHookApi; ctx: HookEventContext } {
  const service = new NotificationHookService(
    "omp",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const api = new FakeHookApi();
  new NotificationHooksExtension(service, "end").register(api);
  return { api, ctx: { cwd: "/work/repo" } };
}

test("omp lifecycle registers agent_end and not agent_settled", () => {
  const { api } = buildOmp();

  expect(api.registeredEvents).toContain("agent_end");
  expect(api.registeredEvents).toContain("agent_start");
  expect(api.registeredEvents).toContain("session_shutdown");
  expect(api.registeredEvents).not.toContain("agent_settled");
  expect(api.registeredEvents).not.toContain("ui_prompt_start");
});

test("omp notifies completion from agent_end", async () => {
  const { api, ctx } = buildOmp();

  await api.lifecycleHandlers.agent_end!({
    messages: [
      { role: "assistant", stopReason: "stop", content: "All set." },
    ],
  }, ctx);

  expect(api.lastNotification()).toEqual([
    "omp", "complete", "--cwd", "/work/repo",
    "--title", "Good news, everyone! We've got a very special delivery today.",
    "--message", "task complete [session=s window=1:omp id=@1]",
  ]);
});

test("omp notifies the real question text from agent_end", async () => {
  const { api, ctx } = buildOmp();

  await api.lifecycleHandlers.agent_end!({
    messages: [
      {
        role: "assistant",
        stopReason: "stop",
        content: [{ type: "text", text: "Which option should I use?" }],
      },
    ],
  }, ctx);

  expect(api.lastNotification()).toEqual([
    "omp", "question", "--cwd", "/work/repo",
    "--title", "What-mas?",
    "--message", "Which option should I use? [session=s window=1:omp id=@1]",
  ]);
});

test("omp notifies failure from an aborted agent_end", async () => {
  const { api, ctx } = buildOmp();

  await api.lifecycleHandlers.agent_end!({
    messages: [{ role: "assistant", stopReason: "aborted" }],
  }, ctx);

  expect(api.lastNotification()).toEqual([
    "omp", "error", "--cwd", "/work/repo",
    "--title", "Good news, everyone! There's a report on TV with some very bad news!",
    "--message", "task failed [session=s window=1:omp id=@1]",
  ]);
});
