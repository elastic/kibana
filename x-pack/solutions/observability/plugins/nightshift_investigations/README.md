# Nightshift Investigations Plugin

This plugin provides the domain API for starting and reading investigations, independent of which entity (significant event, alert, etc.) triggers them.

## Scheduled automations

Hourly, daily and weekly automation presets generate calendar-based workflow triggers. Daily and
weekly times, and inclusive hourly windows, use the saved IANA timezone and follow daylight saving
time. Custom cron execution is deferred. Unsupported schedules are ignored when loading the form
and rejected by the API.

Schedule rows store structured presets and generate RRULE directly. Daily and weekly presets use
`time` in `HH:mm` format; weekly presets also require `daysOfWeek` (0 for Sunday through 6 for
Saturday). Hourly presets optionally use `hourWindow: { start, end }` with inclusive whole hours.
All presets accept an IANA `timezone`, defaulting to UTC.

Scheduled automations require nonempty instructions (at most 5,000 characters). Each tick starts a
fresh investigation using a `manual` question subject with an `automatic` trigger type, so normal
automatic-investigation quotas apply. An assessment that finds no issues still creates a conversation.
The Investigate/Ask selector does not select a different execution path.

`runtime.dailyDispatchLimit` caps the new investigations an automation opens, per space and UTC day.
Attempts that continue an open investigation and starts with the `manual` trigger type do not count
and are never blocked, even when the limit is reached. For an automatic attempt that would open a new
investigation, the investigation client charges the automation budget, then the global
automatic-investigation quota. Each charge is the check: the budget slot is reserved atomically, so
overlapping runs across Kibana instances cannot exceed the limit. An attempt denied by either limit
creates no investigation and appears as skipped in automation history: with reason `daily_limit`
when the automation limit denies it, and with reason `investigation_limit` when the global quota
denies it. The automation limit is checked first, so `daily_limit` wins when both are reached. When
the global quota denies an attempt, the client gives back the automation slot. The client also gives
it back when the attempt loses the subject claim to a concurrent start and continues that
investigation instead; the global quota has no refund, so that case still counts against it. An
attempt that fails after claiming its subjects keeps its slot: the claim stays live for two minutes,
and an attempt that joins it in that window continues the claimed investigation and gives back only
its own slot, so the investigation counts once. A failure while the investigation runs does not give
back either slot. The limit is at least 1, and an omitted limit allows unlimited new investigations.
To stop an automation from opening investigations, disable it. Changing the limit takes effect on
the next attempt.

The API-only `scopeQuery` field is forwarded as `scope_query` guidance in the investigation context.
It guides the agent's telemetry filters; it is not an enforced data-access boundary. The optional
`runtime.timeoutSeconds` bounds the investigation workflow started by that run. When set, the generated
automation workflow gets an additional 60 seconds for setup and returning the investigation result.
The stored managed investigation definition and its default timeout are unchanged.

Only one schedule row is supported per automation. It can coexist with alert rows; each source has a
separate guarded investigation step. Alert publication opt-in and alert snapshot resolution are
separate work. Existing saved schedules activate on their next valid save or enable action, with no
automatic workflow rewrite at deployment.

## Requirements

Nightshift investigations are being moved onto the shared `agenticInvestigations` plugin (an investigation is an Agent Builder conversation) and its proposed actions onto the `proposals` plugin. Both are optional dependencies and disabled by default:

```yaml
xpack.agenticInvestigations.enabled: true
xpack.proposals.enabled: true
```

They are **not** enabled in any serverless or stateful default config yet. Enabling them adds visible surface (Kibana features in role management, workflow step types, the proposals managed workflow), so that waits until the shared investigation experience is ready. Until then, environments that run Nightshift (for example customer zero) enable both in their own config, and local development adds them to `config/kibana.dev.yml`. When either plugin is disabled, Nightshift investigations report themselves unavailable.

### Privileges

The `agenticInvestigations` and `proposals` routes require the `read_investigations`, `manage_investigations`, `read_proposals`, and `manage_proposals` API privileges. The Nightshift feature grants them, so a Nightshift user does not need the `agenticInvestigations` or `proposals` feature privileges to call those routes:

| Nightshift privilege | Grants                                                                               |
| -------------------- | ------------------------------------------------------------------------------------ |
| `all`                | `read_investigations`, `manage_investigations`, `read_proposals`, `manage_proposals` |
| `read`               | `read_investigations`, `read_proposals`                                              |

These API privileges are not scoped to Nightshift: they cover every agentic investigation and proposal in the space, including those created by other solutions, plus the investigation routes that share `manage_investigations` (status, assignment, impact, user profile suggestions).

