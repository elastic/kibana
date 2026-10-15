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

## Service accounts (required, POC)

Nightshift runs investigations only as the space's agent service account, `kibana/nightshift-agent-<space>`. There is no fallback that runs them as the user who starts them. A space can use Nightshift only after an admin sets it up:

```yaml
xpack.security.serviceAccounts.enabled: true
xpack.encryptedSavedObjects.encryptionKey: '<32+ characters>'
```

Until a space is set up, the Nightshift app shows a setup step in place of its pages:
- Users with Nightshift manage and configure privileges get an **Enable service account** button.
- Other users are told to ask an administrator.
- If service accounts are turned off, the setup step says which setting to change.

The button calls:

```
POST /internal/nightshift/investigations/service_account/_enable   # needs manage_security
GET  /internal/nightshift/investigations/service_account           # status, agentBuilder:read
POST /internal/nightshift/investigations/service_account/_disable  # teardown, no UI
```

### Accounts and roles

`_enable` creates the accounts and roles proposed in "Nightshift service accounts and required privileges", one set per space. The space is the account's scope: every role's Kibana privileges name only `space:<space>`, so an account cannot act in another space.

| Account | Role | Used by |
|---|---|---|
| `kibana/nightshift-agent-<space>` | `nightshift_agent_<space>` | Investigations, their sandbox tools, the Agent Builder hook workflows, the Slack thread workflow |
| `kibana/relay-<space>` | `nightshift_agent_<space>` | The Relay Slack bot (outside Kibana). Not bound to anything in Kibana. |
| `kibana/nightshift-automations-<space>` | `nightshift_automations_<space>` | Every Nightshift automation's workflow. Its investigations run as the agent account through the entry point. |
| `kibana/nightshift-detection-<space>` | `nightshift_detection_<space>` | Detection and context pipeline workflows an admin binds to it. |

Role names cannot start with an underscore (Elasticsearch reserves those), so the proposed `_nightshift_agent` is `nightshift_agent_<space>`.

| Role | Cluster | Indices | Kibana (`space:<space>` only) |
|---|---|---|---|
| agent | `monitor_inference` | `ai-index-idx-nightshift-cortex`: read, index, delete, auto_configure. `ai-index-idx-nightshift-semantic-memory`, `ai-index-idx-nightshift-decision-trees`: read, index, auto_configure | `nightshift` minimal_all, `agentBuilder` minimal_all, `actions` read |
| automations | `monitor_inference` | none | `nightshift` read, `agenticInvestigations` minimal_read + `investigations_all`, `agentBuilder` minimal_all, `actions` read |
| detection | `monitor_inference` | `.significant_events-detections`: read. `$.nightshift.sources.<space>.*`: read, manage | `nightshift` minimal_all, `alerting_v2_rules` all, `agentBuilder` minimal_all, `actions` read |

Nightshift's `manage-engines` sub-feature is in none of them. The automations role deviates from the proposal: a start claims the investigation's subjects, which needs `manage_investigations`. Nightshift `read` does not grant it and Nightshift `all` would add `manage_nightshift`, so it comes from the agentic investigations sub-feature. Telemetry is not in the agent role: sandbox queries use the telemetry connector's credentials.

Roles carry `metadata.managed_by: nightshift`. `_enable` brings them to the current definition on every run, so a privilege change ships with the code. A role of the same name that Nightshift did not create is never overwritten (409). Existing accounts are reused.

### Bound workflows

`_enable` installs these workflows in the space, each with `settings.run_as` set to the agent account:

- `system-nightshift-investigation-bound-<space>`: the space's entry point. It calls the global `system-nightshift-investigation` with `run-as-mode: inherit`, passing its inputs through.
- `system-nightshift-slack-thread-bound-<space>`: the Slack thread workflow, which calls the global investigation the same way.
- `system-nightshift-sandbox-materialize-workspace-bound-<space>`, `system-nightshift-agent-optimize-bound-<space>`, `system-nightshift-decision-tree-hydrate-bound-<space>`: entry points for the Agent Builder hook workflows (see below).

The investigation and hook workflows themselves are installed once, globally and unbound, at startup. A change to their YAML updates that one copy on the next boot. The bound entry points only change when their own template does. A hook entry point declares its hook's inputs, so a change to a hook's trigger inputs needs a version bump of its entry point (a snapshot test pins them together).

A workflow can only be bound to an account from an authenticated request with `manage_security`, so setup cannot happen at startup. On later boots, the dynamic-workflow upgrade reuses the existing bindings without a request.

### Agent Builder hooks

Agent Builder starts hook workflows with the request of the agent run, and the workflows engine runs a workflow started that way as the original caller. A hook of an investigation running as the service account would therefore run as the user who started it. In a space set up with service accounts, the investigation agent and the decision-tree reinforcement agent name the space's bound hook entry points instead of the global hooks, so hooks run as the agent account too.

The decision-tree reinforcement agent is private and system-owned, so only admins can see or run it. `_enable` grants the agent account the `user` role on it, as the admin setting the space up.

