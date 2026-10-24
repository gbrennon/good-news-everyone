import type { NotificationEvent } from "../contracts";

/**
 * Pair a notification event with its base message.
 */
export interface NotificationTemplate {
  readonly kind: NotificationEvent;
  readonly message: string;
}
