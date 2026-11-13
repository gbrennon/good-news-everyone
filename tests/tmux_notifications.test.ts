import { expect, test } from "bun:test";
import defaultHook, {
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

  public constructor() {
    process.env.TMUX_PANE = "@test";
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
    if (command === "tmux" && this.tmuxIsAvailable) {
      return {
        code: 0,
        stdout: "session=pi-hooks window=1:pi\n",
        stderr: "",
      };
    }
    return { code: command === "tmux" ? 1 : 0, stdout: "", stderr: "" };
  }
}

const tmuxArgs = [
  "display-message",
  "-p",
  "-t",
  "@test",
  "session=#{session_name} window=#{window_index}:#{window_name}",
];

test("notification identifies the agent pane and sends only concise metadata", async () => {
  const service = new NotificationHookService(
    "pi",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const previousPane = process.env.TMUX_PANE;
  process.env.TMUX_PANE = "@agent";

  try {
    await api.lifecycleHandlers.agent_settled!({ outcome: "completed" }, {
      cwd: "/work/repo",
    });
  } finally {
    if (previousPane === undefined) {
      delete process.env.TMUX_PANE;
    } else {
      process.env.TMUX_PANE = previousPane;
    }
  }

  expect(api.calls).toEqual([
    {
      command: "tmux",
      args: [
        "display-message",
        "-p",
        "-t",
        "@agent",
        "session=#{session_name} window=#{window_index}:#{window_name}",
      ],
      cwd: "/work/repo",
    },
    {
      command: "notify-send",
      args: [
        "Good news, everyone!",
        "We've got a very special delivery today.\nagent=pi session=pi-hooks window=1:pi\n",
      ],
      cwd: "/work/repo",
    },
  ]);
});

test("default export registers the notification lifecycle hooks", () => {
  const api = new FakeHookApi();

  defaultHook(api);

  expect(typeof defaultHook).toBe("function");
  api.lifecycleHandlers.agent_start!({}, { cwd: "/work/repo" });
  expect(api.registeredEvents).toContain("ui_prompt_start");
  expect(api.registeredEvents).toContain("agent_end");
  expect(api.registeredEvents).toContain("agent_settled");
});

test("notification hook includes tmux context for questions and failures", async () => {
  const service = new NotificationHookService(
    "pi",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
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
      command: "notify-send",
      args: [
        "What-mas?",
        "What do you need from the crew?\nagent=pi session=pi-hooks window=1:pi\n",
      ],
      cwd: "/work/repo",
    },
    { command: "tmux", args: tmuxArgs, cwd: "/work/repo" },
    {
      command: "notify-send",
      args: [
        "--urgency=critical",
        "Good news, everyone!",
        "There's a report on TV with some very bad news!\nagent=pi session=pi-hooks window=1:pi\n",
      ],
      cwd: "/work/repo",
    },
  ]);
});
test("does not duplicate input notification when settlement repeats the question", async () => {
  const service = new NotificationHookService(
    "pi",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.ui_prompt_start!({}, ctx);
  await api.lifecycleHandlers.agent_end!({
    messages: [
      {
        role: "assistant",
        content: [{ type: "text", text: "Which option should I use?" }],
      },
    ],
  }, ctx);
  await api.lifecycleHandlers.agent_settled!({
    outcome: "completed",
    context: {
      contextMessages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "Which option should I use?" }],
        },
      ],
    },
  }, ctx);

  const notifications = api.calls.filter(
    (call) => call.command === "notify-send",
  );
  expect(notifications).toHaveLength(1);
});

