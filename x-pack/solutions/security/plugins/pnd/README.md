# PND plugin (`@kbn/pnd-plugin`)

Security Watch investigation queue and catalog behind `xpack.pnd.enabled`.

## Enablement

Add to `kibana.yml` (or `config/kibana.dev.yml` for local dev):

```yaml
xpack.pnd.enabled: true
```

- **`xpack.pnd.enabled`** — deployment-level plugin gate (default `false`). When false, the plugin registers no app, routes, or features; Security nav nodes for PND are omitted automatically.
- **`xpack.pnd.ui.useMockData`** — optional presentation-source toggle (default `true`). It still feeds mock Skills / Investigations. Worker settings and Watch grouping are live either way.

Workers install when a user enables one or saves settings on one. There is no Watch-level enablement switch. Disable leaves the per-space Worker document and its settings in place. The only bulk cleanup is turning `xpack.pnd.enabled` off and restarting — PND then stops registering as a managed-workflow owner and orphan cleanup force-deletes its documents across every space.

Restart Kibana after changing config, then open `/app/pnd` (or use the Security left rail).

### When disabled (`xpack.pnd.enabled: false`) — no production pollution

| Surface | Behavior |
|---------|----------|
| HTTP `/internal/pnd/*` | Not registered |
| Kibana feature / privileges | Not registered |
| Browser app `/app/pnd` | Not registered (nav links to `pnd` / `pnd:*` are removed by chrome) |
| Managed workflow **owner** | Not registered (`registerManagedWorkflowOwner` skipped) |
| Managed workflow initialization | Not called |
| Leftover installed Worker documents | Global Workflows orphan cleanup removes docs whose owner is unregistered |

Definitions still exist in `@kbn/workflows/managed` (code registry only). Worker definitions are **not** installed into `.workflows-*` until a user enables that Worker or saves settings on it. PND startup installs only the three global rule workflows before `ready()` reconciles already-installed dynamic documents.

The only always-on cost of a soft flag is the tiny public plugin entry bundle (~page-load limit); it registers nothing when disabled.

### Live mode caveats (`useMockData: false`)

Before enabling live projection in shared or production environments:

- Watch reads require only `pnd_read`; PND owns the catalog projection and its managed definitions. Recent-run enrichment soft-fails when execution history is unavailable.
- Settings writes require `pnd_write`; managed install is requestless, so the PND route is the authorization boundary.
- Autonomy and enablement are durable per Worker. There is no Watch-owned settings write path.

### Skills projection

Skills are only projected from real data. At startup, PND provisions the required Agent Builder agent in every space that has an installed watch before `ready()` runs reconciliation, so skills resolve correctly in non-default spaces on first request.

`GET /internal/pnd/skills` returns a per-space `WatchSkill[]` projected from live workflow definitions:

- Each `ai.agent` step in a workflow's YAML contributes the skills it can invoke. The projection walks all step branches (if/else, cases, parallel branches) so nested agent steps are found.
- If the step has a `configuration_overrides.skill_ids` list those IDs are used, even when the step's agent-id cannot be resolved from Agent Builder. Otherwise the agent's own `configuration.skill_ids` are used, plus any `baseConfiguration.skill_ids` from its type.
- Results are cached per space with a 5-minute TTL. The cache is invalidated immediately after any watch enable, disable, or settings write so the next read reflects the current list of projected skills.

## Chrome strategy (PR1)

PND is a **standalone Security-category app** (`/app/pnd`) that **uses platform Kibana chrome**:

- Does **not** hide the Kibana top header (search, help, AI Agent, user menu)
- Does **not** render a custom left rail or Tour/Help/user utilities
- Slots Throughline-ordered destinations into the **Security solution nav** (ESS + serverless trees)
- Platform footer stays as on Security `main`: Launchpad, Developer tools, Settings / stack management, collapse
- **Discover** uses the platform `{ link: 'discover' }` destination (real `/app/discover`)
- **Dashboards** uses Security’s real dashboards destination (same Throughline slot; no PND stub)
- **Chats** stays in-app and embeds Agent Builder
- Watches keeps a **content-area** secondary nav (Workflows / Skills / … stubs)
- Ask PND FAB routes to Chats (hidden on `/chats`)