### Automations

An automation's workflow runs as `kibana/nightshift-automations-<space>` (`settings.run_as`), so it keeps working whoever created it. Its `nightshift.triggerInvestigation` step starts the investigation through the space's entry point, which runs it as the agent account: automations account → start → agent account, as the proposal describes.

The workflows plugin requires `manage_security` for every create, update and delete of a workflow bound to a service account. Creating, changing (including enabling or disabling) and deleting automations therefore requires `manage_security` in addition to Nightshift manage, and the routes refuse other callers before writing anything. The Automations page is read-only for them, with a callout that says why. This matches AlertZero workers.

Creating or changing an automation also requires the space to be set up. `_enable` binds automations that already exist to the automations account. When service accounts are off, automations keep running as their authors.

### `_enable`

1. Refuses with 400 when service accounts are off, 403 without `manage_security`, and 404 when the space does not exist, before writing anything.
2. Creates or updates the roles, then creates the accounts that are missing.
3. Installs the bound workflows, the entry point last, so a setup that fails part-way leaves the space reading as not set up. A failed install names the workflow.
4. Admits the agent account to the reinforcement agent, and binds existing automations to the automations account (a failure is logged per automation, not fatal).
5. Checks that every installed workflow is bound to the agent account, and fails otherwise. A workflow that fails validation (the Slack thread workflow on a deployment without the `slack2.message` trigger) is reported in the status, not fatal.

Setups of one space run one after another. `_enable` is idempotent: running it again repairs a space whose workflows were removed or are bound to another account (for example `kibana/nightshift_investigator` from an earlier version of this POC), and brings the roles up to date.

The status reports, per bound workflow, whether it is installed, enabled, valid, and which account it runs as. A space counts as set up only when its entry point is installed, enabled, and bound to the space's agent account.

### Effects

- `POST /internal/nightshift/investigations`, automatic significant-event investigations, and the investigation agent's Agent Builder availability all require the bound entry point and `xpack.security.serviceAccounts.enabled`.
- The investigation, its Agent Builder conversation, its hooks, and every `kibana.request` step run as the agent account. `executed_by` still records the user who started it.
- `_ensure` rejects any run that does not execute as the space's agent account. Anyone allowed to run workflows can start the global investigation directly, but such a run executes as them and fails before it touches an investigation.

### Known gaps

- **Chat-started investigations.** The `streams-investigation-management` skill starts `system-nightshift-investigation` by id through `execute_workflow`. That run executes as the chat user, so `_ensure` rejects it.
- **Deleted account.** If an account is force-deleted, every run fails with a token exchange error. Recovery: delete the leftover token, then run `_disable` and `_enable` again.
- **The detection account is not bound to anything yet.** Nightshift's own detection workflows still run as their callers.
- **Automations need `manage_security` to edit.** Users with only Nightshift manage can view automations but not change them.
- **Kibana application name.** The roles use `kibana-.kibana`, the default. A deployment with a custom `kibana.index` needs the matching application name.

## How investigations are stored and run

An investigation is an Agent Builder conversation with the `investigation` template. The investigation id is the conversation id. The `agenticInvestigations` plugin owns everything around it:

- **Subjects.** What is investigated: alerts (with their snapshot), significant events, questions, and Slack threads. Each subject has its own document and attachment.
- **Impact, hypotheses, and proposed actions.** The agent records these.
- **The query API.** `GET /internal/investigations/investigations[/{id}]`, used for reads.

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

### Reading investigations

Readers use the shared query API: the Nightshift landing page (list, severity counts, cards from `agenticInvestigations.InvestigationCard`, Agent Builder's conversation details flyout for one investigation), the significant-event flyout (`@kbn/investigation-output`), the alert "Investigate" action (list by `subject_id=<alert id>`), and significant events' investigation status route.

Nightshift does not delete investigations. The Significant Events reset leaves the investigation conversations and their shared data (subjects, claims, impact, hypotheses) alone: Agent Builder has no cross-space delete, and the shared data has no owner that would limit a sweep to Nightshift's investigations.

### Continuing an investigation

Investigations are public conversations, and Agent Builder lets anyone who can converse in one write its subjects, metadata, and attachments. So any identity that can read an open investigation continues it: a workflow step, its automations, the Slack thread workflow, and a user over HTTP all add to the same investigation.

### Slack threads

`POST /internal/nightshift/investigations/_slack_thread` finds a thread's investigation by its `slack_thread` subject, keyed `team:<T>/channel:<C>/thread:<ts>`. It does not set or read the Agent Builder conversation origin: Agent Builder sets that when the Slack relay calls its callback converse API, and a relay chat about the same thread may carry it.

With `create`, the route creates the investigation as the identity that runs the Slack workflow. The new investigation has the thread as its subject, claimed so that concurrent creates for one thread agree on one investigation. The thread's status message is recorded on that subject as `slack.status_message_ts`.

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
