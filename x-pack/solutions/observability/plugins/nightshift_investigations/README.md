# Nightshift Investigations Plugin

This plugin provides the domain API for starting and reading investigations, independent of which entity (significant event, alert, etc.) triggers them.

Investigation starts can include up to 20 `notificationDestinations`. Each uses the generic envelope `{ type, connector_id, params }`, with optional `automation_id` and `automation_name` provenance. `params` is a JSON object limited to 4096 serialized characters, three container levels including the root, and 20 entries per object or array; keys are limited to 128 characters. Workflow YAML validates the envelope; notification handlers validate connector-specific params before execution starts, when recovering workflow inputs, and before delivery claims. Unsupported types are rejected at runtime. Delivery fields are server-owned and rejected in destination input.

Slack is the currently supported notification type. It accepts `params: { channel, thread_ts? }`: `channel` must contain 1–500 characters and `thread_ts` at most 100. `thread_ts` is the parent message ID used for thread replies. Channel-mode Slack automations require a destination.

```json
{
  "notificationDestinations": [
    {
      "type": "slack",
      "connector_id": "my-slack-connector",
      "params": { "channel": "#alerts", "thread_ts": "1759190400.000100" }
    }
  ]
}
```

Destinations are fixed for the lifetime of an investigation. The separate `notifications` array starts empty and stores delivery attempts, each linked to `notificationDestinations` by `destination_index`. Once an investigation settles, delivery claims each destination by appending an `unconfirmed` attempt before executing its connector in the investigation's space. Each claim records an `attempt_id` and `attempted_at`; its result is saved separately by matching its destination index and attempt ID. Notification writes use a single read/update without version checks or conflict retries. Delivery assumes one sender per investigation; overlapping senders can produce duplicate posts or overwrite attempt records. A confirmed message timestamp produces `sent`, connector error responses produce `failed`, and exceptions, cancellation, or missing timestamps leave the attempt `unconfirmed`. All three statuses prevent automatic resend, including after a crash or a result-write failure.

Delivery state is available through the investigation API. The `nightshift.sendNotifications` step returns `sent` and `failed` counts for the current run and the number of unresolved `unconfirmed` claims. Notification-step failures continue the investigation workflow; persistence failures stop further posts within that step. Unconfirmed attempts have no automatic expiry or reclamation.