Starting an investigation also needs Agent Builder `all` (the start route's own requirement), execute access to workflows (the start runs the investigation workflow as the caller), and read access to connectors (availability checks that an inference connector exists for the investigation agent). The Scout write-path tests run with exactly that role.

`read_investigations` lets a user with Nightshift `read` get, list, and count investigations through the shared query API; every write still needs `manage_investigations`. UI capabilities are scoped to the feature that owns them, so capabilities like `agenticInvestigations.showInvestigations` and `proposals.showProposals` still need the `agenticInvestigations` and `proposals` features. Opening the investigation conversation in Agent Builder still needs the Agent Builder feature privileges.

## Service accounts

Nightshift runs investigations only as the agent service account, `nightshift_agent`. There is no fallback that runs them as the user who starts them, so a space can use Nightshift only after an admin sets it up. Until then, every Nightshift page shows the onboarding with "Enable Elastic Nightshift" as its first step: users with `manage_security` get the button, others are told to ask an administrator, and the step says so when service accounts are turned off. The plan and the remaining PRs are tracked in elastic/obs-execution#570.

### Accounts and roles

There is one account of each kind per deployment, shared by every space. Each holds a role that Nightshift never creates or changes. On Serverless, where Nightshift ships, the roles are elasticsearch-controller predefined roles, whose names start with `_`. Stateful Elasticsearch has no such roles, so on stateful they are created by whoever sets up the deployment, named like the account. Their definitions are in `common/service_account_roles.ts`. Scout tests and evals create them with `ensureNightshiftServiceAccountRoles`, so they also run against Elastic Cloud Hosted.

| Account name | Role (stateful / Serverless) | Used by |
|---|---|---|
| `nightshift_agent` | `nightshift_agent` / `_nightshift_agent` | Investigations, their sandbox tools and Agent Builder hooks |
| `nightshift_automations` | `nightshift_automations` / `_nightshift_automations` | Automation workflows |

The roles cover every space. Where an account acts is decided by the workflows bound to it, which are installed per space.

### Setting up a space

On a local stateful stack, create the roles once (Serverless has its own):

```bash
node -r @kbn/setup-node-env x-pack/solutions/observability/plugins/nightshift_investigations/scripts/create_service_account_roles.ts
```

Pass `--es-url` and `--auth` for a stack that is not on `http://localhost:9200` with `elastic:changeme`.

On a local Serverless project (`yarn es serverless --projectType observability --productTier complete` and `yarn start --serverless=oblt`) the roles come from Serverless itself, and Kibana presents the project type's UIAM certificate (`kibana_serverless_observability.crt`, elastic/kibana#299809), without which UIAM lists no accounts and refuses to let Kibana run as one. One setting is still needed:

- `--server.publicBaseUrl=http://localhost:5601`, so the investigation's `kibana.request` steps reach Kibana instead of a cloud URL that does not resolve locally.

Then enable service accounts and set the space up:

```yaml
xpack.security.serviceAccounts.enabled: true
xpack.encryptedSavedObjects.encryptionKey: '<32+ characters>'
```

```
POST /internal/nightshift/investigations/service_account/_enable   # needs manage_security
GET  /internal/nightshift/investigations/service_account           # status, read_nightshift
POST /internal/nightshift/investigations/service_account/_disable  # teardown
```

Only the service accounts backend assigns account ids: `kibana/<name>` on stateful, a generated id on Serverless (UIAM). So the caller finds or creates the accounts first, as the current user, with `ensureNightshiftServiceAccounts` from `common`, and passes their ids to `_enable` as `{ "serviceAccountIds": { "agent": "...", "automations": "..." } }`. The setup step in the app does both on one click.

Every space does that: the account directory is the one source of which account a space binds to, so an account recreated outside Kibana is picked up on the next setup. The accounts are shared, so the lookup finds the ones the first space created and later spaces reuse them. `ensureNightshiftServiceAccounts` lists the accounts by name and reuses one Kibana can run as. It creates a missing account only after checking that its role exists, so a stateful deployment without the roles gets a clear error instead of an account without privileges.

`_enable`:

1. Refuses with 400 when service accounts are off, 403 without `manage_security`, and 404 when the space does not exist, before writing anything.
2. Installs the space's bound workflows with `settings.run_as` set to the agent account, the entry point `system-nightshift-investigation-bound-<space>` last. The entry point also keeps the automations account's id, as its `automationsServiceAccountId` template value. A setup that fails part-way leaves the space reading as not set up. A failed install names the workflow.
3. Turns bound workflows an admin disabled back on.
4. Checks that every installed workflow is bound to the agent account and that the entry point is enabled, and fails otherwise.

Setups of one space run one after another. `_enable` is idempotent: running it again repairs a space whose workflows were removed, disabled, or bound to another account. A workflow can only be bound from an authenticated request with `manage_security`, so setup cannot happen at startup. On later boots, the dynamic-workflow upgrade reuses the existing bindings.

A space counts as set up when its entry point is installed, enabled and bound to an account; that account is the space's agent account, and every other bound workflow has to run as it too. Each space keeps its own ids, so spaces are set up independently. `_disable` uninstalls the space's bound workflows and keeps the accounts, which other spaces share.

### What setup changes

- Starting an investigation, automatic significant-event investigations, and the investigation agent's Agent Builder availability require `xpack.security.serviceAccounts.enabled` and the space's bound entry point.
- The investigations client starts the entry point with `triggeredBy: nightshift-investigations` (`NIGHTSHIFT_INVESTIGATIONS_TRIGGER_SOURCE`). The entry point fails any other run, so the generic workflow run API cannot start an investigation as the agent account.
- The entry point calls the global `system-nightshift-investigation` with `run-as-mode: inherit`. A change to the investigation YAML updates that one global copy on the next boot.
- `_ensure` rejects any run that does not execute as the agent account. Anyone allowed to run workflows can start the global investigation directly, but such a run executes as them and fails before it touches an investigation.
- The Slack thread workflow is installed per space, bound to the agent account (`system-nightshift-slack-thread-bound-<space>`), and no longer globally. It only runs when a `slack2.message` event starts it.

### Automations

An automation's workflow runs as the space's automations account (`settings.run_as`), the one kept on its entry point when the space was set up, so it keeps working whoever created it. Its `nightshift.triggerInvestigation` step starts the investigation through the space's entry point, which runs it as the agent account.

The workflows plugin requires `manage_security` for every create, update and delete of a workflow bound to a service account. Creating, changing (including enabling or disabling) and deleting automations therefore requires `manage_security` in addition to Nightshift manage, and the routes refuse other callers before writing anything. The Automations page shows the edit actions disabled for them, with a callout that says why. Creating or changing an automation also requires the space to be set up. `_enable` binds automations that already exist. When service accounts are off, automations keep running as their authors.

### Agent Builder hooks

Agent Builder starts hook workflows with the request of the agent run, and the workflows engine runs a workflow started that way as the original caller. The investigation agent and the decision-tree reinforcement agent therefore always name the space's bound hook entry points, so hooks run as the agent account:

- `system-nightshift-sandbox-materialize-workspace-bound-<space>`
- `system-nightshift-agent-optimize-bound-<space>`
- `system-nightshift-decision-tree-hydrate-bound-<space>`

Each calls its global hook with `run-as-mode: inherit`. A hook entry point only runs when Agent Builder starts it as a hook (`triggeredBy: agent-builder-hook`, which only server code sets), so nobody can run it directly with made-up round content and plant knowledge as the agent account.

There is no fallback to the global hooks. Setup installs the three entry points, and a space without them cannot run Nightshift at all: availability requires the bound investigation entry point, so a run that reaches a hook is always in a set-up space.

The decision-tree reinforcement agent is shared: everyone can run it, so agent optimize can run it as the agent account, and only admins can change it. Agent Builder still hides it from UI listings, and its submit tool writes decision trees as the caller.

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

`POST /internal/nightshift/investigations/_slack_thread` finds a thread's investigation by its `slack_thread` subject, keyed by the Relay's thread key `slack:<T>:<C>:<ts>`. A Slack-trigger automation records the same subject for the message that started it, taking the key from the event's `externalConversationId`. It does not set or read the Agent Builder conversation origin: Agent Builder sets that when the Slack relay calls its callback converse API, and a relay chat about the same thread may carry it.

With `create`, the route creates the investigation as the identity that runs the Slack workflow. The new investigation has the thread as its subject, claimed so that concurrent creates for one thread agree on one investigation. The thread's status message is recorded on that subject as `slack.status_message_ts`.

The Slack connector delivers each event at least once. The workflow passes Slack's event id as `event_id` and its own execution id as `execution_id`, and the route records both on the thread's subject in `slack.seen_events` (the latest 50). An event another execution already recorded is answered with `duplicate: true`, and the workflow skips it; the same execution asking again, for example on a retried step, is not a duplicate. A run whose investigation failed calls the route again with `release_event: true`, which removes the event as recorded for that execution, so a redelivery of the event is handled. The workflow runs one call per thread at a time, so two deliveries of one event cannot race each other.

## Sandbox connectors

The investigation agent reaches external systems from its sandbox through Kibana connectors. A connector is usable from the sandbox when the actions plugin reports it as sandbox capable and the caller can execute it; the sandbox bash tool then injects the connector's config and auth headers as `CONNECTOR_*` environment variables for one command (see the actions plugin's `getSandboxCredentials`).

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

