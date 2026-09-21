# AlertZero plugin (`@kbn/alertzero-plugin`)

Security Watch investigation queue and catalog behind the `securitySolution:enableAlertZero` advanced setting.

## Enablement

Two independent gates, with different scopes and different jobs.

### `securitySolution:enableAlertZero` — the user-facing, per-space gate

A namespace-scoped Kibana advanced setting (default `false`), registered by this plugin in `server/ui_settings.ts`. Turn it on in **Stack Management → Advanced Settings** for the space you want AlertZero in, or pin it for a whole deployment:

```yaml
uiSettings.overrides:
  securitySolution:enableAlertZero: true
```

It controls four things. Enabling takes effect live, but **disabling takes full effect only after a page reload** — the setting is registered with `requiresPageReload: true`, so Advanced Settings prompts for one. Dismiss that prompt and the Agent Builder surfaces in the last row stay in place until the page is reloaded:

| Surface | When off |
|---------|----------|
| Browser app `/app/alertzero` | Registered but `AppStatus.inaccessible`; every page renders core's "Application unavailable" |
| Security solution navigation | AlertZero nodes disappear — core empties `visibleIn` and `deepLinks` for an inaccessible app, and chrome drops nav nodes whose link has no nav link. The navigation trees hold no check of their own |
| HTTP `/internal/alertzero/*` | `404`, via the `withAlertZeroEnabled` wrapper on every route |
| Agent Builder Investigation template and its tabs | Absent from the next page load. Agent Builder's conversation template contract has no deregistration counterpart, so a session that already registered them keeps them until it reloads; in that window opening one raises an error instead of loading an investigation |

### `xpack.alertzero.enabled` — the deployment kill switch

A plugin config flag, now defaulting to `true`. It is *not* the user-facing toggle; it exists to stop AlertZero's startup side effects on a deployment, and turning it off requires a restart:

```yaml
xpack.alertzero.enabled: false
```

Everything in the table below is skipped when it is off — including registration of the advanced setting itself, which is why `withAlertZeroEnabled` can never read an unregistered key.

### `xpack.alertzero.ui.useMockData`

Optional presentation-source toggle (default `false`). Set to `true` to serve the mock Investigation catalog from `@kbn/alertzero-common` instead of real data — useful for demos and UI work without a live stack. Worker settings and Watch grouping are live either way.

### Worker lifecycle

Workers install when a user enables one or saves settings on one. There is no Watch-level enablement switch. Disable leaves the per-space Worker document and its settings in place. The only bulk cleanup is turning `xpack.alertzero.enabled` off and restarting — AlertZero then stops registering as a managed-workflow owner and orphan cleanup force-deletes its documents across every space. Turning the *advanced setting* off does **not** trigger cleanup; it only hides the surfaces.

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
- Settings writes require `alertzero_write`; managed install is requestless, so the AlertZero route is the authorization boundary.
- Autonomy and enablement are durable per Worker. There is no Watch-owned settings write path.

### Skills projection

Skills are only projected from real data. At startup, AlertZero provisions the required Agent Builder agent in every space that has an installed watch before `ready()` runs reconciliation, so skills resolve correctly in non-default spaces on first request.

`GET /internal/alertzero/skills` returns a per-space `WatchSkill[]` projected from live workflow definitions:

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
- **Chats** stays in-app and embeds Agent Builder
- Watches keeps a **content-area** secondary nav (Workflows / Skills / … stubs)
- Ask AlertZero FAB routes to Chats (hidden on `/chats`)

## Routes

| UI route | Purpose |
|----------|---------|
| `/app/alertzero` | Brief — Investigation queue |
| `/app/alertzero/chats` | Agent Builder embed (`sessionTag: alertzero`) |
| `/app/discover` | Real Discover (via Security / AlertZero nav Discover item) |
| `/app/security/dashboards` | Real Security dashboards (via Throughline Dashboards item) |
| `/app/alertzero/alerts` | Placeholder — coming soon |
| `/app/alertzero/attacks` | Placeholder — coming soon |
| `/app/alertzero/records` | Placeholder — coming soon |
| `/app/alertzero/threat-hunt` | Placeholder — coming soon |
| `/app/alertzero/streams` | Placeholder — coming soon |
| `/app/alertzero/watches` | Watch catalog (`system-security-watch-*`) |
| `/app/alertzero/watches/:watchId` | Watch detail |
| `/app/alertzero/watches/workflows` … `/guardrails` | Watches section stubs |
| `/app/alertzero/investigations/:id` | Investigation inspector shell |
| `/app/alertzero/investigations/:id/proposals/:proposalId` | Proposal detail shell |
| `/app/alertzero/settings` | Settings stub (no dedicated nav item) |

