# AlertZero plugin (`@kbn/alertzero-plugin`)

Security Watch investigation queue and catalog behind the `securitySolution:enableAlertZero` advanced setting.

## Enablement

### Runtime dependencies

AlertZero's upgrade and access-denied screens can load when Agent Builder, Proposals, or Agentic Investigations is disabled. These plugins are optional dependencies of the shell, but all three are required to run the feature. For example, enable Agentic Investigations with:

```yaml
xpack.agenticInvestigations.enabled: true
```

When a runtime dependency is absent, AlertZero does not register its managed-workflow owner or start feature services. Eligible users see an unavailable screen and the APIs return 503. An insufficient subscription still shows the appropriate upgrade gate first.

### Two independent gates, with different scopes and different jobs

### `securitySolution:enableAlertZero` — the user-facing, per-space gate

A namespace-scoped Kibana advanced setting (default `false`), registered by this plugin in `server/ui_settings.ts`. Turn it on in **Stack Management → Advanced Settings** for the space you want AlertZero in, or pin it for a whole deployment:

```yaml
uiSettings.overrides:
  securitySolution:enableAlertZero: true
```

It controls three things, and both enabling and disabling take effect live. The setting is still registered with `requiresPageReload: true`, so Advanced Settings prompts for a reload, but none of the surfaces below needs one:

| Surface | When off |
|---------|----------|
| Browser app `/app/alertzero` | Registered but `AppStatus.inaccessible`; every page renders core's "Application unavailable" |
| Security solution navigation | AlertZero nodes disappear — core empties `visibleIn` and `deepLinks` for an inaccessible app, and chrome drops nav nodes whose link has no nav link. The navigation trees hold no check of their own |
| HTTP `/internal/alertzero/*` | `404`, via the `withAlertZeroEnabled` wrapper on every route |

The Agent Builder conversation template UI for investigations and escalations (the details flyout and its tabs) is **not** gated by this setting. The `agenticInvestigations` plugin registers it whenever Agent Builder is available, so the flyout is the same in every space and every solution. See the agentic investigations README, "Template UI and gating".

### `xpack.alertzero.enabled` — the deployment kill switch

A plugin config flag, defaulting to `false`. It is *not* the user-facing toggle; it is a deployment-level gate that must be on for AlertZero to register anything. Turning it on or off requires a restart:

```yaml
xpack.alertzero.enabled: true
```

