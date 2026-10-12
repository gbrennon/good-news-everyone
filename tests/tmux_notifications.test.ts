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
  private readonly nextResult: HookExecutionResult;

  public constructor(
    nextResult: HookExecutionResult = { code: 0, stdout: "", stderr: "" },
  ) {
    this.nextResult = nextResult;
  }

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
    return this.nextResult;
  }
}

test("default export registers the notification lifecycle hooks", () => {
  const api = new FakeHookApi();

  defaultHook(api);

  expect(typeof defaultHook).toBe("function");
  expect(api.registeredEvents).toContain("ui_prompt_start");
  expect(api.registeredEvents).toContain("agent_settled");
});

test("notification hook dispatches question and settlement notifications", async () => {
  const service = new NotificationHookService("pi");
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.ui_prompt_start!({}, ctx);
  api.lifecycleHandlers.agent_before_settle!({ outcome: "error" }, ctx);
  await api.lifecycleHandlers.agent_settled!({}, ctx);

  expect(api.calls).toEqual([
    {
      command: "agent-notify",
      args: ["pi", "question", "--cwd", "/work/repo", "--message", "input needed"],
      cwd: "/work/repo",
    },
    {
      command: "agent-notify",
      args: ["pi", "error", "--cwd", "/work/repo", "--message", "task failed"],
      cwd: "/work/repo",
    },
  ]);
});
