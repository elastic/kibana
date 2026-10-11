# Nightshift Investigations Plugin

This plugin provides the domain API for starting and reading investigations, independent of which entity (significant event, alert, etc.) triggers them.

## Requirements

Nightshift investigations are being moved onto the shared `agenticInvestigations` plugin (an investigation is an Agent Builder conversation) and its proposed actions onto the `proposals` plugin. Both are optional dependencies and disabled by default:

```yaml
xpack.agenticInvestigations.enabled: true
xpack.proposals.enabled: true
```

They are **not** enabled in any serverless or stateful default config yet. Enabling them adds visible surface (Kibana features in role management, workflow step types, the proposals managed workflow), so that waits until the shared investigation experience is ready. Until then, environments that run Nightshift (for example customer zero) enable both in their own config, and local development adds them to `config/kibana.dev.yml`. When either plugin is disabled, Nightshift investigations report themselves unavailable.

### Privileges

The `agenticInvestigations` and `proposals` routes require the `read_investigations`, `manage_investigations`, `read_proposals`, and `manage_proposals` API privileges. The Nightshift feature grants them, so a Nightshift user does not need the `agenticInvestigations` or `proposals` feature privileges to call those routes:

| Nightshift privilege | Grants |
| --- | --- |
| `all` | `read_investigations`, `manage_investigations`, `read_proposals`, `manage_proposals` |
| `read` | `read_investigations`, `read_proposals` |

These API privileges are not scoped to Nightshift: they cover every agentic investigation and proposal in the space, including those created by other solutions, plus the investigation routes that share `manage_investigations` (status, assignment, impact, user profile suggestions).