### Security left-rail order (when `securitySolution:enableAlertZero` is on)

**AlertZero → Chats → Discover → Dashboards → Alerts → Attacks → Records → Threat hunt → Streams → Watches**, then the rest of Security’s existing destinations (including the platform **More** overflow — not an AlertZero stub).

### Internal API (`/internal/alertzero/*`)

| Method | Path |
|--------|------|
| GET | `/internal/alertzero/watches` |
| GET | `/internal/alertzero/watches/{watchId}` |
| GET | `/internal/alertzero/workers` |
| PATCH | `/internal/alertzero/workers/{workerId}` |
| GET | `/internal/alertzero/skills` |
| GET | `/internal/alertzero/investigations` |
| GET | `/internal/alertzero/investigations/{id}` |
| GET | `/internal/alertzero/investigations/{id}/proposals` |

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
- `system-security-detection-rule-creation`

Those definitions live in `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/`. Each Worker's settings contract is one `WorkerSettingsDeclaration` in `@kbn/alertzero-common` (`impl/worker_settings/`, one file per Watch team); AlertZero's `server/managed_workflows/workers/` derives defaults, validation, patch application and API projection from it, registered from `server/managed_workflows/worker_registry.ts`. Watch GET/list returns catalog placeholders only.

Worker definitions are `dynamic` + `auto` + `restorable`. They are installed on enable or a settings save with `workflowIdSuffix: spaceId`, so every space owns an independent copy. Disable changes enablement in place. Each Worker is a `yamlTemplate` whose template values mirror the settings API (shared fields flat, Worker-specific fields under `extras`) and are re-used during definition upgrades. Persisted values are validated against the Worker's current declaration on every read and write; there is no migration layer (see [Pre-customer state](#pre-customer-state)). Startup does not enumerate documents before `ready()`.

The prototype rule workflows remain static global installs and are not advertised to workflow selector UIs:

- `system-security-rule-tuning-worker` — the tuning sweep; the Rule Tuning Worker dispatches it (`workflow.executeAsync`) on its schedule setting (default 2h) per enabled space, and it remains directly callable for manual runs
- `system-security-rule-tuning-review` — launched per noisy rule by the tuning sweep, each run holding its own approval gate
- `system-security-rule-creation` — implementation used by the Detection Rule Creation Worker
- `system-security-rule-preview` — called by both of the above

### Managed definition `version` vs product “v1”

Two different version fields:

| Field | Where | Meaning |
|-------|--------|---------|
| YAML `version: "1"` | Top of each Worker `*.yaml` | Workflow document schema / format version (stays `"1"` until the YAML language changes). |
| Definition `version: N` | The Worker's module under `managed/definitions/alertzero/` | **Managed reconciliation counter** for `@kbn/workflows/managed`. Bump when you need install/`ready()` to re-apply the definition (`versionStrategy: 'auto'`). |

Start a new definition at `1` and increment it for intentional definition changes. This counter is not product SemVer; once a definition has been published, do not reset it without an explicit managed-document migration decision.

### Central AlertZero Worker registry guide

The current YAML files are Worker stubs rather than final Watch-team definitions.

