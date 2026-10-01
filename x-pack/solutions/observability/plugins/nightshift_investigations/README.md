# Nightshift Investigations Plugin

This plugin provides the domain API for starting and reading investigations, independent of which entity (significant event, alert, etc.) triggers them.

Investigation starts can include up to 20 `notifications`, each containing `type: slack`, a `connector_id`, and a `channel`, with optional `thread_ts`, `automation_id`, and `automation_name`. Delivery fields are server-owned and rejected in start and workflow inputs. Channel-mode Slack automations require a destination.

Once an investigation settles, delivery claims each destination as `unconfirmed` before executing its connector in the investigation's space. Each claim records an `attempt_id` and `attempted_at`; its result is saved separately using Saved Objects version checks. A confirmed message timestamp produces `sent`, connector error responses produce `failed`, and exceptions, cancellation, or missing timestamps leave the attempt `unconfirmed`. All three statuses prevent automatic resend, including after a crash or a result-write failure.

Delivery state is available through the investigation API. The notification step returns `sent` and `failed` counts for the current run and the number of unresolved `unconfirmed` claims. Notification-step failures continue the investigation workflow; persistence failures stop further posts within that step. Unconfirmed attempts have no automatic expiry or reclamation.
