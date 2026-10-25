/**
 * Represent a text content block in a settlement message.
 */
export interface SettleContentBlock {
  readonly type: "text";
  readonly text: string;
}