Destinations and delivery history live in a hidden, readonly `nightshift.notification_routing` attachment backed by its own index. Endpoints are deduplicated by type, connector ID, and canonical parameters while retaining automation attribution. The 5-association limit applies to retained endpoints and automation identities, not execution or attempt history. The started phase, or an early failed phase, adds destinations and freezes each execution's participants; explicit follow-up executions notify all retained destinations.

The investigation workflow sends a started message, stores its confirmed Slack thread reference, and replies with completion or failure. Later executions reuse that thread. An explicitly supplied parent timestamp is also supported. Failure delivery initializes routing even before the started step runs. A failure without an existing or explicit thread posts directly to the configured channel and stores its confirmed thread reference. Terminal delivery selects one persisted outcome, preventing contradictory completion and failure messages.

Each execution, destination, and phase is claimed as `unconfirmed` before connector execution. The shared attachment factory handles versioned writes, and the connector executes once using workflow authentication, the investigation's space, and the abort signal. A confirmed message timestamp produces `sent`; connector error responses produce `failed`; exceptions, cancellation after claiming, and missing timestamps remain `unconfirmed`. Replay skips all existing attempts. An uncertain root blocks automatic root recreation across later executions; a definitely failed root may be attempted again by a later execution.

The `nightshift.sendNotifications` step validates the persisted workflow execution and its investigation binding, and reads the investigation (title, severity, summary, impact, first pending proposed action) through the shared query API. Until Agent Builder titles the investigation, messages use the run's `title` input. Investigation and execution IDs may differ for explicit continuation. It returns persisted `sent`, `failed`, and `unconfirmed` counts for the requested execution and phase; full diagnostics are available through authorized attachment reads. Notification-step failures continue the investigation workflow, while persistence failures stop further posts within that step. There is no automatic claim expiry, resend, or routing-document cleanup on investigation or space deletion. A confirmed root post from the Elastic Slack app claims its thread as a `slack_thread` subject using the thread key the Relay returns, so a mention or reply in it continues the investigation. Posts through a custom Slack connector and replies under a caller-named message register nothing here; a thread another investigation holds stays with it.

