import type { HookContentBlock } from "./hook_content_block";
import type { ToolInputPayload } from "./tool_input_payload";

/**
 * Report the result produced by a tool invocation.
 */
export interface ToolResultEvent {
  readonly isError?: boolean;
  readonly toolName: string;
  readonly input: ToolInputPayload;
  readonly content: readonly HookContentBlock[];
}