- **`xpack.alertzero.enabled`** — deployment-level plugin gate (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for AlertZero are omitted automatically.

AlertZero reads live data only. To work on the UI without waiting for Workers to produce proposals, seed the queue with `scripts/seed_proposal_attachments.sh`, which writes real proposal documents and Agent Builder conversations into your local stack.

Everything in the table below is skipped when it is off — including registration of the advanced setting itself, which is why `withAlertZeroEnabled` can never read an unregistered key.


### Subscription and authorization

UI and HTTP API access additionally require:

- ECH: an available, active license supporting Enterprise.
- Serverless: the **Security** product's **Complete** tier. Security Serverless supplies this entitlement through `setServerlessTierAvailable` on the server setup and browser start contracts. Other products' Complete tiers do not qualify.
- AlertZero **Read** to view content and **All** for AlertZero-owned write actions, such as worker settings. Changing a worker also requires the `manage_security` cluster privilege; enabling or disabling one also requires Workflows managed-workflow update access.

An insufficient subscription or missing AlertZero Read access removes AlertZero navigation and deep links while keeping direct URLs mountable for the environment-specific upgrade or access-denied screen. The queue additionally requires **Proposed Actions Read** (`proposals`); without it, the queue shows a gate naming the missing privilege before requesting queue data. This additional privilege does not affect navigation visibility or access to worker settings. AlertZero Read-only users cannot edit worker settings. Proposal approval, dismissal, and revision are governed by **Proposed Actions All/Manage**, independently of AlertZero Write. An approved action runs as the approver, so they also need the action's own privileges (for example Alerts All or Rules All). The revision tool still checks the per-space AlertZero setting. The application boundary prevents feature content from mounting until access is resolved and responds to license changes.

Every AlertZero HTTP route uses `withAlertZeroEnabled` to check the per-space setting and subscription before running its handler, alongside declarative read/write authorization. Setting-off requests return 404 for otherwise authorized callers; subscription and authorization failures return 403.

Both AlertZero attachment renderers in Agent Builder also observe availability after registration. Losing eligibility unmounts their content and stops active query observers; restoring eligibility shows the content again. Stored attachments and the authorization of their underlying shared APIs are unchanged.

None of this gates the investigation and escalation details flyout. The `agenticInvestigations` plugin registers that flyout regardless of the subscription, the setting and `AccessBoundary`; its write actions follow the Agentic Investigations UI capabilities or API privileges, and its proposed actions the Proposed Actions privileges. The AlertZero feature grants those API privileges: **All** grants `read_investigations`, `manage_investigations`, `read_escalations` and `manage_escalations`, and **Read** grants `read_investigations` and `read_escalations`. So an AlertZero All user can assign, change status, close and escalate in the flyout without the Agentic Investigations feature.

AlertZero's own queue and escalations pages gate those actions on the Agentic Investigations UI capabilities and AlertZero **All** (`useAlertZeroInvestigationsCapabilities`).

These availability checks gate **UI and API access only**. They do not stop, disable, or unschedule background work when a subscription changes.

### Worker lifecycle

Workers install when a user enables one or saves settings on one. There is no Watch-level enablement switch. Disable leaves the per-space Worker document and its settings in place. The only bulk cleanup is turning `xpack.alertzero.enabled` off and restarting — AlertZero then stops registering as a managed-workflow owner and orphan cleanup force-deletes its documents across every space. Turning the *advanced setting* off does **not** trigger cleanup; it only hides the surfaces.

Managed-workflow ownership remains registered when optional runtime dependencies are missing, so their absence does not cause installed AlertZero workflows to be deleted as orphans.

Each Worker runs as its own `alertzero_<worker>` service account, with a role of the same name. AlertZero creates both from the browser, with the admin's privileges, when a Worker is turned on without an account, and reuses existing ones without changing them.

The Worker's child workflows run as the same account. Every `workflow.execute` and `workflow.executeAsync` call in a Worker's chain sets `run-as-mode: inherit` and names the child by a literal `workflow-id`. Inheritance requires a literal id, and the step input schema ignores unknown keys, so a misspelled `run-as-mode` silently runs the child as the original caller. Action workflows are the exception: proposals start them by a templated id, so they keep the default identity. `service_account_inheritance.test.ts` enforces both rules.

Inheritance needs a parent that runs as a service account. Running a child workflow such as a review or sweep by hand fails at its first child call, so run the Worker instead. The Attack Discovery pipeline that `security.attack-discovery.run` starts is a known gap: its alert retrieval, generation and validation workflows still run as the user who enabled the Worker, because the step starts them from code. The step itself runs as the Worker's account, so its generation events are attributed to that account and tagged, and every user in the space with access to Attack Discovery sees them in the generations view. The Attack discoveries it persists are attributed to the user who last enabled the Worker or saved its settings.

**Known limitation (MVP):** AlertZero does not detect or repair a Worker whose role or service account was deleted. If the role is deleted, the Worker's runs fail with authorization errors until the role is re-created with the same name and privileges. If the account is deleted (Kibana only allows this with force while Workers are bound to it), the Worker's runs fail until it is re-bound to a new account through the worker API (`PATCH /internal/alertzero/workers/{workerId}` with a new `settings.serviceAccountId` and the Worker's current `settingsRevision`). Detecting and repairing both cases is planned post-MVP.

To inspect a Worker's installed managed workflow — its rendered YAML, triggers, and executions — in the Workflows UI, also set:

```yaml
uiSettings.overrides:
  workflows:ui:showManagedWorkflows: true
```

This is optional. AlertZero's own Watch pages work without it; it only affects what the Workflows UI lists (default `false`).

### When the kill switch is off (`xpack.alertzero.enabled: false`) — no production pollution

| Surface | Behavior |
|---------|----------|
| `securitySolution:enableAlertZero` | Not registered (absent from Advanced Settings) |
| HTTP `/internal/alertzero/*` | Not registered |
| Kibana feature / privileges | Not registered |
| Browser app `/app/alertzero` | Not registered (nav links to `alertzero` / `alertzero:*` are removed by chrome) |
| Managed workflow **owner** | Not registered (`registerManagedWorkflowOwner` skipped) |
| Managed workflow initialization | Not called |
| Leftover installed Worker documents | Global Workflows orphan cleanup removes docs whose owner is unregistered |

With the kill switch on but the advanced setting off, the Kibana feature privileges *are* registered — `features.registerKibanaFeature` cannot be scoped per space — so the `alertzero` read/write privileges appear in the Roles and Spaces pickers regardless of the per-space toggle.

Definitions still exist in `@kbn/workflows/managed` (code registry only). Worker definitions are **not** installed into `.workflows-*` until a user enables that Worker or saves settings on it. AlertZero startup installs only the three global rule workflows before `ready()` reconciles already-installed dynamic documents.

The only always-on cost of a soft flag is the tiny public plugin entry bundle (~page-load limit); it registers nothing when disabled.

### Live data mode (default)

Real data is served by default. Keep these in mind when running AlertZero in shared or production environments:

- Watch reads require only `alertzero_read`; AlertZero owns the catalog projection and its managed definitions. Recent-run enrichment soft-fails when execution history is unavailable.
- Settings writes (autonomy, schedule, extras) require `alertzero_write`; managed install is requestless, so the AlertZero route is the authorization boundary for those fields.
- Enable/disable also requires Workflows `workflowsManagement:update` **and** `workflowsManagement:managed:update`. `workflows:all` does **not** include `workflow_update_managed` — that sub-feature must be granted explicitly.
- Autonomy and enablement are durable per Worker. There is no Watch-owned settings write path.
- Enabling a Worker is refused while the space has no AI model to run it on: no LLM connector and no Elastic Managed LLM (EIS), or "use only the default connector" is on with no default set. Every Worker then reports `blockingReasons: ['no_model']`, its switch can't be turned on, and `PATCH enabled: true` returns a 400. The stored `enabled` value is never changed, and switching a Worker off or saving its settings still works. Adding any chat connector, or running `node scripts/eis.js` against a running stack, unblocks it.

### Skills projection

Skills are only projected from real data. At startup, AlertZero provisions the required Agent Builder agent in every space that has an installed watch before `ready()` runs reconciliation, so skills resolve correctly in non-default spaces on first request.

There is no skills route. Skills ride along on each Worker returned by `GET /internal/alertzero/workers`, projected per space from live workflow definitions:

- Each `ai.agent` step in a workflow's YAML contributes the skills it can invoke. The projection walks all step branches (if/else, cases, parallel branches) so nested agent steps are found.
- If the step has a `configuration_overrides.skill_ids` list those IDs are used, even when the step's agent-id cannot be resolved from Agent Builder. Otherwise the agent's own `configuration.skill_ids` are used, plus any `baseConfiguration.skill_ids` from its type.
- Results are cached per space with a 5-minute TTL. The cache is invalidated immediately after any watch enable, disable, or settings write so the next read reflects the current list of projected skills.

## Chrome strategy (PR1)

AlertZero is a **standalone Security-category app** (`/app/alertzero`) that **uses platform Kibana chrome**:

- Does **not** hide the Kibana top header (search, help, AI Agent, user menu)
- Does **not** render a custom left rail or Tour/Help/user utilities
- Slots Throughline-ordered destinations into the **Security solution nav** (ESS + serverless trees)
- Platform footer stays as on Security `main`: Launchpad, Developer tools, Settings / stack management, collapse
- **Discover** uses the platform `{ link: 'discover' }` destination (real `/app/discover`)
- **Dashboards** uses Security’s real dashboards destination (same Throughline slot; no AlertZero stub)
- **Chat** is Agent Builder's own conversation page; AlertZero links out to it rather than hosting it
- Watches keeps a **content-area** secondary nav (Workflows / Skills / … stubs)

## Routes

| UI route | Purpose |
|----------|---------|
| `/app/alertzero` | Brief — Investigation queue |
| `/app/discover` | Real Discover (via Security / AlertZero nav Discover item) |
| `/app/security/dashboards` | Real Security dashboards (via Throughline Dashboards item) |
| `/app/alertzero/watches` | Watch catalog (`system-security-watch-*`) |
| `/app/alertzero/watches/:watchId` | Watch detail |
| `/app/alertzero/watches/workflows` … `/guardrails` | Watches section stubs |

An investigation has no route of its own: it is a templated Agent Builder conversation, so its
details open in Agent Builder's conversation flyout (`?selectedConversationId=` on the queue) and
its chat opens at `/app/agent_builder/agents/{agentId}/conversations/{id}`. The flyout UI is
registered by the `agenticInvestigations` plugin; AlertZero's queue pages import its shared hooks,
signals, query client and modals from `@kbn/agentic-investigations-plugin/public`.

### Security left-rail order (when `securitySolution:enableAlertZero` is on)

**AlertZero → Discover → Dashboards → Escalations → Watches**, then the rest of Security’s existing destinations (including the platform **More** overflow — not an AlertZero stub).

### Internal API (`/internal/alertzero/*`)

| Method | Path |
|--------|------|
| GET | `/internal/alertzero/watches` |
| GET | `/internal/alertzero/watches/{watchId}` |
| GET | `/internal/alertzero/workers` |
| PATCH | `/internal/alertzero/workers/{workerId}` |
| GET | `/internal/alertzero/skills` |

OpenAPI → Zod schemas live in `@kbn/alertzero-common`. Regenerate with:

```bash
cd x-pack/solutions/security/packages/kbn-alertzero-common
pnpm openapi:generate
```

## Managed workflows

Owner plugin id: `alertzero`. A Watch is a grouping-only catalog entry (`system-security-watch-*`). Durable settings live on tagged Worker workflow documents, not on a Watch object.

Managed Worker definitions:

- `system-security-floor-alert-triage`
- `system-security-floor-attack-discovery`
- `system-security-hunt-continuous-threat-hunt`
- `system-security-detection-rule-tuning`
- `system-security-detection-rule-coverage`
- `system-security-forensics-endpoint-analysis`

Those definitions live in `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/`. Each Worker's settings contract is one `WorkerSettingsDeclaration` in `@kbn/alertzero-common` (`impl/worker_settings/`, one file per Watch team); AlertZero's `server/managed_workflows/workers/` derives defaults, validation, patch application and API projection from it, registered from `server/managed_workflows/worker_registry.ts`. Watch GET/list returns catalog placeholders only.

Worker definitions are `dynamic` + `auto` + `restorable`. They are installed on enable or a settings save with `workflowIdSuffix: spaceId`, so every space owns an independent copy. Disable changes enablement in place. Each Worker is a `yamlTemplate` whose template values mirror the settings API (shared fields flat, Worker-specific fields under `extras`) and are re-used during definition upgrades. Persisted values are validated against the Worker's current declaration on every read and write. Stored documents are never rewritten without a user request; instead the read path and every Worker's `yamlTemplate` run stored values through the same `upgradeStoredWorkerSettings` (`managed/definitions/alertzero/worker_settings_defaults.ts`). A schedule or extras key the document does not have yet is filled from the current default, extras a Worker no longer declares are ignored, and a stored autonomy level the Worker no longer allows is lowered to the nearest allowed level below it (never raised). So the settings page and the running workflow agree; installed copies pick up a change when the definition version moves and `ready()` re-renders them. Any other value that is already stored is left as-is, including when it is out of range. Renames and other breaking shape changes have no compatibility path (see [Pre-customer state](#pre-customer-state)).

The prototype rule workflows remain static global installs and are not advertised to workflow selector UIs:

- `system-security-rule-tuning-worker` — the tuning sweep; the Rule Tuning Worker dispatches it (`workflow.executeAsync`) on its schedule setting (default 2h) per enabled space, and it remains directly callable for manual runs
- `system-security-rule-tuning-review` — launched per noisy rule by the tuning sweep, each run holding its own approval gate
- `system-security-coverage-worker` — the coverage sweep. The Rule Coverage Worker dispatches it (`workflow.execute`) on its schedule setting (default 1h) per enabled space with its lookback and max gaps settings
- `system-security-coverage-review` — launched per pending coverage gap by the coverage sweep, each run holding its own approval gate
- `system-security-rule-creation` — launched by a coverage review when nothing covers the gap
- `system-security-rule-preview` — called by both of the above

### Managed definition `version` vs product “v1”

Two different version fields:

| Field | Where | Meaning |
|-------|--------|---------|
| YAML `version: "1"` | Top of each Worker `*.yaml` | Workflow document schema / format version (stays `"1"` until the YAML language changes). |
| Definition `version: N` | The Worker's module under `managed/definitions/alertzero/` | **Managed reconciliation counter** for `@kbn/workflows/managed`. Bump when you need install/`ready()` to re-apply the definition (`versionStrategy: 'auto'`). |

Start a new definition at `1` and increment it for intentional definition changes. This counter is not product SemVer; once a definition has been published, do not reset it without an explicit managed-document migration decision. A change to a render helper in `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_template_values.ts` needs a definition version bump too; no test catches a missing one.

### Central AlertZero Worker registry guide

The current YAML files are Worker stubs rather than final Watch-team definitions.

1. Define the stable Worker id, display name, and Watch membership in `@kbn/alertzero-common` (`SYSTEM_SECURITY_WORKER_CATALOG`). Per-space document ids are produced later by `workflowIdSuffix: spaceId`.
2. Add a per-Worker managed definition module under `kbn-workflows/managed/definitions/alertzero` and include it in the platform `managedWorkflowDefinitions` registry. Keep `pluginId: 'alertzero'` and `ALERTZERO_WORKER_MANAGEMENT` (`dynamic` / `auto` / `restorable`).
3. Add the Worker's allowed autonomy levels and defaults (`allowedAutonomyLevels`, optional `scheduleInterval.defaultValue`, optional `extras.defaultValue`) to `managed/definitions/alertzero/worker_settings_defaults.ts`, and run its `yamlTemplate` values through `upgradeStoredWorkerSettings` with them. Then add its `WorkerSettingsDeclaration` in `@kbn/alertzero-common` (`impl/worker_settings/<watch>.ts`), built from those defaults plus the `extras` schema, and list it in `WORKER_SETTINGS_DECLARATIONS`. On the server add the Worker to `WORKER_SETTINGS_VERSIONS` (and the `RegisteredWorkerId` union) in `server/managed_workflows/workers/worker_settings.ts`; `workers/index.ts` then registers it from the catalog through the shared registration, which reads the declaration. Add a stored-shape fixture at `server/managed_workflows/workers/fixtures/<worker_id_in_snake_case>/current.json`, and regenerate the settings contract snapshot ([Changing Worker settings safely](#changing-worker-settings-safely)).
4. Enablement is lifecycle state: templates start with `enabled: false`, and AlertZero enables the installed per-space document through the request-authorized Workflows update API. After any settings install, AlertZero also calls that CRUD path so Task Manager resyncs.
5. Defaults from the declaration are used for a fresh per-space install. Persisted values are untrusted: on read and write they are parsed by the Worker's complete schema (`workerId` literal, `autonomy` restricted to the allowed levels, `scheduleInterval` only if declared, `extras` only if declared, unknown keys rejected). A stored document that fails projects the Worker as `unavailable`.
6. A PATCH composes the next settings from the stored ones and validates the result with the same complete schema (semantics under [Worker-specific settings](#worker-specific-settings-extras)). Failures return 400 naming the field; nothing is written. Do not add per-Worker branches to the server path — extend the declaration.
7. `toSettings` projects stored values into `WorkerSettings`: `workerId`, `autonomy`, `scheduleInterval` for schedule-driven Workers, `extras` for Workers that declare them. Read and PATCH use the same names and nesting.
8. Add settings-module tests for defaults, patches, and that projected keys are not stripped. Add managed-definition tests for valid rendered YAML and registry tests for catalog/settings wiring. Imported YAML changes require an explicit managed-definition version decision.
9. If the Worker loses some or all of its work while another Worker is off (it acts on records that Worker writes, or hands records to it that only it reads), add an entry to `WORKER_DEPENDENCIES` in `public/pages/watches/worker_dependencies/worker_dependencies.tsx`. The entry carries its own dialog and warning copy, which names only what is lost.
10. Every child workflow the Worker calls with `workflow.execute` or `workflow.executeAsync`, directly or through another child, sets `run-as-mode: inherit` with a literal `workflow-id` (see [Worker lifecycle](#worker-lifecycle)). Action workflows keep the default identity.

The Workers service owns per-space installation, reading persisted values, enable/disable, and upgrades. Settings responses carry a logical revision (`settingsRevision`, `null` before the per-space document exists). A settings PATCH sends the revision its draft was built from; the server returns 409 when the stored revision differs and the client keeps the draft. Compare-then-write, not an atomic guard.

### Scheduled Workers

Not every Worker is schedule-driven — the rest are alert- or event-triggered — so a schedule is a per-Worker opt-in rather than part of `CommonWorkerTemplateValues`. A Worker without one carries no interval in its template values and none in its projected settings.

Scheduled Workers today: `system-security-floor-attack-discovery` (default `24h`), `system-security-detection-rule-tuning` (default `2h`) and `system-security-detection-rule-coverage` (default `1h`). The two Detection Workers also keep a `manual` trigger for on-demand sweeps.

The interval is a positive count with a unit of minutes, hours or days (`'30m'`, `'24h'`, `'7d'`). It is validated by the `WorkerScheduleInterval` OpenAPI schema at the route boundary and rendered verbatim into the trigger's `every`. Seconds are not offered: the workflow engine only accepts `s` at 60 or above. Changing an interval rewrites the workflow YAML, and the post-install `updateWorkflow` call is what re-registers the Task Manager task.

To give another Worker a schedule:

1. **`<worker>.yaml`** — add a `scheduled` trigger. Keep `manual` alongside it if the Worker should also support on-demand runs; the scheduler reads only scheduled triggers.

   ```yaml
   triggers:
     - type: scheduled
       with:
         every: "__WORKER_SCHEDULE_INTERVAL__"
     - type: manual
   consts:
     worker_settings:
       scheduleInterval: "__WORKER_SCHEDULE_INTERVAL__"
   ```

2. **`<worker>.ts`** — swap the template type and renderer, and bump the definition `version`:

   ```ts
   import { renderScheduledWorkerYaml, type ScheduledWorkerTemplateValues } from './worker_template_values';

   version: 2,
   yamlTemplate: (values: ScheduledWorkerTemplateValues): string =>
     renderScheduledWorkerYaml(WORKER_YAML, values),
   } as const satisfies ManagedWorkflowDefinition<ScheduledWorkerTemplateValues>;
   ```

3. **`worker_settings_defaults.ts`** — add `scheduleInterval: { defaultValue: '<interval>' }` to the Worker's defaults, and pass it through in its declaration in `@kbn/alertzero-common` (`impl/worker_settings/<watch>.ts`). Presence is the opt-in: it drives fresh-install defaults, the interval rendered for documents that predate it, the projected settings, and whether an interval PATCH is accepted or rejected with a 400 naming `scheduleInterval`.

Nothing changes in the API schema or the UI: `scheduleInterval` is already optional on `WorkerSettings` and `WorkerSettingsWrite`, and the interval control renders purely off the field's presence in the read body. A new schedule on an existing Worker takes effect on the next save or enable.

Tests to update:

- `managed_workflow_definitions.test.ts` — add `scheduleInterval` to the Worker's `templateRepresentativeValuesById` entry and update its fingerprint row to `<newVersion>:<newHash>` (the failure message prints the hash).
- `worker_registry.test.ts` — set the Worker's `EXPECTED_WORKER_SETTINGS` entry with its `scheduleInterval` and add `'scheduled'` to `triggerTypes` (keep `'manual'` if the YAML keeps that trigger).
- `worker_settings.test.ts` — add the Worker to `SCHEDULED_WORKER_IDS` so the "rejects an interval patch" cases stop running against it.
- `worker_settings_compat.test.ts` — regenerate the settings contract snapshot (see [Changing Worker settings safely](#changing-worker-settings-safely)).

### Worker-specific settings (`extras`)

`enabled` sits beside `settings`; `autonomy` and `scheduleInterval` are the shared fields inside it. Anything else lives under `settings.extras`, owned by the Worker's Watch team and closed per Worker. A PATCH is the editable subset of the read body plus the revision GET returned:

```json
{ "enabled": true, "settingsRevision": 3, "settings": { "autonomy": "manual", "scheduleInterval": "2h", "extras": { "analysisWindowDays": 7, "fpCountThreshold": 10, "fpRateThresholdPct": 50 } } }
```

Shared fields are per-field: omitted keeps the stored value, supplied replaces it. `extras` is whole-object: omitted keeps the stored object; supplied must be the complete valid object for that Worker and replaces it. No deep merge, no special `null`. Unknown keys, another Worker's fields, a replacement missing a required field, or an autonomy level the Worker does not allow are rejected with a 400 naming the field.

Adding a field to an existing Worker touches only Watch-owned code (Rule Tuning's analysis window is the worked example):

1. **Schema** — add the field to the Worker's extras object in `@kbn/alertzero-common/impl/schemas/components/<watch>_watch_settings.schema.yaml` (`additionalProperties: false`, required) and run `yarn openapi:generate` in that package.
2. **Default** — add its default to the Worker's `extras.defaultValue` in `managed/definitions/alertzero/worker_settings_defaults.ts`; the declaration in `impl/worker_settings/<watch>.ts` picks it up. An installed document that lacks the key reads and renders that default; a stored value always wins.
3. **Template** — forward `values.extras.<field>` in the Worker's `yamlTemplate` renderer and YAML and bump the definition `version`; the setting is done only when the saved value reaches the run. Then regenerate the settings contract snapshot ([Changing Worker settings safely](#changing-worker-settings-safely)).
4. **Control** — build a real control in the Worker's own folder under `public/pages/watches/custom_settings/<worker>/` (Rule Tuning lives in `custom_settings/rule_tuning/`), registered by Worker id in `custom_settings/registry.ts`. It receives `settings` and `onExtrasChange(extras)` and hands back the complete `extras` object. It never calls an API and there is no form generator or app-load completeness check; cover it with a component test.

The shared Watch page renders the interval control from the presence of `scheduleInterval`, offers only the Worker's `allowedAutonomyLevels` (one level renders as a fixed value), and mounts the registered custom component. Every card also carries a Models row linking to Stack Management → Feature Settings, where models are picked per space for each AlertZero tier; a Worker has no model setting of its own, so don't add one to `extras`. Every edit, including Enabled, changes a draft. Save validates all dirty Workers, then writes Worker by Worker with the revision each draft started from; failed Workers keep draft and error; Discard drops unsaved edits without undoing successful writes.

Worker dependencies (`WORKER_DEPENDENCIES`) are judged client-side against every Worker's saved enabled state, with this page's draft on top, so they work across Watches. Turning off a Worker that an enabled Worker depends on asks for confirmation before the draft changes; turning a Worker on never asks. Each Worker header carries one warning icon listing its reasons. After Save, an acknowledge-only notice lists why a saved Worker that is on cannot do all of its work: a missing model after every save, a disabled provider only after the save that turned the Worker on. The notice never blocks the save.

### Changing Worker settings safely

Every configured space stores its own copy of a Worker's settings, and that copy must keep reading after your change. `worker_settings_compat.test.ts` enforces this; you do not need to remember any of it.

- **Settings contract.** `server/managed_workflows/workers/test_helpers/settings_contract.snapshot.json` records each Worker's own settings schema and defaults, plus the two shared schemas every document and save goes through: `WorkerSettings` (the second stage of every Worker's complete schema) and `WorkerSettingsWrite` (the `settings` body of a save). When they change, the test says whether the change is safe for stored documents and for saves that used to pass. A normal test run never writes the snapshot; update it with:

  ```bash
  UPDATE_WORKER_SETTINGS_CONTRACT=true node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/workers/worker_settings_compat.test.ts
  ```

  For a breaking change, update mode refuses to write until you also set `ACCEPT_WORKER_SETTINGS_BREAKING_CHANGE=<issue-url>`, naming the issue where the reset of the affected environments was agreed with the Common Worker Layer team. The URL and the breaking changes, computed against the base branch, are written into the snapshot. A PR stays red until every change that breaks the base branch's contract is listed in an entry it added; an empty or partial entry does not count. Update mode refuses to run in CI. The acceptance exists only while AlertZero has no customers; [security-team#19312](https://github.com/elastic/security-team/issues/19312) replaces it with a migration check.
- **Stored fixtures.** `fixtures/<worker_id_in_snake_case>/*.json` are documents configured Workers store; `current.json` is the shape a space stores today. Every fixture must read, render without throwing, and read back unchanged. From each Worker's `current.json`, a document missing a defaulted key must read and render exactly like one that stores the default, and a no-longer-allowed autonomy level exactly like the level it is lowered to; rendering never modifies the stored values. These checks compare renders with each other; what the rendered workflow contains is the Watch team's, tested by the managed definition and registry tests. A new Worker needs `current.json`.
- **Unclassified schema features.** A failure saying "Unclassified … Teach the Worker settings contract check about it" means the schema uses a JSON Schema construct the classifier does not know. Ask the Common Worker Layer team to extend `test_helpers/settings_contract.ts`; do not work around it.
- **Validation the contract cannot compare.** A failure saying "Cannot establish settings compatibility at …" means a stored or saved setting goes through a refinement (`.refine`, `.superRefine`, `.check`), a transform, a preprocess or a pipe. JSON Schema drops those, so a change to them would pass unnoticed. It is not a breaking change and cannot be accepted: express the constraint as a bound, an enum or a pattern, or ask the Common Worker Layer team to teach the contract to compare it.

Installed copies re-render only when a Worker's definition `version` moves. `managed_workflow_definitions.test.ts` fails until you bump it whenever the Worker's YAML or its defaults in `worker_settings_defaults.ts` change: its fingerprint row covers both. A YAML-only edit touches nothing in the settings contract.

| Change | Result | What to do |
|---|---|---|
| New setting with a default, loosened bound, added allowed value, new Worker | Safe | Run the update command. Bump the definition version when the YAML or the defaults change (enforced). |
| New schedule on an existing Worker | Safe | As above. Task Manager picks up the schedule on the next save or enable in each space. |
| Changed default | Safe | Bump the definition version (enforced) and run the update command. It reaches fresh installs and every stored document that does not hold the field; a stored value always wins. |
| YAML edit | Not a settings change | Bump the definition version (enforced). |
| Render-helper edit (`src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_template_values.ts`) | Not a settings change | Bump the definition version yourself; no test catches a missing bump. |
| Removed autonomy level that has a lower allowed level (for example `supervised` when `assisted` stays) | Safe | Bump the definition version (enforced) and run the update command. Stored documents holding the removed level read and render as the nearest allowed level; a trigger that depends on the level changes on the next save or enable in each space. |
| Removed `extras` from a Worker | Safe | Bump the definition version (enforced) and run the update command. Stored extras are ignored on read and render. |
| Renamed, removed or retyped setting; tightened bound; removed allowed value (autonomy: the lowest allowed level); new setting without a default, including a required key inside a nested object; removed Worker; settings version bump; a `WorkerSettings` or `WorkerSettingsWrite` change that rejects documents or saves that used to pass | Breaking | Prefer keeping the stored key and changing only the label. Otherwise, before customers, a coordinated reset recorded with `ACCEPT_WORKER_SETTINGS_BREAKING_CHANGE=<issue-url>` in update mode; after that, a migration ([security-team#19312](https://github.com/elastic/security-team/issues/19312)). |

`Safe` means safe on upgrade. While a rollout or rollback mixes versions, a Kibana that predates an added field shows that Worker as unavailable and rejects settings saves until every node runs the same version.

The contract compares what JSON Schema can express, on both stages of each Worker's complete schema and on the save body; validation it cannot express fails the build instead of being skipped. It does not cover the rest of the save request (`enabled`, `settingsRevision`) or the rules the Workers service adds on save, such as requiring a service account to enable a Worker.

Possible future improvements: if real incidents show that a setting stopped reaching the workflow input it is meant for, the owning Watch team can add a targeted test proving that particular setting reaches that input. Generic rules about rendered workflow content (no `undefined`, required YAML fragments, every stored setting changing the YAML) stay out of this gate. They block valid Watch-owned changes such as prompt edits, moving a value within the YAML, or retiring a setting from execution while keeping it readable, and resolving those false alarms would mean editing a CWL-owned test. Such rules should become mandatory only with an agreed ownership boundary and an exception process.

### Pre-customer state

AlertZero is not live. A new required extra or schedule key that has a default is read and rendered from that default when a document lacks it. Renames, type changes, and other breaking shape changes still have no compatibility path. A deliberate breaking change needs a migration under [security-team#19312](https://github.com/elastic/security-team/issues/19312) or a reset decision. When documents from earlier development builds do not validate, the fix is a clean reset of the affected per-space Worker documents, agreed with the Common Worker Layer team on an issue and recorded with `ACCEPT_WORKER_SETTINGS_BREAKING_CHANGE=<issue-url>` in update mode (see [Changing Worker settings safely](#changing-worker-settings-safely)).

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types and OpenAPI | `@kbn/alertzero-common` |
| Managed Worker YAML, renderers, and template value types | `kbn-workflows/managed/definitions/alertzero` |
| Worker settings defaults, validation, patches, and API projection | `plugins/alertzero/server/managed_workflows/workers` |
| Investigation / Proposal conversation projection | Agent Builder / Conversations (optional dep) |
| Live Watch projection | Workflows Management via `workflowsExtensions` |
| Skills projection | `server/services/utils/skills_projection_service.ts` + `server/services/watches/project_watch.ts` |
| Brief / in-app pages | `plugins/alertzero/public` |
| Solution nav nodes | `security_solution_ess` / `security_solution_serverless` navigation trees |

## In scope (PR1)

- Platform chrome (header + Security footer utilities)
- Throughline body order in Security nav; Discover → real Discover; Dashboards → real Security dashboards
- Brief queue, Watches catalog/detail
- Investigation details and chat hosted by Agent Builder

## Non-goals (this PR)

- Nesting routes under `/app/security` or importing Security page wrappers
- Pixel-perfect Throughline CSS port
- Implementing Workflows / Activity / Performance / Guardrails data
- No `.kibana-threat-intel-hunt-findings` index / Intelligence Hub findings queue
- No AlertZero create or delete surface for custom watches

## Development

```bash
source ~/.nvm/nvm.sh && nvm use
node scripts/regenerate_moon_projects.js --update --filter @kbn/alertzero-plugin
node scripts/type_check --project x-pack/solutions/security/plugins/alertzero/tsconfig.json
node scripts/jest x-pack/solutions/security/plugins/alertzero/public/components/app_chrome/alertzero_chrome.test.tsx
node scripts/jest x-pack/solutions/security/packages/kbn-alertzero-common
```

### Page-load budget

Keep `pageLoadAssetSize.alertzero` lean — prefer a thin plugin entry over raising the optimizer limit. Keep the app UI behind `import('./application')` in `public/plugin.ts`. The shared package (`@kbn/alertzero-common`) must use an **explicit export allow-list** in `index.ts` — never `export *` for schemas. Star re-exports defeat optimizer tree-shaking and can pull Zod into the page-load bundle even when the plugin only imports a few constants.

Measure with:

```bash
node scripts/build_kibana_platform_plugins.js --dist --no-cache
# inspect target/public/bundles/metrics.json → "page load bundle size" for alertzero
```


## Discovering actions and revising proposals with Elastic AI

AlertZero registers the `alertzero-action-discovery` skill and
`security.alertzero.actions.list` tool. The skill exposes the action catalog tool
when loaded, with availability checked against the caller's AlertZero read
privilege and the current space's enablement setting. The tool repeats that check
when invoked.

Proposal revisions are owned by the shared proposals plugin. Its
`proposal-management` skill exposes `platform.proposals.revise` independently of
AlertZero. See the [proposal revision guidance](../../../../platform/plugins/shared/proposals/README.md#revising-proposals-with-elastic-ai)
for behavior and manual validation.