### Investigation quota notice

When the global investigation quota denies an automatic start from a Slack trigger,
`nightshift.triggerInvestigation` skips the start with `investigation_limit` and replies in the
triggering Slack thread, once per Slack channel and UTC day. The reply says the limit was reached
and links the Nightshift settings in the workflow's space for an admin to raise it, or omits the
link when no Kibana URL is known. The once-a-day marker is claimed before posting, so a failed post is not
retried. Alert, schedule, and manual runs post nothing.

### Workflow failures

The managed investigation workflow uses `settings.on-failure.fallback` to invoke
`nightshift.handleInvestigationFailure` for model resolution, agent setup, agent pre-execution,
agent execution, and step timeout errors. Persistence has the same fallback after its explicit
retries are exhausted because step-level error handling overrides workflow-level handling.
The handler records the validated execution and subjects, creates a missing investigation conversation,
and preserves an existing conversation's open/closed state. It emits the existing failed lifecycle
trigger and uses the same notification routing and delivery claims as `nightshift.sendNotifications`.
Notification errors do not replace the original workflow error. Lifecycle trigger emission remains
best effort; Slack delivery claims suppress replayed sends.

Once the conversation exists, the handler also appends an `investigation_run_failed` timeline event
with the run's execution ID, original request when available, and failure reason. This happens before
subject recovery so an attachment error does not erase the explanation. The entry is visible in Agent
Builder even when the agent never recorded a chat round, and is available as historical context to a
later agent run. Request and reason text are each capped at 10,000 characters. A failed timeline write
is logged and does not block the existing notification path. The custom-event API assigns fresh IDs,
so replay or concurrent handling can produce duplicate timeline entries; Slack deduplication is
unchanged. Existing failed conversations are not backfilled.

Workflow-level timeout, cancellation, Task Manager interruption, and resume-scheduling failure bypass
these fallbacks. Reporting those outcomes needs a durable Workflows terminal-outcome mechanism,
coordinated with recovery (#1677), before #1820 can be closed. Future intentional-cancellation messages
should say "Investigation stopped". The separate Slack follow-up workflow's status-message editor is
unchanged; consolidating it with investigation-owned notifications remains follow-up work.
