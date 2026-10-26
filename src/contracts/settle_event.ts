import type { AgentOutcome } from "./agent_outcome";
import type { SettleContext } from "./settle_context";
import type { SettleMessage } from "./settle_message";

/**
 * Describe the outcome and messages reported by an agent.
 */
export interface SettleEvent {
  readonly aborted?: boolean;
  readonly context?: SettleContext;
  readonly messages?: readonly SettleMessage[];
  readonly outcome?: AgentOutcome;
}