## Routes

| UI route | Purpose |
|----------|---------|
| `/app/pnd` | Brief — Investigation queue |
| `/app/pnd/chats` | Agent Builder embed (`sessionTag: pnd`) |
| `/app/discover` | Real Discover (via Security / PND nav Discover item) |
| `/app/security/dashboards` | Real Security dashboards (via Throughline Dashboards item) |
| `/app/pnd/alerts` | Placeholder — coming soon |
| `/app/pnd/attacks` | Placeholder — coming soon |
| `/app/pnd/records` | Placeholder — coming soon |
| `/app/pnd/threat-hunt` | Placeholder — coming soon |
| `/app/pnd/streams` | Placeholder — coming soon |
| `/app/pnd/watches` | Watch catalog (`system-security-watch-*`) |
| `/app/pnd/watches/:watchId` | Watch detail |
| `/app/pnd/watches/workflows` … `/guardrails` | Watches section stubs |
| `/app/pnd/investigations/:id` | Investigation inspector shell |
| `/app/pnd/investigations/:id/proposals/:proposalId` | Proposal detail shell |
| `/app/pnd/settings` | Settings stub (no dedicated nav item) |

### Security left-rail order (when PND enabled)

**PND → Chats → Discover → Dashboards → Alerts → Attacks → Records → Threat hunt → Streams → Watches**, then the rest of Security’s existing destinations (including the platform **More** overflow — not a PND stub).

### Internal API (`/internal/pnd/*`)

| Method | Path |
|--------|------|
| GET | `/internal/pnd/watches` |
| GET | `/internal/pnd/watches/{watchId}` |
| GET | `/internal/pnd/workers` |
| PATCH | `/internal/pnd/workers/{workerId}` |
| GET | `/internal/pnd/skills` |
| GET | `/internal/pnd/investigations` |
| GET | `/internal/pnd/investigations/{id}` |
| GET | `/internal/pnd/investigations/{id}/proposals` |

OpenAPI → Zod schemas live in `@kbn/pnd-common`. Regenerate with:

```bash
cd x-pack/solutions/security/packages/kbn-pnd-common
yarn openapi:generate
```

## Managed workflows

Owner plugin id: `pnd`. A Watch is a grouping-only catalog entry (`system-security-watch-*`). Durable settings live on tagged Worker workflow documents, not on a Watch object.

Managed Worker definitions:

- `system-security-floor-alert-triage`
- `system-security-floor-attack-discovery`
- `system-security-dark-continuous-threat-hunt`
- `system-security-detection-rule-tuning`
- `system-security-detection-rule-creation`

Those definitions live in `src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/`. PND owns defaults, migrations, patches, and API projection under `server/managed_workflows/workers/`, registered from `server/managed_workflows/worker_registry.ts`. Watch GET/list returns catalog placeholders only.

Worker definitions are `dynamic` + `auto` + `restorable`. They are installed on enable or a settings save with `workflowIdSuffix: spaceId`, so every space owns an independent copy. Disable changes enablement in place. Each Worker is a `yamlTemplate` whose versioned template values persist autonomy and are re-used during definition upgrades. `migrate()` still runs on read/write; startup does not enumerate documents before `ready()`.

The prototype rule workflows remain static global installs and are not advertised to workflow selector UIs:

- `system-security-rule-tuning` — the tuning sweep; the Rule Tuning Worker dispatches it (`workflow.executeAsync`) every 2h per enabled space, and it remains directly callable for manual runs
- `system-security-rule-tuning-proposal` — launched per noisy rule by the tuning sweep, each run holding its own approval gate
- `system-security-rule-creation` — implementation used by the Detection Rule Creation Worker
- `system-security-rule-preview` — called by both of the above

### Managed definition `version` vs product “v1”

Two different version fields:

| Field | Where | Meaning |
|-------|--------|---------|
| YAML `version: "1"` | Top of each Worker `*.yaml` | Workflow document schema / format version (stays `"1"` until the YAML language changes). |
| Definition `version: N` | The Worker's module under `managed/definitions/pnd/` | **Managed reconciliation counter** for `@kbn/workflows/managed`. Bump when you need install/`ready()` to re-apply the definition (`versionStrategy: 'auto'`). |

