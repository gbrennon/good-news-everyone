/**
 * Report the result of an external command execution.
 */
export interface HookExecutionResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}
