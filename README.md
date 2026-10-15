# GB Agent Notifications

Native TypeScript lifecycle notification hook for the Pi coding agent.

## Overview

- Dispatches notifications on `ui_prompt_start` (input needed) and `agent_settled`
  (complete/error) via `agent-notify`.
- Tracks the latest turn outcome per workspace directory.

## Architecture

- `src/contracts.ts` defines the `HookApi` and event payload contracts.
- `src/notification_hook_service.ts` dispatches `question`, `complete`, and `error` notifications.
- `src/notification_hooks_extension.ts` registers the lifecycle listeners on the Pi extension API.

## Verification

```bash
bun test
```
