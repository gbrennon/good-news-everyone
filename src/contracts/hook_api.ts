import type { HookEventContext } from "./hook_event_context";
import type { HookExecOptions } from "./hook_exec_options";
import type { HookExecutionResult } from "./hook_execution_result";
import type { SettleEvent } from "./settle_event";
import type { ToolResultEvent } from "./tool_result_event";
import type { ToolResultPatch } from "./tool_result_patch";

/**
 * Register lifecycle handlers and execute commands in the active workspace.
 */
export interface HookApi {
  on(
    event: "tool_result",
    handler: (
      event: ToolResultEvent,
      ctx: HookEventContext,
    ) => Promise<ToolResultPatch | undefined>,
  ): void;
  on(
    event:
      | "ui_prompt_start"
      | "agent_start"
      | "agent_end"
      | "agent_before_settle"
      | "agent_settled"
      | "session_shutdown",
    handler: (
      event: SettleEvent,
      ctx: HookEventContext,
    ) => Promise<void> | void,
  ): void;
  exec(
    command: string,
    args: readonly string[],
    options: HookExecOptions,
  ): Promise<HookExecutionResult>;
}
