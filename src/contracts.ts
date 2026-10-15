/**
 * Contract definitions for Pi coding agent hook events and execution.
 *
 * Callers provide an implementation of HookApi to register event handlers
 * and execute external commands within the active workspace directory.
 */
export interface HookExecutionResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface HookExecOptions {
  readonly cwd: string;
}

export interface HookEventContext {
  readonly cwd: string;
  readonly sessionId?: string;
}

export interface HookContentBlock {
  readonly type: "text";
  readonly text: string;
}

export interface ToolInputPayload {
  readonly path?: string;
  readonly filePath?: string;
}

export interface ToolResultEvent {
  readonly isError?: boolean;
  readonly toolName: string;
  readonly input: ToolInputPayload;
  readonly content: readonly HookContentBlock[];
}

export interface ToolResultPatch {
  readonly content: readonly HookContentBlock[];
}

export type AgentOutcome = "completed" | "aborted" | "error";

export type NotificationEvent = "question" | "complete" | "error";

export interface SettleContentBlock {
  readonly type: "text";
  readonly text: string;
}

export type AgentStopReason = "stop" | "length" | "toolUse" | "error" | "aborted";

export interface SettleMessage {
  readonly role: string;
  readonly content?: string | readonly SettleContentBlock[];
  readonly stopReason?: AgentStopReason;
}

export interface SettleContext {
  readonly contextMessages?: readonly SettleMessage[];
}

export interface SettleEvent {
  readonly aborted?: boolean;
  readonly context?: SettleContext;
  readonly messages?: readonly SettleMessage[];
  readonly outcome?: AgentOutcome;
}

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
      | "agent_settled",
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
