import { expect, test } from "bun:test";
import defaultHook, {
  type HookApi,
  type HookEventContext,
  type HookExecOptions,
  type HookExecutionResult,
  NotificationHookService,
  NotificationHooksExtension,
  type SettleEvent,
} from "../src/index";

interface RecordedExecCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

class FakeHookApi implements HookApi {
  public readonly calls: RecordedExecCall[] = [];
  public readonly registeredEvents: string[] = [];
  public readonly lifecycleHandlers: Record<
    string,
    (event: SettleEvent, ctx: HookEventContext) => Promise<void> | void
  > = {};
  public tmuxIsAvailable: boolean = true;

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
    options: HookExecOptions,
  ): Promise<HookExecutionResult> {
    this.calls.push({ command, args, cwd: options.cwd });
    if (command === "tmux" && this.tmuxIsAvailable) {
      return {
        code: 0,
        stdout: "session=pi-hooks window=1:pi id=@224\n",
        stderr: "",
      };
    }
    return { code: command === "tmux" ? 1 : 0, stdout: "", stderr: "" };
  }
}

const tmuxArgs = [
  "display-message",
  "-p",
  "session=#{session_name} window=#{window_index}:#{window_name} id=#{window_id}",
];

test("default export registers the notification lifecycle hooks", () => {
  const api = new FakeHookApi();

  defaultHook(api);

  expect(typeof defaultHook).toBe("function");
  api.lifecycleHandlers.agent_start!({}, { cwd: "/work/repo" });
  expect(api.registeredEvents).toContain("ui_prompt_start");
  expect(api.registeredEvents).toContain("agent_settled");
});

test("notification hook includes tmux context for questions and failures", async () => {
  const service = new NotificationHookService("pi");
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.ui_prompt_start!({}, ctx);
  api.lifecycleHandlers.agent_before_settle!({ outcome: "error" }, ctx);
  await api.lifecycleHandlers.agent_settled!({}, ctx);

  expect(api.calls).toEqual([
    { command: "tmux", args: tmuxArgs, cwd: "/work/repo" },
    {
      command: "agent-notify",
      args: [
        "pi",
        "question",
        "--cwd",
        "/work/repo",
        "--message",
        "input needed [session=pi-hooks window=1:pi id=@224]",
      ],
      cwd: "/work/repo",
    },
    { command: "tmux", args: tmuxArgs, cwd: "/work/repo" },
    {
      command: "agent-notify",
      args: [
        "pi",
        "error",
        "--cwd",
        "/work/repo",
        "--message",
        "task failed [session=pi-hooks window=1:pi id=@224]",
      ],
      cwd: "/work/repo",
    },
  ]);
});

test("does not notify before the agent settles", async () => {
  const service = new NotificationHookService("pi");
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  api.lifecycleHandlers.agent_start!({}, ctx);
  api.lifecycleHandlers.agent_before_settle!({ outcome: "completed" }, ctx);

  expect(api.calls).toEqual([]);
});

test("notifies aborted settlement as an error", async () => {
  const service = new NotificationHookService("pi");
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_settled!({ aborted: true }, ctx);

  expect(api.calls[1]).toEqual({
    command: "agent-notify",
    args: [
      "pi",
      "error",
      "--cwd",
      "/work/repo",
      "--message",
      "task failed [session=pi-hooks window=1:pi id=@224]",
    ],
    cwd: "/work/repo",
  });
});

test("notifies outside tmux with an explicit unavailable context", async () => {
  const service = new NotificationHookService("omp");
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  api.tmuxIsAvailable = false;
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_settled!({ outcome: "completed" }, ctx);

  expect(api.calls).toEqual([
    { command: "tmux", args: tmuxArgs, cwd: "/work/repo" },
    {
      command: "agent-notify",
      args: [
        "omp",
        "complete",
        "--cwd",
        "/work/repo",
        "--message",
        "task complete [session=unavailable window=unavailable id=unavailable]",
      ],
      cwd: "/work/repo",
    },
  ]);
});
