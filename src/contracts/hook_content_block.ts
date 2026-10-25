/**
 * Represent a text content block from a hook event.
 */
export interface HookContentBlock {
  readonly type: "text";
  readonly text: string;
}
