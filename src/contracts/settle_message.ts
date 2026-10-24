import type { AgentStopReason } from "./agent_stop_reason";
import type { SettleContentBlock } from "./settle_content_block";

/**
 * Represent one message reported during agent settlement.
 */
export interface SettleMessage {
  readonly role: string;
  readonly content?: string | readonly SettleContentBlock[];
  readonly stopReason?: AgentStopReason;
}
