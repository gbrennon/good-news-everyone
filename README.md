# GB Agent Notifications

Native TypeScript lifecycle notification hook for the Pi coding agent.

## Overview

- Dispatches notifications on `ui_prompt_start` (input needed) and `agent_settled`
  (complete/error) via `agent-notify`.
- Tracks the latest turn outcome per workspace directory.
- Re-sends unhandled `question` (input needed) notifications on a fixed interval
  until the user responds, the session shuts down, or a reminder cap is reached.

## Re-notification

- A `question` notification is re-sent every `PI_NOTIFY_REMINDER_INTERVAL_MS`
  milliseconds (default `120000`).
- Reminders stop after `PI_NOTIFY_MAX_REMINDERS` re-sends (default `3`).
- Reminders are cancelled when a new agent turn starts (`agent_start`) or the
  session shuts down (`session_shutdown`).
- `complete` and `error` notifications are informational and never re-sent.

## Architecture

- `src/contracts.ts` defines the `HookApi`, `Scheduler`, and event payload contracts.
- `src/notification_hook_service.ts` dispatches `question`, `complete`, and `error` notifications.
- `src/reminder_coordinator.ts` re-sends unhandled notifications on a bounded schedule.
- `src/system_scheduler.ts` adapts the runtime timer to the `Scheduler` port.
- `src/notification_hooks_extension.ts` registers the lifecycle listeners on the Pi extension API.

## Verification

```bash
bun test
```