Start a new definition at `1` and increment it for intentional definition changes. This counter is not product SemVer; once a definition has been published, do not reset it without an explicit managed-document migration decision.

### Central PND Worker registry guide

The current YAML files are Worker stubs rather than final Watch-team definitions.

1. Define the stable Worker id, display name, and Watch membership in `@kbn/pnd-common` (`SYSTEM_SECURITY_WORKER_CATALOG`). Per-space document ids are produced later by `workflowIdSuffix: spaceId`.
2. Add a per-Worker managed definition module under `kbn-workflows/managed/definitions/pnd` and include it in the platform `managedWorkflowDefinitions` registry. Keep `pluginId: 'pnd'` and `PND_WORKER_MANAGEMENT` (`dynamic` / `auto` / `restorable`).
3. Register the Worker with settings behavior in PND's `server/managed_workflows/workers/` registry. The registry joins settings behavior to the platform definition by stable Worker id.
4. Enablement is lifecycle state: templates start with `enabled: false`, and PND enables the installed per-space document through the request-authorized Workflows update API. After any settings install, PND also calls that CRUD path so Task Manager resyncs.
5. Treat stored values as untrusted old data. `migrate` validates the shape, returns the complete current value set, and sets `migrated: true` whenever PND must reinstall it. Reads and PATCHes run `migrate()`; startup does not enumerate documents before `ready()`.
6. Keep `applyPatch` limited to fields already present on `UpdateWorkerRequestBody`. New Worker-specific shapes require agreement before extending the OpenAPI contract.
7. `toSettings` projects stored values into `WorkerSettings` (`workerId`, `autonomy`).
8. Add settings-module tests for defaults, patches, and that projected keys are not stripped. Add managed-definition tests for valid rendered YAML and registry tests for catalog/settings wiring. Imported YAML changes require an explicit managed-definition version decision.

The Workers service owns per-space installation, reading persisted values, enable/disable, and upgrades. Settings responses carry the logical workflow version, and settings patches return HTTP 409 when a fresh read shows that version was already stale. This is best-effort detection rather than an atomic write guard.

## Working-group contribution map

| Area | Where to land |
|------|----------------|
| Shared types, fixtures, OpenAPI | `@kbn/pnd-common` |
| Managed Worker YAML, renderers, and template value types | `kbn-workflows/managed/definitions/pnd` |
| Worker settings defaults, migrations, patches, and API projection | `plugins/pnd/server/managed_workflows/workers` |
| Investigation / Proposal conversation projection | Agent Builder / Conversations (optional dep) |
| Live Watch projection (non-mock) | Workflows Management via `workflowsExtensions` |
| Skills projection | `server/services/utils/skills_projection_service.ts` + `server/services/watches/project_watch.ts` |
| Brief / in-app pages | `plugins/pnd/public` |
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
- No PND create or delete surface for custom watches

## Development

```bash
source ~/.nvm/nvm.sh && nvm use
node scripts/regenerate_moon_projects.js --update --filter @kbn/pnd-plugin
node scripts/type_check --project x-pack/solutions/security/plugins/pnd/tsconfig.json
node scripts/jest x-pack/solutions/security/plugins/pnd/public/components/app_chrome/pnd_chrome.test.tsx
node scripts/jest x-pack/solutions/security/packages/kbn-pnd-common
```

### Page-load budget

Keep `pageLoadAssetSize.pnd` lean — prefer a thin plugin entry over raising the optimizer limit. Keep the app UI behind `import('./application')` in `public/plugin.ts`. The shared package (`@kbn/pnd-common`) must use an **explicit export allow-list** in `index.ts` — never `export *` for schemas/samples. Star re-exports defeat optimizer tree-shaking and can pull Zod + mock catalogs into the page-load bundle even when the plugin only imports a few constants.

Measure with:

```bash
node scripts/build_kibana_platform_plugins.js --filter pnd --dist --no-cache --no-examples
# inspect …/pnd/target/public/metrics.json → "page load bundle size"
```
