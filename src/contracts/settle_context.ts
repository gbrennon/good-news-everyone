import type { SettleMessage } from "./settle_message";

/**
 * Provide prior context messages for a settlement event.
 */
export interface SettleContext {
  readonly contextMessages?: readonly SettleMessage[];
}
