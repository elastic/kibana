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

Earlier versions stored investigations as Nightshift saved objects, settled by a reconciliation task and served by `GET`/`PATCH /internal/nightshift/investigations[/{id}]` and `/follow`. That saved object type, the task, and those routes are removed. The type name is reserved in core's `removed_types.json`, so an upgrade drops leftover documents, and the task type is listed in Task Manager's removed types, so a scheduled task is marked unrecognized instead of run.

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

The workflow's concurrency key is `investigation:<id>` with a `queue` strategy, so runs of one investigation never overlap. The key also registers the workflow as a driver workflow, so the investigation reads as in progress while a run is queued or running.

### Reading and deleting investigations

Readers use the shared query API: the Nightshift landing page (list, severity counts, cards from `agenticInvestigations.InvestigationCard`, Agent Builder's conversation details flyout for one investigation), the significant-event flyout (`@kbn/investigation-output`), the alert "Investigate" action (list by `subject_id=<alert id>`), and significant events' investigation status route.

`deleteAllInvestigations()` on the start contract deletes, through `agenticInvestigations.deleteSubjectInvestigationDataAcrossSpaces()`, the subjects, claims, impact, and hypotheses of every investigation with subjects in every space. The Agent Builder conversations stay; Agent Builder has no cross-space delete.

### One identity per investigation

Agent Builder lets only the conversation owner write subjects, metadata, and attachments. So one identity must create and continue an investigation. Use a service account for the investigation workflow, its automations, and the Slack thread workflow.

A start will not continue an investigation it does not own. It opens a new one instead and logs a warning.

The start judges ownership by Agent Builder's owner check. (Agent Builder resolves the user profile id of an API key's creator for fake requests too, so a workflow step and the HTTP calls it makes count as the same owner.) If a run reaches an investigation it does not own anyway, the agent still works in the conversation, but subjects and the reopen are skipped. Cross-identity follow-ups need converse-access writes in Agent Builder.

### Slack threads

`POST /internal/nightshift/investigations/_slack_thread` finds a thread's investigation by the conversation origin `team:<T>/channel:<C>/thread:<ts>`, which is the key Agent Builder uses for Slack. If that origin belongs to another conversation, it falls back to the thread's `slack_thread` subject.

With `create`, the route creates the investigation as the identity that runs the Slack workflow. The new investigation gets that origin and has the thread as its subject. The thread's status message is recorded on that subject as `slack.status_message_ts`.

The Slack connector delivers each event at least once. The workflow passes Slack's event id as `event_id`, and the route records it on the thread's subject in `slack.seen_event_ids` (the latest 50). An event the thread already recorded is answered with `duplicate: true`, and the workflow skips it. The workflow runs one call per thread at a time, so two deliveries of one event cannot race each other.
