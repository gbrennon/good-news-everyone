# Notifications

This document describes notification taglines and reminder behavior.

## Taglines

Runtime notifications use the selected opening phrase as the notification title. The body contains
the tagline, session metadata, and a trailing newline.

- `question` notifications use question-oriented taglines.
- `complete` notifications use completion-oriented taglines.
- `error` notifications use failure-oriented taglines.
- Question reminders preserve their original title and tagline.

## Re-notification

- A `question` notification is re-sent every
  `PI_NOTIFY_REMINDER_INTERVAL_MS` milliseconds (default `120000`).
- Reminders stop after `PI_NOTIFY_MAX_REMINDERS` re-sends (default `3`).
- Reminders are cancelled when a new agent turn starts (`agent_start`) or the
  session shuts down (`session_shutdown`).
- `complete` and `error` notifications are informational and never re-sent.