1. Define the stable Worker id, display name, and Watch membership in `@kbn/alertzero-common` (`SYSTEM_SECURITY_WORKER_CATALOG`). Per-space document ids are produced later by `workflowIdSuffix: spaceId`.
2. Add a per-Worker managed definition module under `kbn-workflows/managed/definitions/alertzero` and include it in the platform `managedWorkflowDefinitions` registry. Keep `pluginId: 'alertzero'` and `ALERTZERO_WORKER_MANAGEMENT` (`dynamic` / `auto` / `restorable`).
3. Add the Worker's `WorkerSettingsDeclaration` in `@kbn/alertzero-common` (`impl/worker_settings/<watch>.ts`) and list it in `WORKER_SETTINGS_DECLARATIONS`: `workerId`, `allowedAutonomyLevels` (1–3 of the shared scale, ascending), optional `scheduleInterval: { defaultValue }`, optional `extras: { schema, defaultValue }`. On the server add the Worker to `WORKER_SETTINGS_VERSIONS` (and the `RegisteredWorkerId` union) in `server/managed_workflows/workers/worker_settings.ts`; `workers/index.ts` then registers it from the catalog through the shared registration, which reads the declaration.
4. Enablement is lifecycle state: templates start with `enabled: false`, and AlertZero enables the installed per-space document through the request-authorized Workflows update API. After any settings install, AlertZero also calls that CRUD path so Task Manager resyncs.
5. Defaults from the declaration are used for a fresh per-space install. Persisted values are untrusted: on read and write they are parsed by the Worker's complete schema (`workerId` literal, `autonomy` restricted to the allowed levels, `scheduleInterval` only if declared, `extras` only if declared, unknown keys rejected). A stored document that fails projects the Worker as `unavailable`.
6. A PATCH composes the next settings from the stored ones and validates the result with the same complete schema (semantics under [Worker-specific settings](#worker-specific-settings-extras)). Failures return 400 naming the field; nothing is written. Do not add per-Worker branches to the server path — extend the declaration.
7. `toSettings` projects stored values into `WorkerSettings`: `workerId`, `autonomy`, `scheduleInterval` for schedule-driven Workers, `extras` for Workers that declare them. Read and PATCH use the same names and nesting.
8. Add settings-module tests for defaults, patches, and that projected keys are not stripped. Add managed-definition tests for valid rendered YAML and registry tests for catalog/settings wiring. Imported YAML changes require an explicit managed-definition version decision.

The Workers service owns per-space installation, reading persisted values, enable/disable, and upgrades. Settings responses carry a logical revision (`settingsRevision`, `null` before the per-space document exists). A settings PATCH sends the revision its draft was built from; the server returns 409 when the stored revision differs and the client keeps the draft. Compare-then-write, not an atomic guard.

### Scheduled Workers

Not every Worker is schedule-driven — the rest are alert- or event-triggered — so a schedule is a per-Worker opt-in rather than part of `CommonWorkerTemplateValues`. A Worker without one carries no interval in its template values and none in its projected settings.

Scheduled Workers today: `system-security-floor-attack-discovery` (default `24h`) and `system-security-detection-rule-tuning` (default `2h`, also keeps a `manual` trigger for on-demand sweeps).

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

3. **`impl/worker_settings/<watch>.ts`** (in `@kbn/alertzero-common`) — add `scheduleInterval: { defaultValue: '<interval>' }` to the Worker's declaration. Presence is the opt-in: it drives fresh-install defaults, the projected settings, and whether an interval PATCH is accepted or rejected with a 400 naming `scheduleInterval`.

Nothing changes in the API schema or the UI: `scheduleInterval` is already optional on `WorkerSettings` and `WorkerSettingsWrite`, and the interval control renders purely off the field's presence in the read body. Documents persisted before the field existed do not match the new shape; see [Pre-customer state](#pre-customer-state).

Tests to update:

- `managed_workflow_definitions.test.ts` — add `scheduleInterval` to the Worker's `templateRepresentativeValuesById` entry and update its fingerprint row to `<newVersion>:<newHash>` (the failure message prints the hash).
- `worker_registry.test.ts` — set the Worker's `EXPECTED_WORKER_SETTINGS` entry with its `scheduleInterval` and add `'scheduled'` to `triggerTypes` (keep `'manual'` if the YAML keeps that trigger).
- `worker_settings.test.ts` — add the Worker to `SCHEDULED_WORKER_IDS` so the "rejects an interval patch" cases stop running against it.

### Worker-specific settings (`extras`)

`enabled` sits beside `settings`; `autonomy` and `scheduleInterval` are the shared fields inside it. Anything else lives under `settings.extras`, owned by the Worker's Watch team and closed per Worker. A PATCH is the editable subset of the read body plus the revision GET returned:

```json
{ "enabled": true, "settingsRevision": 3, "settings": { "autonomy": "manual", "scheduleInterval": "2h", "extras": { "analysisWindowDays": 14 } } }
```

Shared fields are per-field: omitted keeps the stored value, supplied replaces it. `extras` is whole-object: omitted keeps the stored object; supplied must be the complete valid object for that Worker and replaces it. No deep merge, no special `null`. Unknown keys, another Worker's fields, a replacement missing a required field, or an autonomy level the Worker does not allow are rejected with a 400 naming the field.

Adding a field to an existing Worker touches only Watch-owned code (Rule Tuning's analysis window is the worked example):

1. **Schema** — add the field to the Worker's extras object in `@kbn/alertzero-common/impl/schemas/components/<watch>_watch_settings.schema.yaml` (`additionalProperties: false`, required) and run `yarn openapi:generate` in that package.
2. **Declaration** — add its fresh-install default to `extras.defaultValue` in `impl/worker_settings/<watch>.ts`.
3. **Template** — forward `values.extras.<field>` in the Worker's `yamlTemplate` renderer and YAML and bump the definition `version`; the setting is done only when the saved value reaches the run.
4. **Control** — build a real control in the Worker's own folder under `public/pages/watches/custom_settings/<worker>/` (Rule Tuning lives in `custom_settings/rule_tuning/`), registered by Worker id in `custom_settings/registry.ts`. It receives `settings` and `onExtrasChange(extras)` and hands back the complete `extras` object. It never calls an API and there is no form generator or app-load completeness check; cover it with a component test.

The shared Watch page renders the interval control from the presence of `scheduleInterval`, offers only the Worker's `allowedAutonomyLevels` (one level renders as a fixed value), and mounts the registered custom component. Every edit, including Enabled, changes a draft. Save validates all dirty Workers, then writes Worker by Worker with the revision each draft started from; failed Workers keep draft and error; Discard drops unsaved edits without undoing successful writes.

### Pre-customer state

AlertZero is not live. Declarations, schemas and template values may change without a compatibility path or migration. Persisted settings must validate against the current shape; when documents from earlier development builds do not, the fix is a clean reset of the affected per-space Worker documents, coordinated with the Watch teams.

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types, fixtures, OpenAPI | `@kbn/alertzero-common` |
| Managed Worker YAML, renderers, and template value types | `kbn-workflows/managed/definitions/alertzero` |
| Worker settings defaults, validation, patches, and API projection | `plugins/alertzero/server/managed_workflows/workers` |
| Investigation / Proposal conversation projection | Agent Builder / Conversations (optional dep) |
| Live Watch projection (non-mock) | Workflows Management via `workflowsExtensions` |
| Skills projection | `server/services/utils/skills_projection_service.ts` + `server/services/watches/project_watch.ts` |
| Brief / in-app pages | `plugins/alertzero/public` |
| Solution nav nodes | `security_solution_ess` / `security_solution_serverless` navigation trees |

## In scope (PR1)

- Platform chrome (header + Security footer utilities)
- Throughline body order in Security nav; Discover → real Discover; Dashboards → real Security dashboards
- Brief queue, Watches catalog/detail, Chats Agent Builder embed
- Investigation shells + mock internal APIs

## Non-goals (this PR)

- Nesting routes under `/app/security` or importing Security page wrappers
- Wiring remaining operate destinations (Alerts, Attacks, …) to real apps
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

Keep `pageLoadAssetSize.alertzero` lean — prefer a thin plugin entry over raising the optimizer limit. Keep the app UI behind `import('./application')` in `public/plugin.ts`. The shared package (`@kbn/alertzero-common`) must use an **explicit export allow-list** in `index.ts` — never `export *` for schemas/samples. Star re-exports defeat optimizer tree-shaking and can pull Zod + mock catalogs into the page-load bundle even when the plugin only imports a few constants.

Measure with:

```bash
node scripts/build_kibana_platform_plugins.js --filter alertzero --dist --no-cache --no-examples
# inspect …/alertzero/target/public/metrics.json → "page load bundle size"
```
