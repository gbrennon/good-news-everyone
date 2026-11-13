# Good News, Everyone!

Native TypeScript lifecycle notification hook for the Pi coding agent.
It announces your agent's state changes, both the good and the not-so-good.

## About the name

"Good news, everyone!" is Professor Farnsworth's signature catchphrase in Futurama.
He uses it to summon the Planet Express crew for a new mission.

The irony is that the news is almost never good.
The phrase usually precedes a disaster or an absurd errand,
so the crew learned to brace themselves whenever the Professor said "good news."

That is exactly what a notification hook does.

Farnsworth is the notifier of his world:
- he gathers the crew and delivers the message.

This hook gathers the agent's state changes and delivers them to you.

The name covers all three events, errors included:
- A question becomes "good news, everyone, your input is needed."
- A completion is genuine good news.
- A failure is still announced as "good news," which is the joke.

## Taglines

Runtime notifications use the selected opening phrase as the notification title. The body contains
the tagline, a newline, session metadata, and a trailing newline.
- `question` notifications use question-oriented taglines.
- `complete` notifications use completion-oriented taglines.
- `error` notifications use failure-oriented taglines.
- Questions re-sent by reminders preserve the originally selected title and tagline.

### Screenshots

![Completion notification](docs/assets/notification-complete.png)

![Question notification](docs/assets/notification-question.png)

![Error notification](docs/assets/notification-error.png)

## Installation

### Pi

Install the package with the Pi package manager:

```bash
pi install npm:@gbrennon/good-news-everyone@0.1.0
```

Pi loads `src/index.ts` from the package manifest.

### OMP

Install the package with the OMP plugin manager:

```bash
omp plugin install @gbrennon/good-news-everyone@0.1.0
```

OMP loads the dedicated `src/omp.ts` entrypoint, which uses the `agent_end`
lifecycle. Restart OMP after installing or updating the plugin.

### Manual installation

To install both hooks directly into the user extension directories:

```bash
./scripts/install.sh
```

## Overview

- Dispatches notifications on `ui_prompt_start` (input needed) and
  `agent_settled` (complete/error) via `notify-send`.
- Tracks the latest turn outcome per workspace directory.
- Re-sends unhandled `question` (input needed) notifications on a fixed interval until the user
responds, the session shuts down, or a reminder cap is reached.

## Re-notification

- A `question` notification is re-sent every
  `PI_NOTIFY_REMINDER_INTERVAL_MS` milliseconds (default `120000`).
- Reminders stop after `PI_NOTIFY_MAX_REMINDERS` re-sends (default `3`).
- Reminders are cancelled when a new agent turn starts (`agent_start`) or the
  session shuts down (`session_shutdown`).
- `complete` and `error` notifications are informational and never re-sent.

## Agent compatibility

- pi settles on `agent_settled` and signals idle input on `ui_prompt_start`.
- omp emits neither; it exposes `agent_end` as the terminal run signal, so the
  omp build drives complete, question, and error from `agent_end`.
- The package manifest selects the Pi and OMP entrypoints independently.
- The manual installer bakes `PI_HOOK_AGENT` into each generated bundle.

## Architecture

- `src/contracts/` defines the `HookApi`, `Scheduler`, and event payload contracts.
- `src/notification_hook_service/` dispatches `question`, `complete`, and `error`
  notifications.
- `src/reminder_coordinator/` re-sends unhandled notifications on a bounded schedule.
- `src/system_scheduler.ts` adapts the runtime timer to the `Scheduler` port.
- `src/notification_hooks_extension/` registers lifecycle listeners on the Pi
  extension API.

## Verification

```bash
bun test
```
