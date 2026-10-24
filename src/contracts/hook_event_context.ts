/**
 * Identify the workspace and optional session for a hook event.
 */
export interface HookEventContext {
  readonly cwd: string;
  readonly sessionId?: string;
}
