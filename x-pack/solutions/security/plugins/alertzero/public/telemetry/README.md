# AlertZero browser telemetry

Event-Based Telemetry (EBT) events the `alertzero` public plugin reports from the browser. They go through core analytics, so a deployment that has turned telemetry off sends nothing. The server events are in the [server telemetry README](../../server/telemetry/README.md).

The four events are registered when the app first mounts (`registerAlertZeroUiEvents`, loaded with the app), so their schemas stay out of the page-load bundle; the app exists only inside the `xpack.alertzero.enabled` guard. Every event is reported from inside the app. They are reported through `useAlertZeroTelemetry()`, which reads `analytics` from the Kibana context and never throws. Names follow the RFC's naming Option B, `<plugin>_<object>_<verb>`: the epic's `alertzero.ui.*` events become `alertzero_ui_*`. The epic's fifth browser event, `flyout_interaction`, belongs to the Investigation flyout, which Agentic Investigations owns, so it is built there.

## Rules

- **No content.** No entity ids or names, no conversation, proposal or alert text, no error messages, no free text. Every field is a closed enum, a boolean or a small integer.
- **Only values the UI sends.** Each vocabulary lists only the values a UI reports today. The epic names more (other queue filters, Escalation cards and errors), and each is added with its UI, as a new value of the same `keyword` field.
- **Once per occurrence.** A page visit, a click or a toast reports once. A callout or error prompt reports when it appears, not on every re-render while it stays visible, and again only after it has gone away and come back. A request that keeps failing is one occurrence: a query without data drops its error while a poll or focus refetch retries it, so the prompt hides for a moment, but it reports again only once a refetch settles without the error. Ref latches keep React StrictMode's repeated effects from reporting twice.
- **Tests.** `events.test.ts` checks every payload against a dev-mode analytics client (`createAnalytics({ isDev: true })`), which throws on a schema mismatch or an undeclared field. The hooks and the queue page have their own tests for the latches.

## Events

### `alertzero_ui_home_opened`

The AlertZero home page opened on the queue, once per mount, when the queue's open count first arrives or fails to load. Not sent for onboarding (the home page decides between the queue and onboarding first), nor for refetches, window-focus polls, a count that changes during the visit, or a failed count that a retry then loads. A failed count also sends its `alertzero_ui_error_shown`.

| Field | Type | Description |
|---|---|---|
| `queue_size_bucket` | keyword | Open proposals when the queue loaded, as a range: `0`, `1_10`, `11_50`, `51_200` or `gt_200`, or `unknown` when the count failed to load |
| `default_filters_changed` | boolean | Whether the queue opened with non-default filters. Always `false` today: the queue has no saved filters, so it always opens with the defaults |

### `alertzero_ui_queue_filtered`

The user set a queue filter or sort, including switching from one value to another. Clearing a filter sends nothing, so the count is of filters chosen. The filter value is never sent.

| Field | Type | Description |
|---|---|---|
| `filter_type` | keyword | `impact` (the Impact entity pills), the queue's only filter today |

The epic's status, assignee, type, time range and other filter types are added when the queue has those controls.

### `alertzero_ui_brief_card_clicked`

A queue card was clicked open into the Investigation flyout. A flyout opened from the URL, such as a copied link, is not a click and sends nothing.

| Field | Type | Description |
|---|---|---|
| `conversation_type` | keyword | `investigation` |
| `has_pending_proposal` | boolean | Whether the card's proposal was still `pending` |
| `position_in_list` | long | Zero-based position of the card in its queue section (`section`), after the Impact filter |
| `section` | keyword | The queue section the card was rendered in: `respond`, `investigate`, `configure` or `closed` |

Cards on the Escalations page don't report clicks yet; an escalation value is added when they do.

### `alertzero_ui_error_shown`

An error toast, callout or error prompt was shown. The class is a fixed mapping, never the error's message: HTTP failures map from the status code (`classifyError`).

| Field | Type | Description |
|---|---|---|
| `error_class` | keyword | `network` (no response), `bad_request` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `timeout` (408), `conflict` (409), `rate_limited` (429), `server` (5xx), `partial_failure`, `worker_scan_failed`, `clipboard` or `unknown` |
| `surface` | keyword | `queue`, `flyout`, `onboarding`, `watch_detail` or `watch_settings` |

Where it is sent:

| Site | `surface` | `error_class` |
|---|---|---|
| Queue header count failed to load (`conversations_page.tsx`) | `queue` | From the error |
| A queue section failed to load (`queue_section.tsx`); picking or clearing an Impact filter starts a new occurrence | `queue` | From the error |
| A queue section's Show more failed, below rows already on screen (`queue_section.tsx`); each failed click reports once | `queue` | From the error |
| Approve or dismiss failed (`conversations_page.tsx` decision toast) | `queue` | From the error |
| Copy link failed, from a card menu or the flyout (`copy_link.ts`) | `queue` or `flyout` | `clipboard` |
| Scan failure callout (`scan_failure_callout.tsx`), on the queue or onboarding | `queue` or `onboarding` | `worker_scan_failed` |
| Enabling Workers failed, or partly failed, during onboarding (`use_enable_workers.ts`) | `onboarding` | From the error, and `partial_failure` for the partial-success warning |
| Saving a Worker failed (`use_workers_api.ts` toasts) | `watch_settings` | From the error (`conflict` and `forbidden` have their own toasts) |
| The Watch failed to load or was not found (`watch_detail.tsx`); switching to another Watch starts a new occurrence | `watch_detail` | From the error, or `not_found` |
| The Workers failed to load on a Watch (`watch_detail.tsx`) | `watch_detail` | From the error |

Not sent: form validation messages (an invalid trigger amount), and the read-only and permission notices, which describe access rather than an error. Nor is a failure to set up a Worker's service account (the onboarding toast, and the inline error on the Watch settings page): AlertZero gets it as a message, with no HTTP status to classify. Any other per-Worker save error shown inline on the Watch settings page is the same failure as the save toast, so only the toast reports. The Escalations page shows no AlertZero error of its own yet, so it has no surface value.
