# AlertZero plugin (`@kbn/alertzero-plugin`)

Security Watch investigation queue and catalog behind `xpack.alertzero.enabled`.

## Enablement

Add to `kibana.yml` (or `config/kibana.dev.yml` for local dev):

```yaml
xpack.alertzero.enabled: true
```

- **`xpack.alertzero.enabled`** — deployment-level plugin gate (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for AlertZero are omitted automatically.
- **`xpack.alertzero.ui.useMockData`** — optional presentation-source toggle (default `true`). It still feeds mock Skills / Investigations. Worker settings and Watch grouping are live either way.

Workers install when a user enables one or saves settings on one. There is no Watch-level enablement switch. Disable leaves the per-space Worker document and its settings in place. The only bulk cleanup is turning `xpack.alertzero.enabled` off and restarting — AlertZero then stops registering as a managed-workflow owner and orphan cleanup force-deletes its documents across every space.

Restart Kibana after changing config, then open `/app/alertzero` (or use the Security left rail).

To inspect a Worker's installed managed workflow — its rendered YAML, triggers, and executions — in the Workflows UI, also set:

```yaml
uiSettings.overrides:
  workflows:ui:showManagedWorkflows: true
```

This is optional. AlertZero's own Watch pages work without it; it only affects what the Workflows UI lists (default `false`).

### When disabled (`xpack.alertzero.enabled: false`) — no production pollution

| Surface | Behavior |
|---------|----------|
| HTTP `/internal/alertzero/*` | Not registered |
| Kibana feature / privileges | Not registered |
| Browser app `/app/alertzero` | Not registered (nav links to `alertzero` / `alertzero:*` are removed by chrome) |
| Managed workflow **owner** | Not registered (`registerManagedWorkflowOwner` skipped) |
| Managed workflow initialization | Not called |
| Leftover installed Worker documents | Global Workflows orphan cleanup removes docs whose owner is unregistered |

Definitions still exist in `@kbn/workflows/managed` (code registry only). Worker definitions are **not** installed into `.workflows-*` until a user enables that Worker or saves settings on it. AlertZero startup installs only the three global rule workflows before `ready()` reconciles already-installed dynamic documents.

The only always-on cost of a soft flag is the tiny public plugin entry bundle (~page-load limit); it registers nothing when disabled.

### Live mode caveats (`useMockData: false`)

Before enabling live projection in shared or production environments:

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

### Security left-rail order (when AlertZero enabled)

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
yarn openapi:generate
```

## Managed workflows

Owner plugin id: `alertzero`. A Watch is a grouping-only catalog entry (`system-security-watch-*`). Durable settings live on tagged Worker workflow documents, not on a Watch object.

Managed Worker definitions:

- `system-security-floor-alert-triage`
- `system-security-floor-attack-discovery`
- `system-security-dark-continuous-threat-hunt`
- `system-security-detection-rule-tuning`
- `system-security-detection-rule-creation`

Those definitions live in `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/`. AlertZero owns defaults, migrations, patches, and API projection under `server/managed_workflows/workers/`, registered from `server/managed_workflows/worker_registry.ts`. Watch GET/list returns catalog placeholders only.

Worker definitions are `dynamic` + `auto` + `restorable`. They are installed on enable or a settings save with `workflowIdSuffix: spaceId`, so every space owns an independent copy. Disable changes enablement in place. Each Worker is a `yamlTemplate` whose versioned template values persist autonomy and are re-used during definition upgrades. `migrate()` still runs on read/write; startup does not enumerate documents before `ready()`.

The prototype rule workflows remain static global installs and are not advertised to workflow selector UIs:

- `system-security-rule-tuning` — implementation used by the Detection Rule Tuning Worker
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
3. Register the Worker with settings behavior in AlertZero's `server/managed_workflows/workers/` registry. The registry joins settings behavior to the platform definition by stable Worker id.
4. Enablement is lifecycle state: templates start with `enabled: false`, and AlertZero enables the installed per-space document through the request-authorized Workflows update API. After any settings install, AlertZero also calls that CRUD path so Task Manager resyncs.
5. Treat stored values as untrusted old data. `migrate` validates the shape, returns the complete current value set, and sets `migrated: true` whenever AlertZero must reinstall it. Reads and PATCHes run `migrate()`; startup does not enumerate documents before `ready()`.
6. Keep `applyPatch` limited to fields already present on `UpdateWorkerRequestBody`. New Worker-specific shapes require agreement before extending the OpenAPI contract.
7. `toSettings` projects stored values into `WorkerSettings` (`workerId`, `autonomy`, and `scheduleInterval` for schedule-driven Workers).
8. Add settings-module tests for defaults, patches, and that projected keys are not stripped. Add managed-definition tests for valid rendered YAML and registry tests for catalog/settings wiring. Imported YAML changes require an explicit managed-definition version decision.

The Workers service owns per-space installation, reading persisted values, enable/disable, and upgrades. Settings responses carry the logical workflow version, and settings patches return HTTP 409 when a fresh read shows that version was already stale. This is best-effort detection rather than an atomic write guard.

### Scheduled Workers

Not every Worker is schedule-driven — the rest are alert- or event-triggered — so a schedule is a per-Worker opt-in rather than part of `CommonWorkerTemplateValues`. A Worker without one carries no interval in its template values and none in its projected settings.

`system-security-floor-attack-discovery` is the only scheduled Worker today.

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

3. **`server/managed_workflows/workers/worker_settings.ts`** — add one entry to `WORKER_SCHEDULE_DEFAULTS` with the Worker's default interval. Presence in that map is the opt-in: it drives `createDefaultValues`, the `toSettings` projection, and whether an interval PATCH is applied or rejected with a 400.

Nothing changes in the API schema or the UI. `scheduleInterval` is already optional on `WorkerSettings` and `UpdateWorkerRequestBody`, and the interval control renders purely off the field's presence in the payload. `WORKER_SETTINGS_VERSIONS` does not change either — the field is additive with a default, so an install predating it reads correctly with no migration.

Tests to update:

- `managed_workflow_definitions.test.ts` — add `scheduleInterval` to the Worker's `templateRepresentativeValuesById` entry, and update its fingerprint row to `<newVersion>:<newHash>` (the failure message prints the hash).
- `worker_registry.test.ts` — set the Worker's `EXPECTED_WORKER_SETTINGS` entry to `triggerType: 'scheduled'` and its `scheduleInterval`. That assertion compares the Worker's full trigger list, so widen it if the Worker keeps `manual` too.
- `worker_settings.test.ts` — `UNSCHEDULED_WORKER_IDS` excludes only Attack Discovery today; add the new Worker so the "rejects an interval patch" cases stop running against it.

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types, fixtures, OpenAPI | `@kbn/alertzero-common` |
| Managed Worker YAML, renderers, and template value types | `kbn-workflows/managed/definitions/alertzero` |
| Worker settings defaults, migrations, patches, and API projection | `plugins/alertzero/server/managed_workflows/workers` |
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
