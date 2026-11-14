# Architecture

This document describes lifecycle compatibility and the main notification components.

## Agent compatibility

- Pi settles on `agent_settled` and signals idle input on `ui_prompt_start`.
- OMP emits neither; its `agent_end` signal drives complete, question, and error notifications.
- The package manifest selects the Pi and OMP entrypoints independently.
- The manual installer bakes `PI_HOOK_AGENT` into each generated bundle.

## Components

- `src/contracts/` defines the `HookApi`, `Scheduler`, and event payload contracts.
- `src/notification_hook_service/` dispatches `question`, `complete`, and `error` notifications.
- `src/reminder_coordinator/` re-sends unhandled notifications on a bounded schedule.
- `src/system_scheduler.ts` adapts the runtime timer to the `Scheduler` port.
- `src/notification_hooks_extension/` registers lifecycle listeners on the Pi extension API.