test("does not notify before the agent settles", async () => {
  const service = new NotificationHookService(
    "pi",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  api.lifecycleHandlers.agent_start!({}, ctx);
  api.lifecycleHandlers.agent_before_settle!({ outcome: "completed" }, ctx);

  expect(api.calls).toEqual([]);
});

test("classifies an agent-end error as a failed task", async () => {
  const service = new NotificationHookService(
    "omp",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_end!({
    messages: [
      {
        role: "assistant",
        stopReason: "error",
        content: [{ type: "text", text: "The task failed." }],
      },
    ],
  }, ctx);

  expect(api.calls[1]).toEqual({
    command: "notify-send",
    args: [
      "--urgency=critical",
      "Good news, everyone!",
      "There's a report on TV with some very bad news!\nagent=omp session=pi-hooks window=1:pi\n",
    ],
    cwd: "/work/repo",
  });
});

test("classifies an agent-end question without punctuation as input needed", async () => {
  const service = new NotificationHookService(
    "omp",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_end!({
    messages: [
      {
        role: "assistant",
        content: [{
          type: "text",
          text: "What would you like me to change or investigate in this repository",
        }],
      },
    ],
  }, ctx);

  expect(api.calls[1]).toEqual({
    command: "notify-send",
    args: [
      "What-mas?",
      "What do you need from the crew?\nagent=omp session=pi-hooks window=1:pi\n",
    ],
    cwd: "/work/repo",
  });
});

test("classifies an agent-end assistant question as input needed", async () => {
  const service = new NotificationHookService(
    "omp",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_end!({
    messages: [
      {
        role: "assistant",
        content: [{ type: "text", text: "Which option should I use?" }],
      },
    ],
  }, ctx);

  expect(api.calls[1]).toEqual({
    command: "notify-send",
    args: [
      "What-mas?",
      "What do you need from the crew?\nagent=omp session=pi-hooks window=1:pi\n",
    ],
    cwd: "/work/repo",
  });
});

test("classifies a settled assistant question as input needed", async () => {
  const service = new NotificationHookService(
    "pi",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_settled!({
    outcome: "completed",
    context: {
      contextMessages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "Which option should I use?" }],
        },
      ],
    },
  }, ctx);

  expect(api.calls[1]).toEqual({
    command: "notify-send",
    args: [
      "What-mas?",
      "What do you need from the crew?\nagent=pi session=pi-hooks window=1:pi\n",
    ],
    cwd: "/work/repo",
  });
});

test("notifies aborted settlement as an error", async () => {
  const service = new NotificationHookService(
    "pi",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_settled!({ aborted: true }, ctx);

  expect(api.calls[1]).toEqual({
    command: "notify-send",
    args: [
      "--urgency=critical",
      "Good news, everyone!",
      "There's a report on TV with some very bad news!\nagent=pi session=pi-hooks window=1:pi\n",
    ],
      cwd: "/work/repo",
  });
});

test("notifies outside tmux with an explicit unavailable context", async () => {
  const service = new NotificationHookService(
    "omp",
    undefined,
    new NotificationTaglineSelector(new RandomSource(() => 0)),
  );
  const extension = new NotificationHooksExtension(service);
  const api = new FakeHookApi();
  const previousPane = process.env.TMUX_PANE;
  delete process.env.TMUX_PANE;
  extension.register(api);
  const ctx: HookEventContext = { cwd: "/work/repo" };

  await api.lifecycleHandlers.agent_settled!({ outcome: "completed" }, ctx);
  if (previousPane !== undefined) {
    process.env.TMUX_PANE = previousPane;
  }

  expect(api.calls).toEqual([{
      command: "notify-send",
      args: [
        "Good news, everyone!",
        "We've got a very special delivery today.\nagent=omp\n",
      ],
      cwd: "/work/repo",
    },
  ]);
});

test("default extension notifies on settlement without an injected service", async () => {
  const extension = new NotificationHooksExtension();
  const api = new FakeHookApi();
  extension.register(api);

  expect(api.registeredEvents).toContain("agent_start");
  expect(api.registeredEvents).toContain("session_shutdown");
  expect(api.registeredEvents).toContain("ui_prompt_start");
  expect(api.registeredEvents).toContain("agent_end");
  expect(api.registeredEvents).toContain("agent_before_settle");
  expect(api.registeredEvents).toContain("agent_settled");

  await api.lifecycleHandlers.agent_settled!({ outcome: "completed" }, {
    cwd: "/work/repo",
  });

  const notifications = api.calls.filter((call) => call.command === "notify-send");
  expect(notifications).toHaveLength(1);
  expect(notifications[0]!.args[0]).toContain("news");
  expect(notifications[0]!.args[1]).toMatch(
    /\nagent=pi session=pi-hooks window=1:pi\n$/,
  );
  expect(notifications[0]!.cwd).toBe("/work/repo");
});
