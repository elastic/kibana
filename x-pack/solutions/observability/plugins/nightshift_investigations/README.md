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

`read_investigations` lets a user with Nightshift `read` get, list, and count investigations through the shared query API; every write still needs `manage_investigations`. UI capabilities are scoped to the feature that owns them, so capabilities like `agenticInvestigations.showInvestigations` and `proposals.showProposals` still need the `agenticInvestigations` and `proposals` features. Opening the investigation conversation in Agent Builder still needs the Agent Builder feature privileges.

## Service account (required, POC)

Nightshift runs investigations only as its service account, `kibana/nightshift_investigator`. There is no fallback that runs them as the user who starts them. A space can use Nightshift only after an admin sets it up:

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

`_enable` runs with the caller's privileges:
1. It creates the `nightshift_investigator` role and service account if they are missing. Existing ones are reused unchanged.
2. It installs two workflows in the caller's space, both with `settings.run_as` set to the account:
   - `system-nightshift-investigation-bound-<spaceId>`, which uses the same YAML as `system-nightshift-investigation`.
   - `system-nightshift-slack-thread-bound-<spaceId>`, whose investigation call targets the space's bound investigation.

Running `_enable` again repairs a space whose setup was removed.

A workflow can only be bound to the account from an authenticated request with `manage_security`, so setup cannot happen at startup. On later boots, the dynamic-workflow upgrade reuses the existing bindings without a request. The global `system-nightshift-investigation` and `system-nightshift-slack-thread` are no longer installed, and the boot-time orphan cleanup removes copies left from earlier versions.

**Effects**
- `POST /internal/nightshift/investigations`, automatic significant-event investigations, and the investigation agent's Agent Builder availability all require the bound workflow and `xpack.security.serviceAccounts.enabled`.
- The investigation, its Agent Builder conversation, and every `kibana.request` step run as the service account. `executed_by` still records the user who started it.

**Known gaps**
- **Agent Builder hook workflows.** `system-nightshift-sandbox-materialize-workspace`, `system-nightshift-agent-optimize` and `system-nightshift-decision-tree-hydrate` run as the user who started the investigation. Agent Builder starts them with the service account's scoped request, and the workflows engine unwraps that to the original caller (`getWorkflowOriginalRequest`). It keeps the service account only through a `workflow.execute` step with `run-as-mode: inherit`, and hooks are not steps.
- **Chat-started investigations.** The `streams-investigation-management` skill starts `system-nightshift-investigation` by id through `execute_workflow`. That id is no longer installed, and the per-space id includes the space, which the static skill text cannot name.
- **Deleted account.** If the account is force-deleted, every run fails with a token exchange error. Recovery: delete the leftover token, then run `_disable` and `_enable` again.
- **Broad role.** The role is deliberately broad for the POC: Kibana `all` on every space, plus read on observability data.

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

The `nightshift.sendNotifications` step validates the persisted workflow execution, its investigation binding, and current ownership. Investigation and execution IDs may differ for explicit continuation. It returns persisted `sent`, `failed`, and `unconfirmed` counts for the requested execution and phase; full diagnostics are available through authorized attachment reads. Notification-step failures continue the investigation workflow, while persistence failures stop further posts within that step. There is no automatic claim expiry, resend, or routing-document cleanup on investigation or space deletion. Outbound thread references do not register incoming Slack-thread continuation.
