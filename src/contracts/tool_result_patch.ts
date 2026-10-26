import type { HookContentBlock } from "./hook_content_block";

/**
 * Replace the visible tool result content.
 */
export interface ToolResultPatch {
  readonly content: readonly HookContentBlock[];
}