Starting an investigation also needs Agent Builder `all` (the start route's own requirement), execute access to workflows (the start runs the investigation workflow as the caller), and read access to connectors (availability checks that an inference connector exists for the investigation agent). The Scout write-path tests run with exactly that role.

`read_investigations` lets a user with Nightshift `read` get, list, and count investigations through the shared query API; every write still needs `manage_investigations`. UI capabilities are scoped to the feature that owns them, so capabilities like `agenticInvestigations.showInvestigations` and `proposals.showProposals` still need the `agenticInvestigations` and `proposals` features. Opening the investigation conversation in Agent Builder still needs the Agent Builder feature privileges.

## How investigations are stored and run

An investigation is an Agent Builder conversation with the `investigation` template. The investigation id is the conversation id. The `agenticInvestigations` plugin owns everything around it:

- **Subjects.** What is investigated: alerts (with their snapshot), significant events, questions, and Slack threads. Each subject has its own document and attachment.
- **Impact, hypotheses, and proposed actions.** The agent records these.
- **The query API.** `GET /internal/investigations/investigations[/{id}]`, used for reads.

The legacy `nightshift-investigation` saved object type is still registered, but nothing writes it anymore.

### Starting an investigation

The start route, the `nightshift.triggerInvestigation` workflow step, and `client.start` work out which subjects the start covers. For an alert, that is one subject per alert in `context.alerts`.

If any of those subjects is part of an open investigation that the caller owns, the start continues that investigation. When several match, the most recently updated one wins. The new subjects are added to it, and the agent gets a follow-up brief describing the new alerts.

If none match, the start claims the subjects for a new investigation id. That way, of two concurrent starts for one subject, the second continues the first. Closed investigations never match. One start always lands on exactly one investigation.

The daily quota for automatic starts (`trigger_type: automatic`) only counts starts that open a new investigation. It is checked after the subject matching and before the claim, so a follow-up on an open investigation is never denied, and a denied start claims nothing.

The start then runs the `system-nightshift-investigation` workflow with `investigation_id` and the new subjects, and returns `{ investigation_id }`. It does not write to the investigation itself. The workflow's `_ensure` step does all of that:

- creates the conversation;
- records the subjects;
- reopens a closed investigation.

Until `_ensure` has run, the shared GET for a new investigation returns 404. That gap is usually a few seconds.

### Titles

Agent Builder titles the investigation. `_ensure` creates the conversation without a title, so it carries Agent Builder's `New conversation` placeholder, and Agent Builder generates the title from the first round's message when that round ends. Until then the shared API reports `title_pending: true`, and the shared UI names the investigation after its first subject (an alert's rule name, the question, a Slack thread's question), or else "New investigation".

The `title` of the start route, the `nightshift.triggerInvestigation` step, and the investigation workflow is still accepted for compatibility, but it is not stored as the title. The start passes it on as the workflow's `title` input only. The `_slack_thread` route's `title` is the generated title, or until then a headline from the thread's question.

The workflow's concurrency key is `investigation:<id>` with a `queue` strategy, so runs of one investigation never overlap. The investigation reads as in progress while its agent runs.

### Reading and deleting investigations

Readers use the shared query API: the Nightshift landing page (list, severity counts, cards from `agenticInvestigations.InvestigationCard`, Agent Builder's conversation details flyout for one investigation), the significant-event flyout (`@kbn/investigation-output`), the alert "Investigate" action (list by `subject_id=<alert id>`), and significant events' investigation status route.

`deleteAllInvestigations()` on the start contract deletes the legacy saved objects in every space and, through `agenticInvestigations.deleteSubjectInvestigationDataAcrossSpaces()`, the subjects, claims, impact, and hypotheses of every investigation with subjects. The Agent Builder conversations stay; Agent Builder has no cross-space delete.

### One identity per investigation

Agent Builder lets only the conversation owner write subjects, metadata, and attachments. So one identity must create and continue an investigation. Use a service account for the investigation workflow, its automations, and the Slack thread workflow.

A start will not continue an investigation it does not own. It opens a new one instead and logs a warning.

The start judges ownership by Agent Builder's owner check. (Agent Builder resolves the user profile id of an API key's creator for fake requests too, so a workflow step and the HTTP calls it makes count as the same owner.) If a run reaches an investigation it does not own anyway, the agent still works in the conversation, but subjects and the reopen are skipped. Cross-identity follow-ups need converse-access writes in Agent Builder.

### Slack threads

`POST /internal/nightshift/investigations/_slack_thread` finds a thread's investigation by the conversation origin `team:<T>/channel:<C>/thread:<ts>`, which is the key Agent Builder uses for Slack. If that origin belongs to another conversation, it falls back to the thread's `slack_thread` subject.

With `create`, the route creates the investigation as the identity that runs the Slack workflow. The new investigation gets that origin and has the thread as its subject. The thread's status message is recorded on that subject as `slack.status_message_ts`.

The Slack connector delivers each event at least once. The workflow passes Slack's event id as `event_id` and its own execution id as `execution_id`, and the route records both on the thread's subject in `slack.seen_events` (the latest 50). An event another execution already recorded is answered with `duplicate: true`, and the workflow skips it; the same execution asking again, for example on a retried step, is not a duplicate. A run whose investigation failed calls the route again with `release_event: true`, which removes the event as recorded for that execution, so a redelivery of the event is handled. The workflow runs one call per thread at a time, so two deliveries of one event cannot race each other.

## Notifications

Investigation starts can include up to 5 `notificationDestinations`. Each uses the generic envelope `{ type, connector_id, params }`, with optional `automation_id` and `automation_name` provenance. `params` is a JSON object limited to 4096 serialized characters, three container levels including the root, and 20 entries per object or array; keys are limited to 128 characters. Workflow YAML validates the envelope; notification handlers validate connector-specific params before execution starts, when recovering workflow inputs, and when preparing delivery. Unsupported types are rejected at runtime. Delivery fields are server-owned and rejected in destination input.

Slack is the currently supported notification type. It accepts `params: { channel, thread_ts? }`: `channel` must contain 1–500 characters and `thread_ts` at most 100. `thread_ts` is the parent message ID used for thread replies. Channel-mode Slack automations require a destination.

The automation UI's Channel action uses the Elastic Slack app by default. A saved connector can be supplied through `completion.connectorId`; editing or cloning the automation preserves that selection. Removing the Slack action clears its action and destination and removes notification destinations from the regenerated workflow. Direct-message actions and Slack-source thread actions remain separate follow-up work.

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

Destinations and delivery history live in a hidden, readonly `nightshift.notification_routing` attachment backed by its own index. Endpoints are deduplicated by type, connector ID, and canonical parameters while retaining automation attribution. The 5-association limit applies to retained endpoints and automation identities, not execution or attempt history. The started phase adds destinations and freezes each execution's participants; explicit follow-up executions notify all retained destinations.

The investigation workflow sends a started message, stores its confirmed Slack thread reference, and replies with completion or failure. Later executions reuse that thread. An explicitly supplied parent timestamp is also supported. Terminal delivery requires an initialized execution and persists one terminal phase, preventing contradictory completion and failure messages.

Each execution, destination, and phase is claimed as `unconfirmed` before connector execution. The shared attachment factory handles versioned writes, and the connector executes once using workflow authentication, the investigation's space, and the abort signal. A confirmed message timestamp produces `sent`; connector error responses produce `failed`; exceptions, cancellation after claiming, and missing timestamps remain `unconfirmed`. Replay skips all existing attempts. An uncertain root blocks automatic root recreation across later executions; a definitely failed root may be attempted again by a later execution.

The `nightshift.sendNotifications` step validates the persisted workflow execution and its investigation binding, and reads the investigation (title, severity, summary, impact, first pending proposed action) through the shared query API. Until Agent Builder titles the investigation, messages use the run's `title` input. Investigation and execution IDs may differ for explicit continuation. It returns persisted `sent`, `failed`, and `unconfirmed` counts for the requested execution and phase; full diagnostics are available through authorized attachment reads. Notification-step failures continue the investigation workflow, while persistence failures stop further posts within that step. There is no automatic claim expiry, resend, or routing-document cleanup on investigation or space deletion. Outbound thread references do not register incoming Slack-thread continuation.
